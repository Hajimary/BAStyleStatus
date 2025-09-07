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
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css');

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
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 固定头部区域 */
.galgame-history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 20px 0 20px;
  flex-shrink: 0;
}

.galgame-history-close {
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
  color: #333;
}

.galgame-history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 15px 20px 20px 20px;
  overflow-y: auto;
  flex: 1;
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