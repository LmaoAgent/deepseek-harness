---
description: "Predict the human's likely next message with one cheap model call and serve it to any MCP client over stdio."
kind: "package-reference"
---

# @deepseek-ai/dsh-mcp-next-step

English | [中文](README.zh.md)

## Summary

`dsh-mcp-next-step` is a standalone Model Context Protocol server that predicts the human's likely next message from the exchange a turn just finished. Any MCP client can launch it over stdio; the harness does not mount it. Its single tool, `suggest_next_step`, forwards only the two snippets the caller passes to a separately billed small completion and returns at most two one-line suggestions, so the main conversation is never replayed. Without an API key the server answers from local git evidence and spends no tokens.

## Table of Contents

- [Use this package](#use-this-package)
- [Configure](#configure)
- [Understand the implementation](#understand-the-implementation)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

-----

<a id="use-this-package"></a>
## Use this package

Every MCP client launches the same executable. Pass the provider key through the client's environment block:

```json
{
  "mcpServers": {
    "next-step": {
      "command": "npx",
      "args": ["-y", "@deepseek-ai/dsh-mcp-next-step"],
      "env": { "DEEPSEEK_API_KEY": "sk-..." }
    }
  }
}
```

DSH reaches external servers through its MCP client plugin; use the server entry syntax that [`dsh-mcp-client`](../mcp-client/README.md) documents. The server writes protocol lines on stdout and diagnostics on stderr, so a client that captures one stream never corrupts the other.

Call the tool once when a turn ends:

```
suggest_next_step({ user: "<latest human message>", assistant: "<tail of your reply>", workspace: "/path/to/repo" })
```

The result is one line per suggestion. `workspace` is optional and only improves the zero-token path.

<a id="configure"></a>
## Configure

| Variable | Default | Meaning |
|---|---|---|
| `DEEPSEEK_API_KEY` / `NEXT_STEP_API_KEY` | none | Provider bearer token. Without one the server runs the zero-token heuristic. `NEXT_STEP_API_KEY` wins. |
| `NEXT_STEP_BASE_URL` | `https://api.deepseek.com` | OpenAI-compatible provider root; `/chat/completions` is appended. |
| `NEXT_STEP_MODEL` | `deepseek-chat` | Model that writes the suggestions. |
| `NEXT_STEP_MAX_TOKENS` | `96` | Completion cap, clamped to 16–512. |
| `NEXT_STEP_MAX_SUGGESTIONS` | `2` | Returned suggestions, clamped to 1–3. |
| `NEXT_STEP_TIMEOUT_MS` | `8000` | One provider call, clamped to 100–60000. |
| `NEXT_STEP_CACHE_TTL_MS` | `300000` | Reuse window for an identical digest. |
| `NEXT_STEP_LOCAL_ONLY` | unset | `1` forces the zero-token heuristic even with a key. |
| `NEXT_STEP_LANGUAGE` | inferred | `zh` or `en`; otherwise CJK presence decides. |

<a id="understand-the-implementation"></a>
## Understand the implementation

The predictor clips the human message to 600 characters and the assistant tail to 1000, renders a two-message digest, and asks the provider for at most a few lines. Parsing strips list markers, quotes, and trailing punctuation, drops a line that repeats the human message, folds case and punctuation for duplicates, and clips each suggestion to 96 characters. A digest keeps its prediction for the configured window; the cache holds 64 entries and evicts the oldest first.

Every failure path falls back to the heuristic: no key, `NEXT_STEP_LOCAL_ONLY=1`, a provider error, a timeout, or a completion that parses to nothing. The heuristic cites the working tree and the reply — an open pull request, uncommitted files, an unpushed branch, remaining work, tests — and always returns at least one generic continuation.

The budget per prediction is one provider request of roughly 500 input tokens and at most 96 output tokens, or none in heuristic mode. Callers pay only the tool arguments they pass, so a short digest is the lever that keeps the feature cheap.

## Model Experience

None, as external MCP clients launch this server and it contributes no harness model context.

#### KV Cache effect

No effect on harness requests; each prediction is an independent provider call.

## Known Limitations and Deferred Work

- **No human-facing surface.** The server returns text to the calling model; showing a clickable card above a composer needs a client-side plugin, which this package does not provide.
- **One exchange per call.** The digest carries no conversation history, so a prediction cannot reason about earlier turns beyond what the caller summarizes.
- **Heuristic mode is generic.** Without a key it can only cite the reply and git state, and its suggestions repeat across quiet turns.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
