---
author: Gerald Chen
pubDatetime: 2026-04-15T14:00:00+08:00
title: "Getting Started with Claude Managed Agents: Let Anthropic Run Your Agent Loop"
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
description: "Claude Managed Agents, which entered public beta in April 2026, moves the agent loop, tool execution, and sandboxed runtime entirely into Anthropic's cloud—three API calls are all it takes to get an autonomous agent running. This post walks through the core concepts, demonstrates the full workflow with real code, and compares it against building your own."
---

On April 8, 2026, Anthropic launched the public beta of Claude Managed Agents. Before this, if you wanted Claude to execute multi-step tasks autonomously—writing code, running tests, looking things up—you had to maintain your own agent loop: catch `tool_use`, execute the tool, feed back the `tool_result`, decide when to stop... The logic isn't complicated, but you end up rewriting it for every project.

Managed Agents takes that loop off your hands. You tell it "write me a Fibonacci script and save it to a file," and it calls bash to write the code, reads the file to verify, and fixes errors on its own—all you do is consume the streaming events.

This post is aimed at **developers who want to embed agent capabilities into their own products or applications**. If what you want is an AI assistant for your personal day-to-day work, Hermes Agent ([Hermes Agent Review: OpenClaw's Successor, a Multi-Platform AI Assistant with a Built-In Learning Loop](/en/posts/blog117_hermes-agent-guide/), [Hermes Agent in Practice: Embedding an AI Assistant into Your Development Workflow](/en/posts/blog122_hermes-agent-dev-workflow/)) is a better fit—the two aren't substitutes, they're tools at different layers.

## Three Core Concepts

Before diving into Managed Agents, get clear on how three objects relate to each other.

An **Agent** is a role definition: which model to use, what the system prompt is, which tools are available. Think of it as a job description—defined once, reused many times.

An **Environment** is the runtime container: where the code runs, whether networking is enabled, what dependencies are installed. Each task's sandbox is configured here.

A **Session** is a single execution instance: it binds an Agent to an Environment, forming a stateful conversation with a complete event history.

```
Agent (role) + Environment (runtime) → Session (execution instance)
```

Decoupling these three is the key to the Managed Agents architecture. If a container crashes, the session history survives and can be resumed in a new container. The same Agent definition can run in different Environments (networking off in dev, on in production).

## Quick Start: Up and Running in Five Steps

**Prerequisites**: a valid Anthropic API key (the `ANTHROPIC_API_KEY` environment variable). The Managed Agents beta is currently enabled by default for all API accounts—no separate signup needed.

### Step 1: Install the SDK

```bash
pip install anthropic
# 或
npm install @anthropic-ai/sdk
```

All Managed Agents APIs require a beta header, which the SDK handles automatically:

```
anthropic-beta: managed-agents-2026-04-01
```

> **Note**: this is a public-beta header. The API may introduce breaking changes, so pin your SDK version until GA and keep an eye on the [Release Notes](https://platform.claude.com/docs/en/release-notes/overview).

### Step 2: Create an Agent

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

`agent_toolset_20260401` is the type identifier for the built-in toolset—this single field enables all built-in tools. Agents are persisted after creation; the ID is reusable, so you don't need to create one every time.

### Step 3: Create an Environment

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

`unrestricted` means the container can reach the internet. If you only need local file operations, switch to `sandboxed` for better security.

> **Billing note**: with `unrestricted` networking enabled, any `web_search` calls the Agent makes incur extra charges ($10/1000 calls). For tasks that don't need internet access, disable `web_search` in the Agent definition (see the tool list configuration below).

### Step 4: Start a Session

```python
session = client.beta.sessions.create(
    agent=agent.id,
    environment_id=environment.id,
    title="Generate Fibonacci sequence",
)
print(f"Session ID: {session.id}")
```

### Step 5: Send the Task and Receive Results

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

Once this code runs, the Agent will, on its own:
1. Write the Python script
2. Call `bash` to execute it
3. Call `read` to verify the contents of fibonacci.txt
4. Reply with the result

You never touch any tool-calling logic.

## Built-in Tools

`agent_toolset_20260401` includes the following tools, all enabled by default:

| Tool | Description |
|------|------|
| `bash` | Execute shell commands inside the container |
| `read` | Read files |
| `write` | Write files |
| `edit` | Perform string replacements in files |
| `glob` | Match file paths |
| `grep` | Regex-search file contents |
| `web_fetch` | Fetch web page content (free) |
| `web_search` | Search the internet ($10/1000 calls) |

If you don't need certain tools, you can control them precisely:

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

You can also add custom tools. When the Agent invokes one, an `agent.custom_tool_use` event fires; your application executes it and returns the result via `user.custom_tool_result`:

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

## Streaming Event Types

With tools configured, at runtime you receive the Agent's behavior over an SSE stream—every action (thinking, replying, calling a tool) arrives as a separate event. Events fall into two directions:

**Agent output (what you receive):**

| Event | Description |
|------|------|
| `agent.message` | The Agent's text reply |
| `agent.thinking` | The Agent's reasoning process (extended thinking mode) |
| `agent.tool_use` | The Agent initiates a tool call |
| `agent.tool_result` | Result of a completed tool execution |
| `agent.custom_tool_use` | The Agent needs you to execute a custom tool |
| `session.status_idle` | Task complete, waiting for the next input |
| `session.status_terminated` | Session terminated due to an unrecoverable error |

**User input (what you send):**

| Event | Description |
|------|------|
| `user.message` | Send a new message |
| `user.interrupt` | Interrupt the current execution |
| `user.custom_tool_result` | Return the result of a custom tool execution |
| `user.tool_confirmation` | Approve or reject a tool call |

Interrupting and redirecting the Agent looks like this:

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

## The ant CLI

Alongside the SDK, Anthropic shipped the `ant` CLI, well suited for quick experiments and scripting:

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

The command structure is `ant beta:<resource> <action>`; the beta prefix tells the CLI to attach the corresponding header automatically:

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

The YAML format is especially handy for teams managing Agent configurations—committed alongside the code, with a full change history.

## TypeScript Version

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

## Trade-offs vs. Building Your Own

| | Managed Agents | DIY Agent Loop |
|--|--|--|
| Ramp-up cost | Low, 3 API calls | High, you handle tool calls yourself |
| Control granularity | Constrained by Anthropic's framework | Fully customizable |
| Debuggability | Harder—execution is relatively opaque | Easier—you own all the logs |
| Container management | Managed, handled automatically | You maintain it yourself |
| Session persistence | Built in, stored server-side | You implement it yourself |
| Best fit | Standard tasks, fast time-to-ship | Scenarios requiring deep customization |

A simple rule of thumb: **if your task can be done with the built-in tools (files, commands, web search), Managed Agents is the lower-effort choice**. If you need to call your own internal APIs, embed complex business logic into tool execution, or maintain fine-grained control over every step, building your own is still the better fit.

The difference from Hermes Agent lies on another axis: Hermes "manages your AI assistant's workflow," while Managed Agents "also hosts the code execution environment." The former leans toward personal workflow automation; the latter suits developers embedding autonomous agent capabilities into applications.

## Pricing

Managed Agents bills along two dimensions:

**Token costs** (same as the Messages API):
- Sonnet 4.6: $3/M input, $15/M output
- Opus 4.6: $5/M input, $25/M output
- Prompt Caching discounts apply (cache hits drop to 10% of the standard price)

**Session runtime costs**:
- $0.08 / session-hour
- Billed only while the Agent is executing (`session.status_running`)
- Not billed while waiting for your input (`session.status_idle`)
- Container costs are included

A rough cost reference: running a task on Sonnet 4.6 with 30 minutes of actual execution time, consuming 100K tokens (80K input + 20K output, roughly the context volume of 20-30 back-and-forth turns):
- Tokens: $0.24 + $0.30 = $0.54
- Runtime: 0.5h × $0.08 = $0.04
- Total: about $0.58

Reasonable for complex tasks. `web_search` is billed separately ($10/1000 calls)—turn it off if the task doesn't need internet access.

**On cleaning up Environments and Sessions**: Agents are persisted, but Environments and Sessions currently have no automatic TTL and must be deleted manually (`ant beta:sessions delete` / `ant beta:environments delete`). Idle Sessions in the `idle` state aren't billed, but it's good practice to clean them up once a task is done to avoid accumulating too much history.

---

**Further reading**:
- [Claude Managed Agents official docs](https://platform.claude.com/docs/en/managed-agents/overview)
- [Hermes Agent in Practice: Embedding an AI Assistant into Your Development Workflow](/en/posts/blog122_hermes-agent-dev-workflow/) - another take on personal workflow automation
- [After OpenClaw Shut Down: Rebuilding a Multi-Agent Automation Setup with the Claude Code CLI](/en/posts/blog115_openclaw-to-claude-code-migration/) - a complete DIY agent loop implementation
