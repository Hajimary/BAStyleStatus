#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function parseUnityMeta(metaContent) {
  const sprites = [];
  const lines = metaContent.split('\n');

  let currentSprite = {};
  let inSpriteSection = false;
  let captureRect = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 捕获精灵名称
    if (trimmed.includes('name:') && (trimmed.includes('Common_') || trimmed.includes('Emoji_'))) {
      const match = trimmed.match(/name:\s*(.+)/);
      if (match) {
        currentSprite.name = match[1].trim();
        inSpriteSection = true;
      }
    } else if (inSpriteSection) {
      // 捕获rect数据
      if (trimmed === 'rect:') {
        captureRect = true;
      } else if (captureRect) {
        if (trimmed.startsWith('x:')) {
          currentSprite.x = parseFloat(trimmed.split(':')[1]);
        } else if (trimmed.startsWith('y:')) {
          currentSprite.y = parseFloat(trimmed.split(':')[1]);
        } else if (trimmed.startsWith('width:')) {
          currentSprite.width = parseFloat(trimmed.split(':')[1]);
        } else if (trimmed.startsWith('height:')) {
          currentSprite.height = parseFloat(trimmed.split(':')[1]);
          captureRect = false;
        }
      }

      // 结束sprite数据
      if (trimmed === 'outline: []' || trimmed === 'physicsShape: []') {
        if (currentSprite.name && currentSprite.x !== undefined && currentSprite.y !== undefined &&
            currentSprite.width !== undefined && currentSprite.height !== undefined) {
          sprites.push({...currentSprite});
        }
        currentSprite = {};
        inSpriteSection = false;
      }
    }
  }

  return sprites;
}

function generateCSS(atlasName, sprites) {
  const className = atlasName.toLowerCase();
  let css = `/* Auto-generated sprite sheet: ${atlasName}.png */\n`;
  css += `/* Generated at: ${new Date().toISOString()} */\n\n`;

  // 基础类 - 使用CDN绝对路径
  css += `.${className}-sprite {\n`;
  css += `  background-image: url('https://testingcf.jsdelivr.net/gh/Hajimary/BAStyleStatus@main/src/baui/atlas/${atlasName}.png');\n`;
  css += `  background-repeat: no-repeat;\n`;
  css += `  display: inline-block;\n`;
  css += `  image-rendering: pixelated;\n`;
  css += `  image-rendering: -moz-crisp-edges;\n`;
  css += `  image-rendering: crisp-edges;\n`;
  css += `}\n\n`;

  // 各个精灵的类
  sprites.forEach(sprite => {
    const safeName = sprite.name.replace(/_/g, '-').replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
    css += `.${className}-sprite.${className}-${safeName} {\n`;
    // 使用转换后的CSS坐标
    css += `  background-position: -${sprite.cssX || sprite.x}px -${sprite.cssY || sprite.y}px;\n`;
    css += `  width: ${sprite.width}px;\n`;
    css += `  height: ${sprite.height}px;\n`;
    css += `}\n\n`;
  });

  return css;
}

function generateTypescript(atlasName, sprites, imagePath) {
  let ts = `// Auto-generated sprite data for ${atlasName}.png\n`;
  ts += `// Generated at: ${new Date().toISOString()}\n\n`;

  ts += `export interface ${atlasName}Sprite {\n`;
  ts += `  x: number;\n`;
  ts += `  y: number;\n`;
  ts += `  width: number;\n`;
  ts += `  height: number;\n`;
  ts += `}\n\n`;

  ts += `export const ${atlasName}Sprites: Record<string, ${atlasName}Sprite> = {\n`;

  sprites.forEach((sprite, index) => {
    ts += `  '${sprite.name}': {\n`;
    ts += `    x: ${sprite.x},\n`;
    ts += `    y: ${sprite.y},\n`;
    ts += `    width: ${sprite.width},\n`;
    ts += `    height: ${sprite.height}\n`;
    ts += `  }${index < sprites.length - 1 ? ',' : ''}\n`;
  });

  ts += `};\n\n`;
  ts += `export const ${atlasName}ImagePath = '${imagePath}';\n`;

  return ts;
}

function getImageDimensions(atlasName) {
  // 硬编码已知的图片尺寸
  const dimensions = {
    'CommonUI': { width: 2048, height: 2048 },
    'Emoji': { width: 1024, height: 1024 }
  };
  return dimensions[atlasName] || { width: 2048, height: 2048 };
}

function processAtlasFiles() {
  const atlasDir = path.join(__dirname, '..', 'src', 'baui', 'atlas');
  const distDir = path.join(__dirname, '..', 'src', 'baui', 'atlas', 'generated');

  // 确保dist/baui目录存在
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // 查找所有.meta文件
  const metaFiles = fs.readdirSync(atlasDir)
    .filter(file => file.endsWith('.png.meta'));

  if (metaFiles.length === 0) {
    console.log('⚠️  No .meta files found in', atlasDir);
    return;
  }

  console.log(`📋 Found ${metaFiles.length} atlas file(s) to process\n`);

  metaFiles.forEach(metaFile => {
    const metaPath = path.join(atlasDir, metaFile);
    const baseName = metaFile.replace('.png.meta', '');
    const imagePath = `./atlas/${baseName}.png`;

    console.log(`🔄 Processing ${baseName}...`);

    try {
      const metaContent = fs.readFileSync(metaPath, 'utf-8');
      const sprites = parseUnityMeta(metaContent);

      if (sprites.length === 0) {
        console.log(`  ⚠️  No sprites found in ${metaFile}`);
        return;
      }

      console.log(`  📦 Found ${sprites.length} sprites`);
      
      // 获取图片尺寸用于坐标转换
      const imageDimensions = getImageDimensions(baseName);
      
      // 转换Unity坐标到CSS坐标（Y轴翻转）
      sprites.forEach(sprite => {
        // CSS的Y坐标 = 图片高度 - Unity的Y坐标 - 精灵高度
        sprite.cssY = imageDimensions.height - sprite.y - sprite.height;
        sprite.cssX = sprite.x;
      });

      // 生成CSS文件
      const cssContent = generateCSS(baseName, sprites);
      const cssPath = path.join(distDir, `${baseName}.css`);
      fs.writeFileSync(cssPath, cssContent);
      console.log(`  ✅ Generated ${baseName}.css`);

      // 生成TypeScript定义文件
      const tsContent = generateTypescript(baseName, sprites, imagePath);
      const tsPath = path.join(distDir, `${baseName}Sprites.ts`);
      fs.writeFileSync(tsPath, tsContent);
      console.log(`  ✅ Generated ${baseName}Sprites.ts`);

      // 不再需要复制图片到generated文件夹，webpack会处理
      console.log(`  ℹ️  ${baseName}.png will be processed by webpack\n`);

    } catch (error) {
      console.error(`  ❌ Error processing ${metaFile}:`, error.message);
    }
  });

  console.log('✨ Atlas CSS generation complete!');
}

// 执行主函数
processAtlasFiles();
