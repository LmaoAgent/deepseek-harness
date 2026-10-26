import { describe, expect, it } from 'vitest'
import { ASSISTANT_CLIP, buildMessages, USER_CLIP } from '../src/prompt.ts'

describe('buildMessages', () => {
  it('sends a system prompt and one digest', () => {
    const [system, digest] = buildMessages({ user: '继续', assistant: '已完成', language: 'zh' }, 2)
    expect(system?.role).toBe('system')
    expect(system?.content).toContain('最多输出 2 条建议')
    expect(digest?.role).toBe('user')
    expect(digest?.content).toContain('Human: 继续')
    expect(digest?.content).toContain('Assistant tail: 已完成')
  })

  it('writes the system prompt in English for an English session', () => {
    const [system] = buildMessages({ user: 'go', assistant: 'done', language: 'en' }, 1)
    expect(system?.content).toContain('at most 1 suggestions')
  })

  it('clips the human head and the assistant tail', () => {
    const [, digest] = buildMessages({
      user: `${'u'.repeat(USER_CLIP)}tail`,
      assistant: `head${'a'.repeat(ASSISTANT_CLIP)}`,
      language: 'en',
    }, 1)
    expect(digest?.content).not.toContain('utail')
    expect(digest?.content).not.toContain('ahead')
    expect(digest?.content).toContain('a'.repeat(ASSISTANT_CLIP))
  })
})
