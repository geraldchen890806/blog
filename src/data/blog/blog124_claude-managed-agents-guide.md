---
author: 陈广亮
pubDatetime: 2026-04-15T14:00:00+08:00
title: Claude Managed Agents 上手指南：让 Anthropic 帮你托管 Agent Loop
slug: blog124_claude-managed-agents-guide
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI
  - AI Agent
  - Claude
  - 开发效率
description: 2026年4月刚公测的 Claude Managed Agents 把 Agent Loop、工具执行、沙箱运行环境全部托管到 Anthropic 云端，开发者只需三个 API 调用就能跑起来一个自治 Agent。本文从核心概念讲起，结合真实代码演示完整工作流，并和自建方案做对比。
---

2026年4月8日，Anthropic 发布了 Claude Managed Agents 公测版。在这之前，如果你想让 Claude 自主执行多步骤任务——写代码、跑测试、查资料——你得自己维护一套 agent loop：捕获 `tool_use`、执行工具、把 `tool_result` 塞回去、判断什么时候停止……逻辑不复杂，但每个项目都要重写一遍。

Managed Agents 把这个循环托管了。你告诉它"帮我写个斐波那契脚本并保存到文件"，它自己调用 bash 写代码、读文件验证、遇到错误自己修——你只需要接收流式事件。

