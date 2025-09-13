import type { GameData, GameScene, InlineAction } from './types'

export function parseScript(scriptText: string, defaultBackground?: string): GameData {
  try {
    // Remove <think></think> and <thinking></thinking> blocks first
    let cleanedText = scriptText.replace(/<think>[\s\S]*?<\/think>/gi, '')
    cleanedText = cleanedText.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')

    // Extract content between <gametext> and </gametext> tags
    const gametextMatch = cleanedText.match(/.*<gametext>([\s\S]*?)<\/gametext>/i)

    if (!gametextMatch || !gametextMatch[1]) {
      // No gametext block found, return empty data
      return { scenes: [], currentSceneIndex: 0 }
    }

    // Parse only the content within gametext tags
    const gametextContent = gametextMatch[1].trim()
    const lines = gametextContent.split('\n')

    const gameData: GameData = {
      scenes: [],
      currentSceneIndex: 0,
    }

    const tempScenes: GameScene[] = []

    lines.forEach(line => {
      line = line.trim()
      if (!line) return

      // Check for command
      const commandMatch = line.match(/^\[(.+?)\]$/)
      if (commandMatch) {
        const fullCommand = commandMatch[1]
        const parts = fullCommand.split('|')
        const command = parts[0].trim()
        const args = parts.slice(1).map(arg => arg.trim())

        tempScenes.push({
          type: 'command',
          command,
          args,
          original: line,
        })
        return
      }

      // Check for dialogue
      const dialogueMatch = line.match(/^([^|]*)\|([^|]*)\|([^|]*)\|(.*)$/)
      if (dialogueMatch) {
        let spriteImg = dialogueMatch[3].trim()
        let text = dialogueMatch[4].trim()

        // Check for inline action
        const inlineActionMatch = text.match(/(.*?)(\[action\|.+?\])$/)
        let inlineAction: InlineAction | undefined = undefined

        if (inlineActionMatch) {
          text = inlineActionMatch[1].trim()
          const actionCommandMatch = inlineActionMatch[2].match(/^\[(.+?)\]$/)
          if (actionCommandMatch) {
            const actionParts = actionCommandMatch[1].split('|')
            inlineAction = {
              target: actionParts[1].trim(),
              name: actionParts[2].trim(),
              args: actionParts.slice(3).map(arg => arg.trim()),
            }
          }
        }

        const dialogData: GameScene = {
          type: 'dialogue',
          character: dialogueMatch[1].trim() || '旁白',
          position: dialogueMatch[2].trim().toUpperCase() || undefined,
          sprite: spriteImg,
          text: text,
          inlineAction: inlineAction,
          original: line,
        }

        tempScenes.push(dialogData)
        return
      }

      // Skip Unknown line
      /*
      tempScenes.push({
        type: 'unknown',
        original: line,
      })*/
    })

    // Add default background if specified
    if (defaultBackground) {
      tempScenes.unshift({
        type: 'command',
        command: 'bg',
        args: [defaultBackground],
        original: `[bg|${defaultBackground}]`,
      })
    }

    gameData.scenes = tempScenes
    return gameData
  } catch (error) {
    console.error('Error parsing script:', error)
    return { scenes: [], currentSceneIndex: 0 }
  }
}

export function isValidUrl(url: string): boolean {
  return !!url
}
