/**
 * Builds the cross-plugin suggestion face over the resident input shells.
 *
 * @module @deepseek-ai/dsh-client-ui-conversation/input/suggestions
 */

import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ComposerSuggestions } from '../contract/suggestions.ts'

/** The per-Session shell member the staging face writes. */
export interface SuggestionTarget {
  /**
   * Stage or clear the ghost suggestion.
   * @param text - suggestion body, or null to clear it.
   */
  setSuggestion(text: string | null): void
}

/**
 * Wraps shell resolution in the published staging face.
 * @param shellFor - resolves the resident shell for one Session.
 * @returns the staging face other plugins call.
 */
export function createComposerSuggestions(shellFor: (sessionId: SessionId) => SuggestionTarget): ComposerSuggestions {
  return {
    set: (sessionId, text) => {
      shellFor(sessionId).setSuggestion(text)
    },
  }
}
