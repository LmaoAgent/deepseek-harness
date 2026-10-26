#!/usr/bin/env node
/**
 * `dsh-next-step-mcp`: serves next-step predictions over MCP stdio.
 *
 * @module @deepseek-ai/dsh-mcp-next-step/bin
 */

import { createInterface } from 'node:readline'
import { readConfig } from './config.ts'
import { createPredictor } from './predict.ts'
import { createMcpServer, serveLines } from './server.ts'
import { readVersion } from './version.ts'

const config = readConfig(process.env)
const predictor = createPredictor({
  ...config,
  onError: (error) => {
    process.stderr.write(`dsh-next-step-mcp: provider call failed, using local suggestions (${String(error)})\n`)
  },
})
const server = createMcpServer({ predictor, version: readVersion(new URL('../package.json', import.meta.url)) })
process.stderr.write(config.localOnly === true
  ? 'dsh-next-step-mcp: zero-token mode (set DEEPSEEK_API_KEY for model suggestions)\n'
  : `dsh-next-step-mcp: model ${config.model}\n`)
const lines = createInterface({ input: process.stdin, crlfDelay: Number.POSITIVE_INFINITY })
await serveLines(lines, (line) => {
  process.stdout.write(`${line}\n`)
}, server)
