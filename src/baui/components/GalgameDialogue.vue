<script setup lang="ts">
interface Props {
  showNextIndicator?: boolean
  currentDialogueText?: string
  currentCharacterName?: string
  orgName?: string
}

//@ts-ignore
const props = withDefaults(defineProps<Props>(), {
  showNextIndicator: false,
  currentDialogueText: '',
  currentCharacterName: '',
  orgName: '研讨会'
})
</script>

<template>
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
      {{ currentDialogueText }}
    </div>
  </div>

  <!-- Next Indicator (独立于对话框外) -->
  <div
    v-if="showNextIndicator"
    class="galgame-next"
  >
    <i class="fas fa-caret-down"></i>
  </div>
</template>

<style scoped lang="scss">
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
  bottom: 20%;
  right: 3%; /* 位于 galgame-dialogue 右侧 2%-4% 区域 */
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
</style>
