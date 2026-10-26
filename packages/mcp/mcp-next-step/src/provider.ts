/**
 * OpenAI-compatible chat completions for the prediction model.
 *
 * @module @deepseek-ai/dsh-mcp-next-step/provider
 */

import type { Completion, CompletionResult, TokenUsage } from './types.ts'

/** Failure modes of one provider call. */
export type ProviderErrorCode = 'network' | 'http' | 'payload'

/** A provider call that did not produce usable text. */
export class ProviderError extends Error {
  /**
   * @param message - Actionable description naming the status or missing field.
   * @param code - Stable category callers branch on.
   */
  constructor(message: string, readonly code: ProviderErrorCode) {
    super(message)
    this.name = 'ProviderError'
  }
}

/** One OpenAI-compatible endpoint. */
export interface CompletionEndpoint {
  /** Provider root, without a trailing slash. */
  baseUrl: string
  /** Bearer token. */
  apiKey: string
  /** Sampling temperature; predictions want little variance. */
  temperature?: number
  /** Transport override for tests and proxies. */
  fetch?: typeof fetch
}

/** Narrows a JSON value to an object with string keys. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Reads provider usage, ignoring malformed or absent counters. */
function readUsage(value: unknown): TokenUsage | undefined {
  if (!isRecord(value)) return undefined
  const input = value.prompt_tokens
  const output = value.completion_tokens
  if (typeof input !== 'number' || typeof output !== 'number') return undefined
  return { input, output }
}

/** Validates one chat-completion payload and extracts its first message. */
function readCompletion(payload: unknown): CompletionResult {
  if (!isRecord(payload)) throw new ProviderError('response is not a JSON object', 'payload')
  const choices = payload.choices
  if (!Array.isArray(choices) || choices.length === 0) throw new ProviderError('response has no choices', 'payload')
  const choice: unknown = choices[0]
  const message = isRecord(choice) ? choice.message : undefined
  if (!isRecord(message) || typeof message.content !== 'string') {
    throw new ProviderError('response choice has no text content', 'payload')
  }
  const usage = readUsage(payload.usage)
  return usage === undefined ? { text: message.content } : { text: message.content, usage }
}

/**
 * Builds a completion that posts to an OpenAI-compatible `/chat/completions`.
 * @param endpoint - Provider root, credentials, sampling temperature, and transport.
 * @returns A completion safe to call once per prediction.
 */
export function createCompletion(endpoint: CompletionEndpoint): Completion {
  const target = `${endpoint.baseUrl.replace(/\/+$/u, '')}/chat/completions`
  const send = endpoint.fetch ?? fetch
  const temperature = endpoint.temperature ?? 0.2
  return async (request, signal) => {
    let response: Response
    try {
      response = await send(target, {
        method: 'POST',
        headers: { authorization: `Bearer ${endpoint.apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          max_tokens: request.maxTokens,
          temperature,
          stream: false,
        }),
        signal,
      })
    } catch (error) {
      throw new ProviderError(`request failed: ${error instanceof Error ? error.message : String(error)}`, 'network')
    }
    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).replace(/\s+/gu, ' ').trim().slice(0, 200)
      throw new ProviderError(`HTTP ${response.status}: ${detail === '' ? 'no detail' : detail}`, 'http')
    }
    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new ProviderError('response body is not JSON', 'payload')
    }
    return readCompletion(payload)
  }
}
