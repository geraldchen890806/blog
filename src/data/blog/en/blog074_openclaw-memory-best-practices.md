---
title: "AI Agent Memory Systems in Practice: OpenClaw Memory Best Practices"
author: Gerald Chen
pubDatetime: 2026-02-23T18:00:00+08:00
slug: openclaw-memory-best-practices
featured: true
draft: false
tags:
  - AI Agent
  - LLM
  - 开发效率
  - 自动化
description: "A deep dive into OpenClaw's memory architecture, from file layout to retrieval tuning, with actionable best practices for managing AI Agent memory"
---

## Introduction: Why Do AI Agents Need Memory?

If you've spent any time talking to an AI assistant, you've probably run into these problems:

- A few turns into the conversation, it forgets the requirements you stated at the beginning
- Every restart means re-explaining your preferences from scratch
- It can't recall last week's decisions, so it keeps asking the same questions

This isn't a flaw in the AI model itself — it's a **context management** challenge. A language model's working memory (the context window) is finite, typically somewhere between 32k and 200k tokens. Once a conversation gets long, earlier information gets pushed out of the window.

OpenClaw's solution is refreshingly direct: **files are memory**. Anything that needs to persist gets written to Markdown files, and the model only "remembers" what's on disk. The mechanism looks simple, but there's a lot of deliberate design underneath.

This article walks through OpenClaw's memory system end to end — from architectural principles to hands-on configuration — to help you build an effective memory system for your AI Agent.

**Practical tip**: If you're already running OpenClaw, you can hand this article directly to your Agent and have it optimize its own memory management based on the best practices below. Concrete steps are at the end of the article.

## OpenClaw Memory Architecture

### The Three-Layer Memory Model

OpenClaw's memory system maps nicely onto how human memory works:

```
Context (working memory)
    ↓
Compaction (short-term memory)
    ↓
Memory Files (long-term memory)
```

**Working memory (Context)**: Everything the model can "see" in the current session — the system prompt, conversation history, and tool call results. This layer is bounded by the context window; once tokens run out, compression is needed.

**Short-term memory (Compaction)**: When working memory approaches its limit, OpenClaw automatically summarizes older conversation into a digest and saves the compressed version into session history. Like human short-term memory, it keeps the key points and drops the details.

**Long-term memory (Memory Files)**: Persistent Markdown files that store decisions, preferences, lessons learned — anything worth keeping long term. This is the only memory layer that survives across sessions.

### Core File Layout

OpenClaw organizes memory with a fixed file structure:

```
~/.openclaw/workspace/
├── MEMORY.md                    # Curated long-term memory (main session only)
├── memory/
│   ├── 2026-02-20.md           # Daily logs
│   ├── 2026-02-21.md
│   └── 2026-02-22.md
├── AGENTS.md                    # Agent behavior rules
├── SOUL.md                      # Personality and tone
├── TOOLS.md                     # Tool usage notes
├── USER.md                      # User info
└── HEARTBEAT.md                 # Heartbeat checklist
```

**MEMORY.md**: Curated long-term memory holding important decisions, user preferences, and lessons learned. It is only loaded in private chats (the main session) and never exposed in group conversations.

**memory/YYYY-MM-DD.md**: Date-organized operational logs recording the day's tasks, problems, and ad-hoc decisions. By default, the session bootstrap reads today's and yesterday's logs for recent context.

**AGENTS.md**: Defines how the Agent works — rules like "always confirm before deploying" or "sensitive operations require authorization". Loaded at every session start.

**SOUL.md**: The Agent's personality definition, controlling tone, style, and boundaries. If you want your Agent more formal or more casual, define it here.

