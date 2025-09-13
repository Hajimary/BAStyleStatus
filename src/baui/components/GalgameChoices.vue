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
        class="galgame-choice"
        @click.stop="handleChoiceClick(choice.action)"
      >
        {{ choice.text }}
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
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
</style>