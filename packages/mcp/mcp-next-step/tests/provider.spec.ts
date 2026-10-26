import { describe, expect, it, vi } from 'vitest'
import { createCompletion, ProviderError } from '../src/provider.ts'
import type { CompletionRequest } from '../src/types.ts'

const request: CompletionRequest = {
  model: 'deepseek-chat',
  messages: [{ role: 'user', content: 'hi' }],
  maxTokens: 32,
}

const signal = new AbortController().signal

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

describe('createCompletion', () => {
  it('posts an OpenAI-compatible request and reads text with usage', async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => jsonResponse({
      choices: [{ message: { content: 'Run tests' } }],
      usage: { prompt_tokens: 12, completion_tokens: 3 },
    }))
    const complete = createCompletion({ baseUrl: 'https://api.example.com/', apiKey: 'k', fetch: fetchMock })
    expect(await complete(request, signal)).toEqual({ text: 'Run tests', usage: { input: 12, output: 3 } })
    const [input, init] = fetchMock.mock.calls[0]!
    expect(input).toBe('https://api.example.com/chat/completions')
    const body = JSON.parse(init?.body as string) as Record<string, unknown>
    expect(body).toMatchObject({ model: 'deepseek-chat', max_tokens: 32, temperature: 0.2, stream: false })
    expect((init?.headers as Record<string, string>).authorization).toBe('Bearer k')
    expect(init?.signal).toBe(signal)
  })

  it('keeps a configured temperature and omits usage the provider did not report', async () => {
    const complete = createCompletion({
      baseUrl: 'https://api.example.com',
      apiKey: 'k',
      temperature: 0.9,
      fetch: async () => jsonResponse({ choices: [{ message: { content: 'ok' } }] }),
    })
    expect(await complete(request, signal)).toEqual({ text: 'ok' })
  })

  it('reports an HTTP failure with a one-line detail', async () => {
    const complete = createCompletion({
      baseUrl: 'https://x',
      apiKey: 'k',
      fetch: async () => new Response(' bad \n gateway ', { status: 502 }),
    })
    await expect(complete(request, signal)).rejects.toMatchObject({ code: 'http', message: 'HTTP 502: bad gateway' })
  })

  it('reports an HTTP failure without a body', async () => {
    const complete = createCompletion({ baseUrl: 'https://x', apiKey: 'k', fetch: async () => new Response('', { status: 500 }) })
    await expect(complete(request, signal)).rejects.toMatchObject({ code: 'http', message: 'HTTP 500: no detail' })
  })

  it('rejects a non-JSON body', async () => {
    const complete = createCompletion({ baseUrl: 'https://x', apiKey: 'k', fetch: async () => new Response('nope') })
    await expect(complete(request, signal)).rejects.toMatchObject({ code: 'payload', message: 'response body is not JSON' })
  })

  it('rejects a payload that is not an object', async () => {
    const complete = createCompletion({ baseUrl: 'https://x', apiKey: 'k', fetch: async () => jsonResponse([1]) })
    await expect(complete(request, signal)).rejects.toBeInstanceOf(ProviderError)
    await expect(complete(request, signal)).rejects.toMatchObject({ message: 'response is not a JSON object' })
  })

  it('rejects a payload without choices', async () => {
    const complete = createCompletion({ baseUrl: 'https://x', apiKey: 'k', fetch: async () => jsonResponse({ choices: [] }) })
    await expect(complete(request, signal)).rejects.toMatchObject({ message: 'response has no choices' })
  })

  it('rejects a choice without text content', async () => {
    const empty = createCompletion({ baseUrl: 'https://x', apiKey: 'k', fetch: async () => jsonResponse({ choices: [{}] }) })
    await expect(empty(request, signal)).rejects.toMatchObject({ message: 'response choice has no text content' })
    const numeric = createCompletion({
      baseUrl: 'https://x',
      apiKey: 'k',
      fetch: async () => jsonResponse({ choices: [{ message: { content: 7 } }] }),
    })
    await expect(numeric(request, signal)).rejects.toMatchObject({ message: 'response choice has no text content' })
  })

  it('ignores malformed usage counters', async () => {
    const complete = createCompletion({
      baseUrl: 'https://x',
      apiKey: 'k',
      fetch: async () => jsonResponse({ choices: [{ message: { content: 'ok' } }], usage: { prompt_tokens: 1 } }),
    })
    expect(await complete(request, signal)).toEqual({ text: 'ok' })
    const notObject = createCompletion({
      baseUrl: 'https://x',
      apiKey: 'k',
      fetch: async () => jsonResponse({ choices: [{ message: { content: 'ok' } }], usage: 5 }),
    })
    expect(await notObject(request, signal)).toEqual({ text: 'ok' })
  })

  it('rejects a choice that is not an object', async () => {
    const complete = createCompletion({ baseUrl: 'https://x', apiKey: 'k', fetch: async () => jsonResponse({ choices: [1] }) })
    await expect(complete(request, signal)).rejects.toMatchObject({ message: 'response choice has no text content' })
  })

  it('reports an HTTP failure whose body cannot be read', async () => {
    const broken = new ReadableStream({
      start(controller) {
        controller.error(new Error('broken'))
      },
    })
    const complete = createCompletion({
      baseUrl: 'https://x',
      apiKey: 'k',
      fetch: async () => new Response(broken, { status: 502 }),
    })
    await expect(complete(request, signal)).rejects.toMatchObject({ message: 'HTTP 502: no detail' })
  })

  it('uses the global fetch when no transport is injected', async () => {
    const stub = vi.fn(async () => jsonResponse({ choices: [{ message: { content: 'ok' } }] }))
    vi.stubGlobal('fetch', stub)
    try {
      const complete = createCompletion({ baseUrl: 'https://x', apiKey: 'k' })
      expect(await complete(request, signal)).toEqual({ text: 'ok' })
      expect(stub).toHaveBeenCalledTimes(1)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('wraps a transport failure as a network error', async () => {
    const complete = createCompletion({ baseUrl: 'https://x', apiKey: 'k', fetch: async () => { throw new Error('down') } })
    await expect(complete(request, signal)).rejects.toMatchObject({ code: 'network', message: 'request failed: down' })
    const thrown = createCompletion({ baseUrl: 'https://x', apiKey: 'k', fetch: async () => { throw 'boom' } })
    await expect(thrown(request, signal)).rejects.toMatchObject({ code: 'network', message: 'request failed: boom' })
  })
})
