/**
 * Public entry for `@deepseek-ai/dsh-mcp-next-step`: the predictor, its MCP
 * dispatcher, the stdio line loop, and the configuration reader.
 *
 * @module @deepseek-ai/dsh-mcp-next-step
 */

export type * from './types.ts'
export { readConfig } from './config.ts'
export { heuristicSuggestions } from './heuristic.ts'
export { parseSuggestions } from './parse.ts'
export { createPredictor } from './predict.ts'
export { createCompletion, ProviderError } from './provider.ts'
export type { CompletionEndpoint, ProviderErrorCode } from './provider.ts'
export { createMcpServer, serveLines } from './server.ts'
export type { McpServer, McpServerOptions } from './server.ts'
export { NO_SIGNALS, parseStatus, readLocalSignals } from './signals.ts'
export type { LocalSignals } from './signals.ts'
export { NEXT_STEP_TOOL } from './tool.ts'
export { readVersion } from './version.ts'
