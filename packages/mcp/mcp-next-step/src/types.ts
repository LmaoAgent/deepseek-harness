/**
 * Types shared by the predictor, its provider adapter, and the MCP transport.
 *
 * @module @deepseek-ai/dsh-mcp-next-step/types
 */

/** Languages the built-in prompts and heuristic suggestions are written in. */
export type Language = 'zh' | 'en'

/** The latest exchange a prediction may look at. */
export interface NextStepInput {
  /** The human's latest message. */
  user?: string
  /** Tail of the assistant's latest reply. */
  assistant?: string
  /** Workspace root; only the zero-token local signals read it. */
  workspace?: string
  /** Output language; inferred from the input when omitted. */
  language?: Language
}

/** One predicted next message. */
export interface Suggestion {
  /** Imperative one-liner a client shows above its composer. */
  text: string
}

/** Which path produced a prediction. */
export type PredictionSource = 'model' | 'cache' | 'heuristic'

/** Provider-reported token counts. */
export interface TokenUsage {
  /** Prompt tokens the provider billed. */
  input: number
  /** Completion tokens the provider billed. */
  output: number
}

/** One prediction and its provenance. */
export interface Prediction {
  /** At most the configured maximum number of entries, most likely first. */
  suggestions: Suggestion[]
  /** Path that produced the suggestions. */
  source: PredictionSource
  /** Provider usage, present only when the model path ran. */
  usage?: TokenUsage
}

/** One chat message sent to the provider. */
export interface ChatMessage {
  /** Author role; predictions need only these two. */
  role: 'system' | 'user'
  /** Message text. */
  content: string
}

/** One provider completion request. */
export interface CompletionRequest {
  /** Provider model name. */
  model: string
  /** System and digest messages, in that order. */
  messages: ChatMessage[]
  /** Completion cap. */
  maxTokens: number
}

/** One provider completion result. */
export interface CompletionResult {
  /** Raw completion text. */
  text: string
  /** Provider-reported usage, when reported. */
  usage?: TokenUsage
}

/** Performs one completion; hosts substitute their own provider here. */
export type Completion = (request: CompletionRequest, signal: AbortSignal) => Promise<CompletionResult>

/** Produces predictions for one configuration. */
export interface Predictor {
  /**
   * Predicts the human's next message from the latest exchange.
   * @param input - The latest exchange and optional workspace.
   * @returns At least one suggestion on every path.
   */
  predict(input: NextStepInput): Promise<Prediction>
}

/** Deployment-varying predictor behavior. */
export interface PredictorConfig {
  /** Bearer token for the OpenAI-compatible provider; omitted keeps the heuristic path. */
  apiKey?: string
  /** Provider root, without a trailing slash. */
  baseUrl: string
  /** Provider model name. */
  model: string
  /** Completion cap; prediction text never exceeds this. */
  maxTokens: number
  /** Aborts one provider call after this many milliseconds. */
  timeoutMs: number
  /** Reuses an identical digest's prediction for this long in milliseconds. */
  cacheTtlMs: number
  /** Upper bound on returned suggestions. */
  maxSuggestions: number
  /** Forces the output language instead of inferring it. */
  language?: Language
  /** Skips the provider entirely (zero-token mode). */
  localOnly?: boolean
  /** Overrides the provider call, for hosts and tests. */
  complete?: Completion
  /** Clock injection for cache expiry in tests. */
  now?: () => number
  /** Receives provider failures that fell back to the heuristic. */
  onError?: (error: unknown) => void
}
