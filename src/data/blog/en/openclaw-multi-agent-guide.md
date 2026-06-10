---
author: Gerald Chen
pubDatetime: 2026-02-13T00:45:00+08:00
title: "OpenClaw Multi-Agent Setup in Practice: Pitfalls and Best Practices"
slug: openclaw-multi-agent-guide
featured: true
draft: false
tags:
  - OpenClaw
  - AI
  - 配置
description: "Setting up multiple OpenClaw agents and multiple Telegram accounts comes with plenty of pitfalls. Based on hands-on experience, this post covers every common problem and its fix so you can skip the pain."
---

If you've been using OpenClaw for a while, you've probably hit this need: you want a dedicated AI assistant for blogging, another for fiction writing, another for coding... each with its own role, working directory, and configuration. That's exactly what multi-agent setup is for.

This isn't a theory tutorial — it's a field report of pitfalls I actually hit. I'll walk you through what goes wrong during setup, why it goes wrong, and how to avoid or fix it.

## Why Multiple Agents

**Context isolation.** Different work contexts call for different AI assistants:

- **Blog assistant**: focused on technical writing, familiar with your blog deployment workflow, with its own drafts directory
- **Fiction assistant**: creative writing style, manages chapters and character profiles, no need to touch your codebases
- **Dev assistant**: knows your coding conventions, can run sensitive commands, but shouldn't access your personal notes
- **Family assistant**: bound to the family WhatsApp group, restricted to a limited tool set to protect privacy