**TOOLS.md**: Local notes on tool usage — server SSH configs, frequently used commands, where API credentials live. This file is **maintained by you** and does not affect which tools are available (that's controlled by the config file).

These files are automatically injected into the "Project Context" section of the system prompt at the start of every conversation. Large files get truncated (default: 20,000 characters per file, 150,000 characters total), adjustable via `agents.defaults.bootstrapMaxChars`.

### Two Memory Tools

OpenClaw gives the Agent two tools for accessing memory files:

**memory_search**: Semantic retrieval with natural-language queries. For example, "last week's decisions about server configuration" returns relevant snippets along with their file locations and line numbers.

**memory_get**: Exact reads by file path and line range. Typically used after `memory_search` to pull the full context.

Both tools are provided by the memory plugin (`memory-core` by default) and can be disabled with `plugins.slots.memory = "none"`.

## Context Management: Keeping the Agent Efficient

### How the System Prompt Is Built

Every time the Agent runs a task, OpenClaw rebuilds the system prompt. It contains:

1. **Tool list and descriptions**: Which tools the Agent can call (exec, read, write, browser, etc.)
2. **Skills metadata**: Names, descriptions, and file locations of installed skills (not their contents — those are read on demand)
3. **Workspace location**: The current working directory
4. **Time information**: UTC time plus local time converted to the user's timezone
5. **Runtime metadata**: Host info, model name, thinking mode
6. **Project Context**: The injected workspace files (AGENTS.md, SOUL.md, etc.)

The tool section has two sources of overhead:

- **The tool list text**: The "Available tools: read, write, exec..." you see in the system prompt
- **Tool schemas (JSON)**: Parameter definitions sent to the model — not rendered as text, but still counted as tokens

Some tool schemas are big: `browser` can take 2,400+ tokens, `exec` 1,500+. If your Agent doesn't need certain tools, disable them via the tool policy to save tokens.

### Context Monitoring Commands

OpenClaw ships a few commands to help you understand context usage:

```bash
/status          # Quick view of token usage and session state
/context list    # List of injected files + size stats
/context detail  # Detailed breakdown: token cost of skills, tools, files
```

Example output (`/context list`):

```text
🧠 Context breakdown
Workspace: /Users/yourname/.openclaw/workspace
Bootstrap max/file: 20,000 chars
System prompt (run): 38,412 chars (~9,603 tok)
  (Project Context: 23,901 chars (~5,976 tok))

Injected workspace files:
- AGENTS.md: OK | raw 1,742 chars (~436 tok) | injected 1,742 chars (~436 tok)
- SOUL.md: OK | raw 912 chars (~228 tok) | injected 912 chars (~228 tok)
- TOOLS.md: TRUNCATED | raw 54,210 chars (~13,553 tok) | injected 20,962 chars (~5,241 tok)
- MEMORY.md: OK | raw 3,500 chars (~875 tok) | injected 3,500 chars (~875 tok)

Skills list: 2,184 chars (~546 tok) (12 skills)
Tool schemas (JSON): 31,988 chars (~7,997 tok)
Session tokens (cached): 14,250 total / ctx=32,000
```

Notice that `TOOLS.md` got truncated. If your tool notes get too long, consider splitting them up or pruning stale content.

### The Compaction Mechanism

When a session approaches the context window limit, OpenClaw triggers **auto-compaction**:

1. Summarize the earlier conversation into a digest
2. Keep the most recent messages (the latter half, by default)
3. Write the summary into session history; future requests use it in place of the original messages

Before compacting, OpenClaw can run a **silent memory flush**: it prompts the Agent to write important information to `memory/` files first, and only then compresses. This ensures key decisions don't get lost to compaction.

Example configuration:

```json5
{
  "agents": {
    "defaults": {
      "compaction": {
        "reserveTokensFloor": 20000,
        "memoryFlush": {
          "enabled": true,
          "softThresholdTokens": 4000,
          "systemPrompt": "Session nearing compaction. Store durable memories now.",
          "prompt": "Write any lasting notes to memory/YYYY-MM-DD.md; reply with NO_REPLY if nothing to store."
        }
      }
    }
  }
}
```

The flush triggers when `current tokens > (context window - 20000 - 4000)`. The Agent receives the prompt, writes its memories, and replies `NO_REPLY` (invisible to the user).

You can also compact manually:

```
/compact Focus on decisions and open questions
```

This compresses immediately, optionally with an instruction to steer what the summary should focus on.

**Compaction vs Session Pruning**:
- Compaction: summarizes old conversation and **persists** it to the JSONL history file
- Session Pruning: removes old **tool call results** from the current request only, without touching the history file

Pruning is a temporary, per-request optimization; compaction is a permanent rewrite of history.

## In Practice: Building an Effective Memory System

### File Layering Strategy

Based on my hands-on experience running a blog Agent, here's the recommended file layering:

**MEMORY.md**: Strategic decisions, long-term preferences, important lessons

```markdown
# MEMORY.md - 长期记忆

## 部署流程
- 每次部署必须经过确认（2026-02-13 教训：未确认导致错误配置上线）
- 部署前检查：git diff → 总结改动 → 等待"确认"
- 部署后验证：检查网站访问 + 关键页面

## 写作质量标准
- humanizer 评分目标：45+ 优秀，35-44 良好
- 避免 AI 夸张词汇："标志着""见证了""激动人心"
- 公式化结尾必须改为具体陈述

## 用户偏好
- Telegram 主号：123456789（日常联系、审核确认）
- 博客部署路径：/Users/yourname/ai/blog
- 社交媒体推文格式：描述 + URL + 标签（≤280字符）
```

**memory/YYYY-MM-DD.md**: The day's operational log and ad-hoc tasks

```markdown
# 2026-02-23 博客 Agent 工作日志

## blog074 写作 (18:00)
- 文章：《OpenClaw Memory 最佳实践》
- 预计字数：6000-7000
- 状态：大纲完成，正在撰写

## 技术调研
- 读取 OpenClaw 官方文档：memory.md、context.md、compaction.md
- 关键发现：混合检索（Vector + BM25）可提高精度
- 待测试：时间衰减功能（halfLifeDays=30）

## 下一步
- 完成 blog074 初稿
- 5点自我校验
- 提交部署审核
```

**TOOLS.md**: Deployment rules and tool configuration

```markdown
# TOOLS.md - 工具使用笔记

## 部署规则（强制执行）
每次部署前必须：
1. `git status` 显示改动列表
2. `git diff` 显示关键改动内容
3. 总结改动，等待大人回复"确认"
4. 确认后才能执行 build 和部署

## 服务器配置
- 服务器：example-server.com:22
- 部署路径：/var/www/html/
- 快速部署：`cd ~/blog && ./deploy.sh`

## 社交媒体发布
- 推文生成：`node scripts/generate-tweet.js`
- 发布到 X：`node scripts/publish-to-x.js`
```

**AGENTS.md**: Behavior rules and workflows

```markdown
# AGENTS.md - Agent 工作规范

## 每次会话启动
1. 读 SOUL.md（人格）
2. 读 USER.md（用户信息）
3. 读 memory/今天.md + memory/昨天.md（近期上下文）
4. **仅主会话**：读 MEMORY.md（长期记忆）

## 写入规则
- "记住这个" → 立即写入 memory/YYYY-MM-DD.md
- 重要决策 → 更新 MEMORY.md
- 不要"心中记着"，没有心智笔记！

## 安全规则
- 部署操作必须确认
- 不外泄私人信息（IP、密码、Telegram ID）
- `trash` 优于 `rm`（可恢复）
```

### Write Rules: What Goes Where, and When

**What belongs in MEMORY.md**:
- ✅ User preferences (contact details, working hours, language habits)
- ✅ Strategic decisions ("all future deploys require confirmation")
- ✅ Lessons learned ("2026-02-13: a config error caused a service outage")
- ✅ Long-term project state ("blog series progress: 3/10")

**What belongs in memory/YYYY-MM-DD.md**:
- ✅ The day's tasks and progress
- ✅ Ad-hoc decisions ("skipping tests today, will backfill tomorrow")
- ✅ Technical research notes
- ✅ To-do items

**What should NOT go into memory files**:
- ❌ Sensitive credentials (API keys, passwords) → use `~/.openclaw/credentials/`
- ❌ Throwaway computation results ("3 + 5 = 8") → just recompute next time
- ❌ Raw logs from tool output → too long; write a summary instead

**The core principle**: If you want the Agent to remember something in the next session, it **must be written to a file**. There's no such thing as a "mental note" — files are the only source of truth.

### Retrieval Tuning: Hybrid Search + Temporal Decay

OpenClaw's memory_search supports multiple retrieval strategies. Recommended configuration:

```json5
{
  "agents": {
    "defaults": {
      "memorySearch": {
        "provider": "openai",  // 或 gemini、local
        "model": "text-embedding-3-small",
        "query": {
          "hybrid": {
            "enabled": true,
            "vectorWeight": 0.7,    // 语义匹配权重
            "textWeight": 0.3,      // 关键词匹配权重
            "candidateMultiplier": 4,
            "mmr": {
              "enabled": true,      // 去重
              "lambda": 0.7         // 0=最大多样性，1=最大相关性
            },
            "temporalDecay": {
              "enabled": true,      // 时间衰减
              "halfLifeDays": 30    // 30天后分数减半
            }
          }
        }
      }
    }
  }
}
```

**Hybrid retrieval**: Combines vector similarity (semantic) with BM25 keyword matching (lexical).

- Vectors excel at "same meaning, different wording": a query for "Mac host" can match "the machine running the gateway"
- BM25 excels at exact tokens: a commit hash like `a828e60` or a code symbol like `memorySearch.query.hybrid`

Hybrid retrieval takes the best of both, with the formula:

```
finalScore = 0.7 × vectorScore + 0.3 × textScore
```

**MMR (Maximal Marginal Relevance)**: A deduplication mechanism that avoids returning multiple near-identical snippets.

Say you query "server configuration" and your logs have three nearly identical entries:

```
memory/2026-02-10.md  → "Configure Nginx, listen on port 443"
memory/2026-02-08.md  → "Configure Nginx, listening port 443"
memory/2026-02-05.md  → "Enable Nginx SSL"
```

Without MMR: the first two are both returned (redundant)
With MMR (lambda=0.7): only the first and third are returned (better diversity)

**Temporal decay**: Scores recent memories higher while old ones gradually fade.

The formula: `decayedScore = score × e^(-λ × ageInDays)`, where `λ = ln(2) / halfLifeDays`.

With halfLifeDays=30:
- Today's notes: 100% score
- 7 days ago: ~84%
- 30 days ago: 50%
- 90 days ago: 12.5%
- 180 days ago: ~1.6%

**Permanent files don't decay**: `MEMORY.md` and non-date-formatted files (like `memory/projects.md`) always keep their original score.

A real-world example — querying "server deployment process":

Without decay:

```
1. memory/2025-09-15.md  (score: 0.91)  ← 148 days old, but a strong match
2. memory/2026-02-23.md  (score: 0.82)  ← today
3. MEMORY.md             (score: 0.80)
```

With decay (halfLife=30):

```
1. memory/2026-02-23.md  (score: 0.82 × 1.00 = 0.82)  ← today
2. MEMORY.md             (score: 0.80 × 1.00 = 0.80)  ← permanent file
3. memory/2025-09-15.md  (score: 0.91 × 0.03 = 0.03)  ← stale entry fades
```

The old note still matches well semantically, but gets demoted for being stale — fresh information rises to the top.

### Privacy and Security

**MEMORY.md is loaded in the main session only**

By default, OpenClaw only loads `MEMORY.md` in private chats (the main session); it is never injected into group conversations. This keeps private information out of public settings.

If you run multiple Agents (say, a main Agent, a blog Agent, and a tooling Agent), you can give each one its own workspace:

```json5
{
  "agents": {
    "main": {
      "workspace": "~/.openclaw/workspace-main"
    },
    "blog": {
      "workspace": "~/.openclaw/workspace-blog"
    }
  }
}
```

Each Agent's memory is fully isolated, with no cross-contamination.

**Keep sensitive data separate**

Never write API keys, passwords, or SSH private keys into workspace files. The right approach:

- API keys: store in `~/.openclaw/credentials/` or environment variables
- Server passwords: use SSH key authentication, or store in a password manager
- Config references: in TOOLS.md, record only the location, never the actual value

Example (TOOLS.md):

```markdown
## 服务器配置
- SSH key：~/.ssh/id_blog_server
- API key：存储在环境变量 BLOG_API_KEY
- 数据库密码：1Password vault "Blog Infrastructure"
```

**Version control caveats**

Backing up the workspace with Git (in a private repo) is a good idea, but exclude sensitive files:

```gitignore
# .gitignore
.DS_Store
.env
**/*.key
**/*.pem
**/secrets*
~/.openclaw/credentials/
```

Even in a private repo, real credentials should never be committed.

## Advanced: Heartbeat and Automation

### The Heartbeat Mechanism

OpenClaw supports periodic heartbeat checks, letting the Agent proactively run recurring tasks.

Configuration (in `~/.openclaw/openclaw.json`):

```json5
{
  "cron": {
    "jobs": [
      {
        "name": "博客心跳检查",
        "schedule": { "kind": "every", "everyMs": 1800000 },  // 30分钟
        "payload": { "kind": "systemEvent", "text": "Read HEARTBEAT.md if it exists. Follow it strictly. If nothing needs attention, reply HEARTBEAT_OK." },
        "sessionTarget": "main"
      }
    ]
  }
}
```

Example HEARTBEAT.md:

```markdown
# HEARTBEAT.md

## 每日检查（轮流执行）

**周一、三、五**:
- 检查博客网站可访问性
- 检查 GitHub 仓库同步状态
- 生成技术博客内容提案（发给用户确认）

**周二、四、六**:
- 监控技术趋势（HN、Reddit）
- 收集有趣的技术话题

**周日**:
- 周报：本周网站访问情况
- 内容规划：下周博客主题建议

---

只有当有具体任务需要注意时才会发送消息，否则保持 HEARTBEAT_OK
```

On each heartbeat, the Agent reads HEARTBEAT.md and runs the corresponding tasks. If there's nothing to do, it replies `HEARTBEAT_OK` (silently).

**Tracking check state**

To avoid redundant checks, keep a state file in the workspace:

```json
// memory/heartbeat-state.json
{
  "lastChecks": {
    "email": 1708675200,
    "calendar": 1708660800,
    "website": 1708689600
  }
}
```

The Agent reads this file at each heartbeat to decide whether a re-check is needed.

### Automating Memory Flush

The compaction memory flush mentioned earlier triggers automatically. Example configuration:

```json5
{
  "agents": {
    "defaults": {
      "compaction": {
        "memoryFlush": {
          "enabled": true,
          "softThresholdTokens": 4000,
          "systemPrompt": "Session nearing compaction. Store durable memories now.",
          "prompt": "Pre-compaction memory flush. Store durable memories now (use memory/YYYY-MM-DD.md; create memory/ if needed). IMPORTANT: If the file already exists, APPEND new content only and do not overwrite existing entries. If nothing to store, reply with NO_REPLY."
        }
      }
    }
  }
}
```

When the session nears the compaction threshold, the Agent gets the prompt, writes important information to memory files, and replies `NO_REPLY`. The user never notices a thing.

You can also schedule a periodic review of recent logs in HEARTBEAT.md to keep MEMORY.md fresh:

```markdown
## 每周任务（周日）
- 读取过去7天的 memory/YYYY-MM-DD.md
- 提取重要决策和教训
- 更新 MEMORY.md 中的相关章节
- 删除 MEMORY.md 中过时的信息
```

This is the equivalent of a human reviewing their journal regularly, consolidating short-term memory into long-term memory.

### Cross-Session Collaboration (Multi-Agent Setups)

If you have multiple Agents dividing up work, OpenClaw's session tools come in handy:

- `sessions_list`: List all active sessions
- `sessions_send`: Send a message to another session
- `sessions_spawn`: Spawn a sub-Agent for an isolated task
- `subagents`: Manage sub-Agents (list, steer, kill)

Example setup: the main Agent handles sensitive tasks (deployments, payments), a blog Agent handles writing, and a tooling Agent handles data scraping.

The main Agent can delegate work via `sessions_send`:

```
sessions_send(sessionKey="agent:blog:telegram:123456", message="写一篇关于 OpenClaw Memory 的文章")
```

When the blog Agent finishes, it sends the result back via `sessions_send`.

The benefits of this architecture:
- Isolation: each Agent has its own workspace and memory
- Security: sensitive information lives only in the main Agent's MEMORY.md
- Specialization: each Agent can load different skills and configuration

## Common Problems and Solutions

### 1. Inaccurate Retrieval

**Symptom**: `memory_search` returns irrelevant results, or misses obviously relevant content.

**Likely causes**:
- Pure vector retrieval is weak on exact tokens (IDs, code symbols)
- The embedding model doesn't match the query language (e.g. using an English-only model to search Chinese)
- The index is stale (files were modified but not re-indexed)

**Fixes**:

1. Enable hybrid retrieval (Vector + BM25):

```json5
{
  "memorySearch": {
    "query": {
      "hybrid": {
        "enabled": true,
        "vectorWeight": 0.7,
        "textWeight": 0.3
      }
    }
  }
}
```

2. Check the embedding model: if you mostly write in Chinese, consider a multilingual model (like `text-embedding-3-small`) or a local GGUF model.

3. Force a re-index: change the `memorySearch.model` setting — OpenClaw detects the change and rebuilds the index automatically.

### 2. Context Overflow

**Symptom**: `/status` shows tokens near the limit; the conversation slows down or errors out.

**Likely causes**:
- TOOLS.md is too long (very common!)
- Too many skills in the list
- Session history has accumulated too many tool call results
- Large files get injected frequently

**Fixes**:

1. Clean up TOOLS.md: delete stale configuration and keep only what's currently needed. Or split it into multiple files (injecting only the main one).

2. Disable unneeded tools: restrict the available tools via the tool policy.

3. Compact manually:

```
/compact Focus on decisions and current tasks
```

4. Tune the bootstrap limits:

```json5
{
  "agents": {
    "defaults": {
      "bootstrapMaxChars": 15000,      // 单文件限制
      "bootstrapTotalMaxChars": 100000 // 总量限制
    }
  }
}
```

5. Enable session pruning: automatically drops old tool call results (without touching conversation text).

### 3. Lost Memories

**Symptom**: The Agent forgets earlier decisions or user preferences.

**Likely causes**:
- The information was never written to a file — it only lived in context
- It was written to `memory/YYYY-MM-DD.md`, but has aged out of the "today + yesterday" loading window
- It was written to MEMORY.md, but you're in a group session (which doesn't load MEMORY.md)

