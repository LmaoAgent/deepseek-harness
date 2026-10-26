/**
 * The published version, read from the nearest package manifest.
 *
 * @module @deepseek-ai/dsh-mcp-next-step/version
 */

import { readFileSync } from 'node:fs'

/**
 * Reads a manifest version without failing server startup.
 * @param manifest - Manifest location.
 * @returns The manifest version, or `0.0.0` when it cannot be read.
 */
export function readVersion(manifest: URL): string {
  try {
    const parsed: unknown = JSON.parse(readFileSync(manifest, 'utf8'))
    if (typeof parsed === 'object' && parsed !== null && 'version' in parsed && typeof parsed.version === 'string') {
      return parsed.version
    }
  } catch {
    // A missing or unparsable manifest keeps the server usable; the version is advisory.
  }
  return '0.0.0'
}
