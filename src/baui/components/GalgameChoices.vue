<script setup lang="ts">
import type { Choice } from '../galgame/types'

// Props
const props = defineProps<{
  showChoices: boolean
  choices: Choice[]
}>()

// Emits
const emit = defineEmits<{
  choiceClick: [choiceAction: () => void]
}>()

// Methods
const handleChoiceClick = (choiceAction: () => void) => {
  emit('choiceClick', choiceAction)
}
</script>

<template>
  <div v-if="showChoices">
    <!-- Semi-transparent overlay -->
    <div
      class="galgame-choice-overlay"
      @click.stop
    />

    <!-- Choices Area -->
    <div class="galgame-choices">
      <button
        v-for="(choice, index) in choices"
        :key="index"
        class="galgame-btn galgame-btn-primary galgame-choice-btn"
        @click.stop="handleChoiceClick(choice.action)"
      >
        {{ choice.text }}
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import '../styles/global.scss';

/* 半透明遮罩层 */
.galgame-choice-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 4;
}

/* 选项区域 */
.galgame-choices {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  max-width: 400px;
  z-index: 6;
  user-select: none;
}

/* 选项按钮特殊调整 */
.galgame-choice-btn {
  width: 100%;
  padding: 12px 20px;
  font-size: 18px;
  text-align: center;
  transform: skewX(0); /* 选择按钮不倾斜 */

  &:hover {
    transform: translateY(-2px);
  }
}
</style>
