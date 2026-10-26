/**
 * The two-message digest sent to the prediction model, with the character caps
 * that keep one prediction cheap.
 *
 * @module @deepseek-ai/dsh-mcp-next-step/prompt
 */

import { clip } from './text.ts'
import type { ChatMessage, Language } from './types.ts'

/** Longest human message forwarded to the prediction model. */
export const USER_CLIP = 600
/** Longest assistant tail forwarded to the prediction model. */
export const ASSISTANT_CLIP = 1000

const SYSTEM: Record<Language, (count: number) => string> = {
  en: count => `You predict the human's next message in a coding-agent session.
Return at most ${count} suggestions, one per line, imperative, at most 10 words each.
No numbering, quotes, prefixes, or explanation. Match the session language.
Prefer the single most useful continuation and never repeat work already reported finished.`,
  zh: count => `你在预测一次编程协作中人类的下一条消息。
最多输出 ${count} 条建议，每行一条，用祈使句，每条不超过 10 个词。
不要编号、引号、前缀或解释。使用与对话相同的语言。
优先给出最有用的下一步，不要重复已经完成的工作。`,
}

/**
 * Builds the provider messages for one digest.
 * @param input - Clipped-or-raw exchange fields and the output language.
 * @param maxSuggestions - Number of suggestions the system prompt asks for.
 * @returns System prompt followed by the digest.
 */
export function buildMessages(input: { user: string; assistant: string; language: Language }, maxSuggestions: number): ChatMessage[] {
  const digest = [
    `Human: ${clip(input.user, USER_CLIP)}`,
    `Assistant tail: ${clip(input.assistant, ASSISTANT_CLIP, true)}`,
  ].join('\n')
  return [
    { role: 'system', content: SYSTEM[input.language](maxSuggestions) },
    { role: 'user', content: digest },
  ]
}
