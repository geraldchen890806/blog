---
author: 陈广亮
pubDatetime: 2026-04-10T16:00:00+08:00
title: Hermes Agent 评测：OpenClaw 的继任者，自带学习循环的多平台 AI 助手
slug: blog117_hermes-agent-guide
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI工具
  - Agent
  - Hermes
  - 自动化
description: Hermes Agent 是 Nous Research 推出的开源 AI 助手框架，内置自学习循环、跨平台消息集成和 Cron 调度，支持 OpenClaw 配置一键迁移。本文介绍其核心功能、适用场景及局限性。
---

Nous Research 在 Anthropic 切断 OpenClaw 的 Claude 订阅调用之后推出了 Hermes Agent，并内置了 OpenClaw 配置的自动导入工具，定位上就是 OpenClaw 的继任者。它不只是换了个名字，架构上有几处明显改进：自学习循环、跨平台统一网关、原生 MCP 支持。

本文梳理 Hermes Agent 的核心功能、适用场景和局限，帮你判断它是否适合自己的工作流。

## 核心功能

### 自学习循环

这是 Hermes Agent 区别于大多数 Agent 框架的关键特性。Agent 在使用过程中会：

- 从对话和任务执行中**自动提炼技能**（兼容 [agentskills.io](https://agentskills.io) 开放标准）
- 在后续任务中**复用和改进**已有技能
- 通过 FTS5（SQLite 全文搜索扩展）**检索历史对话**，跨 session 回忆相关上下文
- 构建**用户模型**（基于 [Honcho](https://github.com/plastic-labs/honcho) 记忆与用户建模库），记住用户的偏好和习惯

效果上，用的时间越长，Agent 对你的工作方式越熟悉，执行同类任务的效率越高。这套机制和 OpenClaw 的 MEMORY.md 手动记忆有本质区别——不需要你主动维护记忆文件，Agent 自己积累。

### 多平台消息网关

通过统一的 `hermes gateway` 进程管理所有平台的消息收发：

- **即时通讯**：Telegram、Discord、Slack、WhatsApp、Signal
- **邮件**：支持 Email 收发
- **跨平台连续性**：在 Telegram 开始的对话，可以在 Slack 里继续，上下文不丢失

这个设计比 OpenClaw 和 `claude -p` 方案都更彻底——不需要为每个平台单独写桥接代码，网关统一处理。

### 内置 Cron 调度器

定时任务通过对话指令或配置文件设置，支持标准 cron 表达式，任务结果推送到指定平台。比手写 `setInterval` + markdown 配置文件的方案更简洁，不需要维护独立的调度脚本。

### 并行子 Agent

支持生成隔离的子 Agent 实例并行处理任务，通过对话指令触发。适合同时抓取多个数据源、并行执行多个代码分析任务等场景，也可以编写 Python 脚本通过 RPC 调用工具，把多步流水线压缩成单次对话。

### 官方声称 40+ 内置工具

工具集覆盖日常开发的主要操作，包括：文件读写、Shell 命令执行、网页抓取、全文搜索、数据库查询、代码编辑、Git 操作等。通过 toolset 系统可以按场景启用特定工具子集，也支持连接任何 MCP 服务器扩展能力。

### 灵活的模型选择

支持 10+ 供应商，运行时切换：

```bash
hermes model  # 交互式选择模型
```

- **Anthropic 直连**：直接调用 Claude API
- **Nous Portal**：Nous Research 自己的推理服务
- **OpenRouter**：接入 200+ 模型（Claude、GPT、Gemini、Llama 等）
- **OpenAI API**：直连 OpenAI
- **本地部署**：Ollama/vLLM 等本地模型

同一套配置，随时切换模型，不需要改代码。

## 安装与配置

### 快速安装

支持 Linux、macOS、WSL2、Termux：

```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```

这是 Python 项目，开发者也可以 clone 源码安装。安装完成后运行配置向导：

```bash
hermes setup
```

向导会引导配置 LLM 供应商、消息平台 API Key、工作目录等。

### 从 OpenClaw 迁移

内置迁移工具，自动导入 OpenClaw 的设置、记忆和技能：

```bash
hermes claw migrate           # 交互式迁移（完整预设）
hermes claw migrate --dry-run # 预览会迁移哪些内容
```

能迁移的内容包括：SOUL.md 角色设定、MEMORY.md 和 USER.md 记忆条目、用户自建技能、命令白名单、平台配置及 API Key。不需要手动重建配置。

### 启动

```bash
hermes          # 启动交互式 CLI
hermes gateway  # 启动消息网关（后台监听各平台）
```

## 适用场景

**个人 AI 工作流自动化**

有固定的日常任务（写作、代码 review、信息整理），希望 Agent 随时间学习你的偏好和工作风格，逐渐减少重复指令。Hermes 的自学习循环在这个场景下优势明显。

**多平台统一入口**

同时在 Telegram、Slack、Discord 等多个平台工作，希望 Agent 跨平台保持上下文连续性，而不是每个平台各自独立。

**轻量化部署**

不想维护复杂的服务器基础设施。Hermes 支持无服务器部署（[Modal](https://modal.com)，一个 serverless GPU/CPU 平台，按调用计费），空闲时接近零成本，有请求时自动唤醒。也可以跑在 5 美元的 VPS 上。

**OpenClaw 用户迁移**

已有 OpenClaw 配置的用户，迁移成本最低——现有的 workspace 目录直接复用。

## 局限与不足

**自学习的不可控性**

自动提炼技能听起来很好，但实际上 Agent 总结出的"技能"质量参差不齐。它可能把某次偶然的操作提炼成固定技能，导致后续任务产生不符合预期的行为。目前没有直观的界面查看和管理已有技能，需要一定的维护成本。

**依赖外部服务**

跨平台连续性、用户建模（Honcho）等高级功能依赖 Nous Research 的云端服务。本地完全离线运行时，这些功能不可用。

**社区和文档还在完善中**

项目相对较新，文档覆盖不够完整，部分高级功能（比如自定义技能格式、MCP 集成细节）需要查源码或社区 issue 才能搞清楚。与 OpenClaw 成熟的文档体系相比还有差距。

**macOS 后台进程限制**

Hermes 本身不依赖 Claude Code CLI，模型调用走 API 不受 Keychain 限制。但若在 macOS 上通过 launchd 设置开机自启，网关进程可能因为环境变量未加载（如 API Key 未读取）导致认证失败。稳妥做法是从交互 Shell 手动启动 `hermes gateway`。

**并发控制需注意**

多个平台同时发消息时，并发调用可能导致 session 状态混乱。文档中对并发场景的处理方式描述不够清晰。

## Hermes Agent vs OpenClaw vs 自建方案对比

| 维度 | Hermes Agent | OpenClaw | claude -p + Node.js 自建 |
|------|-------------|-----------|--------------------------|
| 上手成本 | 低（setup 向导） | 低（图形界面） | 高（需要自己写桥接代码） |
| 自学习 | 内置，自动 | 手动维护 MEMORY.md | 需要手动维护记忆文件 |
| 多平台支持 | 内置网关，开箱即用 | 内置多平台支持 | 每个平台需单独对接 |
| 可控性 | 较低（黑盒行为多） | 中等（配置文件可控） | 高（代码完全自己掌控） |
| 定制灵活性 | 受限于框架设计 | 技能系统 + 配置 | 完全自由 |
| 调试难度 | 较高（学习循环行为难追踪） | 中等（日志相对清晰） | 较低（日志清晰） |
| 依赖外部服务 | 部分功能依赖云端 | 被 Anthropic 切断 | 可完全本地运行 |

如果你的需求是"快速搭起来用"且愿意接受自学习的不确定性，Hermes 明显更省事。如果你需要深度定制或对 Agent 行为有强控制需求，自建方案更合适。

## 总结

Hermes Agent 在 OpenClaw 之后补上了几个关键短板：自学习循环省去了手动维护记忆文件的麻烦，统一网关解决了多平台对接的重复工作，OpenClaw 迁移工具降低了切换成本。

目前最大的问题是成熟度——自学习的行为可预测性不足，文档和社区还在建设中。适合愿意接受一定不确定性、希望快速搭建个人 AI 工作流的用户。追求稳定可控的场景，自建方案仍然是更可靠的选择。

**延伸阅读**：
- [Hermes Agent 文档](https://hermes-agent.nousresearch.com/docs/)
- [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent)
- [用 Claude Code CLI 构建多 Agent 自动化系统](https://chenguangliang.com/posts/blog115_openclaw-to-claude-code-migration/) - 自建方案的完整实现，与 Hermes 方案形成对比
