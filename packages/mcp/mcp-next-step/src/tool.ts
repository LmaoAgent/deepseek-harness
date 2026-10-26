/**
 * The single MCP tool this server publishes.
 *
 * @module @deepseek-ai/dsh-mcp-next-step/tool
 */

/** Model-facing tool definition for `tools/list`. */
export const NEXT_STEP_TOOL = {
  name: 'suggest_next_step',
  description: 'Predict the human\'s most likely next messages from the turn you just finished. Call once at the end of a turn. A separate cheap model call writes at most two short lines from the snippets you pass, so the conversation is not replayed.',
  inputSchema: {
    type: 'object',
    properties: {
      user: {
        type: 'string',
        description: 'Latest human message; clipped to 600 characters.',
      },
      assistant: {
        type: 'string',
        description: 'Tail of your latest reply; clipped to 1000 characters.',
      },
      workspace: {
        type: 'string',
        description: 'Optional workspace root for zero-token git signals.',
      },
      language: {
        type: 'string',
        enum: ['zh', 'en'],
        description: 'Output language; inferred from the text when omitted.',
      },
    },
    additionalProperties: false,
  },
} as const
