import type { Ref } from 'vue'
import type { GameState, GameScene, HistoryItem, CharacterDisplay, CGDisplay, Choice } from './types'
import { updateCharacterSprite, addToHistory } from './gameState'
import { handleCommand } from './commandHandler'
import { bauiSettings } from '../settings'

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
  overlayOpacity: Ref<number>,
  showChoices?: Ref<boolean>,
  choices?: Ref<Choice[]>
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
    state.currentIndex++
    showNextIndicator.value = state.currentIndex < state.data.scenes.length
  } else if (scene.type === 'command') {
    // Handle choice command specially
    if (scene.command === 'choice') {
      await handleChoice(scene, gameState, showChoices, choices, showNextIndicator)
    } else {
      await handleCommand(
        scene,
        backgroundStyle,
        cgImage,
        overlayOpacity,
        leftCharacter,
        centerCharacter,
        rightCharacter
      )
      state.currentIndex++
      showNextIndicator.value = state.currentIndex < state.data.scenes.length
      // Auto-continue for non-interactive commands
      if (scene.command !== 'wait') {
        setTimeout(() => {
          processNextScene(
            gameState,
            currentCharacterName,
            currentDialogueText,
            showNextIndicator,
            historyList,
            leftCharacter,
            centerCharacter,
            rightCharacter,
            backgroundStyle,
            cgImage,
            overlayOpacity,
            showChoices,
            choices
          )
        }, 50)
      }
    }
  }
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

export async function handleChoice(
  scene: GameScene,
  gameState: Ref<GameState>,
  showChoices?: Ref<boolean>,
  choices?: Ref<Choice[]>,
  showNextIndicator?: Ref<boolean>
) {
  if (!showChoices || !choices) return

  const state = gameState.value
  const args = scene.args || []

  // Hide next indicator
  if (showNextIndicator) {
    showNextIndicator.value = false
  }

  // Set up choices
  const choiceList: Choice[] = []

  args.forEach((choiceText: string) => {
    // Remove any tag parts (e.g., "choice text>tag")
    let text = choiceText.trim()
    const tagIndex = text.indexOf('>')
    if (tagIndex !== -1) {
      text = text.substring(0, tagIndex).trim()
    }

    choiceList.push({
      text,
      action: () => {
        // Check if we're in the last message
        if (getLastMessageId() == getCurrentMessageId()) {
          // Use the configured input mode
          if (bauiSettings.input_mode === '直接发送') {
            if (typeof (window as any).triggerSlash === 'function') {
              (window as any).triggerSlash(`/send ${text} || /trigger`);
            }
          } else if (bauiSettings.input_mode === '覆盖输入') {
            if (typeof (window as any).triggerSlash === 'function') {
              (window as any).triggerSlash(`/setinput ${text}`);
            }
          } else if (bauiSettings.input_mode === '尾附输入') {
            const old_content = ($('#send_textarea').val() as string) || '';
            $('#send_textarea')
              .val([old_content, text].join('\n'))[0]
              .dispatchEvent(new Event('input', { bubbles: true }));
          } else if (bauiSettings.input_mode === '自动推进') {
            // Auto advance - do nothing special, just continue
          }
        } else if (typeof (window as any).triggerSlash === 'function') {
          (window as any).triggerSlash(`/setinput ${text}`);
        }

        // Move to next scene and continue processing
        state.currentIndex++
        state.showingChoices = false
      }
    })
  })

  // Show choices
  choices.value = choiceList
  showChoices.value = true
  state.showingChoices = true
}
