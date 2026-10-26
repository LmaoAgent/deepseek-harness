import { describe, expect, it, vi } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { createComposerSuggestions } from '../src/client/input/suggestions.ts'

describe('createComposerSuggestions', () => {
  it('stages and clears the suggestion on the resolved shell', () => {
    const setSuggestion = vi.fn()
    const shellFor = vi.fn(() => ({ setSuggestion }))
    const face = createComposerSuggestions(shellFor)
    const sessionId = 'session-1' as SessionId

    face.set(sessionId, '核对 #966 的 11 个文件差异')
    expect(shellFor).toHaveBeenCalledWith(sessionId)
    expect(setSuggestion).toHaveBeenLastCalledWith('核对 #966 的 11 个文件差异')

    face.set(sessionId, null)
    expect(setSuggestion).toHaveBeenLastCalledWith(null)
  })
})
