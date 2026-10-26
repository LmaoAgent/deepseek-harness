/**
 * The predictor: one cheap provider call per distinct exchange, a cached result
 * per digest, and a zero-token heuristic whenever the provider cannot answer.
 *
 * @module @deepseek-ai/dsh-mcp-next-step/predict
 */

import { heuristicSuggestions } from './heuristic.ts'
import { parseSuggestions } from './parse.ts'
import { buildMessages } from './prompt.ts'
import { createCompletion } from './provider.ts'
import { readLocalSignals } from './signals.ts'
import { cacheKey, clip, detectLanguage } from './text.ts'
import type { Completion, NextStepInput, Prediction, Predictor, PredictorConfig, Suggestion } from './types.ts'

/** Cache entries kept before the oldest is evicted. */
const MAX_CACHE_ENTRIES = 64
/** Digest caps, matching the prompt module's own clipping. */
const USER_LIMIT = 600
const ASSISTANT_LIMIT = 1000

/** Chooses the provider call the configuration allows. */
function resolveCompletion(config: PredictorConfig): Completion | undefined {
  if (config.localOnly === true) return undefined
  if (config.complete !== undefined) return config.complete
  if (config.apiKey === undefined) return undefined
  return createCompletion({ baseUrl: config.baseUrl, apiKey: config.apiKey })
}

/**
 * Builds a predictor for one configuration.
 * @param config - Provider, limits, and clock overrides.
 * @returns A predictor that never rejects; a failed provider call falls back to the heuristic.
 */
export function createPredictor(config: PredictorConfig): Predictor {
  const now = config.now ?? Date.now
  const limit = Math.max(1, Math.trunc(config.maxSuggestions))
  const complete = resolveCompletion(config)
  const cache = new Map<string, { at: number; suggestions: Suggestion[] }>()

  /** Records a digest's suggestions, evicting the oldest entry at capacity. */
  function remember(key: string, suggestions: Suggestion[]): void {
    while (cache.size >= MAX_CACHE_ENTRIES) {
      // oxlint-disable-next-line typescript/no-non-null-assertion -- the loop condition guarantees a key exists.
      cache.delete(cache.keys().next().value!)
    }
    cache.set(key, { at: now(), suggestions })
  }

  return {
    async predict(input: NextStepInput): Promise<Prediction> {
      const user = clip(input.user, USER_LIMIT)
      const assistant = clip(input.assistant, ASSISTANT_LIMIT, true)
      const language = config.language ?? input.language ?? detectLanguage(user, assistant)
      const key = cacheKey(user, assistant, language, String(limit))
      const hit = cache.get(key)
      if (hit !== undefined && now() - hit.at < config.cacheTtlMs) return { suggestions: hit.suggestions, source: 'cache' }

      const heuristic = async (): Promise<Prediction> => {
        const signals = await readLocalSignals(input.workspace)
        const suggestions = heuristicSuggestions({ assistant, language }, signals, limit)
        remember(key, suggestions)
        return { suggestions, source: 'heuristic' }
      }

      if (complete === undefined) return await heuristic()
      try {
        const result = await complete({
          model: config.model,
          messages: buildMessages({ user, assistant, language }, limit),
          maxTokens: config.maxTokens,
        }, AbortSignal.timeout(config.timeoutMs))
        const suggestions = parseSuggestions(result.text, { limit, exclude: user })
        if (suggestions.length === 0) return await heuristic()
        remember(key, suggestions)
        return result.usage === undefined
          ? { suggestions, source: 'model' }
          : { suggestions, source: 'model', usage: result.usage }
      } catch (error) {
        config.onError?.(error)
        return await heuristic()
      }
    },
  }
}
