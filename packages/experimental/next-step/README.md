---
description: "Experimental next-step predictor: one cheap model call after each finished turn, streamed to the composer as ghost text."
kind: "package-reference"
---

# @deepseek-ai/dsh-experimental-next-step

English | [中文](README.zh.md)

## Summary

The predictor watches finished root turns, asks one small model call for the human's likely next message, and streams the answer to a subscribed client. The request is independent: a short event digest, its own token budget, and no Session identity, so the conversation never carries the prediction. The [browser half](../client-ui-next-step/README.md) stages the stream as composer ghost text.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

-----

<a id="use-this-package"></a>
## Use this package

Mount the plugin beside the Session runtime. Without configuration it reuses the finished Session's own provider and model; set both to pin a cheaper model:

```yaml
- name: '@deepseek-ai/dsh-experimental-next-step'
  config:
    provider: deepseek
    model: deepseek-chat
    maxTokens: 160
    timeoutMs: 8000
    maxInputChars: 1200
```

The browser half subscribes through the Remote namespace `nextStep`; mounting it alone costs nothing until a subscribed client watches a Session.

<a id="understand-the-implementation"></a>
## Understand the implementation

One `session/event` listener answers `turn/end` for root Sessions only. While the turn runs it keeps the last four human and assistant messages, clips that exchange to `maxInputChars`, and calls `ctx.llm.stream` once with its own abort deadline and reasoning off, so the budget buys text rather than thinking. Text blocks are joined, and a non-empty answer replaces the Session's snapshot. `watch` streams the current snapshot and every replacement until the caller aborts; an empty answer publishes nothing.

## Model Experience

### Prediction request

#### What the model sees

A fixed system instruction plus one user message holding the last few human and assistant texts, clipped to the last `maxInputChars` characters.

#### Token effect

One independent request per finished root turn: roughly 500 input tokens and at most `maxTokens` output tokens. Its messages never enter the conversation history or a later request.

#### KV Cache effect

Independent: the digest changes with every turn and the request shares no prefix with the conversation.

## Known Limitations and Deferred Work

- **Short memory.** Only the last four messages are kept, so an earlier decision the human refers back to is invisible to the prediction.
- **No quality gate.** Every answer is published as-is; there is no confidence check or deduplication against the draft the human already typed.
- **Root turns only.** Child Sessions never predict, and a failed request is logged and dropped rather than retried.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
