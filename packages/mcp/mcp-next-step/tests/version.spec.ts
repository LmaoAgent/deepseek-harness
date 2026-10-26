import { describe, expect, it } from 'vitest'
import { readVersion } from '../src/version.ts'

describe('readVersion', () => {
  it('reads the package manifest', () => {
    expect(readVersion(new URL('../package.json', import.meta.url))).toMatch(/^\d+\.\d+\.\d+/u)
  })

  it('falls back when the manifest is missing', () => {
    expect(readVersion(new URL('./fixtures/missing.json', import.meta.url))).toBe('0.0.0')
  })

  it('falls back when the manifest has no version string', () => {
    expect(readVersion(new URL('./fixtures/without-version.json', import.meta.url))).toBe('0.0.0')
  })
})
