import type { Ref } from 'vue'
import type { GameScene, CGDisplay, CharacterDisplay } from './types'
import { resolveImageUrl } from './imageAliasManager'

export async function handleCommand(
  scene: GameScene,
  backgroundStyle: Ref<string>,
  cgImage: Ref<CGDisplay>,
  overlayOpacity: Ref<number>,
  leftCharacter: Ref<any>,
  centerCharacter: Ref<any>,
  rightCharacter: Ref<any>
) {
  if (!scene.command) return

  const { command, args = [] } = scene

  switch(command) {
    case 'bg':
      await handleBackground(args[0], backgroundStyle)
      break

    case 'show':
      handleShowCharacter(args, leftCharacter, centerCharacter, rightCharacter)
      break

    case 'hide':
      handleHideCharacter(args[0], leftCharacter, centerCharacter, rightCharacter)
      break

    case 'cg':
      handleCG(args[0], cgImage, true)
      break

    case 'hide_cg':
      handleCG('', cgImage, false)
      break

    case 'fade':
    case 'fadeout':
    case 'fadein':
      await handleFade(command, overlayOpacity)
      break

    case 'clear':
      handleClear(leftCharacter, centerCharacter, rightCharacter, cgImage)
      break

    case 'shake':
      // Handle shake effect - would need to emit event or use ref
      break

    case 'effect':
      handleEffect(args[0])
      break

    default:
      console.log('Unknown command:', command)
  }
}

async function handleBackground(url: string | undefined, backgroundStyle: Ref<string>) {
  if (url) {
    backgroundStyle.value = `url(${url})`
  }
}

function handleShowCharacter(
  args: string[],
  leftCharacter: Ref<any>,
  centerCharacter: Ref<any>,
  rightCharacter: Ref<any>
) {
  const [_name, position, sprite] = args
  const pos = position?.toUpperCase() || 'C'

  switch(pos) {
    case 'L':
    case 'LEFT':
      leftCharacter.value.src = sprite || ''
      leftCharacter.value.active = true
      break
    case 'C':
    case 'CENTER':
      centerCharacter.value.src = sprite || ''
      centerCharacter.value.active = true
      break
    case 'R':
    case 'RIGHT':
      rightCharacter.value.src = sprite || ''
      rightCharacter.value.active = true
      break
  }
}

function handleHideCharacter(
  position: string | undefined,
  leftCharacter: Ref<any>,
  centerCharacter: Ref<any>,
  rightCharacter: Ref<any>
) {
  const pos = position?.toUpperCase() || ''

  switch(pos) {
    case 'L':
    case 'LEFT':
      leftCharacter.value.active = false
      break
    case 'C':
    case 'CENTER':
      centerCharacter.value.active = false
      break
    case 'R':
    case 'RIGHT':
      rightCharacter.value.active = false
      break
    case 'ALL':
      leftCharacter.value.active = false
      centerCharacter.value.active = false
      rightCharacter.value.active = false
      break
  }
}

function handleCG(url: string | undefined, cgImage: Ref<CGDisplay>, show: boolean) {
  if (show && url) {
    cgImage.value.src = url
    cgImage.value.active = true
  } else {
    cgImage.value.active = false
  }
}

async function handleFade(command: string, overlayOpacity: Ref<number>) {
  switch(command) {
    case 'fade':
    case 'fadeout':
      overlayOpacity.value = 1
      await wait(500)
      break
    case 'fadein':
      overlayOpacity.value = 0
      break
  }
}

function handleClear(
  leftCharacter: Ref<any>,
  centerCharacter: Ref<any>,
  rightCharacter: Ref<any>,
  cgImage: Ref<CGDisplay>
) {
  leftCharacter.value.active = false
  centerCharacter.value.active = false
  rightCharacter.value.active = false
  cgImage.value.active = false
}

function handleEffect(effectType: string | undefined) {
  // Handle special effects
  console.log('Effect:', effectType)
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
