import { describe, expect, it, vi } from 'vitest'
import { apply as hostApply } from '../src/index.ts'
import { apply } from '../src/client/index.ts'

/** Adds the Cordis `inject` scope the browser half uses after `$mount`. */
function withInject(base: Record<string, unknown>) {
  return {
    ...base,
    inject: (_deps: unknown, cb: (scope: Record<string, unknown>) => void) => {
      const disposers: (() => void)[] = []
      const scope = {
        ...base,
        effect: (fn: () => () => void) => {
          const disposer = fn()
          disposers.push(disposer)
          return disposer
        },
      }
      cb(scope)
      return Object.assign(Promise.resolve(), {
        dispose: async () => {
          for (const disposer of disposers.reverse()) disposer()
        },
      })
    },
  }
}

/** One session list store with a settable snapshot. */
function sessionList(ids: string[]) {
  let snapshot = { ids }
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    set(next: string[]) {
      snapshot = { ids: next }
      for (const listener of [...listeners]) listener()
    },
  }
}

describe('next-step browser half', () => {
  it('leaves the host half empty', () => {
    expect(hostApply).toHaveLength(0)
    hostApply()
  })

  it('warns when a watch fails before abort', async () => {
    const list = sessionList(['a'])
    const warn = vi.fn()
    const broken = {
      dispose: vi.fn(),
      async *[Symbol.asyncIterator]() {
        throw new Error('broken')
      },
    }
    const ctx = withInject({
      logger: { warn },
      remote: {
        $mount: vi.fn(async () => async () => {}),
        nextStep: { watch: vi.fn(() => broken) },
      },
      sessions: { list },
      composerSuggestions: { set: vi.fn() },
    })
    const dispose = await apply(ctx as never)
    await vi.waitFor(() => { expect(warn).toHaveBeenCalledWith(expect.stringContaining('broken')) })
    await dispose()
  })

  it('follows every listed session and stages its suggestions', async () => {
    const list = sessionList(['a'])
    const staged = new Map<string, string | null>()
    const watched: string[] = []
    const handle = {
      dispose: vi.fn(),
      async *[Symbol.asyncIterator]() {
        yield { text: '核对差异' }
        yield { text: '' }
      },
    }
    const disposeRemote = vi.fn(async () => {})
    const ctx = withInject({
      logger: { warn: vi.fn() },
      remote: {
        $mount: vi.fn(async () => disposeRemote),
        nextStep: {
          watch: vi.fn((id: string) => {
            watched.push(id)
            return handle
          }),
        },
      },
      sessions: { list },
      composerSuggestions: { set: (id: string, text: string | null) => { staged.set(id, text) } },
    })
    const dispose = await apply(ctx as never)
    await vi.waitFor(() => { expect(staged.get('a')).toBeNull() })
    expect(watched).toEqual(['a'])
    list.set(['a', 'b'])
    expect(watched).toEqual(['a', 'b'])
    list.set(['b'])
    expect(handle.dispose).toHaveBeenCalled()
    await dispose()
    expect(disposeRemote).toHaveBeenCalled()
  })
})

describe('next-step browser failure variants', () => {
  it('describes a non-Error watch failure as text', async () => {
    const list = sessionList(['a'])
    const warn = vi.fn()
    const broken = {
      dispose: vi.fn(),
      async *[Symbol.asyncIterator]() {
        throw 'boom'
      },
    }
    const ctx = withInject({
      logger: { warn },
      remote: { $mount: vi.fn(async () => async () => {}), nextStep: { watch: vi.fn(() => broken) } },
      sessions: { list },
      composerSuggestions: { set: vi.fn() },
    })
    const dispose = await apply(ctx as never)
    await vi.waitFor(() => { expect(warn).toHaveBeenCalledWith(expect.stringContaining('boom')) })
    await dispose()
  })

  it('stays quiet when a watch fails after its session was closed', async () => {
    const list = sessionList(['a'])
    const warn = vi.fn()
    let controller: AbortController | undefined
    let fail: ((error: unknown) => void) | undefined
    const handle = {
      dispose: vi.fn(),
      async *[Symbol.asyncIterator]() {
        await new Promise((_, reject) => { fail = reject })
      },
    }
    const ctx = withInject({
      logger: { warn },
      remote: {
        $mount: vi.fn(async () => async () => {}),
        nextStep: { watch: vi.fn((_id: string, signal: AbortSignal) => { controller = { signal } as AbortController; return handle }) },
      },
      sessions: { list },
      composerSuggestions: { set: vi.fn() },
    })
    const dispose = await apply(ctx as never)
    await Promise.resolve()
    list.set([])
    fail?.(new Error('closed'))
    await Promise.resolve()
    await dispose()
    expect(warn).not.toHaveBeenCalled()
    expect(controller?.signal.aborted).toBe(true)
  })
})

describe('next-step mount failure', () => {
  it('unmounts the remote when the watch scope cannot start', async () => {
    const disposeRemote = vi.fn(async () => {})
    const ctx = {
      logger: { warn: vi.fn() },
      remote: { $mount: vi.fn(async () => disposeRemote) },
      sessions: { list: sessionList([]) },
      composerSuggestions: { set: vi.fn() },
      inject: () => Object.assign(Promise.reject(new Error('no scope')), { dispose: async () => {} }),
    }
    await expect(apply(ctx as never)).rejects.toThrow('no scope')
    expect(disposeRemote).toHaveBeenCalled()
  })
})