这篇文章的目标读者是**想在自己的产品或应用里集成 Agent 能力的开发者**。如果你想要的是一个帮你处理个人日常工作的 AI 助手，Hermes Agent（[评测](https://chenguangliang.com/posts/blog117_hermes-agent-guide/)、[实战](https://chenguangliang.com/posts/blog122_hermes-agent-dev-workflow/)）更对口——两者不是替代关系，而是不同层次的工具。

## 三个核心概念

理解 Managed Agents 之前，先搞清楚三个对象的关系。

**Agent** 是角色定义：用哪个模型、system prompt 是什么、开放哪些工具。类似一份职位描述，一次定义，多次复用。

**Environment** 是运行容器：代码在哪里跑、网络是否开放、有哪些依赖包。每个任务的沙箱环境在这里配置。

**Session** 是一次执行实例：把 Agent 和 Environment 绑在一起，形成有状态的会话，记录完整的事件历史。

```
Agent（角色） + Environment（环境） → Session（执行实例）
```

这三者的解耦是 Managed Agents 架构的关键。容器崩溃了不影响会话历史，可以在新容器里恢复。同一个 Agent 定义可以在不同 Environment 里运行（开发环境关闭网络，生产环境开启）。

## 快速上手：五步跑起来

**前提条件**：需要有效的 Anthropic API Key（`ANTHROPIC_API_KEY` 环境变量），Managed Agents 公测目前对所有 API 账户默认开放，无需单独申请。

### 第一步：安装 SDK

```bash
pip install anthropic
# 或
npm install @anthropic-ai/sdk
```

所有 Managed Agents API 需要带 beta header，SDK 会自动处理：

```
anthropic-beta: managed-agents-2026-04-01
```

> **注意**：这是公测版 beta header。API 可能有破坏性变更，正式上线前建议锁定 SDK 版本并关注 [Release Notes](https://platform.claude.com/docs/en/release-notes/overview)。

### 第二步：创建 Agent

```python
from anthropic import Anthropic

client = Anthropic()  # 读取 ANTHROPIC_API_KEY 环境变量

agent = client.beta.agents.create(
    name="Coding Assistant",
    model="claude-sonnet-4-6",
    system="You are a helpful coding assistant. Write clean, well-documented code.",
    tools=[{"type": "agent_toolset_20260401"}],
)
print(f"Agent ID: {agent.id}")
```

`agent_toolset_20260401` 是内置工具集的类型标识，填这一个字段就能开启所有内置工具。Agent 创建之后会持久化，ID 可以重复使用，不需要每次都创建。

### 第三步：创建 Environment

```python
environment = client.beta.environments.create(
    name="my-env",
    config={
        "type": "cloud",
        "networking": {"type": "unrestricted"}  # 允许访问外网
    },
)
print(f"Environment ID: {environment.id}")
```

`unrestricted` 表示容器可以访问互联网。如果只需要本地文件操作，可以改为 `sandboxed`，更安全。

> **计费提醒**：开启 `unrestricted` 网络后，如果 Agent 调用了 `web_search` 工具，会产生额外费用（$10/1000次）。不需要联网的任务建议在 Agent 定义时关闭 `web_search`（参见下方工具清单配置）。

### 第四步：启动 Session

```python
session = client.beta.sessions.create(
    agent=agent.id,
    environment_id=environment.id,
    title="Generate Fibonacci sequence",
)
print(f"Session ID: {session.id}")
```

### 第五步：发送任务并接收结果

```python
# 关键：先打开流，再发送消息，避免竞态条件
with client.beta.sessions.events.stream(session.id) as stream:
    client.beta.sessions.events.send(
        session.id,
        events=[{
            "type": "user.message",
            "content": [{
                "type": "text",
                "text": "写一个 Python 脚本，生成前 20 个斐波那契数，保存到 fibonacci.txt"
            }],
        }],
    )

    for event in stream:
        match event.type:
            case "agent.message":
                for block in event.content:
                    if block.type == "text":  # content 里可能有非 text 类型的 block
                        print(block.text, end="", flush=True)
            case "agent.tool_use":
                print(f"\n[工具调用: {event.name}]")
            case "agent.tool_result":
                print(f"[执行完成]")
            case "session.status_idle":
                print("\n\nAgent 完成任务。")
                break
```

这段代码运行之后，Agent 会自己：
1. 写出 Python 脚本
2. 调用 `bash` 执行脚本
3. 调用 `read` 验证 fibonacci.txt 内容
4. 回复你结果

全程你不需要处理任何工具调用逻辑。

## 内置工具清单

`agent_toolset_20260401` 包含以下工具，默认全部开启：

| 工具 | 说明 |
|------|------|
| `bash` | 在容器内执行 Shell 命令 |
| `read` | 读取文件 |
| `write` | 写入文件 |
| `edit` | 对文件执行字符串替换 |
| `glob` | 文件路径匹配 |
| `grep` | 正则搜索文件内容 |
| `web_fetch` | 获取网页内容（免费） |
| `web_search` | 搜索互联网（$10/1000次） |

如果不需要某些工具，可以精确控制：

```python
# 只开启文件操作工具，关闭网络
tools = [{
    "type": "agent_toolset_20260401",
    "default_config": {"enabled": False},  # 默认全关
    "configs": [
        {"name": "bash",  "enabled": True},
        {"name": "read",  "enabled": True},
        {"name": "write", "enabled": True},
    ]
}]
```

还可以加入自定义工具。Agent 调用时会触发 `agent.custom_tool_use` 事件，由你的应用执行后通过 `user.custom_tool_result` 返回结果：

```python
# 1. 定义自定义工具
tools = [
    {"type": "agent_toolset_20260401"},
    {
        "type": "custom",
        "name": "query_database",
        "description": "Query the production database",
        "input_schema": {
            "type": "object",
            "properties": {
                "sql": {"type": "string", "description": "SQL query to execute"}
            },
            "required": ["sql"]
        }
    }
]

# 2. 在流事件处理中响应自定义工具调用
with client.beta.sessions.events.stream(session.id) as stream:
    client.beta.sessions.events.send(session.id, events=[...])

    for event in stream:
        match event.type:
            case "agent.custom_tool_use":
                # Agent 想调用你的自定义工具
                if event.name == "query_database":
                    result = my_db.execute(event.input["sql"])
                    # 把结果发回给 Agent
                    client.beta.sessions.events.send(
                        session.id,
                        events=[{
                            "type": "user.custom_tool_result",
                            "tool_use_id": event.id,
                            "content": str(result),
                        }],
                    )
            case "session.status_idle":
                break
```

## 流式事件类型

工具配置好之后，实际运行时你通过 SSE 流接收 Agent 的行为——每一个动作（思考、回复、工具调用）都会作为独立事件推送过来。事件按方向分两类：

**Agent 输出（你接收的）：**

| 事件 | 说明 |
|------|------|
| `agent.message` | Agent 的文字回复 |
| `agent.thinking` | Agent 的思考过程（扩展思考模式） |
| `agent.tool_use` | Agent 发起工具调用 |
| `agent.tool_result` | 工具执行完毕的结果 |
| `agent.custom_tool_use` | Agent 需要你执行自定义工具 |
| `session.status_idle` | 任务完成，等待下一个输入 |
| `session.status_terminated` | Session 因不可恢复错误终止 |

**用户输入（你发送的）：**

| 事件 | 说明 |
|------|------|
| `user.message` | 发送新消息 |
| `user.interrupt` | 中断当前执行 |
| `user.custom_tool_result` | 返回自定义工具执行结果 |
| `user.tool_confirmation` | 批准或拒绝工具调用 |

中断并重定向 Agent 的用法：

```python
# 合并中断和新指令，一次发送
client.beta.sessions.events.send(
    session.id,
    events=[
        {"type": "user.interrupt"},
        {
            "type": "user.message",
            "content": [{"type": "text", "text": "改成生成前 50 个，不需要保存文件"}],
        },
    ],
)
```

## ant CLI 工具

除了 SDK，Anthropic 同步发布了 `ant` CLI，适合快速实验和脚本化操作：

```bash
# macOS
brew install anthropics/tap/ant

# Linux
VERSION=1.0.0
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m | sed -e 's/x86_64/amd64/' -e 's/aarch64/arm64/')
curl -fsSL "https://github.com/anthropics/anthropic-cli/releases/download/v${VERSION}/ant_${VERSION}_${OS}_${ARCH}.tar.gz" \
  | sudo tar -xz -C /usr/local/bin ant
```

命令结构是 `ant beta:<resource> <action>`，beta prefix 告诉 CLI 自动附加对应 header：

```bash
# 创建 Agent（交互式）
ant beta:agents create \
  --name "Coding Assistant" \
  --model '{id: claude-sonnet-4-6}' \
  --system "You are a helpful coding assistant." \
  --tool '{type: agent_toolset_20260401}'

# 更推荐的方式：从 YAML 文件创建，纳入版本控制
cat > assistant.agent.yaml << 'EOF'
name: Coding Assistant
model: claude-sonnet-4-6
system: |
  You are a helpful coding assistant.
tools:
  - type: agent_toolset_20260401
EOF

ant beta:agents create < assistant.agent.yaml

# 流式监听 Session 输出
ant beta:sessions stream --session-id session_01...

# 列出所有 Agent，提取 id 和 name
ant beta:agents list --transform "{id,name}" --format jsonl
```

YAML 格式特别适合团队管理 Agent 配置——和代码一起提交，有完整的变更历史。

## TypeScript 版本

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const agent = await client.beta.agents.create({
  name: "Coding Assistant",
  model: "claude-sonnet-4-6",
  system: "You are a helpful coding assistant.",
  tools: [{ type: "agent_toolset_20260401" }],
});

const environment = await client.beta.environments.create({
  name: "my-env",
  config: { type: "cloud", networking: { type: "unrestricted" } },
});

const session = await client.beta.sessions.create({
  agent: agent.id,
  environment_id: environment.id,
  title: "Fibonacci task",
});

// 先打开流
const stream = await client.beta.sessions.events.stream(session.id);

// 再发消息
await client.beta.sessions.events.send(session.id, {
  events: [{
    type: "user.message",
    content: [{ type: "text", text: "写一个斐波那契脚本" }],
  }],
});

// 处理事件
try {
  for await (const event of stream) {
    if (event.type === "agent.message") {
      for (const block of event.content) {
        if (block.type === "text") {
          process.stdout.write(block.text);
        }
      }
    } else if (event.type === "session.status_idle") {
      break;
    }
  }
} finally {
  stream.controller.abort(); // 确保流正确关闭
}
```

## 和自建方案的取舍

| | Managed Agents | 自建 Agent Loop |
|--|--|--|
| 上手成本 | 低，3 个 API 调用 | 高，需要自己处理工具调用 |
| 控制粒度 | 受限于 Anthropic 框架 | 完全自定义 |
| 调试难度 | 较高，执行过程相对黑盒 | 较低，日志完全自控 |
| 容器管理 | 托管，自动处理 | 需要自己维护 |
| 会话持久化 | 内置，服务端保存 | 需要自己实现 |
| 适用场景 | 标准任务，快速落地 | 需要深度定制的场景 |

一个判断标准：**如果你的任务能用内置工具（文件、命令、网络搜索）完成，Managed Agents 是更省事的选择**。如果你需要调用自己的内部 API、有复杂的业务逻辑嵌入工具执行过程，或者需要对每一步执行有细粒度控制，自建仍然更合适。

和 Hermes Agent 的区别在另一个维度：Hermes 是"帮你管理 AI 助手的工作流"，Managed Agents 是"把代码执行环境也托管了"。前者侧重个人工作流自动化，后者更适合开发者在应用里内嵌自治 Agent 能力。

## 计费方式

Managed Agents 是双维度计费：

**Token 费用**（与 Messages API 相同）：
- Sonnet 4.6：$3/M 输入，$15/M 输出
- Opus 4.6：$5/M 输入，$25/M 输出
- Prompt Caching 折扣适用（缓存命中降至标准价格 10%）

**Session 运行时费用**：
- $0.08 / session-hour
- 仅在 Agent 执行中（`session.status_running`）才计费
- 等待你输入（`session.status_idle`）时不计费
- 已包含容器费用

一个大致的成本参考：用 Sonnet 4.6 跑一个实际执行 30 分钟的任务，消耗 10 万 token（输入 8 万 + 输出 2 万，大约相当于来回交互 20-30 轮的上下文量）：
- Token：$0.24 + $0.30 = $0.54
- 运行时：0.5h × $0.08 = $0.04
- 合计：约 $0.58

对于复杂任务来说成本合理。`web_search` 是单独计费的（$10/1000次），如果任务不需要联网建议关掉。

**关于 Environment 和 Session 的清理**：Agent 持久化保存，Environment 和 Session 目前没有自动 TTL，需要手动删除（`ant beta:sessions delete` / `ant beta:environments delete`）。闲置的 Session 处于 `idle` 状态不计费，但建议任务完成后及时清理，避免积累过多历史记录。

---

**延伸阅读**：
- [Claude Managed Agents 官方文档](https://platform.claude.com/docs/en/managed-agents/overview)
- [Hermes Agent 开发实战：把 AI 助手嵌进项目开发流程](https://chenguangliang.com/posts/blog122_hermes-agent-dev-workflow/) - 个人工作流自动化的另一个思路
- [用 Claude Code CLI 构建多 Agent 自动化系统](https://chenguangliang.com/posts/blog115_openclaw-to-claude-code-migration/) - 自建 Agent Loop 的完整实现
