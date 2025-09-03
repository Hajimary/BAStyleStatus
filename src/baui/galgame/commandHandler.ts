import type { Ref } from 'vue'
import type { GameScene, CGDisplay, CharacterDisplay } from './types'
import { resolveImageUrl } from './imageAliasManager'

export async function handleCommand(
  scene: GameScene,
  backgroundStyle: Ref<string>,
  cgImage: Ref<CGDisplay>,
  overlayOpacity: Ref<number>,
  leftCharacter: Ref<CharacterDisplay>,
  centerCharacter: Ref<CharacterDisplay>,
  rightCharacter: Ref<CharacterDisplay>
) {
  if (!scene.command) return

  const { command, args = [] } = scene

  switch(command) {
    case 'bg':
      await handleBackground(args[0], backgroundStyle)
      break

    case 'show':
      await handleShowCharacter(args, leftCharacter, centerCharacter, rightCharacter)
      break

    case 'hide':
      handleHideCharacter(args[0], leftCharacter, centerCharacter, rightCharacter)
      break

    case 'cg':
      await handleCG(args[0], cgImage, true)
      break

    case 'hide_cg':
      await handleCG('', cgImage, false)
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
    const resolvedUrl = await resolveImageUrl(url)
    if (resolvedUrl) {
      backgroundStyle.value = `url(${resolvedUrl})`
    }
  }
}

async function handleShowCharacter(
  args: string[],
  leftCharacter: Ref<CharacterDisplay>,
  centerCharacter: Ref<CharacterDisplay>,
  rightCharacter: Ref<CharacterDisplay>
) {
  const [_name, position, sprite] = args
  const pos = position?.toUpperCase() || 'C'

  if (sprite) {
    const resolvedUrl = await resolveImageUrl(sprite)
    
    switch(pos) {
      case 'L':
      case 'LEFT':
        leftCharacter.value.src = resolvedUrl || ''
        leftCharacter.value.active = !!resolvedUrl
        break
      case 'C':
      case 'CENTER':
        centerCharacter.value.src = resolvedUrl || ''
        centerCharacter.value.active = !!resolvedUrl
        break
      case 'R':
      case 'RIGHT':
        rightCharacter.value.src = resolvedUrl || ''
        rightCharacter.value.active = !!resolvedUrl
        break
    }
  }
}

function handleHideCharacter(
  position: string | undefined,
  leftCharacter: Ref<CharacterDisplay>,
  centerCharacter: Ref<CharacterDisplay>,
  rightCharacter: Ref<CharacterDisplay>
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

async function handleCG(url: string | undefined, cgImage: Ref<CGDisplay>, show: boolean) {
  if (show && url) {
    const resolvedUrl = await resolveImageUrl(url)
    if (resolvedUrl) {
      cgImage.value.src = resolvedUrl
      cgImage.value.active = true
    }
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
  leftCharacter: Ref<CharacterDisplay>,
  centerCharacter: Ref<CharacterDisplay>,
  rightCharacter: Ref<CharacterDisplay>,
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
