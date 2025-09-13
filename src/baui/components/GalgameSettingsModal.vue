<script setup lang="ts">
import { ref, watch } from 'vue'
import type { BauiOption } from '../settings'
import { bauiSettings, initializeBauiSettings, setSettings } from '../settings'

interface Props {
  visible?: boolean
}

//@ts-ignore
const props = withDefaults(defineProps<Props>(), {
  visible: false
})

const emit = defineEmits<{
  close: []
  save: [settings: BauiOption]
}>()

// Local settings state
const localSettings = ref<BauiOption>({
  input_mode: '直接发送',
  chars_per_second: 10
})

// Input mode options
const inputModeOptions = [
  { value: '直接发送', label: '直接发送' },
  { value: '覆盖输入', label: '覆盖输入' },
  { value: '尾附输入', label: '尾附输入' },
  { value: '自动推进', label: '自动推进' }
]

// Initialize local settings when modal opens
watch(() => props.visible, async (newVal) => {
  if (newVal) {
    await initializeBauiSettings()
    localSettings.value = {
      input_mode: bauiSettings.input_mode,
      chars_per_second: bauiSettings.chars_per_second
    }
  }
})

const handleClose = () => {
  emit('close')
}

const handleSave = async () => {
  // Validate chars_per_second
  const cps = Number(localSettings.value.chars_per_second)
  if (isNaN(cps) || cps <= 0 || cps > 100) {
    localSettings.value.chars_per_second = 10
  }

  // Save settings
  const settingsToSave: BauiOption = {
    input_mode: localSettings.value.input_mode,
    chars_per_second: localSettings.value.chars_per_second
  }

  // Save using the new setSettings method
  const success = await setSettings(settingsToSave)

  if (success) {
    emit('save', settingsToSave)
  } else {
    console.error('Failed to save settings')
  }

  emit('close')
}
</script>

<template>
  <!-- Settings Modal -->
  <div
    v-if="visible"
    class="galgame-settings-modal"
    :style="{ display: visible ? 'block' : 'none' }"
  >
    <div class="galgame-settings-content">
      <!-- Fixed header -->
      <div class="galgame-settings-header">
        <div class="galgame-settings-title">
          游戏设置
        </div>
        <button
          class="galgame-settings-close"
          @click="handleClose"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- Settings form -->
      <div class="galgame-settings-form">
        <!-- Input Mode Setting -->
        <div class="galgame-settings-item">
          <label class="galgame-settings-label">
            输入模式
          </label>
          <select
            v-model="localSettings.input_mode"
            class="galgame-settings-select"
          >
            <option
              v-for="option in inputModeOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
          <div class="galgame-settings-hint">
            选择点击选项时的输入行为
          </div>
        </div>

        <!-- Typing Speed Setting -->
        <div class="galgame-settings-item">
          <label class="galgame-settings-label">
            打字速度
          </label>
          <div class="galgame-settings-input-group">
            <input
              v-model.number="localSettings.chars_per_second"
              type="number"
              min="1"
              max="100"
              class="galgame-settings-input"
            >
            <span class="galgame-settings-unit">字/秒</span>
          </div>
          <div class="galgame-settings-hint">
            对话文字显示速度 (1-100)
          </div>
        </div>
      </div>

      <!-- Buttons -->
      <div class="galgame-settings-footer">
        <button
          class="galgame-settings-btn galgame-settings-btn-cancel"
          @click="handleClose"
        >
          取消
        </button>
        <button
          class="galgame-settings-btn galgame-settings-btn-save"
          @click="handleSave"
        >
          保存
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import '../styles/modal.scss';

/* 设置模态框 */
.galgame-settings-modal {
  @include modal-overlay;
}

.galgame-settings-content {
  @include modal-content;
}

/* 固定头部 */
.galgame-settings-header {
  @include modal-header;
}

.galgame-settings-title {
  @include modal-title;
}

.galgame-settings-close {
  @include modal-close-button;
}

/* 设置表单 */
.galgame-settings-form {
  @include modal-body;
}

.galgame-settings-item {
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }
}

.galgame-settings-label {
  display: block;
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.galgame-settings-select {
  width: 100%;
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background-color: white;
  cursor: pointer;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #667eea;
  }
}

.galgame-settings-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.galgame-settings-input {
  flex: 1;
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #ddd;
  border-radius: 6px;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #667eea;
  }
}

.galgame-settings-unit {
  font-size: 14px;
  color: #666;
}

.galgame-settings-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #888;
}

/* 底部按钮 */
.galgame-settings-footer {
  @include modal-footer;
}

.galgame-settings-btn-cancel {
  @include modal-button-cancel;
}

.galgame-settings-btn-save {
  @include modal-button-primary;
}
</style>