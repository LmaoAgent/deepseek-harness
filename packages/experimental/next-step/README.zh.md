---
description: "Experimental next-step predictor: one cheap model call after each finished turn, streamed to the composer as ghost text."
kind: "package-reference"
---

# @deepseek-ai/dsh-experimental-next-step

[English](README.md) | 中文

## Summary

预测器监听已结束的根会话回合，用一次小模型调用预测人类下一句话，并把结果流式推给订阅的客户端。这次请求是独立的：只有一小段事件摘要、自己的 token 预算、不带 Session 身份，因此对话本身不会携带预测结果。[浏览器半边](../client-ui-next-step/README.zh.md) 把这条流变成输入框里的灰字。

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

-----

<a id="use-this-package"></a>
## Use this package

把插件挂在 Session 运行时旁边。不配置时复用已结束回合自己的 provider 与 model；两者都填则固定到更便宜的模型：

```yaml
- name: '@deepseek-ai/dsh-experimental-next-step'
  config:
    provider: deepseek
    model: deepseek-chat
    maxTokens: 160
    timeoutMs: 8000
    maxInputChars: 1200
```

浏览器半边通过 Remote 命名空间 `nextStep` 订阅；只挂 Host 侧、没有客户端订阅时不会产生任何调用。

<a id="understand-the-implementation"></a>
## Understand the implementation

一个 `session/event` 监听器只处理根会话的 `turn/end`；回合进行中它会保留最近四条人类与助手消息，按 `maxInputChars` 截断后用独立的超时、并关闭推理，调用一次 `ctx.llm.stream`，让预算都花在文本上。文本块拼接后非空就替换该 Session 的快照。`watch` 先给出当前快照，再推送每次替换，直到调用方 abort；空回答不发布。

## Model Experience

### Prediction request

#### What the model sees

一条固定系统指令，加一条用户消息：最近几条人类与助手文本，截断到 `maxInputChars`。

#### Token effect

每个已结束的根回合一次独立请求：约 500 输入 token、最多 `maxTokens` 输出 token。这些消息不进对话历史，也不进后续请求。

#### KV Cache effect

独立：摘要每回合都变，与对话不共享前缀。

## Known Limitations and Deferred Work

- **记忆很短。** 只保留最近四条消息，人类回溯更早决定的上下文对预测不可见。
- **没有质量门。** 回答原样发布，既不判置信度，也不与用户已输入的草稿去重。
- **只处理根回合。** 子会话不预测；请求失败只记录日志，不重试。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>
