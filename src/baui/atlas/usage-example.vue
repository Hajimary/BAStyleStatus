<template>
  <div class="example">
    <h3>在 baGal.vue 中使用精灵图示例</h3>
    
    <!-- 使用组件方式 -->
    <SpriteImage atlas="commonui" sprite="common-0" />
    <SpriteImage atlas="commonui" sprite="common-1" :scale="2" />
    
    <!-- 表情精灵 -->
    <SpriteImage atlas="emoji" sprite="emoji-heart" />
    <SpriteImage atlas="emoji" sprite="emoji-sad" :scale="1.5" />
    
    <!-- 动态切换精灵 -->
    <SpriteImage atlas="commonui" :sprite="currentSprite" />
    <button @click="switchSprite">切换</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SpriteImage from './SpriteImage.vue'

const sprites = ['common-0', 'common-1', 'common-2', 'common-3']
const currentIndex = ref(0)
const currentSprite = ref(sprites[0])

const switchSprite = () => {
  currentIndex.value = (currentIndex.value + 1) % sprites.length
  currentSprite.value = sprites[currentIndex.value]
}
</script>

<style scoped lang="scss">
.example {
  padding: 20px;
  
  button {
    margin-left: 10px;
    padding: 5px 10px;
  }
}
</style>