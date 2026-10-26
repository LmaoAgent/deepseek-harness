import { describe, expect, it, vi } from 'vitest'
import { createPredictor } from '../src/predict.ts'
import type { Completion, PredictorConfig } from '../src/types.ts'

const BASE: PredictorConfig = {
  baseUrl: 'https://x',
  model: 'm',
  maxTokens: 32,
  timeoutMs: 1000,
  cacheTtlMs: 1000,
  maxSuggestions: 2,
}

/** Builds a predictor around one injected provider call. */
function withCompletion(complete: Completion, overrides: Partial<PredictorConfig> = {}) {
  return createPredictor({ ...BASE, complete, ...overrides })
}

describe('createPredictor', () => {
  it('returns model suggestions with reported usage', async () => {
    const complete = vi.fn(async () => ({ text: 'Run tests\nPush the branch', usage: { input: 5, output: 2 } }))
    const prediction = await withCompletion(complete).predict({ user: 'go', assistant: 'done' })
    expect(prediction).toEqual({
      suggestions: [{ text: 'Run tests' }, { text: 'Push the branch' }],
      source: 'model',
      usage: { input: 5, output: 2 },
    })
  })

  it('omits usage when the provider did not report it', async () => {
    const prediction = await withCompletion(async () => ({ text: 'Run tests' })).predict({ user: 'go', assistant: 'done' })
    expect(prediction).toEqual({ suggestions: [{ text: 'Run tests' }], source: 'model' })
  })

  it('serves an identical exchange from cache', async () => {
    const complete = vi.fn(async () => ({ text: 'Run tests' }))
    const predictor = withCompletion(complete)
    await predictor.predict({ user: 'go', assistant: 'done' })
    const second = await predictor.predict({ user: 'go', assistant: 'done' })
    expect(second.source).toBe('cache')
    expect(second.suggestions).toEqual([{ text: 'Run tests' }])
    expect(complete).toHaveBeenCalledTimes(1)
  })

  it('expires a cached prediction after the ttl', async () => {
    let now = 0
    const complete = vi.fn(async () => ({ text: 'Run tests' }))
    const predictor = withCompletion(complete, { cacheTtlMs: 10, now: () => now })
    await predictor.predict({ user: 'go', assistant: 'done' })
    now = 11
    expect((await predictor.predict({ user: 'go', assistant: 'done' })).source).toBe('model')
    expect(complete).toHaveBeenCalledTimes(2)
  })

  it('uses the heuristic when no provider is configured', async () => {
    const prediction = await createPredictor({ ...BASE }).predict({ user: '继续', assistant: '已完成' })
    expect(prediction).toEqual({ suggestions: [{ text: '继续完成下一步' }], source: 'heuristic' })
  })

  it('ignores an injected provider in zero-token mode', async () => {
    const complete = vi.fn(async () => ({ text: 'Run tests' }))
    const prediction = await withCompletion(complete, { localOnly: true }).predict({ user: 'go' })
    expect(prediction.source).toBe('heuristic')
    expect(complete).not.toHaveBeenCalled()
  })

  it('falls back and reports when the provider fails', async () => {
    const onError = vi.fn()
    const failure = new Error('down')
    const prediction = await withCompletion(async () => { throw failure }, { onError }).predict({ user: 'go' })
    expect(prediction.source).toBe('heuristic')
    expect(onError).toHaveBeenCalledWith(failure)
  })

  it('falls back when the completion repeats the human message', async () => {
    const prediction = await withCompletion(async () => ({ text: 'Go!' })).predict({ user: 'go' })
    expect(prediction).toEqual({ suggestions: [{ text: 'Continue with the next step' }], source: 'heuristic' })
  })

  it('clamps a maximum below one suggestion', async () => {
    const prediction = await withCompletion(async () => ({ text: 'Run tests\nPush the branch' }), { maxSuggestions: 0 })
      .predict({ user: 'go' })
    expect(prediction.suggestions).toHaveLength(1)
  })

  it('builds a provider from an api key and posts through the global fetch', async () => {
    const stub = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: 'Run tests' } }] })))
    vi.stubGlobal('fetch', stub)
    try {
      const prediction = await createPredictor({ ...BASE, apiKey: 'k' }).predict({ user: 'go' })
      expect(prediction).toEqual({ suggestions: [{ text: 'Run tests' }], source: 'model' })
      expect(stub).toHaveBeenCalledTimes(1)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('evicts the oldest digest after 64 entries', async () => {
    const complete = vi.fn(async () => ({ text: 'Run tests' }))
    const predictor = withCompletion(complete)
    for (let index = 0; index < 65; index += 1) {
      await predictor.predict({ user: `turn ${index}` })
    }
    expect(await predictor.predict({ user: 'turn 0' })).toMatchObject({ source: 'model' })
    expect(complete).toHaveBeenCalledTimes(66)
  })
})
