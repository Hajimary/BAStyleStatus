<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { GameData, GameConfig, HistoryItem, CharacterDisplay, CGDisplay, Choice } from './galgame/types'
import { DEFAULT_CONFIG } from './galgame/types'
import { createGameState, createCharacterDisplay, createCGDisplay } from './galgame/gameState'
import { processNextScene, handleContainerClick } from './galgame/sceneProcessor'
import { imageAliasManager } from './galgame/imageAliasManager'
import { parseScript } from './galgame/scriptParser'
import GalgameDialogue from './components/GalgameDialogue.vue'
import GalgameHistoryModal from './components/GalgameHistoryModal.vue'
import GalgameChoices from './components/GalgameChoices.vue'
import GalgameSettingsModal from './components/GalgameSettingsModal.vue'

// Props
const props = defineProps<{
  messageId: string
  gameData: GameData
  config?: Partial<GameConfig>
  hideUI?: boolean
}>()

const defaultGameData: GameData = {
  "scenes": [
    {
      "type": "dialogue",
      "character": "旁白",
      "sprite": "",
      "text": "橘望と光の訪問を受けた夕方の夏莱オフィス。窓から差し込む夕陽が、部屋を優しく染めている。",
      "original": "旁白|||橘望と光の訪問を受けた夕方の夏莱オフィス。窓から差し込む夕陽が、部屋を優しく染めている。"
    },
    {
      "type": "command",
      "command": "bg",
      "args": [
        "夏莱办公室"
      ],
      "original": "[bg|夏莱办公室]"
    },
    {
      "type": "dialogue",
      "character": "旁白",
      "sprite": "",
      "text": "「新しい路線、見に行きましょうか。せっかく来てくれたんですし」",
      "original": "旁白|||「新しい路線、見に行きましょうか。せっかく来てくれたんですし」"
    },
    {
      "type": "dialogue",
      "character": "橘望",
      "position": "L",
      "sprite": "望大笑",
      "text": "やった！さすが先生！そうと決まれば、さっそく行きましょう！特別席用意してありますからね！",
      "inlineAction": {
        "target": "橘望",
        "name": "jump_up",
        "args": []
      },
      "original": "橘望|L|望大笑|やった！さすが先生！そうと決まれば、さっそく行きましょう！特別席用意してありますからね！[action|橘望|jump_up]"
    },
    {
      "type": "dialogue",
      "character": "橘光",
      "position": "R",
      "sprite": "光微笑",
      "text": "えへへ……先生と一緒に……楽しみ……。",
      "original": "橘光|R|光微笑|えへへ……先生と一緒に……楽しみ……。"
    },
    {
      "type": "command",
      "command": "effect",
      "args": [
        "fade_to_black",
        "0.5"
      ],
      "original": "[effect|fade_to_black|0.5]"
    },
    {
      "type": "command",
      "command": "bg",
      "args": [
        "列车维修车间晚"
      ],
      "original": "[bg|列车维修车间晚]"
    },
    {
      "type": "command",
      "command": "effect",
      "args": [
        "fade_from_black",
        "0.5"
      ],
      "original": "[effect|fade_from_black|0.5]"
    },
    {
      "type": "dialogue",
      "character": "旁白",
      "sprite": "",
      "text": "数分後、CCCの列車制御室。最新鋭の制御パネルが並ぶ様子は、まるで未来の指令センターのようだ。",
      "original": "旁白|||数分後、CCCの列車制御室。最新鋭の制御パネルが並ぶ様子は、まるで未来の指令センターのようだ。"
    },
    {
      "type": "dialogue",
      "character": "橘望",
      "position": "L",
      "sprite": "望正常A",
      "text": "ほらほら先生！これが私たちの新しいベイビーです！最新型の制御システムを搭載した特急列車！スピードも快適性も、今までの比じゃないんですよ！",
      "original": "橘望|L|望正常A|ほらほら先生！これが私たちの新しいベイビーです！最新型の制御システムを搭載した特急列車！スピードも快適性も、今までの比じゃないんですよ！"
    },
    {
      "type": "dialogue",
      "character": "橘光",
      "position": "R",
      "sprite": "光正常A",
      "text": "うん……私たちで、設計から……全部……。望が、とっても頑張った……。",
      "original": "橘光|R|光正常A|うん……私たちで、設計から……全部……。望が、とっても頑張った……。"
    },
    {
      "type": "dialogue",
      "character": "橘望",
      "position": "L",
      "sprite": "望奸笑A",
      "text": "へへーん！当然でしょ！私たち二人で考えた路線なんだから、完璧じゃなきゃダメなんです！",
      "inlineAction": {
        "target": "橘望",
        "name": "shake",
        "args": []
      },
      "original": "橘望|L|望奸笑A|へへーん！当然でしょ！私たち二人で考えた路線なんだから、完璧じゃなきゃダメなんです！[action|橘望|shake]"
    },
    {
      "type": "command",
      "command": "show",
      "args": [
        "阿罗娜",
        "C",
        "阿罗娜默认"
      ],
      "original": "[show|阿罗娜|C|阿罗娜默认]"
    },
    {
      "type": "dialogue",
      "character": "阿罗娜",
      "position": "C",
      "sprite": "阿罗娜默认",
      "text": "わぁ！すごいですね！新しい制御パネルの設計、とても効率的です！阿罗娜も勉強になります！",
      "original": "阿罗娜|C|阿罗娜默认|わぁ！すごいですね！新しい制御パネルの設計、とても効率的です！阿罗娜も勉強になります！"
    },
    {
      "type": "dialogue",
      "character": "橘望",
      "position": "L",
      "sprite": "望正常B",
      "text": "でしょでしょ？特に自慢なのは、新開発した自動運転システム！これがまた賢いんですよ。天候や乗客数に応じて、最適な速度とルートを自動で選択してくれるんです！",
      "original": "橘望|L|望正常B|でしょでしょ？特に自慢なのは、新開発した自動運転システム！これがまた賢いんですよ。天候や乗客数に応じて、最適な速度とルートを自動で選択してくれるんです！"
    },
    {
      "type": "dialogue",
      "character": "橘光",
      "position": "R",
      "sprite": "光认真",
      "text": "安全性も……バッチリ……。何度も……テストした……。",
      "original": "橘光|R|光认真|安全性も……バッチリ……。何度も……テストした……。"
    },
    {
      "type": "dialogue",
      "character": "阿罗娜",
      "position": "C",
      "sprite": "阿罗娜默认",
      "text": "素晴らしいです！でも、自動運転なのに、なぜ運転席はそのままなんですか？",
      "original": "阿罗娜|C|阿罗娜默认|素晴らしいです！でも、自動運転なのに、なぜ運転席はそのままなんですか？"
    },
    {
      "type": "dialogue",
      "character": "橘望",
      "position": "L",
      "sprite": "望害羞A",
      "text": "えへへ……それはね……。やっぱり、手動で運転するのが一番楽しいじゃないですか！時々は私たちも、運転を楽しみたいなって……。",
      "inlineAction": {
        "target": "橘望",
        "name": "jump_down",
        "args": []
      },
      "original": "橘望|L|望害羞A|えへへ……それはね……。やっぱり、手動で運転するのが一番楽しいじゃないですか！時々は私たちも、運転を楽しみたいなって……。[action|橘望|jump_down]"
    },
    {
      "type": "dialogue",
      "character": "橘光",
      "position": "R",
      "sprite": "光微笑",
      "text": "望は……運転が大好き……。私も……。",
      "original": "橘光|R|光微笑|望は……運転が大好き……。私も……。"
    },
    {
      "type": "dialogue",
      "character": "旁白",
      "sprite": "",
      "text": "制御室の大きなモニターには、新路線の完成予想図が映し出されている。グラフや数値が次々と更新され、システムの稼働状況を示している。",
      "original": "旁白|||制御室の大きなモニターには、新路線の完成予想図が映し出されている。グラフや数値が次々と更新され、システムの稼働状況を示している。"
    },
    {
      "type": "dialogue",
      "character": "橘望",
      "position": "L",
      "sprite": "望正常A",
      "text": "先生！ちょっと運転席に座ってみませんか？特別に許可しちゃいます！",
      "original": "橘望|L|望正常A|先生！ちょっと運転席に座ってみませんか？特別に許可しちゃいます！"
    },
    {
      "type": "dialogue",
      "character": "橘光",
      "position": "R",
      "sprite": "光害羞",
      "text": "私たちが……教えるから……。大丈夫……。",
      "original": "橘光|R|光害羞|私たちが……教えるから……。大丈夫……。"
    },
    {
      "type": "command",
      "command": "choice",
      "args": [
        "運転席に座ってみる",
        "「見学だけで十分です」と丁重に断る",
        "「その前に安全確認を」と提案する"
      ],
      "original": "[choice|運転席に座ってみる|「見学だけで十分です」と丁重に断る|「その前に安全確認を」と提案する]"
    }
  ],
  "currentSceneIndex": 0
};

