<template>
  <div 
    :class="spriteClasses"
    :style="customStyle"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  atlas: 'commonui' | 'emoji' | string;  // atlas名称
  sprite: string;  // 精灵名称
  scale?: number;  // 缩放比例
}

const props = withDefaults(defineProps<Props>(), {
  scale: 1
});

// 生成CSS类名
const spriteClasses = computed(() => {
  const atlasName = props.atlas.toLowerCase();
  const spriteName = props.sprite.toLowerCase().replace(/_/g, '-');
  return [
    'sprite-image',
    `${atlasName}-sprite`,
    `${atlasName}-${spriteName}`
  ];
});

// 自定义样式（用于缩放）
const customStyle = computed(() => {
  if (props.scale === 1) return {};
  return {
    transform: `scale(${props.scale})`,
    transformOrigin: 'top left'
  };
});
</script>

<style scoped lang="scss">
/* 导入生成的CSS文件 */
@import './generated/CommonUI.css';
@import './generated/Emoji.css';

.sprite-image {
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}
</style>