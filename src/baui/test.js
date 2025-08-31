'use strict';

(function () {
  const config = {
    defaultBackground: '',
    typewriterSpeed: 30,
    renderDepth: 1,
    characterBottomOffset: -34,
    dialogueHeight: 22, // 对话框高度百分比
    mobileDiaogueHeight: 40, // 移动端对话框高度百分比
    debug: false,
  };

  // 图片别名管理
  const imageAliasManager = (function () {
    let aliases = {};
    let aliasesLoaded = false;

    async function loadImageAliases() {
      try {
        if (typeof getCurrentCharPrimaryLorebook !== 'function') {
          initDefaultAliases();
          aliasesLoaded = true;
          return;
        }

        const charLorebookName = await getCurrentCharPrimaryLorebook();
        if (!charLorebookName) {
          initDefaultAliases();
          aliasesLoaded = true;
          return;
        }

        const allEntries = await getLorebookEntries(charLorebookName);
        aliases = {};

        const imageTypeRegex = /^图片-/;
        const imageEntries = allEntries.filter(
          entry => entry.comment && imageTypeRegex.test(entry.comment) && entry.enabled === true,
        );

        if (imageEntries.length === 0) {
          initDefaultAliases();
          aliasesLoaded = true;
          return;
        }

        for (const entry of imageEntries) {
          parseImageAliasEntry(entry.content);
        }

        aliasesLoaded = true;
      } catch (error) {
        initDefaultAliases();
        aliasesLoaded = true;
      }
    }

    async function waitForAliasesLoaded() {
      if (aliasesLoaded) return true;

      const maxWait = 2000;
      const startTime = Date.now();

      return new Promise(resolve => {
        const checkLoaded = () => {
          if (aliasesLoaded) {
            resolve(true);
            return;
          }

          if (Date.now() - startTime > maxWait) {
            resolve(false);
            return;
          }

          setTimeout(checkLoaded, 100);
        };

        checkLoaded();
      });
    }

    function parseImageAliasEntry(content) {
      if (!content) return;

      const regex = /<([^|]+)\|([^|>]+)>/g;
      let match;

      while ((match = regex.exec(content)) !== null) {
        const alias = match[1].trim();
        const url = match[2].trim();

        if (alias && url) {
          aliases[alias] = url;
        }
      }
    }

    function initDefaultAliases() {
      aliases = {
        少女: '',
        男孩: '',
        背景1: '',
        背景2: '',
        背景A: '',
        背景B: '',
        角色A立绘: '',
        角色B立绘: '',
      };
    }

    function processImageTag(input) {
      if (!input) return input;

      const tagRegexes = {
        char: /\[char\|([^\]]+)\]/,
        bg: /\[bg\|([^\]]+)\]/,
        cg: /\[cg\|([^\]]+)\]/,
      };

      for (const type in tagRegexes) {
        const match = tagRegexes[type].exec(input);
        if (match) {
          const alias = match[1].trim();
          const imgUrl = aliases[alias];
          if (imgUrl) {
            return { url: imgUrl, type: type };
          }
          return { url: null, type: type };
        }
      }

      return input;
    }

    function isValidUrl(url) {
      if (!url) return false;

      if (typeof url === 'string') {
        if (url.includes('[char|') || url.includes('[bg|') || url.includes('[cg|')) {
          const imgTagRegex = /\[(char|bg|cg)\|([^\]]+)\]/;
          const match = url.match(imgTagRegex);
          if (match) {
            const alias = match[2].trim();
            return !!aliases[alias];
          }
        }
      }

      return url.startsWith('http://') || url.startsWith('https://');
    }

    function getImageUrl(input) {
      if (!input) return null;

      if (typeof input === 'string') {
        const imgTagRegex = /\[(char|bg|cg)\|([^\]]+)\]/;
        const match = input.match(imgTagRegex);
        if (match) {
          const type = match[1];
          const alias = match[2].trim();
          if (aliases[alias]) {
            return {
              url: aliases[alias],
              type: type,
            };
          }
        }
      }

      if (typeof input === 'string' && (input.startsWith('http://') || input.startsWith('https://'))) {
        return {
          url: input,
          type: 'char',
        };
      }

      if (typeof input === 'string') {
        const aliasUrl = aliases[input.trim()];
        if (aliasUrl) {
          return {
            url: aliasUrl,
            type: 'char',
          };
        }
      }

      return input;
    }

    function setAlias(alias, url) {
      if (alias && url) {
        aliases[alias.trim()] = url.trim();
        return true;
      }
      return false;
    }

    function getAliases() {
      return aliases;
    }

    initDefaultAliases();

    loadImageAliases();

    return {
      getImageUrl,
      setAlias,
      isValidUrl,
      processImageTag,
      loadImageAliases,
      waitForAliasesLoaded,
      getAliases,
    };
  })();

  // 集中处理错误的辅助函数
  async function safeExecute(fn, fallback = null, errorMessage = '操作执行出错') {
    try {
      return await fn();
    } catch (error) {
      log(errorMessage, error);
      return fallback;
    }
  }

  // 记录日志
  function log(...args) {
    if (
      config.debug &&
      args[0] &&
      typeof args[0] === 'string' &&
      (args[0].includes('出错') || args[0].includes('失败') || args[0].includes('错误'))
    ) {
      console.log('[GALGAME插件]', ...args);
    }
  }

  // 文本格式化处理函数
  function renderText(text) {
    if (!text) return '';

    try {
      // 转换星号包围的文本为斜体
      text = text.replace(/\*{1}(.+?)\*{1}/g, '<em>$1</em>');

      // 转换引号包围的文本，移除引号
      text = text.replace(/\"{1}(.+?)\"{1}/g, '$1');

      return text;
    } catch (error) {
      log('格式化文本错误:', error);
      return text || '';
    }
  }

  const gameTextRegex = /```\S*\s*<gametext>([\s\S]*?)<\/gametext>\s*```/is;
  const directGameTextRegex = /<gametext>([\s\S]*?)<\/gametext>/is;

  const dialogueRegex = /^([^|]*)\|([^|]*)\|([^|]*)\|(.*)$/;
  const commandRegex = /^\[(.+?)\]$/;

  const renderedMessages = new Set();

  const gameStates = {};

  let streamStart = false;
  let streamParsing = false;
  let streamInfo = undefined;
  let tempMesText = null;

  async function renderGameForMessage(messageId) {
    if (renderedMessages.has(messageId)) return;

    if (config.renderDepth > 0) {
      const lastMessageId = await getLastMessageId();
      if (lastMessageId - Number(messageId) >= config.renderDepth) {
        return;
      }
    }

    const messages = await getChatMessages(messageId);
    if (messages.length === 0) {
      return;
    }

    const messageContent = messages[0].message;
    if (!messageContent) {
      return;
    }

    let scriptText = '';
    const scriptMatch = messageContent.match(gameTextRegex);

    if (scriptMatch) {
      scriptText = scriptMatch[1].trim();
    } else {
      const directMatch = messageContent.match(directGameTextRegex);
      if (!directMatch) {
        return;
      }

      scriptText = directMatch[1].trim();
    }

    if (!scriptText) {
      return;
    }

    await imageAliasManager.waitForAliasesLoaded();

    return renderGameContent(messageId, scriptText);
  }

  async function renderGameContent(messageId, scriptText) {
    const messageElement = retrieveDisplayedMessage(messageId);
    if (!messageElement || messageElement.length === 0) {
      return;
    }

    const gameData = parseScript(scriptText);

    const gameHTML = createGameHTML(messageId, gameData);

    messageElement.find('pre, code, .roleplay_galgame').remove();

    messageElement.append(gameHTML);

    setupGameEvents(messageId, gameData);

    renderedMessages.add(messageId);
  }

  function parseScript(scriptText) {
    try {
      const lines = scriptText.trim().split('\n');
      const gameData = {
        scenes: [],
        currentSceneIndex: 0,
      };

      let tempScenes = [];
      let currentExecutableIndex = 0;

      lines.forEach(line => {
        line = line.trim();
        if (!line) return;

        const commandMatch = line.match(/^\[(.+?)\]$/);
        if (commandMatch) {
          const fullCommand = commandMatch[1];
          const parts = fullCommand.split('|');

          const command = parts[0].trim();

          const args = parts.slice(1).map(arg => arg.trim());

          tempScenes.push({
            type: 'command',
            command,
            args,
            original: line,
          });
          currentExecutableIndex++;
          return;
        }

        const dialogueMatch = line.match(/^([^|]*)\|([^|]*)\|([^|]*)\|(.*)$/);
        if (dialogueMatch) {
          let spriteImg = dialogueMatch[3].trim();

          let text = dialogueMatch[4].trim();
          const inlineActionMatch = text.match(/(.*?)(\[action\|.+?\])$/);
          let inlineAction = null;

          if (inlineActionMatch) {
            text = inlineActionMatch[1].trim();
            const actionCommandMatch = inlineActionMatch[2].match(/^\[(.+?)\]$/);
            if (actionCommandMatch) {
              const actionParts = actionCommandMatch[1].split('|');

              inlineAction = {
                target: actionParts[1].trim(),
                name: actionParts[2].trim(),
                args: actionParts.slice(3).map(arg => arg.trim()),
              };
            }
          }

          const dialogData = {
            type: 'dialogue',
            character: dialogueMatch[1].trim() || '旁白',
            position: dialogueMatch[2].trim().toUpperCase() || null,
            sprite: spriteImg,
            text: text,
            inlineAction: inlineAction,
            original: line,
          };

          tempScenes.push(dialogData);

          currentExecutableIndex++;
          return;
        }

        tempScenes.push({
          type: 'unknown',
          original: line,
        });
        currentExecutableIndex++;
      });

      if (config.defaultBackground) {
        tempScenes.unshift({
          type: 'command',
          command: 'bg',
          args: [config.defaultBackground],
          original: `[bg|${config.defaultBackground}]`,
        });
      }

      gameData.scenes = tempScenes;
      return gameData;
    } catch (error) {
      return { scenes: [], currentSceneIndex: 0 };
    }
  }

  function isValidUrl(url) {
    return !!url;
  }

  function createGameHTML(messageId, gameData) {
    const container = $('<div class="roleplay_galgame"></div>');

    container.append(`
      <style>
        @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css');

        /* 基本容器样式 */
        .galgame-container-${messageId} {
          width: 360px;
          position: relative;
          background-color: #000;
          background-size: cover;
          background-position: center;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 5px 15px rgba(0,0,0,0.2);
          margin: 15px auto;
          display: flex;
          flex-direction: column;
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          pointer-events: auto;
          aspect-ratio: 16/9;
          height: auto;
          width: 100%;
        }

        /* PC端适配 */
        @media (min-width: 768px) {
          .galgame-container-${messageId} {
            max-width: 90%;
            aspect-ratio: 16/9;
          }
        }

        /* 移动端适配 */
        @media (max-width: 767px) {
          .galgame-container-${messageId} {
            max-width: 100%;
            aspect-ratio: 3/5;
          }
        }

        /* 背景层 */
        .galgame-bg-${messageId} {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-size: cover;
          background-position: center;
          z-index: 0;
          pointer-events: none;
        }

        /* 角色区域 */
        .galgame-char-area-${messageId} {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: flex-end;
          position: relative;
          min-height: 70%;
          z-index: 1;
        }

        /* 移动端角色区域调整 */
        @media (max-width: 767px) {
          .galgame-char-area-${messageId} {
            min-height: calc(100% - ${config.mobileDiaogueHeight}% - 20px);
          }
        }

        /* 角色立绘 */
        .galgame-char-${messageId} {
          max-width: 100%;
          max-height: 120%;
          position: absolute;
          bottom: ${config.characterBottomOffset}%;
          opacity: 0;
          transition: opacity 0.3s ease-in-out, filter 0.3s ease-in-out;
          pointer-events: none;
        }

        .galgame-char-${messageId}.left {
          left: 0;
          transform: scaleX(1);
        }

        .galgame-char-${messageId}.center {
          left: 50%;
          transform: translateX(-50%);
        }

        .galgame-char-${messageId}.right {
          right: 0;
          transform: scaleX(-1);
        }

        .galgame-char-${messageId}.active {
          opacity: 1;
        }

        .galgame-char-${messageId}.active.dimmed {
          filter: brightness(0.5) grayscale(0.3);
        }

        /* CG图片 */
        .galgame-cg-${messageId} {
          position: absolute;
          top: 0;
          left: 5%;
          width: 90%;
          height: 70%;
          z-index: 3;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease-in-out;
          border: 6px solid white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          background-color: white;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
        }

        .galgame-cg-${messageId} img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .galgame-cg-${messageId}.active {
          opacity: 1;
        }

        /* 对话框 */
        .galgame-dialogue-${messageId} {
          background-color: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(3px);
          border-radius: 10px;
          padding: 25px 18px 15px 18px;
          margin: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.15);
          position: relative;
          min-height: 80px;
          z-index: 4;
          height: ${config.dialogueHeight}%;
          user-select: none;
        }

        /* 移动端对话框高度调整 */
        @media (max-width: 767px) {
          .galgame-dialogue-${messageId} {
            height: ${config.mobileDiaogueHeight}%;
            min-height: 120px;
          }
        }

        /* 角色名称 */
        .galgame-name-${messageId} {
          position: absolute;
          top: -20px;
          left: 15px;
          background-color: #ffacb6;
          color: white;
          padding: 4px 14px;
          border-radius: 15px;
          font-weight: bold;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          font-size: 16px;
          z-index: 5;
          user-select: none;
        }

        /* 对话文本 */
        .galgame-text-${messageId} {
          margin-top: 0;
          color: #333;
          font-size: 17px;
          line-height: 1.5;
          user-select: none;
        }

        /* 下一步指示器 */
        .galgame-next-${messageId} {
          position: absolute;
          bottom: 5px;
          right: 15px;
          font-size: 20px;
          color: #ff69b4;
          animation: pointer-pulse-${messageId} 1.5s infinite;
          user-select: none;
        }

        @keyframes pointer-pulse-${messageId} {
          0% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 0.7; }
        }

        /* 选项区域 */
        .galgame-choices-${messageId} {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 10px;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80%;
          max-width: 300px;
          z-index: 6;
          user-select: none;
        }

        /* 选项按钮 */
        .galgame-choice-${messageId} {
          background-color: rgba(255, 255, 255, 0.8);
          border: 1px solid #ccc;
          border-radius: 8px;
          padding: 10px 15px;
          cursor: pointer;
          transition: all 0.2s;
          color: #333;
          font-weight: bold;
          text-align: center;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
          user-select: none;
        }

        .galgame-choice-${messageId}:hover {
          background-color: rgba(240, 240, 240, 0.9);
          transform: translateY(-2px);
        }

        /* 遮罩层 */
        .galgame-overlay-${messageId} {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: black;
          opacity: 0;
          transition: opacity 0.5s;
          pointer-events: none;
          z-index: 7;
        }

        /* 履历按钮 */
        .galgame-history-btn-${messageId} {
          position: absolute;
          top: 10px;
          right: 10px;
          background-color: rgba(255, 255, 255, 0.8);
          color: #333;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
          z-index: 10;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          transition: background-color 0.2s;
        }

        .galgame-history-btn-${messageId}:hover {
          background-color: rgba(240, 240, 240, 0.9);
        }

        /* 履历模态框 */
        .galgame-history-modal-${messageId} {
          display: none;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.7);
          z-index: 20;
        }

        .galgame-history-content-${messageId} {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90%;
          height: 80%;
          background-color: rgba(255, 255, 255, 0.8);
          border-radius: 12px;
          padding: 20px;
          overflow-y: auto;
          max-height: 100%;
          box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        }

        .galgame-history-title-${messageId} {
          text-align: center;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid #ddd;
          color: #333;
          font-weight: bold;
        }

        .galgame-history-list-${messageId} {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .galgame-history-item-${messageId} {
          padding: 10px;
          border-radius: 8px;
          background-color: rgba(240, 240, 240, 0.8);
        }

        .galgame-history-speaker-${messageId} {
          font-weight: bold;
          color: #ff7eb3;
          margin-bottom: 5px;
        }

        .galgame-history-text-${messageId} {
          color: #000000;
        }

        .galgame-history-close-${messageId} {
          position: absolute;
          top: 10px;
          right: 10px;
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #333;
        }

        /* 晃动动画 */
        .galgame-history-shake-${messageId} {
          animation: shake-light-${messageId} 0.5s ease-in-out;
        }

        @keyframes shake-light-${messageId} {
          0%, 100% { transform: translateX(0) scaleX(var(--originalScaleX, 1)); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px) scaleX(var(--originalScaleX, 1)); }
          20%, 40%, 60%, 80% { transform: translateX(5px) scaleX(var(--originalScaleX, 1)); }
        }

        .shake-center-${messageId} {
          animation: shake-center-${messageId} 0.5s ease-in-out;
        }

        @keyframes shake-center-${messageId} {
          0%, 100% { transform: translateX(-50%) scaleX(var(--originalScaleX, 1)); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(calc(-50% - 5px)) scaleX(var(--originalScaleX, 1)); }
          20%, 40%, 60%, 80% { transform: translateX(calc(-50% + 5px)) scaleX(var(--originalScaleX, 1)); }
        }

        /* 统一图标颜色 */
        .galgame-container-${messageId} .fas {
          color: #ff69b4;
        }

        /* 保持履历按钮文字颜色不变 */
        .galgame-history-btn-${messageId} {
          color: #333;
        }
      </style>
    `);

    const gameContainer = $(`<div class="galgame-container-${messageId}"></div>`);

    const bgLayer = $(`<div class="galgame-bg-${messageId}" id="bg-${messageId}"></div>`);
    gameContainer.append(bgLayer);

    const charArea = $(`<div class="galgame-char-area-${messageId}"></div>`);
    charArea.append(
      `<img class="galgame-char-${messageId} left" id="char-left-${messageId}" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" alt="">`,
    );
    charArea.append(
      `<img class="galgame-char-${messageId} center" id="char-center-${messageId}" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" alt="">`,
    );
    charArea.append(
      `<img class="galgame-char-${messageId} right" id="char-right-${messageId}" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" alt="">`,
    );
    gameContainer.append(charArea);

    const cgLayer = $(
      `<div class="galgame-cg-${messageId}" id="cg-${messageId}"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" alt=""></div>`,
    );
    gameContainer.append(cgLayer);

    const historyBtn = $(
      `<button class="galgame-history-btn-${messageId}" id="history-btn-${messageId}"><i class="fas fa-history"></i> 履历</button>`,
    );
    gameContainer.append(historyBtn);

    const historyModal = $(`
      <div class="galgame-history-modal-${messageId}" id="history-modal-${messageId}">
        <div class="galgame-history-content-${messageId}">
          <button class="galgame-history-close-${messageId}" id="history-close-${messageId}"><i class="fas fa-times"></i></button>
          <div class="galgame-history-title-${messageId}">对话履历</div>
          <div class="galgame-history-list-${messageId}" id="history-list-${messageId}"></div>
        </div>
      </div>
    `);
    gameContainer.append(historyModal);

    const dialogueBox = $(`<div class="galgame-dialogue-${messageId}"></div>`);
    dialogueBox.append(`<div class="galgame-name-${messageId}" id="name-${messageId}"></div>`);
    dialogueBox.append(`<div class="galgame-text-${messageId}" id="text-${messageId}"></div>`);
    dialogueBox.append(
      `<div class="galgame-next-${messageId}" id="next-${messageId}"><i class="fas fa-caret-down"></i></div>`,
    );

    const choicesArea = $(`<div class="galgame-choices-${messageId}" id="choices-${messageId}"></div>`);

    const overlay = $(`<div class="galgame-overlay-${messageId}" id="overlay-${messageId}"></div>`);

    gameContainer.append(bgLayer);
    gameContainer.append(charArea);
    gameContainer.append(cgLayer);
    gameContainer.append(dialogueBox);
    gameContainer.append(choicesArea);
    gameContainer.append(overlay);

    container.append(gameContainer);

    gameStates[messageId] = {
      data: gameData,
      currentIndex: 0,
      waitingForClick: true,
      characters: {
        L: { name: null, sprite: null },
        C: { name: null, sprite: null },
        R: { name: null, sprite: null },
      },
    };

    log('游戏HTML创建完成:', messageId);
    return container;
  }

  function setupGameEvents(messageId, gameData) {
    const container = $(`.galgame-container-${messageId}`);
    if (!container.length) return;

    container.on('click', function (e) {
      e.stopPropagation();
      const state = gameStates[messageId];

      if (!state || state.processing) return;

      if (state.showingChoices) return;

      processNextScene(messageId);
    });

    $(`#history-btn-${messageId}`).on('click', function (e) {
      e.stopPropagation();
      showHistoryModal(messageId);
    });

    $(`#history-close-${messageId}`).on('click', function (e) {
      e.stopPropagation();
      hideHistoryModal(messageId);
    });

    setTimeout(() => {
      processNextScene(messageId);
    }, 100);
  }

  function processNextScene(messageId) {
    const state = gameStates[messageId];
    if (!state) return;

    if (window.GALGAME_FINISHING_STREAM || window.GALGAME_EDITING_MESSAGE) {
      return;
    }

    state.processing = true;

    const scene = state.data.scenes[state.currentIndex];
    if (!scene) {
      $(`#text-${messageId}`).text('对话已结束');
      $(`#next-${messageId}`).hide();

      const replayButton = $(
        `<button style="position:absolute; bottom:5px; left:15px; padding:5px 15px; background-color:#ff69b4; color:white; border:none; border-radius:5px; cursor:pointer;"><i class="fas fa-redo-alt"></i> 重新播放</button>`,
      );
      replayButton.on('click', function (e) {
        e.stopPropagation();
        state.currentIndex = 0;
        $(`#text-${messageId}`).text('');
        $(this).remove();

        hideAllCharacters(messageId);

        state.characters = {
          L: { name: null, sprite: null },
          C: { name: null, sprite: null },
          R: { name: null, sprite: null },
        };

        hideCG(messageId);

        $(`#bg-${messageId}`).css({
          'background-image': 'none',
          'background-color': '#000',
        });

        $(`#name-${messageId}`).hide();

        $(`#overlay-${messageId}`).css({
          opacity: '0',
          transition: 'none',
        });

        $(`#next-${messageId}`).show();

        processNextScene(messageId);
      });

      $(`.galgame-dialogue-${messageId}`).append(replayButton);

      state.processing = false;
      return;
    }

    try {
      if (scene.type === 'dialogue') {
        const nameElement = $(`#name-${messageId}`);
        if (scene.character === '旁白') {
          nameElement.hide();
          // 对于旁白对话，不应该亮起任何角色，但也不要额外暗化
        } else {
          nameElement.text(scene.character).show();

          // 设置角色立绘
          if (scene.position && scene.sprite) {
            showCharacter(messageId, scene.character, scene.position, scene.sprite);
          } else {
            // 如果只有角色名没有立绘和位置，尝试找到该角色并点亮
            for (const p in state.characters) {
              if (state.characters[p].name === scene.character) {
                const pos = p === 'L' ? 'left' : p === 'C' ? 'center' : 'right';
                const element = $(`#char-${pos}-${messageId}`);
                element.removeClass('dimmed').addClass('active');

                // 使其他角色变暗
                for (const otherP in state.characters) {
                  if (otherP !== p && state.characters[otherP].name) {
                    const otherPos = otherP === 'L' ? 'left' : otherP === 'C' ? 'center' : 'right';
                    $(`#char-${otherPos}-${messageId}`).addClass('dimmed');
                  }
                }
                break;
              }
            }
          }
        }

        typewriterEffect(messageId, scene.text, () => {
          if (scene.inlineAction) {
            executeAction(messageId, scene.inlineAction.target, scene.inlineAction.name, scene.inlineAction.args);
          }

          state.currentIndex++;
          state.processing = false;
          $(`#next-${messageId}`).show();
        });
      } else if (scene.type === 'command') {
        processCommand(messageId, scene.command, scene.args).then(() => {
          state.currentIndex++;
          state.processing = false;

          if (scene.command !== 'choice' && scene.command !== 'wait') {
            setTimeout(() => {
              processNextScene(messageId);
            }, 50);
          }
        });
      } else {
        state.currentIndex++;
        state.processing = false;
        processNextScene(messageId);
      }
    } catch (error) {
      state.currentIndex++;
      state.processing = false;
    }
  }

  async function processCommand(messageId, command, args) {
    const state = gameStates[messageId];
    if (!state) return;

    try {
      switch (command) {
        case 'bg':
          await setBackground(messageId, args[0], args[1], args[2] ? parseFloat(args[2]) : 0.5);
          break;

        case 'show':
          showCharacter(messageId, args[0], args[1].toUpperCase(), args[2]);
          break;

        case 'hide':
          hideCharacter(messageId, args[0]);
          break;

        case 'hide_all':
          hideAllCharacters(messageId);
          break;

        case 'cg':
          showCG(messageId, args[0]);
          break;

        case 'hide_cg':
          hideCG(messageId);
          break;

        case 'action':
          executeAction(messageId, args[0], args[1], args.slice(2));
          break;

        case 'wait':
          const waitTime = parseFloat(args[0]) * 1000 || 500;
          $(`#next-${messageId}`).hide();
          await new Promise(resolve => setTimeout(resolve, waitTime));
          $(`#next-${messageId}`).show();
          break;

        case 'choice':
          state.showingChoices = true;
          $(`#next-${messageId}`).hide();

          const choicesContainer = $(`#choices-${messageId}`);
          choicesContainer.empty();

          const choiceOverlay = $(
            `<div style="position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:4;"></div>`,
          );
          $(`.galgame-container-${messageId}`).append(choiceOverlay);

          args.forEach((choice, index) => {
            let text = choice.trim();
            const tagIndex = text.indexOf('>');
            if (tagIndex !== -1) {
              text = text.substring(0, tagIndex).trim();
            }

            const choiceElement = $(`<div class="galgame-choice-${messageId}">${text}</div>`);
            choiceElement.on('click', function (e) {
              e.stopPropagation();

              choicesContainer.empty();
              choiceOverlay.remove();
              state.showingChoices = false;

              if (typeof triggerSlash === 'function') {
                triggerSlash(`/setinput ${text}`);
              }

              state.currentIndex++;
              processNextScene(messageId);
            });

            choicesContainer.append(choiceElement);
          });
          break;

        case 'effect':
          const effectType = args[0];
          const effectParams = args.slice(1);

          if (effectType === 'screen_flash') {
            const overlay = $(`#overlay-${messageId}`);
            overlay.css({
              opacity: '0.8',
              background: 'white',
              transition: 'opacity 0.1s',
            });

            await new Promise(resolve => setTimeout(resolve, 100));

            overlay.css({
              opacity: '0',
              transition: 'opacity 0.1s',
            });

            await new Promise(resolve => setTimeout(resolve, 100));
          } else if (effectType === 'fade_to_black') {
            const overlay = $(`#overlay-${messageId}`);
            const duration = effectParams[0] ? parseFloat(effectParams[0]) : 0.5;
            overlay.css({
              opacity: '0',
              background: 'black',
              transition: `opacity ${duration}s`,
            });

            await new Promise(resolve => setTimeout(resolve, 10));

            overlay.css('opacity', '1');

            await new Promise(resolve => setTimeout(resolve, duration * 1000));
          } else if (effectType === 'fade_from_black') {
            const overlay = $(`#overlay-${messageId}`);
            const duration = effectParams[0] ? parseFloat(effectParams[0]) : 0.5;
            overlay.css({
              opacity: '1',
              background: 'black',
              transition: `opacity ${duration}s`,
            });

            await new Promise(resolve => setTimeout(resolve, 10));

            overlay.css('opacity', '0');

            await new Promise(resolve => setTimeout(resolve, duration * 1000));
          }
          break;
      }
    } catch (error) {
      log(`处理命令出错: ${command}`, error);
    }
  }

  function showCharacter(messageId, name, position, spriteUrl) {
    const state = gameStates[messageId];
    if (!state) return;

    if (!['L', 'C', 'R'].includes(position)) {
      return;
    }

    try {
      const pos = position === 'L' ? 'left' : position === 'C' ? 'center' : 'right';
      const charElement = $(`#char-${pos}-${messageId}`);

      if (!charElement.length) {
        return;
      }

      // 确保当前角色不被暗化
      charElement.removeClass('dimmed');

      for (const p in state.characters) {
        if (p !== position && state.characters[p].name === name) {
          const otherPos = p === 'L' ? 'left' : p === 'C' ? 'center' : 'right';
          $(`#char-${otherPos}-${messageId}`).removeClass('active');
          state.characters[p].name = null;
          state.characters[p].sprite = null;
        }
      }

      let actualSpriteUrl = '';
      let imageType = 'char';

      if (spriteUrl && typeof spriteUrl === 'string') {
        const tagRegexes = {
          char: /\[char\|([^\]]+)\]/,
          bg: /\[bg\|([^\]]+)\]/,
          cg: /\[cg\|([^\]]+)\]/,
        };

        let alias = null;

        for (const type in tagRegexes) {
          const match = spriteUrl.match(tagRegexes[type]);
          if (match) {
            alias = match[1].trim();
            imageType = type;
            break;
          }
        }

        if (alias) {
          const aliasObj = imageAliasManager.getAliases ? imageAliasManager.getAliases() : {};
          if (aliasObj && alias in aliasObj) {
            actualSpriteUrl = aliasObj[alias];
          }
        } else {
          const aliasObj = imageAliasManager.getAliases ? imageAliasManager.getAliases() : {};
          if (aliasObj && spriteUrl in aliasObj) {
            actualSpriteUrl = aliasObj[spriteUrl];
          } else if (spriteUrl.startsWith('http://') || spriteUrl.startsWith('https://')) {
            actualSpriteUrl = spriteUrl;
          }
        }
      }

      if (!actualSpriteUrl || !actualSpriteUrl.startsWith('http')) {
        charElement.attr(
          'src',
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        );
        charElement.attr('alt', name + ' (图片未设置)');
        charElement.css('display', 'block');
        charElement.addClass('active');

        state.characters[position] = {
          name: name,
          sprite: null,
        };

        // 使其他角色变暗
        for (const p in state.characters) {
          if (p !== position && state.characters[p].name) {
            const otherPos = p === 'L' ? 'left' : p === 'C' ? 'center' : 'right';
            $(`#char-${otherPos}-${messageId}`).addClass('dimmed');
          }
        }

        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = function () {
        charElement.attr('src', actualSpriteUrl);
        charElement.attr('alt', name);
        charElement.css('display', 'block');

        if (imageType === 'char') {
          charElement.css({
            'max-height': '120%',
            'max-width': '100%',
            bottom: `${config.characterBottomOffset}%`,
          });
        }

        charElement.addClass('active');

        state.characters[position] = {
          name: name,
          sprite: actualSpriteUrl,
        };

        // 使其他角色变暗
        for (const p in state.characters) {
          if (p !== position && state.characters[p].name) {
            const otherPos = p === 'L' ? 'left' : p === 'C' ? 'center' : 'right';
            $(`#char-${otherPos}-${messageId}`).addClass('dimmed');
          }
        }
      };

      img.onerror = function () {
        charElement.attr(
          'src',
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        );
        charElement.attr('alt', name + ' (图片加载失败)');
        charElement.css('display', 'block');
        charElement.addClass('active');

        state.characters[position] = {
          name: name,
          sprite: null,
        };

        // 使其他角色变暗
        for (const p in state.characters) {
          if (p !== position && state.characters[p].name) {
            const otherPos = p === 'L' ? 'left' : p === 'C' ? 'center' : 'right';
            $(`#char-${otherPos}-${messageId}`).addClass('dimmed');
          }
        }
      };

      img.src = actualSpriteUrl;
    } catch (error) {}
  }

  function hideCharacter(messageId, target) {
    const state = gameStates[messageId];
    if (!state) return;

    try {
      if (['L', 'C', 'R'].includes(target)) {
        const pos = target === 'L' ? 'left' : target === 'C' ? 'center' : 'right';
        const charElement = $(`#char-${pos}-${messageId}`);

        if (charElement.length) {
          charElement.removeClass('active dimmed');
          state.characters[target] = { name: null, sprite: null };
        }
      } else {
        for (const p in state.characters) {
          if (state.characters[p] && state.characters[p].name === target) {
            const pos = p === 'L' ? 'left' : p === 'C' ? 'center' : 'right';
            const charElement = $(`#char-${pos}-${messageId}`);

            if (charElement.length) {
              charElement.removeClass('active dimmed');
              state.characters[p] = { name: null, sprite: null };
            }
          }
        }
      }
    } catch (error) {}
  }

  function hideAllCharacters(messageId) {
    $(`#char-left-${messageId}, #char-center-${messageId}, #char-right-${messageId}`).removeClass('active dimmed');

    const state = gameStates[messageId];
    if (state) {
      state.characters.L = { name: null, sprite: null };
      state.characters.C = { name: null, sprite: null };
      state.characters.R = { name: null, sprite: null };
    }
  }

  function executeAction(messageId, targetName, actionType, params) {
    try {
      const state = gameStates[messageId];
      if (!state) return;

      let targetElement = null;
      let pos = null;

      for (const p in state.characters) {
        if (state.characters[p].name === targetName) {
          pos = p === 'L' ? 'left' : p === 'C' ? 'center' : 'right';
          targetElement = $(`#char-${pos}-${messageId}`);
          break;
        }
      }

      if (!targetElement || !targetElement.length) {
        return;
      }

      if (actionType === 'shake') {
        const intensity = params[0] || 'light';

        let originalScaleX = 1;
        if (pos === 'right') {
          originalScaleX = -1;
        }

        targetElement.css('--originalScaleX', originalScaleX);

        // 为所有位置的角色使用通用的晃动逻辑
        if (pos === 'center') {
          targetElement.removeClass(`shake-light-${messageId} shake-center-${messageId}`);
          void targetElement[0].offsetWidth; // 强制重排
          targetElement.addClass(`shake-center-${messageId}`);

          setTimeout(() => {
            targetElement.removeClass(`shake-center-${messageId}`);
            targetElement.css('transform', 'translateX(-50%)');
          }, 500);
        } else if (pos === 'left') {
          // 左侧角色特定处理
          targetElement.removeClass(`shake-light-${messageId} shake-center-${messageId}`);
          void targetElement[0].offsetWidth; // 强制重排

          // 保存原始样式以便还原
          const originalTransition = targetElement.css('transition');
          targetElement.css('transition', 'none');

          // 添加自定义动画
          targetElement.css('animation', `shake-light-${messageId} 0.5s ease-in-out`);

          setTimeout(() => {
            targetElement.css('animation', '');
            targetElement.css('transition', originalTransition);
            targetElement.css('transform', 'scaleX(1)');
          }, 500);
        } else if (pos === 'right') {
          // 右侧角色特定处理
          targetElement.removeClass(`shake-light-${messageId} shake-center-${messageId}`);
          void targetElement[0].offsetWidth; // 强制重排

          // 保存原始样式以便还原
          const originalTransition = targetElement.css('transition');
          targetElement.css('transition', 'none');

          // 添加自定义动画
          targetElement.css('animation', `shake-light-${messageId} 0.5s ease-in-out`);

          setTimeout(() => {
            targetElement.css('animation', '');
            targetElement.css('transition', originalTransition);
            targetElement.css('transform', 'scaleX(-1)');
          }, 500);
        }
      } else if (actionType === 'jump_up') {
        targetElement.css('transition', 'transform 0.15s ease-out');

        if (pos === 'center') {
          targetElement.css('transform', 'translateX(-50%) translateY(-20px)');

          setTimeout(() => {
            targetElement.css('transition', 'transform 0.15s ease-in');
            targetElement.css('transform', 'translateX(-50%)');
          }, 150);
        } else {
          targetElement.css('transform', 'translateY(-20px) ' + (pos === 'right' ? 'scaleX(-1)' : 'scaleX(1)'));

          setTimeout(() => {
            targetElement.css('transition', 'transform 0.15s ease-in');
            targetElement.css('transform', pos === 'right' ? 'scaleX(-1)' : 'scaleX(1)');
          }, 150);
        }
      } else if (actionType === 'jump_down') {
        targetElement.css('transition', 'transform 0.15s ease-out');

        if (pos === 'center') {
          targetElement.css('transform', 'translateX(-50%) translateY(10px)');

          setTimeout(() => {
            targetElement.css('transition', 'transform 0.15s ease-in');
            targetElement.css('transform', 'translateX(-50%)');
          }, 150);
        } else {
          targetElement.css('transform', 'translateY(10px) ' + (pos === 'right' ? 'scaleX(-1)' : 'scaleX(1)'));

          setTimeout(() => {
            targetElement.css('transition', 'transform 0.15s ease-in');
            targetElement.css('transform', pos === 'right' ? 'scaleX(-1)' : 'scaleX(1)');
          }, 150);
        }
      }
    } catch (error) {
      log('执行动作时出错:', error);
    }
  }

  function typewriterEffect(messageId, text, onComplete) {
    const textElement = $(`#text-${messageId}`);
    const nextIndicator = $(`#next-${messageId}`);

    nextIndicator.hide();
    textElement.text('');

    if (!text || text.length === 0) {
      nextIndicator.show();
      if (onComplete) onComplete();
      return;
    }

    safeExecute(
      async () => {
        let i = 0;
        const speed = config.typewriterSpeed;

        function type() {
          if (i < text.length) {
            textElement.text(textElement.text() + text.charAt(i));
            i++;
            setTimeout(type, speed);
          } else {
            nextIndicator.show();

            addToHistory(messageId, $(`#name-${messageId}`).text(), text);

            if (onComplete) onComplete();
          }
        }

        type();
      },
      null,
      '文本打字机效果出错',
    ).then(() => {
      // 确保回调被执行
      if (!textElement.text()) {
        textElement.text(text);
        nextIndicator.show();
        if (onComplete) onComplete();
      }
    });
  }

  function addToHistory(messageId, speaker, text) {
    const state = gameStates[messageId];
    if (!state) return;

    if (!state.history) {
      state.history = [];
    }

    state.history.push({
      speaker: speaker || '旁白',
      text: text,
    });

    if (state.history.length > 100) {
      state.history.shift();
    }
  }

  function showHistoryModal(messageId) {
    const state = gameStates[messageId];
    if (!state || !state.history) return;

    const historyList = $(`#history-list-${messageId}`);
    historyList.empty();

    for (let i = 0; i < state.history.length; i++) {
      const item = state.history[i];
      const itemElement = $(`
        <div class="galgame-history-item-${messageId}">
          <div class="galgame-history-speaker-${messageId}">${item.speaker}</div>
          <div class="galgame-history-text-${messageId}">${item.text}</div>
        </div>
      `);
      historyList.append(itemElement);
    }

    $(`#history-modal-${messageId}`).css('display', 'block');

    const historyContent = $(`.galgame-history-content-${messageId}`);
    historyContent.scrollTop(historyContent[0].scrollHeight);
  }

  function hideHistoryModal(messageId) {
    $(`#history-modal-${messageId}`).css('display', 'none');
  }

  function showCG(messageId, cgUrl) {
    const cgElement = $(`#cg-${messageId}`);
    if (!cgElement.length) return;

    try {
      let actualCgUrl = '';

      if (cgUrl && typeof cgUrl === 'string') {
        const cgTagRegex = /\[cg\|([^\]]+)\]/;
        const match = cgUrl.match(cgTagRegex);

        if (match) {
          const alias = match[1].trim();

          const aliasObj = imageAliasManager.getAliases ? imageAliasManager.getAliases() : {};
          if (aliasObj && alias in aliasObj) {
            actualCgUrl = aliasObj[alias];
          }
        } else {
          const aliasObj = imageAliasManager.getAliases ? imageAliasManager.getAliases() : {};
          if (aliasObj && cgUrl in aliasObj) {
            actualCgUrl = aliasObj[cgUrl];
          } else if (cgUrl.startsWith('http://') || cgUrl.startsWith('https://')) {
            actualCgUrl = cgUrl;
          }
        }
      }

      if (!actualCgUrl || !actualCgUrl.startsWith('http')) {
        cgElement.removeClass('active');
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = function () {
        cgElement.find('img').attr('src', actualCgUrl);
        cgElement.addClass('active');
      };

      img.onerror = function () {
        cgElement.removeClass('active');
      };

      img.src = actualCgUrl;
    } catch (error) {
      cgElement.removeClass('active');
    }
  }

  function hideCG(messageId) {
    const cgElement = $(`#cg-${messageId}`);
    if (cgElement.length) {
      cgElement.removeClass('active');
    }
  }

  async function setBackground(messageId, bgUrl, transitionType, duration) {
    const container = $(`.galgame-container-${messageId}`);
    const bgElement = $(`#bg-${messageId}`);

    if (!container.length || !bgElement.length) return;

    try {
      let actualBgUrl = '';
      let imageType = 'bg';

      if (bgUrl && typeof bgUrl === 'string') {
        const tagRegexes = {
          bg: /\[bg\|([^\]]+)\]/,
        };

        let alias = null;

        for (const type in tagRegexes) {
          const match = bgUrl.match(tagRegexes[type]);
          if (match) {
            alias = match[1].trim();
            imageType = type;
            break;
          }
        }

        if (alias) {
          const aliasObj = imageAliasManager.getAliases ? imageAliasManager.getAliases() : {};
          if (aliasObj && alias in aliasObj) {
            actualBgUrl = aliasObj[alias];
          }
        } else {
          const aliasObj = imageAliasManager.getAliases ? imageAliasManager.getAliases() : {};
          if (aliasObj && bgUrl in aliasObj) {
            actualBgUrl = aliasObj[bgUrl];
          } else if (bgUrl.startsWith('http://') || bgUrl.startsWith('https://')) {
            actualBgUrl = bgUrl;
          }
        }
      }

      if (!actualBgUrl || !actualBgUrl.startsWith('http')) {
        bgElement.css({
          'background-image': 'none',
          'background-color': '#000',
        });
        return;
      }

      if (transitionType === 'fade') {
        const overlay = $(`#overlay-${messageId}`);
        const transitionDuration = duration || 0.5;

        overlay.css({
          opacity: '0',
          background: '#000',
          transition: `opacity ${transitionDuration}s`,
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        overlay.css('opacity', '1');

        await new Promise(resolve => setTimeout(resolve, transitionDuration * 1000));

        bgElement.css({
          'background-image': `url(${actualBgUrl})`,
          'background-size': 'cover',
          'background-position': 'center',
        });

        await new Promise(resolve => setTimeout(resolve, 50));

        overlay.css({
          opacity: '0',
          transition: `opacity ${transitionDuration}s`,
        });

        await new Promise(resolve => setTimeout(resolve, transitionDuration * 1000));
      } else {
        bgElement.css({
          'background-image': `url(${actualBgUrl})`,
          'background-size': 'cover',
          'background-position': 'center',
        });
      }
    } catch (error) {
      bgElement.css({
        'background-image': 'none',
        'background-color': '#000',
      });
    }
  }

  // 扫描并渲染所有消息
  async function scanAndRenderAllMessages() {
    try {
      const messages = await getChatMessages('0-{{lastMessageId}}');

      const lastMessageId = messages.length > 0 ? Number(messages[0].message_id) : 0;

      for (const message of messages) {
        if (renderedMessages.has(message.message_id)) continue;

        if (config.renderDepth > 0) {
          const messageId = Number(message.message_id);
          if (lastMessageId - messageId >= config.renderDepth) {
            continue;
          }
        }

        if (message.message && (message.message.includes('<gametext>') || message.message.includes('<gametext>'))) {
          await renderGameForMessage(message.message_id);
        }
      }

      if (config.renderDepth > 0) {
        cleanupOldRenders(lastMessageId);
      }
    } catch (error) {}
  }

  // 流式传输处理函数
  async function streamParser(fulltext) {
    try {
      if (streamStart === false) {
        streamStart = true;
        streamParsing = false;

        let last_mesid = Number.parseInt(await triggerSlashWithResult('/pass {{lastMessageId}}'));

        let mes_text = retrieveDisplayedMessage(last_mesid);
        if (!mes_text || mes_text.length === 0) {
          streamStart = false;
          return;
        }

        streamInfo = {
          mesid: last_mesid,
          textLength: fulltext.length,
          text: fulltext,
          textCount: 0,
          characters: {
            L: { name: null, sprite: null },
            C: { name: null, sprite: null },
            R: { name: null, sprite: null },
          },
          currentDialogIndex: 0,
          dialogues: [],
          waitingForClick: true,
          lastProcessedLine: '',
          history: [],
          isComplete: false,
          originalMessageEl: mes_text,
        };

        if (mes_text && mes_text.length > 0) {
          mes_text.attr('data-original-content', mes_text.html() || '');
          mes_text.text(fulltext);
        }

        tempMesText = $('<div class="mes_text"></div>');
        mes_text.after(tempMesText);
        mes_text.css('display', 'none');

        try {
          const messageRow = mes_text.closest('.mes_block');
          if (messageRow && messageRow.length > 0) {
            const editBtn = messageRow.find('.mes_edit');
            if (editBtn && editBtn.length > 0) {
              $(document)
                .off('click.galgame_edit')
                .on('click.galgame_edit', '.mes_edit', function (e) {
                  const clickedMesBlock = $(this).closest('.mes_block');
                  const mesId =
                    clickedMesBlock.attr('mesid') ||
                    clickedMesBlock.attr('data-mesid') ||
                    clickedMesBlock.attr('data-id');

                  if (streamInfo && streamInfo.mesid === Number(mesId)) {
                    // 防止连续点击
                    if (window.GALGAME_EDITING_MESSAGE) {
                      return;
                    }

                    window.GALGAME_EDITING_MESSAGE = true;

                    // 强制恢复原始消息状态
                    forceResetStreamMessage(mesId);

                    // 使用简单的刷新方案 - 更可靠且避免复杂错误处理
                    try {
                      // 记住当前消息ID以便重新加载后定位
                      sessionStorage.setItem('galgame_edit_mesid', mesId);

                      // 提示用户刷新页面
                      if (confirm('为了编辑GALGAME内容，需要刷新页面。点击确定刷新页面，然后再次点击编辑按钮。')) {
                        // 刷新页面
                        location.reload();
                      } else {
                        // 用户取消了操作，清除标志
                        window.GALGAME_EDITING_MESSAGE = false;
                      }
                    } catch (e) {
                      log('准备刷新页面出错:', e);
                      window.GALGAME_EDITING_MESSAGE = false;
                    }
                  }
                });
            }
          }
        } catch (editError) {
          log('设置编辑按钮处理失败:', editError);
        }

        // 创建基本游戏HTML结构
        const gameHTML = $('<div class="roleplay_galgame"></div>');

        // 添加样式和容器 - 使用原GALGAME插件的样式和类名
        gameHTML.append(`
          <style>
            @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css');

            /* 基本容器样式 */
            .galgame-container-${last_mesid} {
              width: 360px;
              position: relative;
              background-color: #000;
              background-size: cover;
              background-position: center;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 5px 15px rgba(0,0,0,0.2);
              margin: 15px auto;
              display: flex;
              flex-direction: column;
              user-select: none;
              -webkit-user-select: none;
              -moz-user-select: none;
              -ms-user-select: none;
              pointer-events: auto;
              aspect-ratio: 16/9;
              height: auto;
            }

            @media (min-width: 768px) {
              .galgame-container-${last_mesid} {
                width: 100%;
                max-width: 90%;
              }
            }

            /* 背景层 */
            .galgame-bg-${last_mesid} {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background-size: cover;
              background-position: center;
              z-index: 0;
              pointer-events: none;
            }

            /* 角色区域 */
            .galgame-char-area-${last_mesid} {
              flex: 1;
              display: flex;
              justify-content: center;
              align-items: flex-end;
              position: relative;
              min-height: 70%;
              z-index: 1;
            }

            /* 移动端角色区域调整 */
            @media (max-width: 767px) {
              .galgame-char-area-${last_mesid} {
                min-height: calc(100% - ${config.mobileDiaogueHeight}% - 20px);
              }
            }

            /* 角色立绘 */
            .galgame-char-${last_mesid} {
              max-width: 100%;
              max-height: 120%;
              position: absolute;
              bottom: ${config.characterBottomOffset}%;
              opacity: 0;
              transition: opacity 0.3s ease-in-out, filter 0.3s ease-in-out;
              pointer-events: none;
            }

            .galgame-char-${last_mesid}.left {
              left: 0;
              transform: scaleX(1);
            }

            .galgame-char-${last_mesid}.center {
              left: 50%;
              transform: translateX(-50%);
            }

            .galgame-char-${last_mesid}.right {
              right: 0;
              transform: scaleX(-1);
            }

            .galgame-char-${last_mesid}.active {
              opacity: 1;
            }

            .galgame-char-${last_mesid}.active.dimmed {
              filter: brightness(0.5) grayscale(0.3);
            }

            /* CG图片 */
            .galgame-cg-${last_mesid} {
              position: absolute;
              top: 0;
              left: 5%;
              width: 90%;
              height: 70%;
              z-index: 3;
              opacity: 0;
              pointer-events: none;
              transition: opacity 0.3s ease-in-out;
              border: 6px solid white;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.2);
              background-color: white;
              display: flex;
              justify-content: center;
              align-items: center;
              overflow: hidden;
            }

            .galgame-cg-${last_mesid} img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }

            .galgame-cg-${last_mesid}.active {
              opacity: 1;
            }

            /* 对话框 */
            .galgame-dialogue-${last_mesid} {
              background-color: rgba(255, 255, 255, 0.8);
              backdrop-filter: blur(3px);
              border-radius: 10px;
              padding: 25px 18px 15px 18px;
              margin: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.15);
              position: relative;
              min-height: 80px;
              z-index: 4;
              height: ${config.dialogueHeight}%;
              user-select: none;
            }

            /* 移动端对话框高度调整 */
            @media (max-width: 767px) {
              .galgame-dialogue-${last_mesid} {
                height: ${config.mobileDiaogueHeight}%;
                min-height: 120px;
              }
            }

            /* 角色名称 */
            .galgame-name-${last_mesid} {
              position: absolute;
              top: -20px;
              left: 15px;
              background-color: #ffacb6;
              color: white;
              padding: 4px 14px;
              border-radius: 15px;
              font-weight: bold;
              box-shadow: 0 2px 5px rgba(0,0,0,0.1);
              font-size: 16px;
              z-index: 5;
              user-select: none;
            }

            /* 对话文本 */
            .galgame-text-${last_mesid} {
              margin-top: 0;
              color: #333;
              font-size: 17px;
              line-height: 1.5;
              user-select: none;
            }

            /* 下一步指示器 */
            .galgame-next-${last_mesid} {
              position: absolute;
              bottom: 5px;
              right: 15px;
              font-size: 20px;
              color: #ff69b4;
              animation: pointer-pulse-${last_mesid} 1.5s infinite;
              user-select: none;
            }

            @keyframes pointer-pulse-${last_mesid} {
              0% { transform: scale(1); opacity: 0.7; }
              50% { transform: scale(1.1); opacity: 1; }
              100% { transform: scale(1); opacity: 0.7; }
            }

            .galgame-text-indicator-${last_mesid} {
              opacity: 0.6;
              position: absolute;
              right: 5px;
              bottom: 30px;
            }

            /* 设置所有Font Awesome图标为粉红色 */
            .galgame-container-${last_mesid} .fas {
              color: #ff69b4;
            }

            .galgame-choices-${last_mesid} {
              display: flex;
              flex-direction: column;
              gap: 8px;
              padding: 10px;
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 80%;
              max-width: 300px;
              z-index: 6;
              user-select: none;
            }

            .galgame-choice-${last_mesid} {
              background-color: rgba(255, 255, 255, 0.8);
              border: 1px solid #ccc;
              border-radius: 8px;
              padding: 10px 15px;
              cursor: pointer;
              transition: all 0.2s;
              color: #333;
              font-weight: bold;
              text-align: center;
              box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
              user-select: none;
            }

            .galgame-choice-${last_mesid}:hover {
              background-color: rgba(240, 240, 240, 0.9);
              transform: translateY(-2px);
            }

            .galgame-overlay-${last_mesid} {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: black;
              opacity: 0;
              transition: opacity 0.5s;
              pointer-events: none;
              z-index: 7;
            }

            .galgame-history-btn-${last_mesid} {
              position: absolute;
              top: 10px;
              right: 10px;
              background-color: rgba(255, 255, 255, 0.8);
              color: #333;
              border: 1px solid #ddd;
              border-radius: 8px;
              padding: 6px 12px;
              font-size: 14px;
              font-weight: bold;
              cursor: pointer;
              z-index: 10;
              box-shadow: 0 2px 5px rgba(0,0,0,0.1);
              transition: background-color 0.2s;
            }

            .galgame-history-btn-${last_mesid}:hover {
              background-color: rgba(240, 240, 240, 0.9);
            }

            .galgame-history-modal-${last_mesid} {
              display: none;
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background-color: rgba(0, 0, 0, 0.7);
              z-index: 20;
            }

            .galgame-history-content-${last_mesid} {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 90%;
              height: 80%;
              background-color: rgba(255, 255, 255, 0.8);
              border-radius: 12px;
              padding: 20px;
              overflow-y: auto;
              max-height: 100%;
              box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            }

            .galgame-history-title-${last_mesid} {
              text-align: center;
              margin-bottom: 15px;
              padding-bottom: 10px;
              border-bottom: 1px solid #ddd;
              color: #333;
              font-weight: bold;
            }

            .galgame-history-list-${last_mesid} {
              display: flex;
              flex-direction: column;
              gap: 10px;
            }

            .galgame-history-item-${last_mesid} {
              padding: 10px;
              border-radius: 8px;
              background-color: rgba(240, 240, 240, 0.8);
            }

            .galgame-history-speaker-${last_mesid} {
              font-weight: bold;
              color: #ff7eb3;
              margin-bottom: 5px;
            }

            .galgame-history-text-${last_mesid} {
              color: #000000;
            }

            .galgame-history-close-${last_mesid} {
              position: absolute;
              top: 10px;
              right: 10px;
              background: none;
              border: none;
              font-size: 20px;
              cursor: pointer;
              color: #333;
            }

            /* 晃动动画 */
            .galgame-history-shake-${last_mesid} {
              animation: shake-light-${last_mesid} 0.5s ease-in-out;
            }

            @keyframes shake-light-${last_mesid} {
              0%, 100% { transform: translateX(0) scaleX(var(--originalScaleX, 1)); }
              10%, 30%, 50%, 70%, 90% { transform: translateX(-5px) scaleX(var(--originalScaleX, 1)); }
              20%, 40%, 60%, 80% { transform: translateX(5px) scaleX(var(--originalScaleX, 1)); }
            }

            .shake-center-${last_mesid} {
              animation: shake-center-${last_mesid} 0.5s ease-in-out;
            }

            @keyframes shake-center-${last_mesid} {
              0%, 100% { transform: translateX(-50%) scaleX(var(--originalScaleX, 1)); }
              10%, 30%, 50%, 70%, 90% { transform: translateX(calc(-50% - 5px)) scaleX(var(--originalScaleX, 1)); }
              20%, 40%, 60%, 80% { transform: translateX(calc(-50% + 5px)) scaleX(var(--originalScaleX, 1)); }
            }

            /* 统一图标颜色 */
            .galgame-container-${last_mesid} .fas {
              color: #ff69b4;
            }

            /* 保持履历按钮文字颜色不变 */
            .galgame-history-btn-${last_mesid} {
              color: #333;
            }
          </style>

          <div class="galgame-container-${last_mesid}">
            <div class="galgame-bg-${last_mesid}" id="bg-stream-${last_mesid}"></div>

            <div class="galgame-char-area-${last_mesid}">
              <img class="galgame-char-${last_mesid} left" id="char-left-stream-${last_mesid}" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" alt="">
              <img class="galgame-char-${last_mesid} center" id="char-center-stream-${last_mesid}" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" alt="">
              <img class="galgame-char-${last_mesid} right" id="char-right-stream-${last_mesid}" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" alt="">
            </div>

            <div class="galgame-cg-${last_mesid}" id="cg-stream-${last_mesid}"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" alt=""></div>

            <button class="galgame-history-btn-${last_mesid}" id="history-btn-stream-${last_mesid}"><i class="fas fa-history"></i> 履历</button>

            <div class="galgame-history-modal-${last_mesid}" id="history-modal-stream-${last_mesid}">
              <div class="galgame-history-content-${last_mesid}">
                <button class="galgame-history-close-${last_mesid}" id="history-close-stream-${last_mesid}"><i class="fas fa-times"></i></button>
                <div class="galgame-history-title-${last_mesid}">对话履历</div>
                <div class="galgame-history-list-${last_mesid}" id="history-list-stream-${last_mesid}"></div>
              </div>
            </div>

            <div class="galgame-dialogue-${last_mesid}">
              <div class="galgame-name-${last_mesid}" id="name-stream-${last_mesid}"></div>
              <div class="galgame-text-${last_mesid}" id="text-stream-${last_mesid}">正在加载游戏内容...</div>
              <div class="galgame-next-${last_mesid}" id="next-stream-${last_mesid}"><i class="fas fa-caret-down"></i></div>
              <div class="galgame-text-indicator-${last_mesid}" id="indicator-stream-${last_mesid}">0/0</div>
            </div>

            <div class="galgame-choices-${last_mesid}" id="choices-stream-${last_mesid}"></div>
            <div class="galgame-overlay-${last_mesid}" id="overlay-stream-${last_mesid}"></div>
          </div>
        `);

        // 插入到DOM
        tempMesText.append(gameHTML);

        // 添加点击事件处理
        $(`.galgame-container-${last_mesid}`, tempMesText).on('click', function (e) {
          e.stopPropagation();

          if (streamInfo.processing) return;
          if (streamInfo.showingChoices) return;

          log('流式界面接收到点击事件，推进对话');
          processStreamNextDialogue();
        });

        // 设置履历按钮点击事件
        $(`#history-btn-stream-${last_mesid}`, tempMesText).on('click', function (e) {
          e.stopPropagation();
          showStreamHistoryModal(last_mesid);
        });

        // 设置履历关闭按钮点击事件
        $(`#history-close-stream-${last_mesid}`, tempMesText).on('click', function (e) {
          e.stopPropagation();
          hideStreamHistoryModal(last_mesid);
        });

        // 存储元素引用
        streamInfo.nameElement = $(`#name-stream-${last_mesid}`, tempMesText);
        streamInfo.textElement = $(`#text-stream-${last_mesid}`, tempMesText);
        streamInfo.portraitsElement = $(`.galgame-char-area-${last_mesid}`, tempMesText);
        streamInfo.sceneElement = $(`#bg-stream-${last_mesid}`, tempMesText);
        streamInfo.nextElement = $(`#next-stream-${last_mesid}`, tempMesText);
        streamInfo.indicatorElement = $(`#indicator-stream-${last_mesid}`, tempMesText);
        streamInfo.leftCharElement = $(`#char-left-stream-${last_mesid}`, tempMesText);
        streamInfo.centerCharElement = $(`#char-center-stream-${last_mesid}`, tempMesText);
        streamInfo.rightCharElement = $(`#char-right-stream-${last_mesid}`, tempMesText);
        streamInfo.cgElement = $(`#cg-stream-${last_mesid}`, tempMesText);
        streamInfo.choicesElement = $(`#choices-stream-${last_mesid}`, tempMesText);
        streamInfo.overlayElement = $(`#overlay-stream-${last_mesid}`, tempMesText);
        streamInfo.historyListElement = $(`#history-list-stream-${last_mesid}`, tempMesText);

        // 初始状态
        streamInfo.nameElement.hide();
        streamInfo.nextElement.hide();

        // 解析初始文本
        streamParsing = false;
        processStreamContent(fulltext);
      } else if (streamParsing === false && streamInfo !== undefined) {
        streamParsing = true;

        // 获取新增文本
        const incremental_text = fulltext.slice(streamInfo.textLength);

        // 如果没有新增文本，不处理
        if (incremental_text.length === 0) {
          log('无新增文本，跳过处理');
          streamParsing = false;
          return;
        }

        streamInfo.text += incremental_text;
        streamInfo.textLength = streamInfo.text.length;

        log('接收流式文本，新增长度:', incremental_text.length, '总长度:', streamInfo.textLength);

        // 保存完整文本到原始消息元素，方便编辑查看
        if (streamInfo.originalMessageEl && streamInfo.originalMessageEl.length > 0) {
          streamInfo.originalMessageEl.text(streamInfo.text);
        }

        // 检查是否包含结束标记
        if (incremental_text.includes('</gametext>')) {
          streamInfo.isComplete = true;

          // 流式传输完成，确保更新原始消息元素，但在延迟后执行
          // 延长等待时间，避免与其他事件冲突
          setTimeout(() => {
            // 检查是否处于编辑状态，如果是则不处理完成逻辑
            if (!window.GALGAME_EDITING_MESSAGE) {
              finishStreamGeneration();
            } else {
              log('检测到编辑状态，延迟处理流式完成');
              // 再等待一段时间
              setTimeout(() => {
                finishStreamGeneration();
              }, 1000);
            }
          }, 1000);
        }

        // 直接处理文本内容
        processStreamContent(streamInfo.text);

        streamParsing = false;
      }
    } catch (error) {
      log('流式解析出错:', error, '错误堆栈:', error.stack);
      streamParsing = false;
    }
  }

  // 处理流式内容
  function processStreamContent(content) {
    try {
      if (!streamInfo || !tempMesText) {
        return;
      }

      try {
        if (streamInfo.textElement && streamInfo.textElement.text() === '正在加载游戏内容...') {
          streamInfo.textElement.text('');
        }
      } catch (e) {}

      let scriptText = '';
      const gameTextMatch = content.match(gameTextRegex) || content.match(directGameTextRegex);

      if (gameTextMatch) {
        scriptText = gameTextMatch[1].trim();
      } else {
        scriptText = content;
      }

      const lastOpenBracket = scriptText.lastIndexOf('[');
      const lastCloseBracket = scriptText.lastIndexOf(']');

      if (lastOpenBracket > lastCloseBracket) {
        // 存在不完整命令，移除最后一个不完整的命令部分
        scriptText = scriptText.substring(0, lastOpenBracket);
      }

      // 预处理：确保所有命令都是完整的
      scriptText = scriptText.replace(/\[show\|[^\]]*$/g, ''); // 移除不完整的show命令
      scriptText = scriptText.replace(/\[bg\|[^\]]*$/g, ''); // 移除不完整的bg命令
      scriptText = scriptText.replace(/\[cg\|[^\]]*$/g, ''); // 移除不完整的cg命令
      scriptText = scriptText.replace(/\[action\|[^\]]*$/g, ''); // 移除不完整的action命令

      // 按行处理内容
      const lines = scriptText.split('\n');

      // 重置流式对话数组
      const prevDialogues = streamInfo.dialogues || [];
      const prevCount = prevDialogues.length;
      streamInfo.dialogues = [];

      // 提取所有命令和对话
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // 跳过可能是不完整命令的行
        if (trimmedLine.startsWith('[') && !trimmedLine.endsWith(']')) {
          continue;
        }

        // 解析对话行
        const dialogueMatch = trimmedLine.match(dialogueRegex);
        if (dialogueMatch) {
          let character = dialogueMatch[1].trim() || '旁白';
          const position = dialogueMatch[2].trim().toUpperCase() || null;
          const sprite = dialogueMatch[3].trim();
          let text = dialogueMatch[4].trim();

          // 检查character是否被错误解析为命令
          if (character.startsWith('[') && !character.endsWith(']')) {
            continue;
          }

          // 检查text是否包含未闭合的命令片段
          if ((text.includes('[') && !text.includes(']')) || (!text.includes('[') && text.includes(']'))) {
            text = text.replace(/\[[^\]]*$/g, ''); // 移除不完整的左括号开始的片段
            text = text.replace(/^[^\[]*\]/g, ''); // 移除不完整的右括号结束的片段
          }

          // 处理内联动作指令
          let inlineAction = null;
          const actionRegex = /\[action\|([^|]+)\|([^|]+)(?:\|([^\]]+))?\]$/;
          const actionMatch = text.match(actionRegex);

          if (actionMatch) {
            // 如果有内联动作，移除文本中的动作指令部分
            text = text.replace(actionRegex, '').trim();

            inlineAction = {
              target: actionMatch[1],
              action: actionMatch[2],
              params: actionMatch[3] ? actionMatch[3].split('|') : [],
            };
          }

          // 最后的安全检查 - 确保所有值都有意义
          if (character && character.length < 20 && !character.includes('[') && !character.includes(']')) {
            const dialogData = {
              type: 'dialogue',
              character: character,
              position: position,
              sprite: sprite,
              text: text,
              inlineAction: inlineAction,
              processed: false,
            };

            streamInfo.dialogues.push(dialogData);
          }
          continue;
        }

        // 解析命令行
        const commandMatch = trimmedLine.match(commandRegex);
        if (commandMatch) {
          const fullCommand = commandMatch[1];
          const parts = fullCommand.split('|');
          const command = parts[0].trim();
          const args = parts.slice(1).map(arg => arg.trim());

          streamInfo.dialogues.push({
            type: 'command',
            command: command,
            args: args,
            processed: false,
          });
        }
      }

      // 更新对话数量
      streamInfo.textCount = streamInfo.dialogues.length;

      // 检查是否有新对话添加，如果当前索引超过了对话数量，重置索引
      if (streamInfo.currentDialogIndex >= streamInfo.dialogues.length) {
        streamInfo.currentDialogIndex = 0;
      }

      // 更新对话计数指示器
      if (streamInfo.textCount > 0) {
        streamInfo.indicatorElement.text(`${streamInfo.currentDialogIndex + 1}/${streamInfo.textCount}`);
      }

      // 初始化第一条对话/命令
      if (streamInfo.dialogues.length > 0 && !streamInfo.initialized) {
        streamInfo.initialized = true;
        processStreamNextDialogue();
      }
    } catch (error) {
      log('处理流式内容出错:', error);

      // 出错后尝试显示内容
      if (streamInfo && streamInfo.textElement) {
        try {
          streamInfo.textElement.text('正在生成内容中，请稍候...');
        } catch (e) {}
      }
    }
  }

  // 处理下一条流式对话/命令
  function processStreamNextDialogue() {
    try {
      if (!streamInfo) return;

      // 如果正在流式完成处理或编辑中，跳过
      if (window.GALGAME_FINISHING_STREAM || window.GALGAME_EDITING_MESSAGE) {
        return;
      }

      // 防止重复处理
      if (streamInfo.processing) {
        return;
      }

      streamInfo.processing = true;

      // 检查是否有下一条对话/命令
      if (streamInfo.currentDialogIndex >= streamInfo.dialogues.length) {
        // 检查是否所有对话都处理完毕且消息已完成
        if (streamInfo.isComplete && !document.querySelector(`.galgame-dialogue-${streamInfo.mesid} .replay-button`)) {
          // 创建重新播放按钮
          const replayButton = $(
            `<button class="replay-button" style="position:absolute; bottom:5px; left:15px; padding:5px 15px; background-color:#ff69b4; color:white; border:none; border-radius:5px; cursor:pointer;"><i class="fas fa-redo-alt"></i> 重新播放</button>`,
          );
          replayButton.on('click', function (e) {
            e.stopPropagation();

            // 如果流式完成处理或编辑中，不处理点击
            if (window.GALGAME_FINISHING_STREAM || window.GALGAME_EDITING_MESSAGE) {
              return;
            }

            restartStreamDialogue();
          });

          $(`.galgame-dialogue-${streamInfo.mesid}`, tempMesText).append(replayButton);
        }

        streamInfo.processing = false;
        return;
      }

      const currentItem = streamInfo.dialogues[streamInfo.currentDialogIndex];

      // 确保界面可访问
      if (!tempMesText || !tempMesText.is(':visible')) {
        streamInfo.processing = false;
        return;
      }

      if (currentItem.type === 'dialogue') {
        // 处理对话
        const character = currentItem.character;
        const position = currentItem.position;
        const sprite = currentItem.sprite;
        const text = currentItem.text;
        const inlineAction = currentItem.inlineAction;

        // 安全检查 - 确保character不是命令片段
        if (character && !character.includes('[') && !character.includes(']')) {
          // 设置角色名称
          if (character === '旁白') {
            streamInfo.nameElement.hide();
            // 对于旁白对话，不应该亮起任何角色，但也不要额外暗化
          } else {
            streamInfo.nameElement.text(character).show();

            // 设置角色立绘
            if (position && sprite) {
              processStreamCharacter(character, position, sprite);
            } else {
              // 如果只有角色名没有立绘和位置，尝试找到该角色并点亮
              for (const p in streamInfo.characters) {
                if (streamInfo.characters[p].name === character) {
                  const element = p === 'L'
                    ? streamInfo.leftCharElement
                    : p === 'C'
                      ? streamInfo.centerCharElement
                      : streamInfo.rightCharElement;
                  element.removeClass('dimmed').addClass('active');

                  // 使其他角色变暗
                  for (const otherP in streamInfo.characters) {
                    if (otherP !== p && streamInfo.characters[otherP].name) {
                      const otherElement = otherP === 'L'
                        ? streamInfo.leftCharElement
                        : otherP === 'C'
                          ? streamInfo.centerCharElement
                          : streamInfo.rightCharElement;
                      otherElement.addClass('dimmed');
                    }
                  }
                  break;
                }
              }
            }
          }

          // 显示对话文本（使用打字机效果）
          streamInfo.nextElement.hide();

          // 格式化文本，确保特殊标记被正确处理
          const cleanText = text.replace(/\[[^\]]*\]/g, ''); // 移除所有可能遗留的命令
          const formattedText = renderText(cleanText);

          streamTypewriterEffect(formattedText, () => {
            // 如果有内联动作，在文本完成后执行
            if (inlineAction) {
              executeStreamAction(inlineAction.target, inlineAction.action, inlineAction.params);
            }

            // 添加到履历
            addStreamToHistory(streamInfo.mesid, character, cleanText);

            streamInfo.nextElement.show();
            streamInfo.currentDialogIndex++;
            streamInfo.indicatorElement.text(
              `${Math.min(streamInfo.currentDialogIndex, streamInfo.dialogues.length)}/${streamInfo.textCount}`,
            );
            streamInfo.processing = false;
          });
        } else {
          // 跳过无效角色名的对话
          streamInfo.currentDialogIndex++;
          streamInfo.processing = false;
          processStreamNextDialogue();
        }
      } else if (currentItem.type === 'command') {
        // 处理命令
        const command = currentItem.command;
        const args = currentItem.args;

        processStreamCommand(command, args).then(() => {
          streamInfo.currentDialogIndex++;
          streamInfo.indicatorElement.text(
            `${Math.min(streamInfo.currentDialogIndex, streamInfo.dialogues.length)}/${streamInfo.textCount}`,
          );
          streamInfo.processing = false;

          // 如果是自动执行的命令（背景、CG等），自动继续下一条
          if (command !== 'choice' && command !== 'wait') {
            setTimeout(() => {
              processStreamNextDialogue();
            }, 50);
          }
        });
      } else {
        streamInfo.currentDialogIndex++;
        streamInfo.processing = false;
        processStreamNextDialogue();
      }
    } catch (error) {
      log('处理流式对话出错:', error);
      if (streamInfo) {
        streamInfo.processing = false;
      }
    }
  }

  // 执行流式角色动作
  function executeStreamAction(targetName, actionType, params = []) {
    try {
      if (!streamInfo) return;

      log('执行流式角色动作:', targetName, actionType, params);

      let targetElement = null;
      let pos = null;

      // 查找目标角色
      for (const p in streamInfo.characters) {
        if (streamInfo.characters[p].name === targetName) {
          pos = p === 'L' ? 'left' : p === 'C' ? 'center' : 'right';
          targetElement =
            pos === 'left'
              ? streamInfo.leftCharElement
              : pos === 'center'
                ? streamInfo.centerCharElement
                : streamInfo.rightCharElement;
          break;
        }
      }

      if (!targetElement || !targetElement.length) {
        log('找不到动作目标:', targetName);
        return;
      }

      if (actionType === 'shake') {
        const intensity = params[0] || 'light';

        let originalScaleX = 1;
        if (pos === 'right') {
          originalScaleX = -1;
        }

        targetElement.css('--originalScaleX', originalScaleX);

        // 为所有位置的角色使用通用的晃动逻辑
        if (pos === 'center') {
          targetElement.removeClass(`shake-light-${streamInfo.mesid} shake-center-${streamInfo.mesid}`);
          void targetElement[0].offsetWidth; // 强制重排
          targetElement.addClass(`shake-center-${streamInfo.mesid}`);

          setTimeout(() => {
            targetElement.removeClass(`shake-center-${streamInfo.mesid}`);
            targetElement.css('transform', 'translateX(-50%)');
          }, 500);
        } else if (pos === 'left') {
          // 左侧角色特定处理
          targetElement.removeClass(`shake-light-${streamInfo.mesid} shake-center-${streamInfo.mesid}`);
          void targetElement[0].offsetWidth; // 强制重排

          // 保存原始样式以便还原
          const originalTransition = targetElement.css('transition');
          targetElement.css('transition', 'none');

          // 添加自定义动画
          targetElement.css('animation', `shake-light-${streamInfo.mesid} 0.5s ease-in-out`);

          setTimeout(() => {
            targetElement.css('animation', '');
            targetElement.css('transition', originalTransition);
            targetElement.css('transform', 'scaleX(1)');
          }, 500);
        } else if (pos === 'right') {
          // 右侧角色特定处理
          targetElement.removeClass(`shake-light-${streamInfo.mesid} shake-center-${streamInfo.mesid}`);
          void targetElement[0].offsetWidth; // 强制重排

          // 保存原始样式以便还原
          const originalTransition = targetElement.css('transition');
          targetElement.css('transition', 'none');

          // 添加自定义动画
          targetElement.css('animation', `shake-light-${streamInfo.mesid} 0.5s ease-in-out`);

          setTimeout(() => {
            targetElement.css('animation', '');
            targetElement.css('transition', originalTransition);
            targetElement.css('transform', 'scaleX(-1)');
          }, 500);
        }
      } else if (actionType === 'jump_up') {
        targetElement.css('transition', 'transform 0.15s ease-out');

        if (pos === 'center') {
          targetElement.css('transform', 'translateX(-50%) translateY(-20px)');

          setTimeout(() => {
            targetElement.css('transition', 'transform 0.15s ease-in');
            targetElement.css('transform', 'translateX(-50%)');
          }, 150);
        } else {
          targetElement.css('transform', 'translateY(-20px) ' + (pos === 'right' ? 'scaleX(-1)' : 'scaleX(1)'));

          setTimeout(() => {
            targetElement.css('transition', 'transform 0.15s ease-in');
            targetElement.css('transform', pos === 'right' ? 'scaleX(-1)' : 'scaleX(1)');
          }, 150);
        }
      } else if (actionType === 'jump_down') {
        targetElement.css('transition', 'transform 0.15s ease-out');

        if (pos === 'center') {
          targetElement.css('transform', 'translateX(-50%) translateY(10px)');

          setTimeout(() => {
            targetElement.css('transition', 'transform 0.15s ease-in');
            targetElement.css('transform', 'translateX(-50%)');
          }, 150);
        } else {
          targetElement.css('transform', 'translateY(10px) ' + (pos === 'right' ? 'scaleX(-1)' : 'scaleX(1)'));

          setTimeout(() => {
            targetElement.css('transition', 'transform 0.15s ease-in');
            targetElement.css('transform', pos === 'right' ? 'scaleX(-1)' : 'scaleX(1)');
          }, 150);
        }
      }
    } catch (error) {
      log('执行流式角色动作出错:', error);
    }
  }

  // 流式打字机效果
  function streamTypewriterEffect(text, onComplete) {
    if (!streamInfo || !streamInfo.textElement) {
      if (onComplete) onComplete();
      return;
    }

    streamInfo.textElement.empty();

    if (!text || text.length === 0) {
      if (onComplete) onComplete();
      return;
    }

    safeExecute(
      async () => {
        // 检查文本是否包含HTML标签（如果renderText生成了HTML）
        const hasHtml = /<[a-z][\s\S]*>/i.test(text);
        const speed = config.typewriterSpeed;

        if (hasHtml) {
          // 使用html方法设置带标签的文本
          let i = 0;
          let tempText = '';

          return new Promise(resolve => {
            function typeHtml() {
              if (i < text.length) {
                tempText += text.charAt(i);
                streamInfo.textElement.html(tempText);
                i++;
                setTimeout(typeHtml, speed);
              } else {
                resolve();
              }
            }

            typeHtml();
          });
        } else {
          // 使用普通文本方法
          let i = 0;

          return new Promise(resolve => {
            function type() {
              if (i < text.length) {
                streamInfo.textElement.text(streamInfo.textElement.text() + text.charAt(i));
                i++;
                setTimeout(type, speed);
              } else {
                resolve();
              }
            }

            type();
          });
        }
      },
      null,
      '流式打字机效果出错',
    ).then(() => {
      // 确保文本显示
      if (!streamInfo || !streamInfo.textElement.text()) {
        streamInfo.textElement.html(text);
      }
      if (onComplete) onComplete();
    });
  }

  // 处理流式命令
  async function processStreamCommand(command, args) {
    try {
      if (!streamInfo) return;

      switch (command) {
        case 'bg':
          await processStreamBackground(args[0], args[1], args[2]);
          break;

        case 'show':
          processStreamCharacter(args[0], args[1].toUpperCase(), args[2]);
          break;

        case 'hide':
          hideStreamCharacter(args[0]);
          break;

        case 'hide_all':
          hideStreamCharacter('L');
          hideStreamCharacter('C');
          hideStreamCharacter('R');
          break;

        case 'cg':
          showStreamCG(args[0]);
          break;

        case 'hide_cg':
          hideStreamCG();
          break;

        case 'action':
          executeStreamAction(args[0], args[1], args.slice(2));
          break;

        case 'wait':
          const waitTime = parseFloat(args[0]) * 1000 || 500;
          streamInfo.nextElement.hide();
          await new Promise(resolve => setTimeout(resolve, waitTime));
          streamInfo.nextElement.show();
          break;

        case 'choice':
          await showStreamChoices(args);
          break;

        case 'effect':
          const effectType = args[0];
          const effectParams = args.slice(1);

          await executeStreamEffect(effectType, effectParams);
          break;
      }
    } catch (error) {
      log(`处理流式命令出错: ${command}`, error);
    }
  }

  // 执行流式特效
  async function executeStreamEffect(effectType, effectParams) {
    try {
      if (!streamInfo || !streamInfo.overlayElement) return;

      if (effectType === 'screen_flash') {
        streamInfo.overlayElement.css({
          opacity: '0.8',
          background: 'white',
          transition: 'opacity 0.1s',
        });

        await new Promise(resolve => setTimeout(resolve, 100));

        streamInfo.overlayElement.css({
          opacity: '0',
          transition: 'opacity 0.1s',
        });

        await new Promise(resolve => setTimeout(resolve, 100));
      } else if (effectType === 'fade_to_black') {
        const duration = effectParams[0] ? parseFloat(effectParams[0]) : 0.5;
        streamInfo.overlayElement.css({
          opacity: '0',
          background: 'black',
          transition: `opacity ${duration}s`,
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        streamInfo.overlayElement.css('opacity', '1');

        await new Promise(resolve => setTimeout(resolve, duration * 1000));
      } else if (effectType === 'fade_from_black') {
        const duration = effectParams[0] ? parseFloat(effectParams[0]) : 0.5;
        streamInfo.overlayElement.css({
          opacity: '1',
          background: 'black',
          transition: `opacity ${duration}s`,
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        streamInfo.overlayElement.css('opacity', '0');

        await new Promise(resolve => setTimeout(resolve, duration * 1000));
      }
    } catch (error) {
      log('执行流式特效出错:', error);
    }
  }

  // 显示流式选项
  async function showStreamChoices(choices) {
    try {
      if (!streamInfo || !streamInfo.choicesElement) return;

      streamInfo.showingChoices = true;
      streamInfo.nextElement.hide();

      const choicesContainer = streamInfo.choicesElement;
      choicesContainer.empty();

      const choiceOverlay = $(
        `<div style="position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:4;"></div>`,
      );
      $(`.galgame-container-${streamInfo.mesid}`, tempMesText).append(choiceOverlay);

      log('处理流式选项，参数:', choices);

      for (let i = 0; i < choices.length; i++) {
        const choice = choices[i];
        let text = choice.trim();
        const tagIndex = text.indexOf('>');
        if (tagIndex !== -1) {
          text = text.substring(0, tagIndex).trim();
        }

        log(`创建流式选项: "${text}"`);

        const choiceClass = `galgame-choice-${streamInfo.mesid}`;
        const choiceElement = $(`<div class="${choiceClass}">${text}</div>`);

        choiceElement.on('click', function (e) {
          e.stopPropagation();
          log(`选择了选项: "${text}"`);

          choicesContainer.empty();
          choiceOverlay.remove();
          streamInfo.showingChoices = false;

          if (typeof triggerSlash === 'function') {
            triggerSlash(`/setinput ${text}`);
          }

          streamInfo.currentDialogIndex++;
          processStreamNextDialogue();
        });

        choicesContainer.append(choiceElement);
      }
    } catch (error) {
      log('显示流式选项出错:', error);
      streamInfo.showingChoices = false;
    }
  }

  // 处理流式背景
  async function processStreamBackground(bgUrl, transitionType, duration) {
    try {
      if (!streamInfo || !streamInfo.sceneElement) return;

      // 处理背景URL
      const imageInfo = resolveImageUrl(bgUrl, 'bg');
      const actualBgUrl = imageInfo ? imageInfo.url : null;

      // 设置背景
      if (actualBgUrl && actualBgUrl.startsWith('http')) {
        if (transitionType === 'fade') {
          const transitionDuration = duration ? parseFloat(duration) : 0.5;

          streamInfo.overlayElement.css({
            opacity: '0',
            background: '#000',
            transition: `opacity ${transitionDuration}s`,
          });

          await new Promise(resolve => setTimeout(resolve, 10));

          streamInfo.overlayElement.css('opacity', '1');

          await new Promise(resolve => setTimeout(resolve, transitionDuration * 1000));

          streamInfo.sceneElement.css({
            'background-image': `url(${actualBgUrl})`,
            'background-size': 'cover',
            'background-position': 'center',
          });

          await new Promise(resolve => setTimeout(resolve, 50));

          streamInfo.overlayElement.css({
            opacity: '0',
            transition: `opacity ${transitionDuration}s`,
          });

          await new Promise(resolve => setTimeout(resolve, transitionDuration * 1000));
        } else {
          streamInfo.sceneElement.css({
            'background-image': `url(${actualBgUrl})`,
            'background-size': 'cover',
            'background-position': 'center',
          });
        }
      } else {
        streamInfo.sceneElement.css({
          'background-image': 'none',
          'background-color': '#000',
        });
      }
    } catch (error) {
      log('处理流式背景出错:', error);
    }
  }

  function setupEventListeners() {
    eventOn(tavern_events.CHARACTER_MESSAGE_RENDERED, async messageId => {
      try {
        // 检查是否在流式生成完成处理阶段，如果是则忽略
        if (window.GALGAME_FINISHING_STREAM) {
          return;
        }

        // 检查渲染深度限制
        if (config.renderDepth > 0) {
          const lastMessageId = await getLastMessageId();
          if (lastMessageId - Number(messageId) >= config.renderDepth) {
            // 如果已经渲染，则清理它
            const $message = retrieveDisplayedMessage(messageId);
            if ($message && $message.find('.roleplay_galgame').length > 0) {
              $message.find('.roleplay_galgame').remove();
              if (renderedMessages.has(messageId)) {
                renderedMessages.delete(messageId);
              }
              if (gameStates[messageId]) {
                delete gameStates[messageId];
              }
            }

            return;
          }
        }

        // 检查是否是当前流式处理的消息
        if (streamInfo && streamInfo.mesid === Number(messageId)) {
          // 如果流式界面已渲染则忽略
          if (tempMesText && tempMesText.length > 0 && tempMesText.is(':visible')) {
            return;
          }

          // 如果流式生成已完成但DOM未重置，保持当前状态
          if (streamInfo.generationComplete && !streamInfo.domProcessComplete) {
            return;
          }
        }

        await renderGameForMessage(messageId);
      } catch (error) {
        log('处理新消息失败:', messageId, error);
      }
    });

    eventOn(tavern_events.MESSAGE_UPDATED, async messageId => {
      try {
        // 检查是否在流式生成完成处理阶段，如果是则忽略
        if (window.GALGAME_FINISHING_STREAM) {
          return;
        }

        // 检查渲染深度限制
        if (config.renderDepth > 0) {
          const lastMessageId = await getLastMessageId();
          if (lastMessageId - Number(messageId) >= config.renderDepth) {
            // 如果已经渲染，则清理它
            const $message = retrieveDisplayedMessage(messageId);
            if ($message && $message.find('.roleplay_galgame').length > 0) {
              $message.find('.roleplay_galgame').remove();
              if (renderedMessages.has(messageId)) {
                renderedMessages.delete(messageId);
              }
              if (gameStates[messageId]) {
                delete gameStates[messageId];
              }
            }

            return;
          }
        }

        // 检查是否是流式处理中的消息
        if (streamInfo && streamInfo.mesid === Number(messageId)) {
          // 检查流式是否已经完成，如果完成则尝试应用编辑
          if (streamInfo.generationComplete) {
            // 如果编辑框已打开，不进行处理
            if ($('.edit_textarea').is(':visible')) {
              return;
            }

            // 显示原始消息并隐藏临时UI
            if (streamInfo.originalMessageEl && streamInfo.originalMessageEl.length > 0) {
              // 在切换前保存游戏状态
              const savedGameState = {
                currentIndex: streamInfo.currentDialogIndex,
                characters: streamInfo.characters,
                history: streamInfo.history,
              };

              // 移除临时UI并显示原始消息
              streamInfo.originalMessageEl.css('display', '');

              if (tempMesText) {
                tempMesText.remove();
                tempMesText = null;
              }

              // 重置流式状态，但保留一些游戏数据
              const oldMesId = streamInfo.mesid;
              streamInfo = undefined;
              streamStart = false;

              // 重新渲染游戏内容
              if (renderedMessages.has(messageId)) {
                renderedMessages.delete(messageId);
              }

              delete gameStates[messageId];

              // 延迟重新渲染，确保DOM已更新
              setTimeout(async () => {
                try {
                  await renderGameForMessage(messageId);

                  // 如果新渲染的游戏存在，尝试恢复状态
                  if (gameStates[messageId]) {
                    // 尝试恢复状态
                    gameStates[messageId].currentIndex = savedGameState.currentIndex;
                    // 其他状态恢复...
                  }
                } catch (e) {
                  log('重新渲染游戏内容失败:', e);
                }
              }, 100);
            }
            return;
          }

          // 如果流式生成未完成，不处理更新
          return;
        }

        // 正常处理其他消息更新
        if (renderedMessages.has(messageId)) {
          renderedMessages.delete(messageId);
          delete gameStates[messageId];
        }
        await renderGameForMessage(messageId);
      } catch (error) {
        log('处理消息更新失败:', messageId, error);
      }
    });

    eventOn(tavern_events.CHAT_CHANGED, async () => {
      try {
        renderedMessages.clear();

        for (const id in gameStates) {
          delete gameStates[id];
        }

        // 重置流式状态
        streamInfo = undefined;
        streamStart = false;
        if (tempMesText) {
          tempMesText.remove();
          tempMesText = null;
        }

        await scanAndRenderAllMessages();
      } catch (error) {
        log('处理聊天变更失败:', error);
      }
    });

    eventOn(tavern_events.MESSAGE_DELETED, () => {
      setTimeout(async () => {
        try {
          renderedMessages.clear();

          for (const id in gameStates) {
            delete gameStates[id];
          }

          // 重置流式状态
          if (streamInfo) {
            streamInfo = undefined;
            streamStart = false;
            if (tempMesText) {
              tempMesText.remove();
              tempMesText = null;
            }
          }

          await scanAndRenderAllMessages();
        } catch (error) {
          log('处理消息删除失败:', error);
        }
      }, 1000);
    });

    // 添加流式传输事件监听
    eventOn(tavern_events.STREAM_TOKEN_RECEIVED, streamParser);

    // 添加流式传输结束事件监听
    eventOn(tavern_events.GENERATION_STOPPED, () => {
      try {
        if (streamInfo && !streamInfo.isComplete) {
          streamInfo.isComplete = true;
          finishStreamGeneration();
        }
      } catch (error) {
        log('处理生成停止事件失败:', error);
      }
    });
  }

  // 初始化并启动插件
  $(async function () {
    try {
      log('初始化GALGAME演出插件...');

      // 设置事件监听
      setupEventListeners();

      // 检查是否有编辑意图
      try {
        const editMesId = sessionStorage.getItem('galgame_edit_mesid');
        if (editMesId) {
          // 清除存储
          sessionStorage.removeItem('galgame_edit_mesid');

          log('检测到编辑意图，准备打开编辑对话框:', editMesId);

          // 延迟执行确保页面加载完成
          setTimeout(() => {
            try {
              // 查找并点击编辑按钮
              const mesBlock = $(`[mesid="${editMesId}"], [data-mesid="${editMesId}"], [data-id="${editMesId}"]`);
              if (mesBlock.length > 0) {
                const editBtn = mesBlock.find('.mes_edit');
                if (editBtn.length > 0) {
                  // 模拟原生点击
                  editBtn[0].click();
                }
              }
            } catch (e) {
              log('自动点击编辑按钮失败:', e);
            }
          }, 1000);
        }
      } catch (e) {}

      // 扫描现有消息
      await scanAndRenderAllMessages();

      log('GALGAME演出插件初始化完成');
    } catch (error) {
      log('初始化GALGAME演出插件失败:', error);
    }
  });

  // 处理流式角色
  function processStreamCharacter(character, position, sprite) {
    try {
      if (!streamInfo) return;

      position = position.toUpperCase();
      if (!['L', 'C', 'R'].includes(position)) {
        position = 'C';
      }

      // 获取对应位置的元素
      let charElement;
      if (position === 'L') {
        charElement = streamInfo.leftCharElement;
      } else if (position === 'C') {
        charElement = streamInfo.centerCharElement;
      } else if (position === 'R') {
        charElement = streamInfo.rightCharElement;
      }

      if (!charElement) return;

      // 确保当前角色不被暗化
      charElement.removeClass('dimmed');

      // 检查是否已经在其他位置显示该角色
      for (const p in streamInfo.characters) {
        if (p !== position && streamInfo.characters[p].name === character) {
          const otherElement =
            p === 'L'
              ? streamInfo.leftCharElement
              : p === 'C'
                ? streamInfo.centerCharElement
                : streamInfo.rightCharElement;

          if (otherElement) {
            otherElement.removeClass('active');
          }

          streamInfo.characters[p].name = null;
          streamInfo.characters[p].sprite = null;
        }
      }

      // 处理角色图片URL
      const imageInfo = resolveImageUrl(sprite, 'char');
      const actualSpriteUrl = imageInfo ? imageInfo.url : null;

      // 更新角色状态
      streamInfo.characters[position] = {
        name: character,
        sprite: actualSpriteUrl || null,
      };

      if (actualSpriteUrl && actualSpriteUrl.startsWith('http')) {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = function () {
          charElement.attr('src', actualSpriteUrl);
          charElement.attr('alt', character);
          charElement.css('display', 'block');

          if (imageInfo.type === 'char') {
            charElement.css({
              'max-height': '120%',
              'max-width': '100%',
              bottom: `${config.characterBottomOffset}%`,
            });
          }

          charElement.addClass('active');

          // 使其他角色变暗
          for (const p in streamInfo.characters) {
            if (p !== position && streamInfo.characters[p].name) {
              const otherPos =
                p === 'L'
                  ? streamInfo.leftCharElement
                  : p === 'C'
                    ? streamInfo.centerCharElement
                    : streamInfo.rightCharElement;
              otherPos.addClass('dimmed');
            }
          }
        };

        img.onerror = function () {
          charElement.attr(
            'src',
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
          );
          charElement.attr('alt', character + ' (图片加载失败)');
          charElement.css('display', 'block');
          charElement.addClass('active');

          // 使其他角色变暗
          for (const p in streamInfo.characters) {
            if (p !== position && streamInfo.characters[p].name) {
              const otherPos =
                p === 'L'
                  ? streamInfo.leftCharElement
                  : p === 'C'
                    ? streamInfo.centerCharElement
                    : streamInfo.rightCharElement;
              otherPos.addClass('dimmed');
            }
          }
        };

        img.src = actualSpriteUrl;
      } else {
        // 无图片时也显示角色
        charElement.attr(
          'src',
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        );
        charElement.attr('alt', character + ' (图片未设置)');
        charElement.css('display', 'block');
        charElement.addClass('active');

        // 使其他角色变暗
        for (const p in streamInfo.characters) {
          if (p !== position && streamInfo.characters[p].name) {
            const otherPos =
              p === 'L'
                ? streamInfo.leftCharElement
                : p === 'C'
                  ? streamInfo.centerCharElement
                  : streamInfo.rightCharElement;
            otherPos.addClass('dimmed');
          }
        }
      }
    } catch (error) {
      log('处理流式角色出错:', error);
    }
  }

  // 隐藏流式角色
  function hideStreamCharacter(target) {
    try {
      if (!streamInfo) return;

      // 如果是位置 (L, C, R)
      if (['L', 'C', 'R'].includes(target)) {
        let charElement = null;

        if (target === 'L') {
          charElement = streamInfo.leftCharElement;
        } else if (target === 'C') {
          charElement = streamInfo.centerCharElement;
        } else if (target === 'R') {
          charElement = streamInfo.rightCharElement;
        }

        if (charElement && charElement.length) {
          charElement.removeClass('active dimmed');
          streamInfo.characters[target] = { name: null, sprite: null };
        }
      }
      // 如果是角色名
      else {
        for (const p in streamInfo.characters) {
          if (streamInfo.characters[p] && streamInfo.characters[p].name === target) {
            const pos = p === 'L' ? 'left' : p === 'C' ? 'center' : 'right';
            const charElement =
              p === 'L'
                ? streamInfo.leftCharElement
                : p === 'C'
                  ? streamInfo.centerCharElement
                  : streamInfo.rightCharElement;

            if (charElement && charElement.length) {
              charElement.removeClass('active dimmed');
              streamInfo.characters[p] = { name: null, sprite: null };
            }
          }
        }
      }
    } catch (error) {
      log('隐藏流式角色出错:', error);
    }
  }

  // 显示流式CG
  function showStreamCG(cgUrl) {
    try {
      if (!streamInfo || !streamInfo.cgElement) return;

      // 处理CG URL
      const imageInfo = resolveImageUrl(cgUrl, 'cg');
      const actualCgUrl = imageInfo ? imageInfo.url : null;

      if (actualCgUrl && actualCgUrl.startsWith('http')) {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = function () {
          streamInfo.cgElement.find('img').attr('src', actualCgUrl);
          streamInfo.cgElement.addClass('active');
        };

        img.onerror = function () {
          streamInfo.cgElement.removeClass('active');
        };

        img.src = actualCgUrl;
      } else {
        streamInfo.cgElement.removeClass('active');
      }
    } catch (error) {
      log('显示流式CG出错:', error);
    }
  }

  // 隐藏流式CG
  function hideStreamCG() {
    try {
      if (!streamInfo || !streamInfo.cgElement) return;

      streamInfo.cgElement.removeClass('active');
    } catch (error) {
      log('隐藏流式CG出错:', error);
    }
  }

  // 添加流式对话到履历
  function addStreamToHistory(messageId, speaker, text) {
    if (!streamInfo || !streamInfo.history) return;

    streamInfo.history.push({
      speaker: speaker || '旁白',
      text: text,
    });

    if (streamInfo.history.length > 100) {
      streamInfo.history.shift();
    }
  }

  // 显示流式履历
  function showStreamHistoryModal(messageId) {
    if (!streamInfo || !streamInfo.history || !streamInfo.historyListElement) return;

    streamInfo.historyListElement.empty();

    for (let i = 0; i < streamInfo.history.length; i++) {
      const item = streamInfo.history[i];
      const itemElement = $(`
        <div class="galgame-history-item-${messageId}">
          <div class="galgame-history-speaker-${messageId}">${item.speaker}</div>
          <div class="galgame-history-text-${messageId}">${item.text}</div>
        </div>
      `);
      streamInfo.historyListElement.append(itemElement);
    }

    $(`#history-modal-stream-${messageId}`).css('display', 'block');

    const historyContent = $(`#history-modal-stream-${messageId} .galgame-history-content-${messageId}`);
    historyContent.scrollTop(historyContent[0].scrollHeight);
  }

  // 隐藏流式履历
  function hideStreamHistoryModal(messageId) {
    $(`#history-modal-stream-${messageId}`).css('display', 'none');
  }

  // 重新开始流式对话
  function restartStreamDialogue() {
    if (!streamInfo) return;

    // 重置对话索引
    streamInfo.currentDialogIndex = 0;

    // 清除文本
    streamInfo.textElement.text('');

    // 移除重新播放按钮
    $(`.galgame-dialogue-${streamInfo.mesid} .replay-button`, tempMesText).remove();

    // 重置角色
    streamInfo.characters = {
      L: { name: null, sprite: null },
      C: { name: null, sprite: null },
      R: { name: null, sprite: null },
    };

    // 隐藏所有角色
    streamInfo.leftCharElement.removeClass('active dimmed');
    streamInfo.centerCharElement.removeClass('active dimmed');
    streamInfo.rightCharElement.removeClass('active dimmed');

    // 隐藏CG
    streamInfo.cgElement.removeClass('active');

    // 重置背景
    streamInfo.sceneElement.css({
      'background-image': 'none',
      'background-color': '#000',
    });

    // 隐藏角色名
    streamInfo.nameElement.hide();

    // 重置转场效果
    streamInfo.overlayElement.css({
      opacity: '0',
      transition: 'none',
    });

    // 显示下一步指示器
    streamInfo.nextElement.show();

    // 开始处理第一条对话
    streamInfo.processing = false;
    processStreamNextDialogue();
  }

  // 添加一个新函数处理流式生成完成后的操作
  function finishStreamGeneration() {
    try {
      if (!streamInfo || !streamInfo.isComplete) return;

      // 防止重复处理
      if (streamInfo.finishProcessed) return;
      streamInfo.finishProcessed = true;

      // 设置一个标志，表示当前正在完成处理
      window.GALGAME_FINISHING_STREAM = true;

      // 确保原始消息元素存在
      if (streamInfo.originalMessageEl && streamInfo.originalMessageEl.length > 0) {
        // 更新原始消息元素的内容
        if (streamInfo.text) {
          // 从临时UI复制内容而不只是文本
          const gameContent = tempMesText ? tempMesText.html() : null;

          // 更新原始消息元素文本
          streamInfo.originalMessageEl.text(streamInfo.text);

          // 标记已完成状态
          streamInfo.originalMessageEl.attr('data-stream-complete', 'true');

          // 尝试创建一个隐藏的备份元素，确保内容在DOM中存在
          const backupId = `stream-backup-${streamInfo.mesid}`;
          if ($(`#${backupId}`).length === 0) {
            const backup = $(`<div id="${backupId}" style="display:none;">${streamInfo.text}</div>`);
            $('body').append(backup);

            // 设置5秒后自动删除
            setTimeout(() => {
              try {
                $(`#${backupId}`).remove();
              } catch (e) {}
            }, 5000);
          }
        }
      }

      // 标记完成状态，以便其他功能可以正确识别
      if (streamInfo) {
        streamInfo.generationComplete = true;
      }

      // 阻止界面刷新，设置一个延迟标志
      setTimeout(() => {
        window.GALGAME_FINISHING_STREAM = false;
      }, 2000); // 给系统足够的时间处理其他事件后再清除标志

      // 设置DOM处理完毕的标志
      streamInfo.domProcessComplete = true;
    } catch (error) {
      window.GALGAME_FINISHING_STREAM = false;
      log('完成流式生成更新时出错:', error);
    }
  }

  // 添加一个新函数强制重置流式消息状态
  function forceResetStreamMessage(mesId) {
    try {
      if (!streamInfo || streamInfo.mesid !== Number(mesId)) return;

      // 确保原始消息元素内容正确
      if (streamInfo.originalMessageEl && streamInfo.originalMessageEl.length > 0) {
        // 移除所有自定义属性
        streamInfo.originalMessageEl.removeAttr('style');
        streamInfo.originalMessageEl.removeAttr('data-stream-complete');

        // 更新内容并显示原始消息
        if (streamInfo.text) {
          streamInfo.originalMessageEl.text(streamInfo.text);
        }
        streamInfo.originalMessageEl.css('display', 'block');
      }

      // 移除临时UI
      if (tempMesText) {
        tempMesText.remove();
        tempMesText = null;
      }

      // 清除游戏状态
      if (renderedMessages.has(String(mesId))) {
        renderedMessages.delete(String(mesId));
      }

      if (gameStates[mesId]) {
        delete gameStates[mesId];
      }

      // 重置流式状态
      streamInfo = undefined;
      streamStart = false;
      streamParsing = false;

      // 清除全局标志
      window.GALGAME_FINISHING_STREAM = false;
      window.GALGAME_EDITING_MESSAGE = false;
    } catch (error) {
      log('强制重置流式消息状态失败:', error);
    }
  }

  // 清理超出渲染深度的GALGAME界面
  function cleanupOldRenders(lastMessageId) {
    try {
      if (config.renderDepth <= 0) return; // 如果没有设置渲染深度限制，则不需要清理

      log('清理超出渲染深度的GALGAME界面');

      // 查找所有已渲染的消息
      $('#chat .mes').each(function () {
        const mesid = Number($(this).attr('mesid') || $(this).attr('data-mesid') || $(this).attr('data-id'));
        if (!isNaN(mesid) && mesid > 0) {
          // 检查是否超出渲染深度
          if (lastMessageId - mesid >= config.renderDepth) {
            // 从渲染集合中移除
            if (renderedMessages.has(mesid.toString())) {
              renderedMessages.delete(mesid.toString());
            }

            // 删除该消息的gameStates
            if (gameStates[mesid]) {
              delete gameStates[mesid];
            }

            // 移除GALGAME界面
            $(this).find('.roleplay_galgame').remove();

            log('清理了消息的GALGAME界面:', mesid);
          }
        }
      });
    } catch (error) {
      log('清理旧渲染时出错:', error);
    }
  }

  // 获取最新消息ID
  async function getLastMessageId() {
    try {
      // 尝试从DOM中获取
      const $lastMessage = $('#chat .mes').last();
      if ($lastMessage.length > 0) {
        const mesid = Number(
          $lastMessage.attr('mesid') || $lastMessage.attr('data-mesid') || $lastMessage.attr('data-id'),
        );
        if (!isNaN(mesid) && mesid > 0) {
          return mesid;
        }
      }

      // 如果DOM中获取失败，尝试通过API获取
      try {
        return Number(await triggerSlashWithResult('/pass {{lastMessageId}}'));
      } catch (e) {
        log('通过API获取最新消息ID失败:', e);
      }

      // 所有方法都失败，返回0
      return 0;
    } catch (error) {
      log('获取最新消息ID时出错:', error);
      return 0;
    }
  }

  // 获取图片URL (新增的辅助函数)
  function resolveImageUrl(urlOrAlias, type = 'char') {
    if (!urlOrAlias || typeof urlOrAlias !== 'string') return null;

    // 处理[type|别名]格式
    const tagRegex = new RegExp(`\\[(${type}|[a-z]+)\\|([^\\]]+)\\]`);
    const match = urlOrAlias.match(tagRegex);

    if (match) {
      const actualType = match[1];
      const alias = match[2].trim();

      const aliasObj = imageAliasManager.getAliases ? imageAliasManager.getAliases() : {};
      if (aliasObj && alias in aliasObj) {
        return {
          url: aliasObj[alias],
          type: actualType,
        };
      }
      return { url: null, type: actualType };
    }

    // 直接使用别名或URL
    const aliasObj = imageAliasManager.getAliases ? imageAliasManager.getAliases() : {};
    if (aliasObj && urlOrAlias in aliasObj) {
      return {
        url: aliasObj[urlOrAlias],
        type: type,
      };
    } else if (urlOrAlias.startsWith('http://') || urlOrAlias.startsWith('https://')) {
      return {
        url: urlOrAlias,
        type: type,
      };
    }

    return { url: null, type: type };
  }
})();
