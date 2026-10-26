/**
 * Text clipping, language detection, duplicate folding, and cache identities
 * shared by the digest, parser, and predictor.
 *
 * @module @deepseek-ai/dsh-mcp-next-step/text
 */

import { createHash } from 'node:crypto'
import type { Language } from './types.ts'

const CJK = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/u

/**
 * Cuts text to a character budget.
 * @param value - Source text, or nothing.
 * @param limit - Maximum retained characters.
 * @param fromEnd - Keeps the tail instead of the head.
 * @returns Trimmed text no longer than `limit`.
 */
export function clip(value: string | undefined, limit: number, fromEnd = false): string {
  const text = value?.trim() ?? ''
  if (text.length <= limit) return text
  return fromEnd ? text.slice(-limit) : text.slice(0, limit)
}

/**
 * Picks the output language from the text a prediction was given.
 * @param values - Candidate texts, most authoritative first.
 * @returns `zh` when CJK text appears, otherwise `en`.
 */
export function detectLanguage(...values: readonly (string | undefined)[]): Language {
  for (const value of values) {
    if (value !== undefined && CJK.test(value)) return 'zh'
  }
  return 'en'
}

/**
 * Folds text for duplicate detection.
 * @param value - Text to normalize.
 * @returns Lowercased text without whitespace, punctuation, or symbols.
 */
export function normalize(value: string): string {
  return value.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '')
}

/**
 * Hashes a cache identity.
 * @param parts - Components that must all match for a cache hit.
 * @returns Lowercase hex digest.
 */
export function cacheKey(...parts: readonly string[]): string {
  return createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 32)
}
