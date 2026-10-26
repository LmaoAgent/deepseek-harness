import { describe, expect, it } from 'vitest'
import { heuristicSuggestions } from '../src/heuristic.ts'
import { NO_SIGNALS } from '../src/signals.ts'

const quiet = { assistant: 'done', language: 'en' as const }

describe('heuristicSuggestions', () => {
  it('always returns at least one continuation', () => {
    expect(heuristicSuggestions(quiet, NO_SIGNALS, 2).map(item => item.text))
      .toEqual(['Continue with the next step'])
  })

  it('names the pull request when the reply mentions one', () => {
    const suggestions = heuristicSuggestions({ assistant: 'PR #966 is still a draft', language: 'en' }, NO_SIGNALS, 2)
    expect(suggestions[0]?.text).toBe('Check the pull request status')
  })

  it('names uncommitted work and an unpushed branch', () => {
    const suggestions = heuristicSuggestions(quiet, { dirtyFiles: 2, ahead: 1 }, 3)
    expect(suggestions.map(item => item.text).slice(0, 2)).toEqual([
      'Review the uncommitted changes',
      'Push the branch and open a pull request',
    ])
  })

  it('continues remaining work and suggests running tests', () => {
    const suggestions = heuristicSuggestions({ assistant: 'TODO: add tests', language: 'en' }, NO_SIGNALS, 3)
    expect(suggestions.map(item => item.text)).toEqual([
      'Continue with the remaining work',
      'Run the tests and confirm they pass',
      'Continue with the next step',
    ])
  })

  it('writes suggestions in the session language', () => {
    const suggestions = heuristicSuggestions({ assistant: 'PR #1 已合并', language: 'zh' }, { dirtyFiles: 1, ahead: 0 }, 2)
    expect(suggestions.map(item => item.text)).toEqual(['查看 PR 的检查与合并状态', '检查未提交的改动'])
  })

  it('writes every rule in Chinese when the session is Chinese', () => {
    const suggestions = heuristicSuggestions(
      { assistant: 'PR #1 还有 TODO，测试待跑', language: 'zh' },
      { dirtyFiles: 1, ahead: 1 },
      6,
    )
    expect(suggestions.map(item => item.text)).toEqual([
      '查看 PR 的检查与合并状态',
      '检查未提交的改动',
      '推送分支并发起 PR',
      '继续处理剩下的待办',
      '运行测试确认全部通过',
      '继续完成下一步',
    ])
  })

  it('honors a limit below the number of candidates', () => {
    expect(heuristicSuggestions(quiet, { dirtyFiles: 1, ahead: 1 }, 1)).toHaveLength(1)
  })
})
