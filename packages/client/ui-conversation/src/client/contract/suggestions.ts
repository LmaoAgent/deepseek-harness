/**
 * Cross-plugin staging face for the composer's ghost suggestion.
 *
 * @module @deepseek-ai/dsh-client-ui-conversation/contract/suggestions
 */

import type { SessionId } from '@deepseek-ai/dsh-session/types'

/**
 * Stages one suggestion per Session. The composer renders it on the
 * placeholder layer while the draft is empty and accepts it with Tab; any
 * plugin may write it without reaching the editor.
 */
export interface ComposerSuggestions {
  /**
   * Stage or clear the ghost suggestion for one Session.
   * @param sessionId - target Session.
   * @param text - suggestion body, or null to clear it.
   */
  set(sessionId: SessionId, text: string | null): void
}
