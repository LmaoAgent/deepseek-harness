import { describe, expect, it } from 'vitest'
import { NO_SIGNALS, parseStatus, readLocalSignals } from '../src/signals.ts'

describe('parseStatus', () => {
  it('counts changed, renamed, conflicted, and untracked files and the ahead count', () => {
    const stdout = [
      '# branch.oid abc',
      '# branch.head main',
      '# branch.ab +3 -1',
      '1 .M N... 100644 100644 100644 a b file.ts',
      '2 R. N... 100644 100644 100644 a b renamed.ts',
      'u UU N... 100644 100644 100644 100644 a b conflict.ts',
      '? untracked.ts',
    ].join('\n')
    expect(parseStatus(stdout)).toEqual({ dirtyFiles: 4, ahead: 3 })
  })

  it('ignores an unparsable ahead line and a clean tree', () => {
    expect(parseStatus('# branch.ab nope\n# branch.head main\n')).toEqual({ dirtyFiles: 0, ahead: 0 })
  })
})

describe('readLocalSignals', () => {
  it('returns no signals without a workspace', async () => {
    expect(await readLocalSignals(undefined)).toEqual(NO_SIGNALS)
  })

  it('returns no signals when git cannot run', async () => {
    expect(await readLocalSignals('/definitely/not/a/workspace')).toEqual(NO_SIGNALS)
  })

  it('reads signals from a real repository', async () => {
    const signals = await readLocalSignals(process.cwd())
    expect(typeof signals.dirtyFiles).toBe('number')
    expect(typeof signals.ahead).toBe('number')
  })
})