// Config
const config = computed(() => ({
  ...DEFAULT_CONFIG,
  ...props.config
}))

// Initialize game data
const initializeGameData = (): GameData => {
  try {
    // 尝试获取当前楼层的消息内容
    const message_id = getCurrentMessageId()
    const chat_messages = getChatMessages(message_id)

    if (chat_messages && chat_messages.length > 0) {
      const chat_message = chat_messages[0]

      // 尝试解析聊天内容
      if (chat_message.message) {
        const parsedData = parseScript(chat_message.message)

        // 如果解析成功且有场景内容，使用解析的数据
        if (parsedData.scenes && parsedData.scenes.length > 0) {
          console.log('Using parsed game data from chat message')
          return parsedData
        }
      }
    }
  } catch (error) {
    console.log('Failed to parse chat message, using default game data:', error)
  }

  // 如果解析失败或没有内容，使用默认数据
  return defaultGameData as GameData
}

// State
const gameData = initializeGameData()
const gameState = createGameState(gameData, props.messageId)

const showHistoryModal = ref(false)
const historyList = ref<HistoryItem[]>([])

// Settings modal
const showSettingsModal = ref(false)

// Character positions
const leftCharacter = ref<CharacterDisplay>(createCharacterDisplay())
const centerCharacter = ref<CharacterDisplay>(createCharacterDisplay())
const rightCharacter = ref<CharacterDisplay>(createCharacterDisplay())

