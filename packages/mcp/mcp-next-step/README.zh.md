---
description: "Predict the human's likely next message with one cheap model call and serve it to any MCP client over stdio."
kind: "package-reference"
---

# @deepseek-ai/dsh-mcp-next-step

[English](README.md) | 中文

## 概述

`dsh-mcp-next-step` 是一个独立的 Model Context Protocol 服务：根据刚结束的一轮对话预测人类下一句话。任何 MCP 客户端都可以通过 stdio 启动它，harness 本身不挂载它。它只有一个工具 `suggest_next_step`，只把调用方传入的两段文本转给一次单独计费的小模型调用，最多返回两行建议，因此主对话不会被重放。没有 API key 时改用本地 git 证据，完全不消耗 token。

## 目录

- [Use this package](#use-this-package)
- [Configure](#configure)
- [Understand the implementation](#understand-the-implementation)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

-----

<a id="use-this-package"></a>
## 使用本包

所有 MCP 客户端启动同一个可执行文件。请通过客户端的环境变量传入 provider key：

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

DSH 通过 MCP 客户端插件接入外部服务；具体条目写法见 [`dsh-mcp-client`](../mcp-client/README.zh.md)。协议行只写 stdout，诊断只写 stderr，客户端捕获单一输出流时不会互相污染。

在一轮结束时调用一次工具：

```
suggest_next_step({ user: "<latest human message>", assistant: "<tail of your reply>", workspace: "/path/to/repo" })
```

结果是每行一条建议。`workspace` 可选，只影响零 token 路径。

<a id="configure"></a>
## 配置

| 变量 | 默认值 | 含义 |
|---|---|---|
| `DEEPSEEK_API_KEY` / `NEXT_STEP_API_KEY` | 无 | Provider bearer token。缺失时走零 token 启发式；`NEXT_STEP_API_KEY` 优先。 |
| `NEXT_STEP_BASE_URL` | `https://api.deepseek.com` | OpenAI 兼容 provider 根地址，自动追加 `/chat/completions`。 |
| `NEXT_STEP_MODEL` | `deepseek-chat` | 生成建议的模型。 |
| `NEXT_STEP_MAX_TOKENS` | `96` | 补全上限，限制在 16–512。 |
| `NEXT_STEP_MAX_SUGGESTIONS` | `2` | 返回条数，限制在 1–3。 |
| `NEXT_STEP_TIMEOUT_MS` | `8000` | 单次 provider 调用超时，限制在 100–60000。 |
| `NEXT_STEP_CACHE_TTL_MS` | `300000` | 相同摘要的复用窗口。 |
| `NEXT_STEP_LOCAL_ONLY` | 未设置 | `1` 强制零 token 启发式，即使配置了 key。 |
| `NEXT_STEP_LANGUAGE` | 自动推断 | `zh` 或 `en`；否则按是否出现 CJK 判断。 |

<a id="understand-the-implementation"></a>
## 理解实现

预测器把人类消息截到 600 字符、助手回复尾部截到 1000 字符，拼成两条消息的摘要，要求 provider 最多返回几行。解析阶段去掉列表符号、引号和句末标点，丢弃与人类消息重复的行，按大小写与标点折叠后去重，每条建议再截到 96 字符。同一个摘要的预测在配置窗口内复用，缓存保留 64 条，先淘汰最旧的。

所有失败路径都回落到启发式：没有 key、`NEXT_STEP_LOCAL_ONLY=1`、provider 报错、超时，或补全解析为空。启发式引用工作区与回复内容——未合并的 PR、未提交改动、未推送分支、遗留待办、测试——并始终至少返回一条通用续写。

每次预测的预算是：一次约 500 输入 token、最多 96 输出 token 的 provider 请求；启发式模式下为 0。调用方只为传入的工具参数付费，因此摘要越短，特性越便宜。

## 模型体验

None, as external MCP clients launch this server and it contributes no harness model context.

#### KV Cache effect

No effect on harness requests; each prediction is an independent provider call.

## 已知限制与延后工作

- **没有人类可见的界面。** 服务把文本返回给调用它的模型；要在输入框上方显示可点击卡片，需要客户端插件，本包不提供。
- **每次只处理一轮。** 摘要不含对话历史，超出调用方概括范围的更早轮次无法参与预测。
- **启发式较泛。** 没有 key 时只能引用回复和 git 状态，安静的回合会得到重复建议。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>
