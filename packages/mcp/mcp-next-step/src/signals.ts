/**
 * Working-tree facts that let the zero-token path suggest something specific
 * without calling a model.
 *
 * @module @deepseek-ai/dsh-mcp-next-step/signals
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

/** Working-tree facts a heuristic suggestion may cite. */
export interface LocalSignals {
  /** Files with uncommitted or untracked changes. */
  dirtyFiles: number
  /** Commits the branch is ahead of its upstream. */
  ahead: number
}

/** Signals for an absent workspace or one that is not a repository. */
export const NO_SIGNALS: LocalSignals = { dirtyFiles: 0, ahead: 0 }

/**
 * Parses `git status --porcelain=v2 --branch` output.
 * @param stdout - Full git status output.
 * @returns Changed-file count and commits ahead of the upstream.
 */
export function parseStatus(stdout: string): LocalSignals {
  let dirtyFiles = 0
  let ahead = 0
  for (const line of stdout.split('\n')) {
    if (line.startsWith('# branch.ab ')) {
      const match = /\+(\d+) -\d+$/u.exec(line)
      if (match?.[1] !== undefined) ahead = Number(match[1])
      continue
    }
    if (line.startsWith('1 ') || line.startsWith('2 ') || line.startsWith('u ') || line.startsWith('? ')) dirtyFiles += 1
  }
  return { dirtyFiles, ahead }
}

/**
 * Reads local signals without failing the prediction path.
 * @param workspace - Workspace root, or nothing to skip git entirely.
 * @param timeoutMs - Upper bound on the git process.
 * @returns Parsed signals, or `NO_SIGNALS` when git cannot run.
 */
export async function readLocalSignals(workspace: string | undefined, timeoutMs = 800): Promise<LocalSignals> {
  if (workspace === undefined) return NO_SIGNALS
  try {
    const { stdout } = await run('git', ['status', '--porcelain=v2', '--branch'], {
      cwd: workspace,
      timeout: timeoutMs,
      maxBuffer: 1 << 20,
    })
    return parseStatus(stdout)
  } catch {
    // A missing repository, missing git, or a timeout leaves no local evidence.
    return NO_SIGNALS
  }
}