// Background and CG
const backgroundStyle = ref<string>('')
const cgImage = ref<CGDisplay>(createCGDisplay())

// Dialogue
const currentCharacterName = ref('')
const currentDialogueText = ref('')
const showNextIndicator = ref(false)

// Choices
const showChoices = ref(false)
const choices = ref<Choice[]>([])

// Overlay
const overlayOpacity = ref(0)

// Dialogue component ref
const dialogueRef = ref<InstanceType<typeof GalgameDialogue> | null>(null)

// Auto play state
const isAutoPlay = ref(false)
let autoPlayTimer: ReturnType<typeof setTimeout> | null = null

// Hide UI state (local state that can be toggled)
const isUIHidden = ref(props.hideUI || false)

// Methods
const onContainerClick = (e: Event) => {
  e.stopPropagation()


  // If UI is hidden, restore it on first click
  if (isUIHidden.value) {
    isUIHidden.value = false
    return // Don't advance dialogue on restore click
  }

  // If history modal is open, don't advance dialogue
  if (showHistoryModal.value) {
    return
  }
  if (showSettingsModal.value) {
    return
  }

  const state = gameState.value
  //if (!state || state.processing) return
  if (state.showingChoices) return

  // Check if typewriter is still running
  if (dialogueRef.value && currentDialogueText.value) {
    // Try to skip the typewriter effect first
    const beforeText = dialogueRef.value.displayedText
    dialogueRef.value.skipTypewriter()

    // If text was not fully displayed, we skipped the typewriter
    // Don't advance to next scene yet
    if (beforeText !== currentDialogueText.value) {
      return
    }
  }

  // Handle click for next dialogue
  if (state.waitingForClick) {
    processScene()
  }
}

const processScene = async () => {
  await processNextScene(
    gameState,
    currentCharacterName,
    currentDialogueText,
    showNextIndicator,
    historyList,
    leftCharacter,
    centerCharacter,
    rightCharacter,
    backgroundStyle,
    cgImage,
    overlayOpacity,
    showChoices,
    choices
  )
}

