/**
 * Environment-driven configuration for the stdio server.
 *
 * @module @deepseek-ai/dsh-mcp-next-step/config
 */

import type { Language, PredictorConfig } from './types.ts'

const DEFAULT_BASE_URL = 'https://api.deepseek.com'
const DEFAULT_MODEL = 'deepseek-chat'
const DEFAULT_MAX_TOKENS = 96
const DEFAULT_TIMEOUT_MS = 8000
const DEFAULT_CACHE_TTL_MS = 300_000
const DEFAULT_MAX_SUGGESTIONS = 2

/** Reads a bounded integer, ignoring unparsable values. */
function readInt(raw: string | undefined, fallback: number, min: number, max: number): number {
  const value = raw === undefined ? Number.NaN : Number.parseInt(raw, 10)
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

/**
 * Reads the predictor configuration from the environment.
 * @param env - Process environment; `NEXT_STEP_*` overrides and `DEEPSEEK_API_KEY` are honored.
 * @returns A configuration that runs the heuristic whenever no key is present.
 */
export function readConfig(env: NodeJS.ProcessEnv): PredictorConfig {
  const key = env.NEXT_STEP_API_KEY ?? env.DEEPSEEK_API_KEY
  const apiKey = key === undefined || key.trim() === '' ? undefined : key.trim()
  const language: Language | undefined = env.NEXT_STEP_LANGUAGE === 'zh' || env.NEXT_STEP_LANGUAGE === 'en'
    ? env.NEXT_STEP_LANGUAGE
    : undefined
  return {
    baseUrl: env.NEXT_STEP_BASE_URL ?? DEFAULT_BASE_URL,
    model: env.NEXT_STEP_MODEL ?? DEFAULT_MODEL,
    maxTokens: readInt(env.NEXT_STEP_MAX_TOKENS, DEFAULT_MAX_TOKENS, 16, 512),
    timeoutMs: readInt(env.NEXT_STEP_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, 100, 60_000),
    cacheTtlMs: readInt(env.NEXT_STEP_CACHE_TTL_MS, DEFAULT_CACHE_TTL_MS, 0, 86_400_000),
    maxSuggestions: readInt(env.NEXT_STEP_MAX_SUGGESTIONS, DEFAULT_MAX_SUGGESTIONS, 1, 3),
    localOnly: env.NEXT_STEP_LOCAL_ONLY === '1' || apiKey === undefined,
    ...apiKey === undefined ? {} : { apiKey },
    ...language === undefined ? {} : { language },
  }
}