**Fixes**:

1. Check that the files exist:

```bash
cat ~/.openclaw/workspace/MEMORY.md
cat ~/.openclaw/workspace/memory/2026-02-23.md
```

2. Test memory_search:

```
memory_search("部署确认规则")
```

If nothing comes back, the data was never written or the index is stale.

3. Make sure you're operating in the main session: if you mention important information in a group, the Agent may not have access to MEMORY.md. Switch to a private chat, or explicitly ask the Agent to write it to the daily log.

4. Review MEMORY.md regularly: set up a weekly task in HEARTBEAT.md so the Agent periodically distills important information from the daily logs into MEMORY.md.

### 4. Privacy Leaks

**Symptom**: Information that shouldn't be public (IP addresses, API keys, personal Telegram IDs) gets exposed in a group chat.

**Likely causes**:
- MEMORY.md is being loaded in group sessions (misconfiguration)
- The Agent quoted contents of a private file in a reply
- The file itself contains sensitive information (which shouldn't be there at all)

**Fixes**:

1. Verify MEMORY.md's loading scope: by default it should load in the main session only. Check the configuration:

```json5
{
  "agents": {
    "defaults": {
      // 确保没有覆盖默认行为
    }
  }
}
```

2. Add privacy rules to AGENTS.md:

```markdown
## 隐私保护
- 不暴露真实 IP、密码、API key
- 群组对话中不引用 MEMORY.md 内容
- 示例数据用占位符（example.com、192.0.2.1）
```

3. Audit your workspace files: make sure TOOLS.md and other shared files contain no sensitive information.

4. Store sensitive data in environment variables or the credentials directory — never in the workspace.

## QMD Backend: Experimental Advanced Retrieval (Optional)

OpenClaw can swap its built-in SQLite indexer for [QMD](https://github.com/tobi/qmd), a local-first search engine combining BM25, vector retrieval, and reranking.

**Enabling QMD**:

```json5
{
  "memory": {
    "backend": "qmd",
    "qmd": {
      "includeDefaultMemory": true,
      "update": { "interval": "5m", "debounceMs": 15000 },
      "limits": { "maxResults": 6, "timeoutMs": 4000 },
      "paths": [
        { "name": "docs", "path": "~/notes", "pattern": "**/*.md" }
      ]
    }
  }
}
```

**Pros**:
- Stronger reranking (higher semantic relevance)
- Can index files outside the workspace
- Supports session history indexing (`sessions.enabled = true`)

**Cons**:
- Requires installing the QMD CLI separately (`bun install -g qmd`)
- The first search may trigger a GGUF model download (slow)
- Adds maintenance complexity

For most users, the built-in SQLite retrieval is plenty. Consider QMD only when:
- You have a large body of notes (tens of thousands of entries) needing high-precision retrieval
- You need to index multiple directories (workspace + other document libraries)
- You're willing to spend time debugging and tuning

## Get Your Agent to Apply These Best Practices

**If you're running OpenClaw**, you can have your Agent optimize its memory management right now. Send it this article and ask it to run through these steps:

**Step 1: Audit the current configuration**
```
请运行 /context detail，检查我的 workspace 文件结构和 token 使用情况，告诉我哪些地方需要优化。
```

**Step 2: Apply the recommended configuration**
```
请根据这篇文章的建议，帮我优化 memory 配置：
1. 启用混合检索（Vector 70% + BM25 30%）
2. 启用时间衰减（halfLifeDays=30）
3. 启用 MMR 去重（lambda=0.7）
4. 启用 Memory flush（compaction 前自动存储）

优化后告诉我具体改了什么。
```

**Step 3: Reorganize the workspace files**
```
请按照文章中的文件分层策略，帮我整理 workspace：
1. 检查 MEMORY.md 是否包含策略性信息
2. 将近期操作日志移到 memory/YYYY-MM-DD.md
3. 清理 TOOLS.md 中的过时内容
4. 在 AGENTS.md 中添加记忆写入规则
```

**Step 4: Set up periodic reviews**
```
请在 HEARTBEAT.md 中设置周任务，让我定期回顾 daily logs 并更新 MEMORY.md。
```

None of this requires hand-editing config files — let the Agent do it itself. Afterwards, your Agent will have more reliable memory management: it won't forget important information, and it won't slow down from context overflow.

## Summary and Resources

The core idea behind OpenClaw's memory system is simple: **files are memory**. But on top of that simple principle sits a rich set of mechanisms for retrieval tuning, context management, and privacy protection.

**Core principles**:
1. **Write it down!** Don't rely on "mental notes" — files are the only source of truth
2. **Layer your memory**: MEMORY.md (long-term) + memory/ daily logs (short-term) + AGENTS.md (rules)
3. **Review regularly**: via heartbeat or by hand, distill daily logs into MEMORY.md
4. **Privacy first**: keep sensitive data separate; MEMORY.md loads only in the main session

**Recommended configuration**:
- Hybrid retrieval (Vector 70% + BM25 30%)
- Temporal decay (halfLifeDays=30)
- MMR deduplication (lambda=0.7)
- Memory flush (auto-store before compaction)

**Resources**:
- [OpenClaw documentation](https://docs.openclaw.ai)
- [Memory concepts](https://docs.openclaw.ai/concepts/memory)
- [Context management guide](https://docs.openclaw.ai/concepts/context)
- [GitHub: OpenClaw](https://github.com/openclaw/openclaw)

---

If you run into problems with OpenClaw's memory system, join the discussion in the [Discord community](https://discord.com/invite/clawd). The mechanism is still evolving fast, and your feedback may shape its future design.

One last thing to remember: an AI Agent isn't magic — it's just software. Good memory management doesn't make the Agent "smarter"; it makes it **more reliable**. When you can clearly see what your Agent remembers and why, you can genuinely trust it with important work.