const toggleHistory = () => {
  showHistoryModal.value = !showHistoryModal.value
}

const toggleSettings = () => {
  showSettingsModal.value = !showSettingsModal.value
}

const handleChoiceSelection = (choiceAction: () => void) => {
  // Execute the choice action (triggers setinput and updates index)
  choiceAction()

  // Hide choices UI
  showChoices.value = false

  // Disable auto play when choice is made
  if (isAutoPlay.value) {
    isAutoPlay.value = false
    clearAutoPlayTimer()
  }

  // Continue processing the next scene
  setTimeout(() => {
    processScene()
  }, 50)
}

// Toggle auto play mode
const toggleAutoPlay = () => {
  isAutoPlay.value = !isAutoPlay.value

  if (!isAutoPlay.value) {
    clearAutoPlayTimer()
  } else {
    // If currently waiting and text is fully displayed, trigger auto advance
    checkAutoAdvance()
  }
}

// Toggle hide UI mode
const toggleHideUI = () => {
  isUIHidden.value = !isUIHidden.value

  // Disable auto play when hiding UI
  if (isUIHidden.value && isAutoPlay.value) {
    isAutoPlay.value = false
    clearAutoPlayTimer()
  }
}

// Clear auto play timer
const clearAutoPlayTimer = () => {
  if (autoPlayTimer) {
    clearTimeout(autoPlayTimer)
    autoPlayTimer = null
  }
}

// Check if we should auto advance
const checkAutoAdvance = () => {
  if (!isAutoPlay.value) return

  // Don't auto advance during choices
  if (showChoices.value || gameState.value.showingChoices) {
    isAutoPlay.value = false
    return
  }

  // Check if text is fully displayed
  if (dialogueRef.value &&
      !dialogueRef.value.isTyping &&
      currentDialogueText.value &&
      dialogueRef.value.displayedText === currentDialogueText.value &&
      gameState.value.waitingForClick) {

    // Wait 2 seconds then advance
    clearAutoPlayTimer()
    autoPlayTimer = setTimeout(() => {
      if (isAutoPlay.value && !showChoices.value && gameState.value.waitingForClick) {
        processScene()
      }
    }, 2000)
  }
}

// Watch for typing completion to trigger auto advance
watch(() => dialogueRef.value?.isTyping, (newVal, oldVal) => {
  if (oldVal === true && newVal === false) {
    // Typing just finished
    checkAutoAdvance()
  }
})

// Watch for showChoices to disable auto play
watch(showChoices, (newVal) => {
  if (newVal && isAutoPlay.value) {
    isAutoPlay.value = false
    clearAutoPlayTimer()
  }
})

// Initialize on mount
onMounted(async () => {
  // Load image aliases first
  await imageAliasManager.loadImageAliases()

  // Process first scene if available
  if (gameState.value.data.scenes.length > 0) {
    processScene()
  }
})
</script>

