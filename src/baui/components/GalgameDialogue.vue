<script setup lang="ts">
import { ref, watch, onUnmounted, onMounted, computed } from 'vue'
import { bauiSettings, initializeBauiSettings } from '../settings'
import { getOrganizationByCharacter } from '../galgame/characterConstants'

interface Props {
  showNextIndicator?: boolean
  currentDialogueText?: string
  currentCharacterName?: string
}

//@ts-ignore
const props = withDefaults(defineProps<Props>(), {
  showNextIndicator: false,
  currentDialogueText: '',
  currentCharacterName: ''
})

// 显示的文本（打字机效果）
const displayedText = ref('')
let typewriterTimer: ReturnType<typeof setInterval> | null = null

// 打字机是否正在进行
const isTyping = ref(false)

// 打字机效果配置
const charsPerSecond = ref(10)
const intervalMs = ref(100)

// 计算属性：根据角色名获取组织名
const orgName = computed(() => {
  return getOrganizationByCharacter(props.currentCharacterName)
})

// 监听文本变化
watch(() => props.currentDialogueText, (newText) => {
  // 清除之前的定时器
  if (typewriterTimer) {
    clearInterval(typewriterTimer)
    typewriterTimer = null
  }

  // 重置显示的文本
  displayedText.value = ''
  isTyping.value = false

  if (!newText) {
    return
  }

  // 开始打字机效果
  isTyping.value = true
  let charIndex = 0
  typewriterTimer = setInterval(() => {
    if (charIndex < newText.length) {
      displayedText.value = newText.slice(0, charIndex + 1)
      charIndex++
    } else {
      // 文本显示完毕，清除定时器
      if (typewriterTimer) {
        clearInterval(typewriterTimer)
        typewriterTimer = null
      }
      isTyping.value = false
    }
  }, intervalMs.value)
}, { immediate: true })

// 初始化设置
onMounted(async () => {
  await initializeBauiSettings()
  charsPerSecond.value = bauiSettings.chars_per_second || 10
  intervalMs.value = 1000 / charsPerSecond.value
})

// 组件卸载时清理定时器
onUnmounted(() => {
  if (typewriterTimer) {
    clearInterval(typewriterTimer)
  }
})

// 点击立即显示全部文本
const skipTypewriter = () => {
  if (typewriterTimer && displayedText.value !== props.currentDialogueText) {
    clearInterval(typewriterTimer)
    typewriterTimer = null
    displayedText.value = props.currentDialogueText
    isTyping.value = false
  }
}

defineExpose({
  skipTypewriter,
  displayedText,
  isTyping
})
</script>

<template>
  <div class="galgame-dialogue-wrapper">
    <!-- Background Gradient -->
    <div class="galgame-dialogue-bg"></div>

    <!-- Dialogue Box -->
    <div class="galgame-dialogue">
      <!-- Row 1: Character Name and Organization -->
      <div class="galgame-dialogue-header">
        <span
          v-if="currentCharacterName"
          class="galgame-name"
        >
          {{ currentCharacterName }}
        </span>
        <span class="galgame-org">{{ orgName }}</span>
      </div>

      <!-- Row 2: Divider -->
      <div class="galgame-divider"></div>

      <!-- Row 3: Dialogue Text -->
      <div class="galgame-text">
        {{ displayedText }}
      </div>
    </div>

    <!-- Next Indicator (独立于对话框外) -->
    <div
      v-if="showNextIndicator && !isTyping"
      class="galgame-next"
    >
      <i class="fas fa-caret-down"></i>
    </div>
    <div v-if="isTyping" class="typing-indicator-location">
      <span class="typing-indicator">.</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
/* 包装容器 */
.galgame-dialogue-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* 确保不影响点击事件 */
}

/* 背景渐变层 */
.galgame-dialogue-bg {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 50%;
  background: linear-gradient(to top, rgba(128, 128, 128, 0.4), rgba(128, 128, 128, 0));
  z-index: 3;
  pointer-events: none;
}

/* 对话框 */
.galgame-dialogue {
  position: absolute;
  bottom: 0;
  left: 7%;
  right: 8%;
  height: 40%;
  z-index: 4;
  user-select: none;
  display: grid;
  grid-template-rows: auto auto 1fr;
  padding: 20px;
  align-content: center;

  /* 移动端对话框调整 */
  @media (max-width: 767px) {
    left: 5%;
    right: 5%;
    padding: 15px;
  }
}

/* 对话框头部 */
.galgame-dialogue-header {
  display: flex;
  align-items: flex-end; /* 垂直靠下对齐 */
  gap: 8px;
}

/* 角色名称 */
.galgame-name {
  color: white;
  font-weight: bold;
  font-size: 24px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  user-select: none;
}

/* 所属机构 */
.galgame-org {
  color: rgba(157, 216, 255, 0.8);
  font-size: 18px;
  font-weight: bold;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  user-select: none;
  padding-bottom: 2px;
}

/* 分割线 */
.galgame-divider {
  height: 1px;
  background-color: rgba(128, 128, 128, 0.5);
  margin: 10px 0;
}

/* 对话文本 */
.galgame-text {
  color: white;
  font-size: 14px;
  line-height: 1.6;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  user-select: none;
  overflow-y: auto;
}

/* 下一步指示器 */
.galgame-next {
  position: absolute;
  bottom: 3%;
  right: 5%; /* 位于 galgame-dialogue 右侧 2%-4% 区域 */
  font-size: 20px;
  color: rgba(255, 255, 255, 0.8);
  animation: float-vertical 2s ease-in-out infinite;
  user-select: none;
  z-index: 5;
  pointer-events: none;
}

@keyframes float-vertical {
  0% { transform: translateY(0px); opacity: 0.7; }
  50% { transform: translateY(-8px); opacity: 1; }
  100% { transform: translateY(0px); opacity: 0.7; }
}

/* 打字指示器 */
.typing-indicator {
  display: inline-block;
  margin-left: 2px;
  letter-spacing: 2px;
  animation: typing-dots 1.5s infinite;
}

.typing-indicator-location {
  position: absolute;
  bottom: 3%;
  left: 50%;
  transform: translateX(-50%); /* 水平居中 */
  font-size: 20px;
  color: rgba(255, 255, 255, 0.8);
  user-select: none;
  z-index: 5;
  pointer-events: none;
}

@keyframes typing-dots {
  0%, 20% {
    color: rgba(255, 255, 255, 0.2);
    text-shadow:
      0.25em 0 0 rgba(255, 255, 255, 0.2),
      0.5em 0 0 rgba(255, 255, 255, 0.2);
  }
  40% {
    color: white;
    text-shadow:
      0.25em 0 0 rgba(255, 255, 255, 0.2),
      0.5em 0 0 rgba(255, 255, 255, 0.2);
  }
  60% {
    color: rgba(255, 255, 255, 0.2);
    text-shadow:
      0.25em 0 0 white,
      0.5em 0 0 rgba(255, 255, 255, 0.2);
  }
  80%, 100% {
    color: rgba(255, 255, 255, 0.2);
    text-shadow:
      0.25em 0 0 rgba(255, 255, 255, 0.2),
      0.5em 0 0 white;
  }
}
</style>
