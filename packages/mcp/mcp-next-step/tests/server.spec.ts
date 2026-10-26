import { describe, expect, it, vi } from 'vitest'
import { createMcpServer, serveLines, type McpServer } from '../src/server.ts'
import { NEXT_STEP_TOOL } from '../src/tool.ts'
import type { NextStepInput, Prediction, Predictor } from '../src/types.ts'

interface RpcReply {
  result?: Record<string, unknown>
  error?: { code: number; message: string }
}

/** Reads a response the dispatcher returned for a request. */
function asReply(value: unknown): RpcReply {
  return value as RpcReply
}

/** Builds a predictor that answers with fixed text and records its input. */
function stubPredictor(text = 'Run tests'): Predictor & { calls: NextStepInput[] } {
  const calls: NextStepInput[] = []
  const prediction: Prediction = { suggestions: [{ text }], source: 'model' }
  return {
    calls,
    predict: vi.fn(async (input: NextStepInput) => {
      calls.push(input)
      return prediction
    }),
  }
}

/** Builds the dispatcher around one predictor. */
function serve(predictor: Predictor): McpServer {
  return createMcpServer({ predictor, version: '1.2.3' })
}

describe('createMcpServer', () => {
  it('answers initialize with the requested protocol version', async () => {
    const reply = asReply(await serve(stubPredictor()).handle({
      jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' },
    }))
    expect(reply.result).toMatchObject({
      protocolVersion: '2025-03-26',
      serverInfo: { name: 'dsh-next-step', version: '1.2.3' },
    })
  })

  it('falls back to its own protocol version and a configured name', async () => {
    const server = createMcpServer({ predictor: stubPredictor(), version: '1.0.0', name: 'custom' })
    const reply = asReply(await server.handle({ jsonrpc: '2.0', id: 'a', method: 'initialize' }))
    expect(reply.result).toMatchObject({ protocolVersion: '2025-06-18', serverInfo: { name: 'custom', version: '1.0.0' } })
  })

  it('answers ping', async () => {
    expect(asReply(await serve(stubPredictor()).handle({ jsonrpc: '2.0', id: 2, method: 'ping' })).result).toEqual({})
  })

  it('lists the single tool', async () => {
    const reply = asReply(await serve(stubPredictor()).handle({ jsonrpc: '2.0', id: 3, method: 'tools/list' }))
    expect(reply.result).toEqual({ tools: [NEXT_STEP_TOOL] })
  })

  it('runs tools/call and joins suggestions with newlines', async () => {
    const predictor = stubPredictor('Run tests')
    const server = createMcpServer({ predictor, version: '1.0.0' })
    const reply = asReply(await server.handle({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: NEXT_STEP_TOOL.name, arguments: { user: '  go  ', assistant: 'done', language: 'zh', workspace: '/w' } },
    }))
    expect(reply.result).toEqual({ content: [{ type: 'text', text: 'Run tests' }] })
    expect(predictor.calls[0]).toEqual({ user: 'go', assistant: 'done', language: 'zh', workspace: '/w' })
  })

  it('drops blank arguments and an unsupported language', async () => {
    const predictor = stubPredictor()
    const server = createMcpServer({ predictor, version: '1.0.0' })
    await server.handle({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: { name: NEXT_STEP_TOOL.name, arguments: { user: '   ', language: 'fr' } },
    })
    expect(predictor.calls[0]).toEqual({})
  })

  it('treats missing or non-object arguments as empty', async () => {
    const predictor = stubPredictor()
    const server = createMcpServer({ predictor, version: '1.0.0' })
    await server.handle({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: NEXT_STEP_TOOL.name } })
    await server.handle({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: NEXT_STEP_TOOL.name, arguments: 'x' } })
    expect(predictor.calls).toEqual([{}, {}])
  })

  it('reports an unknown tool as a tool error', async () => {
    const reply = asReply(await serve(stubPredictor()).handle({
      jsonrpc: '2.0', id: 8, method: 'tools/call', params: { name: 'nope' },
    }))
    expect(reply.result).toEqual({ content: [{ type: 'text', text: 'unknown tool: nope' }], isError: true })
  })

  it('reports a missing tool name as a tool error', async () => {
    const reply = asReply(await serve(stubPredictor()).handle({ jsonrpc: '2.0', id: 9, method: 'tools/call', params: {} }))
    expect(reply.result).toMatchObject({ isError: true })
  })

  it('turns a predictor failure into an internal error', async () => {
    const server = serve({ predict: async () => { throw new Error('boom') } })
    const reply = asReply(await server.handle({
      jsonrpc: '2.0', id: 10, method: 'tools/call', params: { name: NEXT_STEP_TOOL.name },
    }))
    expect(reply.error).toEqual({ code: -32603, message: 'boom' })
  })

  it('describes a non-Error predictor failure', async () => {
    const server = serve({ predict: async () => { throw 'bad' } })
    const reply = asReply(await server.handle({
      jsonrpc: '2.0', id: 11, method: 'tools/call', params: { name: NEXT_STEP_TOOL.name },
    }))
    expect(reply.error).toEqual({ code: -32603, message: 'prediction failed' })
  })

  it('rejects an unknown method that carries an id', async () => {
    const reply = asReply(await serve(stubPredictor()).handle({ jsonrpc: '2.0', id: 12, method: 'resources/list' }))
    expect(reply.error?.code).toBe(-32601)
  })

  it('ignores an unknown notification', async () => {
    expect(await serve(stubPredictor()).handle({ jsonrpc: '2.0', method: 'notifications/initialized' })).toBeUndefined()
  })

  it('rejects malformed messages', async () => {
    const server = serve(stubPredictor())
    for (const message of [null, 'x', [], {}, { method: 5 }]) {
      expect(asReply(await server.handle(message)).error).toMatchObject({ code: -32600 })
    }
  })
})

describe('serveLines', () => {
  it('answers requests, skips blanks, and reports parse errors', async () => {
    const written: string[] = []
    const server = serve(stubPredictor())
    await serveLines([
      '',
      'not json',
      JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
      JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    ], line => written.push(line), server)
    expect(written).toHaveLength(2)
    expect(JSON.parse(written[0]!)).toMatchObject({ error: { code: -32700 } })
    expect(JSON.parse(written[1]!)).toMatchObject({ id: 1, result: {} })
  })
})
