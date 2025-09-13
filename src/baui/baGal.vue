<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { GameData, GameConfig, HistoryItem, CharacterDisplay, CGDisplay, Choice } from './galgame/types'
import { DEFAULT_CONFIG } from './galgame/types'
import { createGameState, createCharacterDisplay, createCGDisplay } from './galgame/gameState'
import { processNextScene, handleContainerClick } from './galgame/sceneProcessor'
import { imageAliasManager } from './galgame/imageAliasManager'
import GalgameDialogue from './components/GalgameDialogue.vue'
import GalgameHistoryModal from './components/GalgameHistoryModal.vue'
import GalgameChoices from './components/GalgameChoices.vue'

// Props
const props = defineProps<{
  messageId: string
  gameData: GameData
  config?: Partial<GameConfig>
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
    overlayOpacity,
    showChoices,
    choices
  )
}

const toggleHistory = () => {
  showHistoryModal.value = !showHistoryModal.value
}

const handleChoiceSelection = (choiceAction: () => void) => {
  // Execute the choice action (triggers setinput and updates index)
  choiceAction()
  
  // Hide choices UI
  showChoices.value = false
  
  // Continue processing the next scene
  setTimeout(() => {
    processScene()
  }, 50)
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
        履历
      </button>

      <!-- History Modal Component -->
      <GalgameHistoryModal
        :visible="showHistoryModal"
        :history-list="historyList"
        @close="toggleHistory"
      />

      <!-- Dialogue Component -->
      <GalgameDialogue
        :show-next-indicator="showNextIndicator"
        :current-dialogue-text="currentDialogueText"
        :current-character-name="currentCharacterName"
        :org-name="'研讨会'"
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

/* 履历按钮 */
.galgame-history-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: rgba(244, 245, 246, 1); /* 不透明 */
  color: rgb(45,70,99);
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 4px 16px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  z-index: 10;
  transform: skewX(-12deg); /* 向右倾斜7度 */
  box-shadow: 1px 1px 0px rgba(0,0,0,0.3); /* 右下方1px阴影 */
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(240, 240, 240, 0.9);
  }
}


/* 统一图标颜色 */
.galgame-container .fas {
  color: #ff69b4;
}

</style>
