/**
 * Zero-token suggestions derived from the latest reply and the working tree.
 * This is the fallback when no provider is configured or a call fails.
 *
 * @module @deepseek-ai/dsh-mcp-next-step/heuristic
 */

import type { LocalSignals } from './signals.ts'
import type { Language, Suggestion } from './types.ts'

const PULL_REQUEST = /(?:pr\s*#\d+|pull request|合并请求)/iu
const TESTS = /\btests?\b|测试/iu
const REMAINING = /\btodo\b|\bfixme\b|待办|下一步/iu

/**
 * Suggests one-line continuations without calling a model.
 * @param input - Assistant tail and output language.
 * @param signals - Working-tree facts, or `NO_SIGNALS` when unknown.
 * @param limit - Maximum suggestions to return.
 * @returns At least one suggestion, most specific first.
 */
export function heuristicSuggestions(
  input: { assistant: string; language: Language },
  signals: LocalSignals,
  limit: number,
): Suggestion[] {
  const zh = input.language === 'zh'
  const candidates: string[] = []
  if (PULL_REQUEST.test(input.assistant)) candidates.push(zh ? '查看 PR 的检查与合并状态' : 'Check the pull request status')
  if (signals.dirtyFiles > 0) candidates.push(zh ? '检查未提交的改动' : 'Review the uncommitted changes')
  if (signals.ahead > 0) candidates.push(zh ? '推送分支并发起 PR' : 'Push the branch and open a pull request')
  if (REMAINING.test(input.assistant)) candidates.push(zh ? '继续处理剩下的待办' : 'Continue with the remaining work')
  if (TESTS.test(input.assistant)) candidates.push(zh ? '运行测试确认全部通过' : 'Run the tests and confirm they pass')
  candidates.push(zh ? '继续完成下一步' : 'Continue with the next step')
  return candidates.slice(0, Math.max(1, limit)).map(text => ({ text }))
}
