---
author: Gerald Chen
pubDatetime: 2026-04-10T16:00:00+08:00
title: "Hermes Agent Review: OpenClaw's Successor, a Multi-Platform AI Assistant with a Built-In Learning Loop"
slug: blog117_hermes-agent-guide
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI Agent
  - 开发效率
description: "Hermes Agent is an open-source AI assistant framework from Nous Research, featuring a self-learning loop, cross-platform messaging integration, and cron scheduling, with one-command migration from OpenClaw configs. This post covers its core features, where it fits, and its limitations."
---

After Anthropic cut off OpenClaw's access to Claude subscription calls, Nous Research released Hermes Agent — complete with a built-in tool for automatically importing OpenClaw configs. It's positioned squarely as OpenClaw's successor. But this isn't just a rebrand; the architecture brings several real improvements: a self-learning loop, a unified cross-platform gateway, and native MCP support.

This post walks through Hermes Agent's core features, the scenarios it fits, and its limitations, so you can decide whether it belongs in your workflow.

## Core Features

### Self-Learning Loop

This is the key feature that sets Hermes Agent apart from most agent frameworks. As you use it, the agent will:

- **Automatically distill skills** from conversations and task executions (compatible with the [agentskills.io](https://agentskills.io) open standard)
- **Reuse and refine** existing skills in subsequent tasks
- **Search past conversations** via FTS5 (SQLite's full-text search extension), recalling relevant context across sessions
- **Build a user model** (based on [Honcho](https://github.com/plastic-labs/honcho), a memory and user-modeling library) that remembers your preferences and habits

In practice, the longer you use it, the better the agent understands how you work, and the more efficiently it handles similar tasks. This is fundamentally different from OpenClaw's manual MEMORY.md approach — you don't maintain memory files yourself; the agent accumulates knowledge on its own.

### Multi-Platform Messaging Gateway

A single `hermes gateway` process manages message I/O for all platforms:

- **Instant messaging**: Telegram, Discord, Slack, WhatsApp, Signal
- **Email**: sending and receiving supported
- **Cross-platform continuity**: a conversation started in Telegram can continue in Slack without losing context

This design goes further than both OpenClaw and the `claude -p` approach — no per-platform bridge code to write; the gateway handles everything centrally.

### Built-In Cron Scheduler

Scheduled tasks can be set up via conversational commands or config files, with standard cron expression support, and results are pushed to the platform of your choice. It's cleaner than hand-rolling `setInterval` plus a markdown config file — no separate scheduler script to maintain.

### Parallel Sub-Agents

Hermes can spawn isolated sub-agent instances to process tasks in parallel, triggered through conversational commands. This suits scenarios like scraping multiple data sources simultaneously or running several code analysis tasks at once. You can also write Python scripts that call tools over RPC, compressing multi-step pipelines into a single conversation.

### 40+ Built-In Tools (per the official claims)

The toolset covers the main operations of day-to-day development: file read/write, shell command execution, web scraping, full-text search, database queries, code editing, Git operations, and more. The toolset system lets you enable specific tool subsets per scenario, and you can connect any MCP server to extend its capabilities.

### Flexible Model Selection

Supports 10+ providers with runtime switching:

```bash
hermes model  # 交互式选择模型
```

- **Anthropic direct**: call the Claude API directly
- **Nous Portal**: Nous Research's own inference service
- **OpenRouter**: access to 200+ models (Claude, GPT, Gemini, Llama, etc.)
- **OpenAI API**: direct OpenAI connection
- **Local deployment**: Ollama/vLLM and other local models

One config, switch models anytime, no code changes.

## Installation and Setup

### Quick Install

Supports Linux, macOS, WSL2, and Termux:

```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```

It's a Python project, so developers can also clone the source and install from there. After installation, run the setup wizard:

```bash
hermes setup
```

The wizard walks you through configuring the LLM provider, messaging platform API keys, working directory, and so on.

### Migrating from OpenClaw

A built-in migration tool automatically imports your OpenClaw settings, memory, and skills:

```bash
hermes claw migrate           # 交互式迁移（完整预设）
hermes claw migrate --dry-run # 预览会迁移哪些内容
```

What gets migrated: the SOUL.md persona, MEMORY.md and USER.md memory entries, user-created skills, command allowlists, platform configs, and API keys. No manual reconfiguration needed.

### Starting Up

```bash
hermes          # 启动交互式 CLI
hermes gateway  # 启动消息网关（后台监听各平台）
```

## Where It Fits

**Personal AI workflow automation**

You have recurring daily tasks (writing, code review, information triage) and want an agent that learns your preferences and working style over time, gradually reducing repetitive instructions. Hermes's self-learning loop shines here.

**A unified entry point across platforms**

You work across Telegram, Slack, Discord, and other platforms simultaneously, and want the agent to maintain context continuity across them rather than treating each platform as an island.

**Lightweight deployment**

You don't want to maintain heavy server infrastructure. Hermes supports serverless deployment ([Modal](https://modal.com), a serverless GPU/CPU platform billed per invocation) — near-zero cost when idle, waking automatically on incoming requests. It also runs fine on a $5 VPS.

**OpenClaw users migrating over**

If you already have an OpenClaw setup, the switching cost is minimal — your existing workspace directory is reused as-is.

## Limitations and Rough Edges

**The unpredictability of self-learning**

Automatic skill distillation sounds great, but in practice the quality of the "skills" the agent extracts is uneven. It may turn a one-off action into a fixed skill, leading to unexpected behavior in later tasks. There's currently no intuitive interface for reviewing and managing existing skills, so some maintenance overhead is unavoidable.

**Dependence on external services**

Advanced features like cross-platform continuity and user modeling (Honcho) rely on Nous Research's cloud services. Running fully offline locally, these features are unavailable.

**Community and docs still maturing**

The project is relatively young and documentation coverage is incomplete. Some advanced features (custom skill formats, MCP integration details) require digging through source code or community issues to figure out. It still lags behind OpenClaw's mature documentation.

**macOS background process caveats**

Hermes itself doesn't depend on the Claude Code CLI — model calls go through the API and aren't subject to Keychain restrictions. However, if you auto-start it on macOS via launchd, the gateway process may fail authentication because environment variables (such as API keys) aren't loaded. The safe approach is to start `hermes gateway` manually from an interactive shell.

**Watch out for concurrency**

When multiple platforms send messages at the same time, concurrent calls can scramble session state. The documentation's treatment of concurrent scenarios is not particularly clear.

## Hermes Agent vs OpenClaw vs DIY Comparison

| Dimension | Hermes Agent | OpenClaw | claude -p + Node.js DIY |
|------|-------------|-----------|--------------------------|
| Learning curve | Low (setup wizard) | Low (GUI) | High (write your own bridge code) |
| Self-learning | Built-in, automatic | Manually maintain MEMORY.md | Manually maintain memory files |
| Multi-platform support | Built-in gateway, works out of the box | Built-in multi-platform support | Each platform integrated separately |
| Controllability | Lower (lots of black-box behavior) | Medium (config-file driven) | High (you own all the code) |
| Customization flexibility | Constrained by framework design | Skill system + config | Fully unconstrained |
| Debugging difficulty | Higher (learning-loop behavior hard to trace) | Medium (relatively clear logs) | Lower (clear logs) |
| External service dependence | Some features rely on the cloud | Cut off by Anthropic | Can run fully local |

If your goal is "get it running fast" and you can live with the uncertainty of self-learning, Hermes is clearly less work. If you need deep customization or strong control over agent behavior, a DIY setup is the better fit.

## Conclusion

Hermes Agent fills several key gaps left after OpenClaw: the self-learning loop removes the chore of maintaining memory files by hand, the unified gateway eliminates the repetitive work of per-platform integration, and the OpenClaw migration tool lowers the switching cost.

The biggest issue right now is maturity — the self-learning behavior isn't predictable enough, and the docs and community are still being built out. It suits users who can tolerate some uncertainty and want to stand up a personal AI workflow quickly. For scenarios that demand stability and control, a DIY setup remains the more reliable choice.

**Further reading**:
- [Hermes Agent docs](https://hermes-agent.nousresearch.com/docs/)
- [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent)
- [After OpenClaw Shut Down: Rebuilding a Multi-Agent Automation Setup with the Claude Code CLI](/en/posts/blog115_openclaw-to-claude-code-migration/) - a complete DIY implementation, as a counterpoint to the Hermes approach
