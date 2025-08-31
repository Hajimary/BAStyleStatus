export interface GameScene {
  type: 'dialogue' | 'command' | 'unknown'
  character?: string
  position?: string
  sprite?: string
  text?: string
  inlineAction?: InlineAction
  command?: string
  args?: string[]
  original: string
}

export interface InlineAction {
  target: string
  name: string
  args: string[]
}

export interface GameData {
  scenes: GameScene[]
  currentSceneIndex: number
}

export interface CharacterState {
  name: string | null
  sprite: string | null
}

export interface GameState {
  data: GameData
  currentIndex: number
  waitingForClick: boolean
  characters: {
    L: CharacterState
    C: CharacterState
    R: CharacterState
  }
  showingChoices?: boolean
  processing?: boolean
}

export interface CharacterDisplay {
  src: string
  active: boolean
  dimmed: boolean
}

export interface CGDisplay {
  src: string
  active: boolean
}

export interface Choice {
  text: string
  action: () => void
}

export interface HistoryItem {
  character: string
  text: string
}

export interface GameConfig {
  dialogueHeight: number
  mobileDiaogueHeight: number
  characterBottomOffset: number
  defaultBackground?: string
  typewriterSpeed?: number
  renderDepth?: number
  debug?: boolean
}

export const DEFAULT_CONFIG: GameConfig = {
  dialogueHeight: 30,
  mobileDiaogueHeight: 40,
  characterBottomOffset: 0,
  defaultBackground: '',
  typewriterSpeed: 30,
  renderDepth: 1,
  debug: false
}

export const TRANSPARENT_PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='