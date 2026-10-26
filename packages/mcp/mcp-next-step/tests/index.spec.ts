import { describe, expect, it } from 'vitest'
import * as api from '../src/index.ts'

describe('public entry', () => {
  it('exports the predictor, transport, and helpers', () => {
    expect(typeof api.createPredictor).toBe('function')
    expect(typeof api.createMcpServer).toBe('function')
    expect(typeof api.serveLines).toBe('function')
    expect(typeof api.createCompletion).toBe('function')
    expect(typeof api.readConfig).toBe('function')
    expect(typeof api.parseSuggestions).toBe('function')
    expect(typeof api.heuristicSuggestions).toBe('function')
    expect(typeof api.readLocalSignals).toBe('function')
    expect(typeof api.parseStatus).toBe('function')
    expect(typeof api.readVersion).toBe('function')
    expect(api.ProviderError.prototype).toBeInstanceOf(Error)
    expect(api.NEXT_STEP_TOOL.name).toBe('suggest_next_step')
    expect(api.NO_SIGNALS).toEqual({ dirtyFiles: 0, ahead: 0 })
  })
})
