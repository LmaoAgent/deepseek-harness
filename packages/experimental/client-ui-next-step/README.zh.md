---
description: "Composer ghost text for the next-step predictor: mounts the Host stream and stages each suggestion in the input."
kind: "package-reference"
---

# @deepseek-ai/dsh-experimental-client-ui-next-step

[English](README.md) | 中文

## Summary

浏览器半边只挂载一次预测器的 Remote 流，跟踪会话列表中的每个会话，并通过 `ctx.composerSuggestions.set` 暂存每条快照。Conversation 输入框在草稿为空时把它画成灰字；Tab 接受、任何草稿都会隐藏它、删空草稿又会重新出现。预测本身由 [Host 包](../next-step/README.zh.md) 生成。

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

-----

<a id="use-this-package"></a>
## Use this package

在同一 Web profile 中与 Conversation 插件一起挂载。它注入 `remote`、`sessions` 与 `composerSuggestions`，因此对应的 Host 条目和 `ui-conversation` 必须已在运行：

```yaml
- name: '@deepseek-ai/dsh-experimental-client-ui-next-step'
```

无需配置；哪些会话参与预测由 Host 决定。

<a id="understand-the-implementation"></a>
## Understand the implementation

`apply` 挂载生成的 Remote 贡献，订阅会话列表，为列表中每个会话打开一条 `watch` 流，并在会话离开列表或插件卸载时关闭。每条快照替换该会话暂存的建议，空文本表示清除。订阅失败只记录日志，不影响输入框。

## Model Experience

None, as the browser half only stages the Host's prediction as unsent draft text.

#### KV Cache effect

No effect; the browser sends no model request.

## Known Limitations and Deferred Work

- **每个列出的会话都在订阅。** 即使人类不在该会话，也保持一条打开的 Remote 流；只订阅当前会话会更省。
- **无法丢弃。** 建议会一直暂存到有新预测、发送或切换会话；浏览器没有拒绝它的入口。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>
