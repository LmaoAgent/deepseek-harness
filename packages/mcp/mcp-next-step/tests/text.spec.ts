import { describe, expect, it } from 'vitest'
import { cacheKey, clip, detectLanguage, normalize } from '../src/text.ts'

describe('clip', () => {
  it('treats absent text as empty', () => {
    expect(clip(undefined, 10)).toBe('')
  })

  it('trims and keeps short text unchanged', () => {
    expect(clip('  hello  ', 10)).toBe('hello')
  })

  it('keeps the head by default', () => {
    expect(clip('abcdef', 3)).toBe('abc')
  })

  it('keeps the tail when asked', () => {
    expect(clip('abcdef', 3, true)).toBe('def')
  })
})

describe('detectLanguage', () => {
  it('reports Chinese for CJK text', () => {
    expect(detectLanguage(undefined, '继续')).toBe('zh')
  })

  it('reports English otherwise', () => {
    expect(detectLanguage('continue', undefined)).toBe('en')
  })
})

describe('normalize', () => {
  it('folds case, whitespace, and punctuation', () => {
    expect(normalize(' Check: the  PR! ')).toBe('checkthepr')
  })
})

describe('cacheKey', () => {
  it('is stable for identical parts', () => {
    expect(cacheKey('a', 'b')).toBe(cacheKey('a', 'b'))
  })

  it('separates parts that could otherwise collide', () => {
    expect(cacheKey('a', 'b')).not.toBe(cacheKey('ab', ''))
  })
})