<template>
  <div class="roleplay_galgame">
    <div
      :class="`galgame-container galgame-container-${messageId}`"
      @click="onContainerClick"
    >
      <!-- Background Layer -->
      <div
        :class="`galgame-bg galgame-bg-${messageId}`"
        :style="{ backgroundImage: backgroundStyle }"
      />

      <!-- Character Area -->
      <div :class="`galgame-char-area galgame-char-area-${messageId}`">
        <!-- Left Character -->
        <img
          :class="[
            'galgame-char',
            `galgame-char-${messageId}`,
            'left',
            { 'active': leftCharacter.active },
            { 'dimmed': leftCharacter.dimmed }
          ]"
          :src="leftCharacter.src"
          alt=""
        >

        <!-- Center Character -->
        <img
          :class="[
            'galgame-char',
            `galgame-char-${messageId}`,
            'center',
            { 'active': centerCharacter.active },
            { 'dimmed': centerCharacter.dimmed }
          ]"
          :src="centerCharacter.src"
          alt=""
        >

        <!-- Right Character -->
        <img
          :class="[
            'galgame-char',
            `galgame-char-${messageId}`,
            'right',
            { 'active': rightCharacter.active },
            { 'dimmed': rightCharacter.dimmed }
          ]"
          :src="rightCharacter.src"
          alt=""
        >
      </div>

      <!-- CG Layer -->
      <div
        :class="[
          'galgame-cg',
          `galgame-cg-${messageId}`,
          { 'active': cgImage.active }
        ]"
      >
        <img :src="cgImage.src" alt="">
      </div>

      <!-- UI Controls Container -->
      <div v-show="!isUIHidden" class="galgame-ui-controls">
        <!-- History Button -->
        <button
          :class="`galgame-btn galgame-btn-${messageId}`"
          @click.stop="toggleHistory"
        >
          履历
        </button>

        <!-- Auto Play Button -->
        <button
          :class="[
            'galgame-btn',
            `galgame-btn-${messageId}`,
            'galgame-btn-auto',
            { 'active': isAutoPlay }
          ]"
          @click.stop="toggleAutoPlay"
        >
          自动
        </button>

        <!-- Hide UI Button -->
        <button
          :class="`galgame-btn galgame-btn-${messageId}`"
          @click.stop="toggleHideUI"
        >
          隐藏
        </button>

        <!-- Settings Button -->
        <button
          :class="`galgame-btn galgame-btn-${messageId}`"
          @click.stop="toggleSettings"
        >
          配置
        </button>
      </div>

      <!-- History Modal Component -->
      <GalgameHistoryModal
        :visible="showHistoryModal"
        :history-list="historyList"
        @close="toggleHistory"
      />

      <!-- Settings Modal Component -->
      <GalgameSettingsModal
        :visible="showSettingsModal"
        @close="toggleSettings"
      />

      <!-- Dialogue Component -->
      <GalgameDialogue
        v-show="!isUIHidden"
        ref="dialogueRef"
        :show-next-indicator="showNextIndicator"
        :current-dialogue-text="currentDialogueText"
        :current-character-name="currentCharacterName"
      />

      <!-- Choices Component -->
      <GalgameChoices
        :show-choices="showChoices"
        :choices="choices"
        @choice-click="handleChoiceSelection"
      />

      <!-- Overlay -->
      <div
        :class="`galgame-overlay galgame-overlay-${messageId}`"
        :style="{ opacity: overlayOpacity }"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css');
@import 'styles/global.scss';

.roleplay_galgame {
  width: 100%;
}

/* 基本容器样式 */
.galgame-container {
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

  /* PC端适配 */
  @media (min-width: 768px) {
    max-width: 90%;
    aspect-ratio: 16/9;
  }

  /* 移动端适配 */
  @media (max-width: 767px) {
    max-width: 100%;
    aspect-ratio: 3/5;
  }
}

/* 背景层 */
.galgame-bg {
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
.galgame-char-area {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  position: relative;
  min-height: 70%;
  z-index: 1;

  /* 移动端角色区域调整 */
  @media (max-width: 767px) {
    min-height: calc(100% - v-bind('config.mobileDiaogueHeight + "%"') - 20px);
  }
}

/* 角色立绘 */
.galgame-char {
  max-width: 100%;
  max-height: 100%;
  position: absolute;
  bottom: v-bind('config.characterBottomOffset + "%"');
  opacity: 0;
  transition: opacity 0.3s ease-in-out, filter 0.3s ease-in-out;
  pointer-events: none;

  &.left {
    left: 0;
    transform: scaleX(1);
  }

  &.center {
    left: 50%;
    transform: translateX(-50%);
  }

  &.right {
    right: 0;
    transform: scaleX(-1);
  }

  &.active {
    opacity: 1;

    &.dimmed {
      filter: brightness(0.5) grayscale(0.3);
    }
  }
}

/* CG图片 */
.galgame-cg {
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

  img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  &.active {
    opacity: 1;
  }
}


/* 遮罩层 */
.galgame-overlay {
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



/* UI控制按钮容器 */
.galgame-ui-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
  display: flex;
  flex-direction: row-reverse; /* 从右到左排列：履历、自动、隐藏 */
  gap: 4px;
  align-items: center;
  width: auto; /* 宽度自适应 */
}


/* 旋转高光动画 */
@keyframes rotating-highlight {
  0% {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  100% {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

/* 统一图标颜色 */
.galgame-container .fas {
  color: #ff69b4;
}

</style>
