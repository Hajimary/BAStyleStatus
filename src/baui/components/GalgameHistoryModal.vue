<script setup lang="ts">
import type { HistoryItem } from '../galgame/types'

interface Props {
  visible?: boolean
  historyList?: HistoryItem[]
}

//@ts-ignore
const props = withDefaults(defineProps<Props>(), {
  visible: false,
  historyList: () => []
})

const emit = defineEmits<{
  close: []
}>()

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <!-- History Modal -->
  <div
    v-if="visible"
    class="galgame-history-modal"
    :style="{ display: visible ? 'block' : 'none' }"
  >
    <div class="galgame-history-content">
      <!-- 固定头部区域 -->
      <div class="galgame-history-header">
        <div class="galgame-history-title">
          对话履历
        </div>
        <button
          class="galgame-history-close"
          @click="handleClose"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <!-- 可滚动的历史记录列表 -->
      <div class="galgame-history-list">
        <div
          v-for="(item, index) in historyList"
          :key="index"
          class="galgame-history-item"
        >
          <strong>{{ item.character }}:</strong> {{ item.text }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import '../styles/modal.scss';

/* 履历模态框 */
.galgame-history-modal {
  @include modal-overlay;
}

.galgame-history-content {
  @include modal-content(90%, 80%, 600px);
}

/* 固定头部区域 */
.galgame-history-header {
  @include modal-header(true); // 使用渐变背景
}

.galgame-history-title {
  @include modal-title;
}

.galgame-history-close {
  @include modal-close-button;
}

.galgame-history-list {
  @include modal-body;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.galgame-history-item {
  padding: 10px;
  background-color: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  flex-shrink: 0;

  strong {
    color: #ff69b4;
  }
}
</style>