**Independent configuration.** Each agent gets its own:
- **Workspace**: a separate working directory, fully isolated from the others
- **SOUL.md**: its own role definition and personality
- **Model**: different agents can run different models (Opus for deep thinking, Sonnet for everyday chat)
- **Tool Policy**: restrict tool permissions per agent (e.g. the family assistant can't run shell commands)

**Account routing.** Multiple Telegram bots or WhatsApp accounts, each routed to a different agent, all managed by a single Gateway.

For example, you might end up with agents like:
- `main`: everyday chat, full capabilities
- `work`: work context, can access project docs
- `creative`: writing assistant, focused on creative work
- `coding`: dev assistant, handles code-related tasks

## Multi-Agent Setup Walkthrough

### 1. Create an Agent

```bash
# 创建一个新 Agent
openclaw agents add blog --workspace ~/.openclaw/workspace-blog

# 验证创建结果
openclaw agents list
```

This adds the following to your config file:

```json5
{
  agents: {
    list: [
      {
        id: "main",
        default: true,
        workspace: "~/.openclaw/workspace",
      },
      {
        id: "blog",
        workspace: "~/.openclaw/workspace-blog",
      },
    ],
  },
}
```

### 2. Set the Model

**⚠️ Pitfall #1: model ID format**

When configuring the model, use the **alias** — never the date-suffixed ID!

```bash
# ✅ 正确：使用别名
openclaw config patch agents.list.1.model "anthropic/claude-sonnet-4-5"

# ❌ 错误：带日期后缀的完整 ID
openclaw config patch agents.list.1.model "anthropic/claude-sonnet-4-20250514"
```

**Why?**

Date-suffixed IDs break when a new version ships. Aliases (like `claude-sonnet-4-5`) automatically track the latest version.

Verify the config:

```bash
openclaw config get agents.list.1.model
# 应该输出：anthropic/claude-sonnet-4-5
```

### 3. Write SOUL.md to Define the Role

In each agent's workspace, create a `SOUL.md` that defines its role:

```bash
cd ~/.openclaw/workspace-blog
```

Create `SOUL.md`:

```markdown
# SOUL.md - 工作助手

你是工作助手，帮助处理日常工作任务。

## 角色定位
- 专注于工作场景，风格专业高效
- 熟悉常用开发工具和工作流程
- 所有重要操作需要确认后执行

## 工作流程
1. 接收任务需求
2. 分析任务并制定执行计划
3. 执行任务
4. 汇报结果

## 工作规范
- 代码示例要完整可用
- 文档结构清晰
- 操作前确认权限
```

**⚠️ Pitfall #2: do NOT create BOOTSTRAP.md yourself**

If you manually create a `BOOTSTRAP.md`, the agent will get stuck in the bootstrapping state forever!

**Why?**

`BOOTSTRAP.md` is the agent's "initialization checklist." On startup, the agent executes the instructions inside it and only deletes the file once it's done. If you create this file by hand with incomplete content, the agent will keep retrying and never reach its normal state.

**Fix:**

```bash
# 如果发现 Agent 卡住了，检查是否有 BOOTSTRAP.md
ls ~/.openclaw/workspace-blog/BOOTSTRAP.md

# 如果存在，直接删除
rm ~/.openclaw/workspace-blog/BOOTSTRAP.md

# 重启 Gateway
openclaw gateway restart
```

### 4. Test the Agent

```bash
# 列出所有 Agent
openclaw agents list

# 查看 Agent 详细配置
openclaw config get agents.list.1

# 重启 Gateway 让配置生效
openclaw gateway restart
```

## Multi-Account Telegram Setup

The classic multi-agent use case: multiple Telegram bots, each routed to a different agent.

### 1. Create the Telegram Bots

Find [@BotFather](https://t.me/BotFather) on Telegram and create a bot:

```
/newbot
```

Follow the prompts to set a name and username, and you'll get a token (something like `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`).

Say you've created two bots:
- `@MyMainBot` → token1
- `@MyWorkBot` → token2

### 2. Configure Multiple Accounts

Edit `~/.openclaw/openclaw.json` (or use `openclaw config patch`):

```json5
{
  channels: {
    telegram: {
      accounts: {
        main: {
          token: "token1",
          dmPolicy: "allowlist",
          allowFrom: ["123456789"], // 你的 Telegram user ID
        },
        blog: {
          token: "token2",
          dmPolicy: "allowlist",
          allowFrom: ["123456789"],
        },
      },
    },
  },
}
```

**⚠️ Pitfall #3: the dmPolicy default**

If you don't set `dmPolicy`, it defaults to `pairing`, which means users must run the `/pair` command before they can chat. But if something is misconfigured, `/pair` may not respond either, and messages get **silently dropped**!

**Fix:**

Explicitly set `dmPolicy: "allowlist"` and configure the `allowFrom` list:

```json5
{
  dmPolicy: "allowlist",
  allowFrom: ["123456789", "987654321"], // 允许的 user ID 列表
}
```

To find your Telegram user ID: send a message to [@userinfobot](https://t.me/userinfobot).

### 3. Configure Routing Rules

Add `bindings` to route each Telegram account to a different agent:

```json5
{
  bindings: [
    {
      agentId: "main",
      match: { channel: "telegram", accountId: "main" },
    },
    {
      agentId: "blog",
      match: { channel: "telegram", accountId: "blog" },
    },
  ],
}
```

**Routing rule precedence**:
1. Exact `peer` match (a specific DM or group ID)
2. `accountId` match (which Telegram account)
3. `channel` match (which platform)
4. Default agent (`default: true`, or the first one in the list)

### 4. Restart the Gateway

```bash
openclaw gateway restart --reason "添加新 Telegram bot"
```

Test it: send `/start` to both bots — you should get replies from two different agents.

## Common Problems and Fixes

### Problem 1: config.patch wiped out my config

**Symptom:**

I wanted to add a new account under `telegram.accounts`, so I ran:

```bash
openclaw config patch channels.telegram.accounts.blog '{"token":"xxx"}'
```

And all my other account configs disappeared!

**Cause:**

For **nested objects**, `config.patch` does a **full replace**, not an incremental merge!

If your config is:

```json5
{
  channels: {
    telegram: {
      accounts: {
        main: {...},
        novel: {...},
      },
    },
  },
}
```

Running `patch channels.telegram.accounts.blog {...}` leaves you with:

```json5
{
  channels: {
    telegram: {
      accounts: {
        blog: {...}, // 只剩这一个！
      },
    },
  },
}
```

**Fix:**

Always patch with the **complete object**:

```bash
# ❌ 错误：只 patch 一个子项
openclaw config patch channels.telegram.accounts.blog '{"token":"xxx"}'

# ✅ 正确：patch 整个 accounts 对象
openclaw config patch channels.telegram.accounts '{
  "main": {"token":"token1", "dmPolicy":"allowlist", "allowFrom":["123456789"]},
  "blog": {"token":"token2", "dmPolicy":"allowlist", "allowFrom":["123456789"]}
}'
```

The same applies to `bindings`, `agents.list`, and any other array or object.

**Best practice:**

Before changing config, export the current state:

```bash
# 导出当前配置
openclaw config get channels.telegram.accounts > telegram-accounts-backup.json

# 编辑后再 patch 回去
openclaw config patch channels.telegram.accounts "$(cat telegram-accounts-edited.json)"
```

### Problem 2: Telegram bot doesn't respond

**Symptom:**

You send `/start` or any other message to the bot, and nothing comes back.

**Possible cause 1: dmPolicy misconfiguration**

Check the config:

```bash
openclaw config get channels.telegram.accounts.blog.dmPolicy
```

If it's `pairing` or unset, switch it to `allowlist`:

```bash
openclaw config patch channels.telegram.accounts.blog.dmPolicy '"allowlist"'
openclaw config patch channels.telegram.accounts.blog.allowFrom '["123456789"]'
openclaw gateway restart
```

**Possible cause 2: Telegram 409 conflict**

**Symptom:** `getUpdates conflict (409)` errors in the logs.

**Cause:** the same bot token is being used by multiple instances at once! Common scenarios:
- OpenClaw.app (GUI) and the CLI gateway running at the same time
- Two terminals each started a gateway

**Check:**

```bash
ps aux | grep -i openclaw
```

If you see multiple processes (the GUI app plus a CLI gateway), that's your conflict.

**Fix:**

1. Quit OpenClaw.app (GUI)
2. Restart the CLI gateway:

```bash
openclaw gateway restart --reason "清除 Telegram bot 冲突"
```

**Lesson:**

A given Telegram bot token can only be used by **one Gateway instance**. If you switch between GUI and CLI, stop one before starting the other.

### Problem 3: binding rules don't take effect

**Symptom:**

You've configured `bindings`, but messages still get routed to the wrong agent.

**Check the bindings:**

```bash
openclaw agents list --bindings
```

**Common mistakes:**

1. **Wrong order**: more specific rules must come first

```json5
// ❌ 错误：通配规则在前，精确规则在后
bindings: [
  { agentId: "main", match: { channel: "telegram" } }, // 会匹配所有 telegram 消息
  { agentId: "blog", match: { channel: "telegram", accountId: "blog" } }, // 永远不会执行
]

// ✅ 正确：精确规则在前
bindings: [
  { agentId: "blog", match: { channel: "telegram", accountId: "blog" } },
  { agentId: "main", match: { channel: "telegram", accountId: "main" } },
]
```

2. **Typo in accountId**: make sure it matches a key in `channels.telegram.accounts`

```bash
# 列出所有配置的账号
openclaw config get channels.telegram.accounts | jq 'keys'
```

### Problem 4: agent config changes don't take effect

**Fix:**

The Gateway needs a restart to pick up new config:

```bash
openclaw gateway restart --reason "更新 Agent 配置"
```

Check that the agent started up properly:

```bash
openclaw status --deep
```

If an agent shows an abnormal status, check the logs:

```bash
tail -n 100 ~/.openclaw/gateway.err.log
```

### Problem 5: nested config only partially takes effect

**Symptom:**

I set `channels.telegram.dmPolicy` at the top level — why is one account still using a different policy?

**Cause:**

Config is **inherited**, and account-level settings **override** the top level:

```json5
{
  channels: {
    telegram: {
      dmPolicy: "allowlist", // 顶层默认
      allowFrom: ["123456789"],
      accounts: {
        main: {
          token: "token1",
          // 继承顶层的 dmPolicy 和 allowFrom
        },
        public: {
          token: "token2",
          dmPolicy: "pairing", // 覆盖顶层配置
        },
      },
    },
  },
}
```

**Best practice:**

- If every account uses the same policy, set it at the top level
- If one account needs a different policy, override it at the account level
- Write out `dmPolicy` explicitly for each account to avoid inheritance surprises

## Best Practices

### 1. Review Before Every Config Change

**Lesson learned:** I once skipped reviewing a patch command, wiped out all my Telegram account configs, and every bot went offline.

**Rules:**
- For any `config.patch`, `gateway restart`, or model change, **review it first**
- Nested objects (`bindings`, `accounts`) must include the complete list
- When in doubt, export the current config and diff

```bash
# 变更前备份
openclaw config get > openclaw-config-backup.json

# 变更后对比
openclaw config get > openclaw-config-new.json
diff openclaw-config-backup.json openclaw-config-new.json
```

### 2. Diagnose with status --deep

```bash
openclaw status --deep
```

The output includes:
- Status of every agent
- Channel connection status
- Recent error logs

If an agent or channel is unhealthy, it shows up right there.

### 3. Read the Error Logs

```bash
# 实时查看日志
tail -f ~/.openclaw/gateway.err.log

# 搜索特定错误
grep -i "error\|conflict\|fail" ~/.openclaw/gateway.err.log | tail -n 50
```

Error keywords to watch for:
- `409 conflict`: Telegram bot conflict
- `unauthorized`: bad or expired token
- `dmPolicy`: message blocked by an access control policy
- `binding`: routing rule problem

### 4. Configure in Stages

Don't set up all agents and channels in one go — it's error-prone and hard to debug.

**Recommended flow:**

1. Set up one new agent first (no Telegram yet) and test it locally
2. Once the agent works, add one Telegram bot and test the routing
3. Once that's verified, add the remaining agents and bots
4. After every change, verify that everything that already worked still works

### 5. Document Your Setup

Create a `SETUP.md` in your workspace that records:
- What each agent is for and how it's configured
- Which Telegram bot maps to which agent
- The reasoning behind any unusual config

```markdown
# SETUP.md

## Agents
- main: 日常聊天，全功能，Telegram @MyMainBot
- blog: 技术写作，workspace-blog，Telegram @MyWorkBot
- novel: 小说创作，workspace-novel，仅本地使用

## Telegram Bots
- @MyMainBot (123456789): main agent
- @MyWorkBot (987654321): work agent

## 特殊配置
- work agent 的 dmPolicy 设为 allowlist，只允许授权用户访问
- main agent 启用了 heartbeat，定期检查日程
```

## Wrapping Up

OpenClaw multi-agent setup isn't complicated, but there are a few traps that are easy to fall into:

1. **The config.patch trap**: nested objects are fully replaced, not incrementally merged
2. **Model IDs**: use the alias (`claude-sonnet-4-5`), never the date-suffixed version
3. **BOOTSTRAP.md**: never create it by hand — the agent will get stuck
4. **dmPolicy**: defaults to `pairing`; switch it to `allowlist`
5. **Telegram 409**: a bot token can only be used by one Gateway at a time
6. **Config inheritance**: account-level settings override top-level settings

**Core principles:**
- Back up before changing config
- Verify after every change
- Check the logs first when something breaks
- Configure in stages, step by step

I hope this saves you some of the detours I took.
