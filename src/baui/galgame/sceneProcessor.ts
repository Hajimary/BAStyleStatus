import type { Ref } from 'vue'
import type { GameState, GameScene, HistoryItem, CharacterDisplay, CGDisplay } from './types'
import { updateCharacterSprite, addToHistory } from './gameState'
import { handleCommand } from './commandHandler'

export async function processNextScene(
  gameState: Ref<GameState>,
  currentCharacterName: Ref<string>,
  currentDialogueText: Ref<string>,
  showNextIndicator: Ref<boolean>,
  historyList: Ref<HistoryItem[]>,
  leftCharacter: Ref<CharacterDisplay>,
  centerCharacter: Ref<CharacterDisplay>,
  rightCharacter: Ref<CharacterDisplay>,
  backgroundStyle: Ref<string>,
  cgImage: Ref<CGDisplay>,
  overlayOpacity: Ref<number>
) {
  const state = gameState.value

  if (state.currentIndex >= state.data.scenes.length) {
    showNextIndicator.value = false
    return
  }

  const scene = state.data.scenes[state.currentIndex]

  if (scene.type === 'dialogue') {
    await processDialogue(
      scene,
      currentCharacterName,
      currentDialogueText,
      historyList,
      leftCharacter,
      centerCharacter,
      rightCharacter
    )
  } else if (scene.type === 'command') {
    await handleCommand(
      scene,
      backgroundStyle,
      cgImage,
      overlayOpacity,
      leftCharacter,
      centerCharacter,
      rightCharacter
    )
  }

  state.currentIndex++
  showNextIndicator.value = state.currentIndex < state.data.scenes.length
}

async function processDialogue(
  scene: GameScene,
  currentCharacterName: Ref<string>,
  currentDialogueText: Ref<string>,
  historyList: Ref<HistoryItem[]>,
  leftCharacter: Ref<CharacterDisplay>,
  centerCharacter: Ref<CharacterDisplay>,
  rightCharacter: Ref<CharacterDisplay>
) {
  currentCharacterName.value = scene.character || '旁白'
  currentDialogueText.value = scene.text || ''

  // Handle character sprites based on position
  if (scene.position && scene.sprite) {
    await updateCharacterSprite(
      scene.position,
      scene.sprite,
      leftCharacter,
      centerCharacter,
      rightCharacter
    )
  }

  // Add to history
  addToHistory(historyList, scene.character || '旁白', scene.text || '')

  // Handle inline action if present
  if (scene.inlineAction) {
    // Process inline action
    console.log('Inline action:', scene.inlineAction)
  }
}

export function handleContainerClick(
  event: Event,
  gameState: Ref<GameState>,
  processNextSceneFn: () => void
) {
  event.stopPropagation()

  const state = gameState.value
  if (!state || state.processing) return
  if (state.showingChoices) return

  // Handle click for next dialogue
  if (state.waitingForClick) {
    processNextSceneFn()
  }
}
