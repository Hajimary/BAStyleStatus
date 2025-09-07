<template>
  <div class="sprite-gallery">
    <div class="gallery-header">
      <h2>精灵图库</h2>
      <div class="filter-controls">
        <label>
          <input type="checkbox" v-model="showCommonUI"> CommonUI
        </label>
        <label>
          <input type="checkbox" v-model="showEmoji"> Emoji
        </label>
        <input
          type="text"
          v-model="searchTerm"
          placeholder="搜索精灵名称..."
          class="search-input"
        >
      </div>
    </div>

    <!-- CommonUI 精灵区域 -->
    <div v-if="showCommonUI" class="atlas-section">
      <h3>CommonUI Atlas ({{ filteredCommonUISprites.length }} / {{ commonUISprites.length }})</h3>
      <div class="sprites-grid">
        <div
          v-for="sprite in filteredCommonUISprites"
          :key="sprite"
          class="sprite-item"
          @click="copySpriteName('commonui', sprite)"
          :title="点击复制使用代码"
        >
          <div class="sprite-preview">
            <SpriteImage atlas="commonui" :sprite="sprite" />
          </div>
          <div class="sprite-name">{{ sprite }}</div>
        </div>
      </div>
    </div>

    <!-- Emoji 精灵区域 -->
    <div v-if="showEmoji" class="atlas-section">
      <h3>Emoji Atlas ({{ filteredEmojiSprites.length }} / {{ emojiSprites.length }})</h3>
      <div class="sprites-grid">
        <div
          v-for="sprite in filteredEmojiSprites"
          :key="sprite"
          class="sprite-item"
          @click="copySpriteName('emoji', sprite)"
          :title="点击复制使用代码"
        >
          <div class="sprite-preview">
            <SpriteImage atlas="emoji" :sprite="sprite" />
          </div>
          <div class="sprite-name">{{ sprite }}</div>
        </div>
      </div>
    </div>

    <!-- 复制提示 -->
    <div v-if="copyMessage" class="copy-toast">
      {{ copyMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import SpriteImage from './SpriteImage.vue'
import { CommonUISprites } from './generated/CommonUISprites'
import { EmojiSprites } from './generated/EmojiSprites'

// 控制显示哪些图集
const showCommonUI = ref(true)
const showEmoji = ref(true)
const searchTerm = ref('')
const copyMessage = ref('')

// 获取所有精灵名称
const commonUISprites = Object.keys(CommonUISprites).map(name =>
  name.replace(/_/g, '-').toLowerCase()
)
const emojiSprites = Object.keys(EmojiSprites).map(name =>
  name.replace(/_/g, '-').toLowerCase()
)

// 过滤精灵
const filteredCommonUISprites = computed(() => {
  if (!searchTerm.value) return commonUISprites
  const term = searchTerm.value.toLowerCase()
  return commonUISprites.filter(sprite => sprite.includes(term))
})

const filteredEmojiSprites = computed(() => {
  if (!searchTerm.value) return emojiSprites
  const term = searchTerm.value.toLowerCase()
  return emojiSprites.filter(sprite => sprite.includes(term))
})

// 复制精灵使用代码
const copySpriteName = (atlas: string, sprite: string) => {
  const code = `<SpriteImage atlas="${atlas}" sprite="${sprite}" />`
  navigator.clipboard.writeText(code).then(() => {
    copyMessage.value = `已复制: ${code}`
    setTimeout(() => {
      copyMessage.value = ''
    }, 2000)
  }).catch(() => {
    copyMessage.value = `精灵名: ${atlas}/${sprite}`
    setTimeout(() => {
      copyMessage.value = ''
    }, 2000)
  })
}
</script>

<style scoped lang="scss">
.sprite-gallery {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.gallery-header {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #e0e0e0;

  h2 {
    margin: 0 0 15px 0;
    color: #333;
  }
}

.filter-controls {
  display: flex;
  gap: 20px;
  align-items: center;

  label {
    display: flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;

    input[type="checkbox"] {
      cursor: pointer;
    }
  }

  .search-input {
    flex: 1;
    max-width: 300px;
    padding: 6px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;

    &:focus {
      outline: none;
      border-color: #4CAF50;
    }
  }
}

.atlas-section {
  margin-bottom: 40px;

  h3 {
    margin: 20px 0 15px 0;
    color: #555;
    font-size: 18px;
    padding: 10px;
    background: #f5f5f5;
    border-radius: 4px;
  }
}

.sprites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 15px;
  padding: 10px;
}

.sprite-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  background: linear-gradient(45deg, #333 25%, #444 25%, #444 50%, #333 50%, #333 75%, #444 75%, #444);
  background-size: 20px 20px;
  border: 1px solid #666;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: linear-gradient(45deg, #4a4a4a 25%, #5a5a5a 25%, #5a5a5a 50%, #4a4a4a 50%, #4a4a4a 75%, #5a5a5a 75%, #5a5a5a);
    background-size: 20px 20px;
    border-color: #4CAF50;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }
}

.sprite-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60px;
  min-width: 60px;
  padding: 10px;
  background: transparent;
  border-radius: 4px;
  margin-bottom: 8px;
}

.sprite-name {
  font-size: 12px;
  color: #ddd;
  text-align: center;
  word-break: break-all;
  max-width: 100px;
  line-height: 1.3;
}

.copy-toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #333;
  color: white;
  padding: 12px 20px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.3s ease;
  font-size: 14px;
}

@keyframes slideIn {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
