import { describe, expect, it } from 'vitest'
import { parseSuggestions, SUGGESTION_CLIP } from '../src/parse.ts'

describe('parseSuggestions', () => {
  it('strips list markers, quotes, and trailing punctuation', () => {
    expect(parseSuggestions('- "Review the diff."', { limit: 2 }).map(item => item.text))
      .toEqual(['Review the diff'])
    expect(parseSuggestions('1. 查看 PR。', { limit: 2 }).map(item => item.text))
      .toEqual(['查看 PR'])
  })

  it('keeps at most the requested number of unique lines', () => {
    const parsed = parseSuggestions('Run tests\n\nRun tests!\nPush the branch', { limit: 2 })
    expect(parsed.map(item => item.text)).toEqual(['Run tests', 'Push the branch'])
  })

  it('drops a suggestion that repeats the human message', () => {
    const parsed = parseSuggestions('Continue with the next step', {
      limit: 2,
      exclude: 'continue with the next step!',
    })
    expect(parsed).toEqual([])
  })

  it('clips an overlong suggestion', () => {
    const [suggestion] = parseSuggestions('x'.repeat(SUGGESTION_CLIP + 20), { limit: 1 })
    expect(suggestion?.text).toHaveLength(SUGGESTION_CLIP)
  })

  it('ignores blank lines', () => {
    expect(parseSuggestions('   \n\t\n', { limit: 2 })).toEqual([])
  })
})
