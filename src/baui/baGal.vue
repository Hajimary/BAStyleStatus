<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { GameData, GameConfig, HistoryItem, CharacterDisplay, CGDisplay, Choice } from './galgame/types'
import { DEFAULT_CONFIG } from './galgame/types'
import { createGameState, createCharacterDisplay, createCGDisplay } from './galgame/gameState'
import { processNextScene, handleContainerClick } from './galgame/sceneProcessor'
import { imageAliasManager } from './galgame/imageAliasManager'

// Props
const props = defineProps<{
  messageId: string
  gameData: GameData
  config?: Partial<GameConfig>
}>()

const defaultGameData = {
  "scenes": [
    {
      "type": "dialogue",
      "character": "旁白",
      "position": null,
      "sprite": "",
      "text": "橘望と光の訪問を受けた夕方の夏莱オフィス。窓から差し込む夕陽が、部屋を優しく染めている。",
      "inlineAction": null,
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
      "position": null,
      "sprite": "",
      "text": "「新しい路線、見に行きましょうか。せっかく来てくれたんですし」",
      "inlineAction": null,
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
      "inlineAction": null,
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
      "position": null,
      "sprite": "",
      "text": "数分後、CCCの列車制御室。最新鋭の制御パネルが並ぶ様子は、まるで未来の指令センターのようだ。",
      "inlineAction": null,
      "original": "旁白|||数分後、CCCの列車制御室。最新鋭の制御パネルが並ぶ様子は、まるで未来の指令センターのようだ。"
    },
    {
      "type": "dialogue",
      "character": "橘望",
      "position": "L",
      "sprite": "望正常A",
      "text": "ほらほら先生！これが私たちの新しいベイビーです！最新型の制御システムを搭載した特急列車！スピードも快適性も、今までの比じゃないんですよ！",
      "inlineAction": null,
      "original": "橘望|L|望正常A|ほらほら先生！これが私たちの新しいベイビーです！最新型の制御システムを搭載した特急列車！スピードも快適性も、今までの比じゃないんですよ！"
    },
    {
      "type": "dialogue",
      "character": "橘光",
      "position": "R",
      "sprite": "光正常A",
      "text": "うん……私たちで、設計から……全部……。望が、とっても頑張った……。",
      "inlineAction": null,
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
      "inlineAction": null,
      "original": "阿罗娜|C|阿罗娜默认|わぁ！すごいですね！新しい制御パネルの設計、とても効率的です！阿罗娜も勉強になります！"
    },
    {
      "type": "dialogue",
      "character": "橘望",
      "position": "L",
      "sprite": "望正常B",
      "text": "でしょでしょ？特に自慢なのは、新開発した自動運転システム！これがまた賢いんですよ。天候や乗客数に応じて、最適な速度とルートを自動で選択してくれるんです！",
      "inlineAction": null,
      "original": "橘望|L|望正常B|でしょでしょ？特に自慢なのは、新開発した自動運転システム！これがまた賢いんですよ。天候や乗客数に応じて、最適な速度とルートを自動で選択してくれるんです！"
    },
    {
      "type": "dialogue",
      "character": "橘光",
      "position": "R",
      "sprite": "光认真",
      "text": "安全性も……バッチリ……。何度も……テストした……。",
      "inlineAction": null,
      "original": "橘光|R|光认真|安全性も……バッチリ……。何度も……テストした……。"
    },
    {
      "type": "dialogue",
      "character": "阿罗娜",
      "position": "C",
      "sprite": "阿罗娜默认",
      "text": "素晴らしいです！でも、自動運転なのに、なぜ運転席はそのままなんですか？",
      "inlineAction": null,
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
      "inlineAction": null,
      "original": "橘光|R|光微笑|望は……運転が大好き……。私も……。"
    },
    {
      "type": "dialogue",
      "character": "旁白",
      "position": null,
      "sprite": "",
      "text": "制御室の大きなモニターには、新路線の完成予想図が映し出されている。グラフや数値が次々と更新され、システムの稼働状況を示している。",
      "inlineAction": null,
      "original": "旁白|||制御室の大きなモニターには、新路線の完成予想図が映し出されている。グラフや数値が次々と更新され、システムの稼働状況を示している。"
    },
    {
      "type": "dialogue",
      "character": "橘望",
      "position": "L",
      "sprite": "望正常A",
      "text": "先生！ちょっと運転席に座ってみませんか？特別に許可しちゃいます！",
      "inlineAction": null,
      "original": "橘望|L|望正常A|先生！ちょっと運転席に座ってみませんか？特別に許可しちゃいます！"
    },
    {
      "type": "dialogue",
      "character": "橘光",
      "position": "R",
      "sprite": "光害羞",
      "text": "私たちが……教えるから……。大丈夫……。",
      "inlineAction": null,
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

// State
const gameState = createGameState(defaultGameData as GameData, props.messageId)

const showHistoryModal = ref(false)
const historyList = ref<HistoryItem[]>([])

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

// Methods
const onContainerClick = (e: Event) => {
  handleContainerClick(e, gameState, processScene)
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
    overlayOpacity
  )
}

const toggleHistory = () => {
  showHistoryModal.value = !showHistoryModal.value
}

const handleChoiceClick = (choiceAction: () => void) => {
  choiceAction()
  showChoices.value = false
  gameState.value.showingChoices = false
}

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

      <!-- History Button -->
      <button
        :class="`galgame-history-btn galgame-history-btn-${messageId}`"
        @click.stop="toggleHistory"
      >
        <i class="fas fa-history"></i> 履历
      </button>

      <!-- History Modal -->
      <div
        v-if="showHistoryModal"
        :class="`galgame-history-modal galgame-history-modal-${messageId}`"
        :style="{ display: showHistoryModal ? 'block' : 'none' }"
      >
        <div :class="`galgame-history-content galgame-history-content-${messageId}`">
          <button
            :class="`galgame-history-close galgame-history-close-${messageId}`"
            @click="toggleHistory"
          >
            <i class="fas fa-times"></i>
          </button>
          <div :class="`galgame-history-title galgame-history-title-${messageId}`">
            对话履历
          </div>
          <div :class="`galgame-history-list galgame-history-list-${messageId}`">
            <div
              v-for="(item, index) in historyList"
              :key="index"
              :class="`galgame-history-item galgame-history-item-${messageId}`"
            >
              <strong>{{ item.character }}:</strong> {{ item.text }}
            </div>
          </div>
        </div>
      </div>

      <!-- Dialogue Box -->
      <div :class="`galgame-dialogue galgame-dialogue-${messageId}`">
        <div
          v-if="currentCharacterName"
          :class="`galgame-name galgame-name-${messageId}`"
        >
          {{ currentCharacterName }}
        </div>
        <div :class="`galgame-text galgame-text-${messageId}`">
          {{ currentDialogueText }}
        </div>
        <div
          v-if="showNextIndicator"
          :class="`galgame-next galgame-next-${messageId}`"
        >
          <i class="fas fa-caret-down"></i>
        </div>
      </div>

      <!-- Choices Area -->
      <div
        v-if="showChoices"
        :class="`galgame-choices galgame-choices-${messageId}`"
      >
        <button
          v-for="(choice, index) in choices"
          :key="index"
          :class="`galgame-choice galgame-choice-${messageId}`"
          @click.stop="handleChoiceClick(choice.action)"
        >
          {{ choice.text }}
        </button>
      </div>

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
  max-height: 120%;
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

/* 对话框 */
.galgame-dialogue {
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(3px);
  border-radius: 10px;
  padding: 25px 18px 15px 18px;
  margin: 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.15);
  position: relative;
  min-height: 80px;
  z-index: 4;
  height: v-bind('config.dialogueHeight + "%"');
  user-select: none;

  /* 移动端对话框高度调整 */
  @media (max-width: 767px) {
    height: v-bind('config.mobileDiaogueHeight + "%"');
    min-height: 120px;
  }
}

/* 角色名称 */
.galgame-name {
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
.galgame-text {
  margin-top: 0;
  color: #333;
  font-size: 17px;
  line-height: 1.5;
  user-select: none;
}

/* 下一步指示器 */
.galgame-next {
  position: absolute;
  bottom: 5px;
  right: 15px;
  font-size: 20px;
  color: #ff69b4;
  animation: pointer-pulse 1.5s infinite;
  user-select: none;
}

@keyframes pointer-pulse {
  0% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 0.7; }
}

/* 选项区域 */
.galgame-choices {
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
.galgame-choice {
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

  &:hover {
    background-color: rgba(240, 240, 240, 0.9);
    transform: translateY(-2px);
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

/* 履历按钮 */
.galgame-history-btn {
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

  &:hover {
    background-color: rgba(240, 240, 240, 0.9);
  }
}

/* 履历模态框 */
.galgame-history-modal {
  display: none;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 20;
}

.galgame-history-content {
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
}

.galgame-history-close {
  position: absolute;
  top: 10px;
  right: 10px;
  background: transparent;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;

  &:hover {
    color: #333;
  }
}

.galgame-history-title {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 15px;
  color: #333;
}

.galgame-history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.galgame-history-item {
  padding: 10px;
  background-color: rgba(255, 255, 255, 0.6);
  border-radius: 8px;

  strong {
    color: #ff69b4;
  }
}

/* 统一图标颜色 */
.galgame-container .fas {
  color: #ff69b4;
}

/* 保持履历按钮文字颜色不变 */
.galgame-history-btn {
  color: #333;
}
</style>
