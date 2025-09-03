import { ref } from 'vue'
import type { Ref } from 'vue'
import type { GameState, GameData, CharacterDisplay, CGDisplay, HistoryItem } from './types'
import { resolveImageUrl } from './imageAliasManager'

export function createGameState(gameData: GameData, _messageId: string) {
  const gameState = ref<GameState>({
    data: gameData,
    currentIndex: 0,
    waitingForClick: true,
    characters: {
      L: { name: null, sprite: null },
      C: { name: null, sprite: null },
      R: { name: null, sprite: null },
    }
  })

  return gameState
}

export function createCharacterDisplay(): CharacterDisplay {
  return {
    src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    active: false,
    dimmed: false
  }
}

export function createCGDisplay(): CGDisplay {
  return {
    src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    active: false
  }
}

export async function updateCharacterSprite(
  position: string,
  sprite: string,
  leftCharacter: Ref<CharacterDisplay>,
  centerCharacter: Ref<CharacterDisplay>,
  rightCharacter: Ref<CharacterDisplay>
) {
  const pos = position.toUpperCase()
  const resolvedUrl = await resolveImageUrl(sprite)

  // Reset dimmed state for all
  leftCharacter.value.dimmed = false
  centerCharacter.value.dimmed = false
  rightCharacter.value.dimmed = false

  switch(pos) {
    case 'L':
    case 'LEFT':
      leftCharacter.value.src = resolvedUrl || sprite
      leftCharacter.value.active = !!sprite
      centerCharacter.value.dimmed = true
      rightCharacter.value.dimmed = true
      break
    case 'C':
    case 'CENTER':
      centerCharacter.value.src = resolvedUrl || sprite
      centerCharacter.value.active = !!sprite
      leftCharacter.value.dimmed = true
      rightCharacter.value.dimmed = true
      break
    case 'R':
    case 'RIGHT':
      rightCharacter.value.src = resolvedUrl || sprite
      rightCharacter.value.active = !!sprite
      leftCharacter.value.dimmed = true
      centerCharacter.value.dimmed = true
      break
  }
}

export function addToHistory(
  historyList: Ref<HistoryItem[]>,
  character: string,
  text: string
) {
  historyList.value.push({
    character: character || '旁白',
    text: text || ''
  })
}
