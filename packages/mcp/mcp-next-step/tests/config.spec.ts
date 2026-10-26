import { describe, expect, it } from 'vitest'
import { readConfig } from '../src/config.ts'

describe('readConfig', () => {
  it('defaults to zero-token mode without a key', () => {
    const config = readConfig({})
    expect(config).toMatchObject({
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-chat',
      maxTokens: 96,
      timeoutMs: 8000,
      cacheTtlMs: 300_000,
      maxSuggestions: 2,
      localOnly: true,
    })
    expect(config.apiKey).toBeUndefined()
    expect(config.language).toBeUndefined()
  })

  it('enables the model path from a trimmed DEEPSEEK_API_KEY', () => {
    const config = readConfig({ DEEPSEEK_API_KEY: ' k ' })
    expect(config.apiKey).toBe('k')
    expect(config.localOnly).toBe(false)
  })

  it('prefers NEXT_STEP_API_KEY and treats a blank key as absent', () => {
    expect(readConfig({ NEXT_STEP_API_KEY: 'n', DEEPSEEK_API_KEY: 'd' }).apiKey).toBe('n')
    expect(readConfig({ NEXT_STEP_API_KEY: '  ' }).localOnly).toBe(true)
  })

  it('honors overrides and clamps them to their bounds', () => {
    const config = readConfig({
      NEXT_STEP_BASE_URL: 'https://x',
      NEXT_STEP_MODEL: 'm',
      NEXT_STEP_MAX_TOKENS: '5000',
      NEXT_STEP_TIMEOUT_MS: '1',
      NEXT_STEP_CACHE_TTL_MS: '999999999',
      NEXT_STEP_MAX_SUGGESTIONS: '9',
    })
    expect(config).toMatchObject({
      baseUrl: 'https://x',
      model: 'm',
      maxTokens: 512,
      timeoutMs: 100,
      cacheTtlMs: 86_400_000,
      maxSuggestions: 3,
    })
  })

  it('ignores unparsable numbers', () => {
    const config = readConfig({ NEXT_STEP_MAX_TOKENS: 'many', NEXT_STEP_TIMEOUT_MS: 'soon' })
    expect(config.maxTokens).toBe(96)
    expect(config.timeoutMs).toBe(8000)
  })

  it('reads a supported language and ignores others', () => {
    expect(readConfig({ NEXT_STEP_LANGUAGE: 'zh' }).language).toBe('zh')
    expect(readConfig({ NEXT_STEP_LANGUAGE: 'en' }).language).toBe('en')
    expect(readConfig({ NEXT_STEP_LANGUAGE: 'fr' }).language).toBeUndefined()
  })

  it('keeps zero-token mode when explicitly requested', () => {
    expect(readConfig({ DEEPSEEK_API_KEY: 'k', NEXT_STEP_LOCAL_ONLY: '1' }).localOnly).toBe(true)
  })
})
