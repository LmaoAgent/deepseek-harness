/**
 * The MCP stdio transport: newline-delimited JSON-RPC 2.0 covering
 * `initialize`, `ping`, `tools/list`, and `tools/call`.
 *
 * @module @deepseek-ai/dsh-mcp-next-step/server
 */

import { clip } from './text.ts'
import { NEXT_STEP_TOOL } from './tool.ts'
import type { Language, NextStepInput, Predictor } from './types.ts'

/** Protocol revision reported when a client does not ask for one. */
const PROTOCOL_VERSION = '2025-06-18'
/** Server name reported in `initialize`. */
const SERVER_NAME = 'dsh-next-step'
/** Longest accepted tool argument, in characters. */
const MAX_ARGUMENT_CHARS = 4000

type RequestId = string | number | null

/** One JSON-RPC response, success or failure. */
function reply(id: RequestId, result: unknown): unknown {
  return { jsonrpc: '2.0', id, result }
}

/** One JSON-RPC error response. */
function failure(id: RequestId, code: number, message: string): unknown {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

/** Narrows a JSON value to an object with string keys. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Reads a request id, treating anything else as a notification id. */
function readId(message: Record<string, unknown>): RequestId {
  const id = message.id
  return typeof id === 'string' || typeof id === 'number' ? id : null
}

/** Reads one optional tool argument, rejecting blanks. */
function readText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : clip(trimmed, MAX_ARGUMENT_CHARS)
}

/** Builds predictor input from MCP tool arguments. */
function readInput(value: unknown): NextStepInput {
  const args = isRecord(value) ? value : {}
  const user = readText(args.user)
  const assistant = readText(args.assistant)
  const workspace = readText(args.workspace)
  const language: Language | undefined = args.language === 'zh' || args.language === 'en' ? args.language : undefined
  return {
    ...user === undefined ? {} : { user },
    ...assistant === undefined ? {} : { assistant },
    ...workspace === undefined ? {} : { workspace },
    ...language === undefined ? {} : { language },
  }
}

/** Runs one `tools/call`, reporting unknown tools as a tool error. */
async function callTool(id: RequestId, params: Record<string, unknown>, predictor: Predictor): Promise<unknown> {
  const name = typeof params.name === 'string' ? params.name : ''
  if (name !== NEXT_STEP_TOOL.name) {
    return reply(id, { content: [{ type: 'text', text: `unknown tool: ${name}` }], isError: true })
  }
  try {
    const prediction = await predictor.predict(readInput(params.arguments))
    return reply(id, { content: [{ type: 'text', text: prediction.suggestions.map(suggestion => suggestion.text).join('\n') }] })
  } catch (error) {
    return failure(id, -32603, error instanceof Error ? error.message : 'prediction failed')
  }
}

/** One JSON-RPC request dispatcher. */
export interface McpServer {
  /**
   * Handles one decoded JSON-RPC message.
   * @param message - Parsed request or notification.
   * @returns The response to write, or nothing for a notification.
   */
  handle(message: unknown): Promise<unknown>
}

/** Construction options for the dispatcher. */
export interface McpServerOptions {
  /** Prediction source behind `tools/call`. */
  predictor: Predictor
  /** Server version reported in `initialize`. */
  version: string
  /** Server name reported in `initialize`. */
  name?: string
}

/**
 * Builds the JSON-RPC dispatcher.
 * @param options - Predictor, version, and optional name.
 * @returns A dispatcher that answers requests and ignores notifications.
 */
export function createMcpServer(options: McpServerOptions): McpServer {
  const name = options.name ?? SERVER_NAME
  return {
    async handle(message) {
      if (!isRecord(message) || typeof message.method !== 'string') return failure(null, -32600, 'invalid request')
      const id = readId(message)
      const params = isRecord(message.params) ? message.params : {}
      switch (message.method) {
        case 'initialize':
          return reply(id, {
            protocolVersion: typeof params.protocolVersion === 'string' ? params.protocolVersion : PROTOCOL_VERSION,
            capabilities: { tools: {} },
            serverInfo: { name, version: options.version },
          })
        case 'ping':
          return reply(id, {})
        case 'tools/list':
          return reply(id, { tools: [NEXT_STEP_TOOL] })
        case 'tools/call':
          return callTool(id, params, options.predictor)
        default:
          // A notification carries no id and must not be answered.
          return Object.hasOwn(message, 'id') ? failure(id, -32601, `unknown method: ${message.method}`) : undefined
      }
    },
  }
}

/**
 * Reads newline-delimited JSON-RPC messages and writes one line per response.
 * @param lines - Decoded lines, typically a readline interface over stdin.
 * @param write - Sink for one serialized response line.
 * @param server - Dispatcher built by `createMcpServer`.
 * @returns Completion after the input closes.
 */
export async function serveLines(
  lines: AsyncIterable<string> | Iterable<string>,
  write: (line: string) => void,
  server: McpServer,
): Promise<void> {
  for await (const line of lines) {
    const message = line.trim()
    if (message === '') continue
    let parsed: unknown
    try {
      parsed = JSON.parse(message)
    } catch {
      write(JSON.stringify(failure(null, -32700, 'parse error')))
      continue
    }
    const response = await server.handle(parsed)
    if (response !== undefined) write(JSON.stringify(response))
  }
}
