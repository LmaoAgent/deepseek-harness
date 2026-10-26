/**
 * Turns a raw completion into at most a few one-line suggestions.
 *
 * @module @deepseek-ai/dsh-mcp-next-step/parse
 */

import { clip, normalize } from './text.ts'
import type { Suggestion } from './types.ts'

/** Longest suggestion text kept from one completion line. */
export const SUGGESTION_CLIP = 96

const LIST_MARKER = /^(?:[-*•·]|\d+[.)、]|[（(]\d+[)）])\s*/u
const EDGES = /^["'`“”‘’「」『』\s]+|["'`“”‘’「」『』\s]+$/gu
const TRAILING = /[。．.;；:：!！?？]+$/u

/** One parsed suggestion, or nothing when the line carries no text. */
function parseLine(raw: string, exclude: string): Suggestion | undefined {
  const stripped = raw
    .trim()
    .replace(LIST_MARKER, '')
    .replace(EDGES, '')
    .replace(TRAILING, '')
    .trim()
  if (stripped === '') return undefined
  if (normalize(stripped) === exclude) return undefined
  return { text: clip(stripped, SUGGESTION_CLIP) }
}

/**
 * Parses completion lines into unique suggestions.
 * @param text - Raw completion text, one suggestion per line.
 * @param options - How many to keep and which text to reject as a repeat.
 * @returns Distinct suggestions in completion order, capped at `options.limit`.
 */
export function parseSuggestions(text: string, options: { limit: number; exclude?: string }): Suggestion[] {
  const exclude = normalize(options.exclude ?? '')
  const seen = new Set<string>()
  const suggestions: Suggestion[] = []
  for (const line of text.split('\n')) {
    if (suggestions.length >= options.limit) break
    const suggestion = parseLine(line, exclude)
    if (suggestion === undefined) continue
    const key = normalize(suggestion.text)
    if (seen.has(key)) continue
    seen.add(key)
    suggestions.push(suggestion)
  }
  return suggestions
}
