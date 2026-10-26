import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const BIN = new URL('../src/bin.ts', import.meta.url).pathname

interface RpcLine {
  id?: number
  result?: { serverInfo?: { name?: string }; content?: { text?: string }[] }
}

describe('dsh-next-step-mcp entry', () => {
  it('serves initialize and a zero-token tools/call over stdio', () => {
    const messages = [
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } },
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'suggest_next_step', arguments: { user: '继续', assistant: '已完成' } },
      },
    ]
    const result = spawnSync(process.execPath, ['--import', 'tsx/esm', BIN], {
      input: `${messages.map(message => JSON.stringify(message)).join('\n')}\n`,
      encoding: 'utf8',
      env: { ...process.env, NEXT_STEP_LOCAL_ONLY: '1' },
      timeout: 30_000,
    })
    expect(result.status).toBe(0)
    const replies = result.stdout.trim().split('\n').map(line => JSON.parse(line) as RpcLine)
    expect(replies).toHaveLength(2)
    expect(replies[0]?.result?.serverInfo?.name).toBe('dsh-next-step')
    expect(replies[1]?.result?.content?.[0]?.text).toBe('继续完成下一步')
    expect(result.stderr).toContain('zero-token mode')
  })
})
