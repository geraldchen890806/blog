---
title: "AI Agent 记忆系统实战：OpenClaw Memory 最佳实践"
author: 陈广亮
pubDatetime: 2026-02-23T18:00:00+08:00
slug: openclaw-memory-best-practices
featured: true
draft: false
tags:
  - AI Agent
  - LLM
  - 开发效率
  - 自动化
description: "深入解析 OpenClaw 的记忆系统架构，从文件结构到检索优化，提供可落地的 AI Agent 记忆管理最佳实践"
---

## 引言：AI Agent 为什么需要记忆？

与 AI 助手对话时，你可能遇到过这些问题：

- 聊了几轮后，它忘记了开头你说的需求
- 每次重启都要重新解释一遍你的偏好
- 无法记住上周的决策，导致重复提问

这不是 AI 模型本身的问题，而是**上下文管理**的挑战。语言模型的工作记忆（context window）是有限的，通常在 32k-200k tokens 之间。一旦对话变长，早期信息就会被挤出窗口。

OpenClaw 的解决方案很直接：**文件就是记忆**。所有需要持久化的信息都写入 Markdown 文件，模型只"记住"写在磁盘上的内容。这套机制看似简单，实际上蕴含了深思熟虑的设计。

本文将系统讲解 OpenClaw 的 memory 机制，从架构原理到实战配置，帮助你构建高效的 AI Agent 记忆系统。

**实用建议**：如果你正在使用 OpenClaw，可以将这篇文章直接发给你的 Agent，让它根据文中的最佳实践优化自己的记忆管理。文末有具体的执行步骤。

## OpenClaw Memory 架构解析

### 三层记忆模型

OpenClaw 的记忆系统可以类比人类的记忆结构：

```
Context（工作记忆）
    ↓
Compaction（短期记忆）
    ↓
Memory Files（长期记忆）
```

**工作记忆（Context）**：当前会话中模型能"看到"的所有内容，包括系统提示词、对话历史、工具调用结果。这部分受 context window 限制，token 用完就需要压缩。

**短期记忆（Compaction）**：当工作记忆接近上限时，OpenClaw 会自动将旧对话总结成摘要，压缩后的内容保存到会话历史中。类似人类的短期记忆，保留要点但丢弃细节。

**长期记忆（Memory Files）**：持久化的 Markdown 文件，存储决策、偏好、教训等需要长期保留的信息。这是唯一跨会话存在的记忆层。

### 核心文件结构

OpenClaw 使用固定的文件布局来组织记忆：

```
~/.openclaw/workspace/
├── MEMORY.md                    # 策略性长期记忆（仅主会话）
├── memory/
│   ├── 2026-02-20.md           # 每日日志
│   ├── 2026-02-21.md
│   └── 2026-02-22.md
├── AGENTS.md                    # Agent 行为规范
├── SOUL.md                      # 人格与语气
├── TOOLS.md                     # 工具使用笔记
├── USER.md                      # 用户信息
└── HEARTBEAT.md                 # 心跳检查清单
```

**MEMORY.md**：策展的长期记忆，存储重要决策、用户偏好、经验教训。只在私聊（main session）中加载，不会在群组对话中暴露。

**memory/YYYY-MM-DD.md**：按日期组织的操作日志，记录当天的任务、问题、临时决策。默认会话启动时读取今天和昨天的日志，提供近期上下文。

**AGENTS.md**：定义 Agent 的工作方式，比如"部署前必须确认"、"敏感操作需要授权"等规则。每次会话启动都会加载。

**SOUL.md**：Agent 的人格设定，决定语气、风格、边界。如果你希望 Agent 更正式或更随意，在这里定义。

**TOOLS.md**：工具使用的本地笔记，比如服务器 SSH 配置、常用命令、API 凭据位置。这是**用户自己维护**的，不影响工具可用性（那由配置文件控制）。

这些文件在每次对话启动时自动注入到系统提示词的"Project Context"部分。大文件会被截断（默认单文件 20,000 字符，总量 150,000 字符），可通过 `agents.defaults.bootstrapMaxChars` 调整。

### 两个记忆工具

OpenClaw 提供两个工具让 Agent 访问记忆文件：

**memory_search**：语义检索，支持自然语言查询。例如"上周关于服务器配置的决策"，会返回相关片段及其文件位置和行号。

**memory_get**：精确读取，指定文件路径和行范围。通常在 `memory_search` 后使用，获取完整上下文。

这两个工具由 memory 插件提供（默认是 `memory-core`），可以通过 `plugins.slots.memory = "none"` 禁用。

## Context 管理：让 Agent 高效工作

### System Prompt 构建流程

每次 Agent 执行任务时，OpenClaw 都会重新构建系统提示词（system prompt）。这个提示词包含：

1. **工具列表与描述**：Agent 能调用哪些工具（exec、read、write、browser 等）
2. **Skills 元数据**：已安装的技能名称、描述、文件位置（不包含具体内容，按需读取）
3. **工作区位置**：当前工作目录
4. **时间信息**：UTC 时间 + 用户时区转换后的本地时间
5. **运行时元数据**：主机信息、模型名称、thinking 模式
6. **Project Context**：注入的工作区文件（AGENTS.md、SOUL.md 等）

工具部分有两个开销来源：

- **工具列表文本**：你在系统提示词中看到的"Available tools: read, write, exec..."
- **工具 schemas（JSON）**：工具的参数定义，发送给模型但不显示为文本，仍然计入 token

某些工具的 schema 很大，比如 `browser` 可能占 2,400+ tokens，`exec` 占 1,500+ tokens。如果你的 Agent 不需要某些工具，可以通过工具策略（tool policy）禁用它们以节省 tokens。

### Context 监控命令

OpenClaw 提供几个命令帮你了解 context 使用情况：

```bash
/status          # 快速查看 token 使用、会话状态
/context list    # 注入文件列表 + 大小统计
/context detail  # 详细分解：skills、tools、files 的 token 开销
```

示例输出（`/context list`）：

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

注意 `TOOLS.md` 被截断了。如果你的工具笔记太长，考虑拆分或清理过时内容。

### Compaction 机制

当会话接近 context window 上限时，OpenClaw 会触发**自动压缩（auto-compaction）**：

1. 将早期对话总结为摘要
2. 保留最近的消息（默认保留后半部分）
3. 摘要写入会话历史，未来请求会用它替代原始消息

压缩前，OpenClaw 可以执行**静默的 memory flush**：提醒 Agent 将重要信息写入 `memory/` 文件，然后再压缩。这个机制确保关键决策不会因压缩而丢失。

配置示例：

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

当 `当前token数 > (context window - 20000 - 4000)` 时，触发 flush。Agent 会收到提示，写入记忆后回复 `NO_REPLY`（用户不可见）。

你也可以手动压缩：

```
/compact Focus on decisions and open questions
```

这会立即执行压缩，可选地提供指令来引导摘要重点。

**Compaction vs Session Pruning**：
- Compaction：总结旧对话，**持久化**到 JSONL 历史文件
- Session Pruning：仅从当前请求中移除旧的**工具调用结果**，不修改历史文件

Pruning 是临时的、per-request 的优化；Compaction 是永久的历史重写。

## 实战：构建高效的记忆系统

### 文件分层策略

基于我管理博客 Agent 的实战经验，这里是推荐的文件分层：

**MEMORY.md**：策略性决策、长期偏好、重要教训

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

**memory/YYYY-MM-DD.md**：当日操作日志、临时任务

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

**TOOLS.md**：部署规则、工具配置

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

**AGENTS.md**：行为规范和工作流

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

### 写入规则：什么时候写什么

**写入 MEMORY.md 的内容**：
- ✅ 用户偏好（联系方式、工作时间、语言习惯）
- ✅ 策略性决策（"以后部署都要确认"）
- ✅ 经验教训（"2026-02-13 配置错误导致服务中断"）
- ✅ 长期项目状态（"博客系列文章进度 3/10"）

**写入 memory/YYYY-MM-DD.md 的内容**：
- ✅ 当日任务与进展
- ✅ 临时决策（"今天先跳过测试，明天补"）
- ✅ 技术调研笔记
- ✅ 待办事项

**不要写入记忆文件的内容**：
- ❌ 敏感凭据（API key、密码）→ 用 `~/.openclaw/credentials/`
- ❌ 临时计算结果（"3 + 5 = 8"）→ 下次重新计算即可
- ❌ 工具输出的原始日志 → 太长，写总结即可

**核心原则**：如果你希望 Agent 在下次会话中记住，就**必须写文件**。所谓的"心智笔记"不存在，文件是唯一的真相。

### 检索优化：混合搜索 + 时间衰减

OpenClaw 的 memory_search 支持多种检索策略，推荐配置：

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

**混合检索**：结合向量相似度（semantic）和 BM25 关键词匹配（lexical）。

- 向量擅长"语义相同但措辞不同"：比如查询"Mac 主机"能匹配到"运行 gateway 的机器"
- BM25 擅长精确 token：比如查询 commit hash `a828e60` 或代码符号 `memorySearch.query.hybrid`

混合检索取两者之长，公式：

```
finalScore = 0.7 × vectorScore + 0.3 × textScore
```

**MMR（Maximal Marginal Relevance）**：去重机制，避免返回内容相似的多个片段。

假设查询"服务器配置"，你的日志中有三条几乎相同的记录：

```
memory/2026-02-10.md  → "配置 Nginx，监听 443 端口"
memory/2026-02-08.md  → "配置 Nginx，监听端口 443"
memory/2026-02-05.md  → "启用 Nginx SSL"
```

不开 MMR：前两条都会返回（冗余）  
开启 MMR（lambda=0.7）：只返回第一条和第三条（多样性更好）

**时间衰减**：让近期记忆的分数更高，旧记忆逐渐淡化。

公式：`decayedScore = score × e^(-λ × ageInDays)`，其中 `λ = ln(2) / halfLifeDays`。

假设 halfLifeDays=30：
- 今天的笔记：100% 分数
- 7天前：~84%
- 30天前：50%
- 90天前：12.5%
- 180天前：~1.6%

**永久文件不衰减**：`MEMORY.md` 和非日期格式的文件（如 `memory/projects.md`）永远保持原始分数。

实际效果举例，查询"服务器部署流程"：

不开衰减：

```
1. memory/2025-09-15.md  (score: 0.91)  ← 148天前，但匹配度高
2. memory/2026-02-23.md  (score: 0.82)  ← 今天
3. MEMORY.md             (score: 0.80)
```

开启衰减（halfLife=30）：

```
1. memory/2026-02-23.md  (score: 0.82 × 1.00 = 0.82)  ← 今天
2. MEMORY.md             (score: 0.80 × 1.00 = 0.80)  ← 永久文件
3. memory/2025-09-15.md  (score: 0.91 × 0.03 = 0.03)  ← 旧记录淡化
```

旧笔记虽然语义匹配好，但因为过时被降权，最新信息排到前面。

### 隐私与安全

**MEMORY.md 仅主会话加载**

OpenClaw 默认只在私聊（main session）中加载 `MEMORY.md`，群组对话中不会注入。这避免了在公共场合暴露私人信息。

如果你有多个 Agent（比如主 Agent、博客 Agent、工具 Agent），可以为每个 Agent 配置独立的 workspace：

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

这样不同 Agent 的记忆完全隔离，不会互相干扰。

**敏感数据分离**

不要把 API key、密码、SSH 私钥写入 workspace 文件。正确做法：

- API key：存储在 `~/.openclaw/credentials/` 或环境变量
- 服务器密码：使用 SSH key 认证，或存储在密码管理器
- 配置引用：在 TOOLS.md 中只写位置，不写具体值

示例（TOOLS.md）：

```markdown
## 服务器配置
- SSH key：~/.ssh/id_blog_server
- API key：存储在环境变量 BLOG_API_KEY
- 数据库密码：1Password vault "Blog Infrastructure"
```

**版本控制注意事项**

建议用 Git 备份 workspace（私有仓库），但要排除敏感文件：

```gitignore
# .gitignore
.DS_Store
.env
**/*.key
**/*.pem
**/secrets*
~/.openclaw/credentials/
```

即使是私有仓库，也不应该提交真实凭据。

## 高级技巧：Heartbeat 与自动化

### Heartbeat 机制

OpenClaw 支持定期心跳检查（heartbeat），让 Agent 主动执行周期性任务。

配置方式（在 `~/.openclaw/openclaw.json` 中）：

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

HEARTBEAT.md 示例：

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

Agent 会在心跳时读取 HEARTBEAT.md，执行对应任务。如果没事做，回复 `HEARTBEAT_OK`（静默）。

**记录检查状态**

为了避免重复检查，可以在 workspace 中维护状态文件：

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

Agent 在心跳时读取这个文件，判断是否需要重新检查。

### Memory Flush 自动化

前面提到的 compaction memory flush 是自动触发的，配置示例：

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

当会话接近压缩阈值时，Agent 会收到提示，将重要信息写入 memory 文件，然后回复 `NO_REPLY`。用户完全无感知。

你也可以在 HEARTBEAT.md 中定期回顾近期日志，更新 MEMORY.md：

```markdown
## 每周任务（周日）
- 读取过去7天的 memory/YYYY-MM-DD.md
- 提取重要决策和教训
- 更新 MEMORY.md 中的相关章节
- 删除 MEMORY.md 中过时的信息
```

这相当于人类定期回顾日记，将短期记忆转化为长期记忆。

### 跨会话协作（多 Agent 场景）

如果你有多个 Agent 分工协作，可以用 OpenClaw 的 session 工具：

- `sessions_list`：列出所有活跃会话
- `sessions_send`：向另一个会话发送消息
- `sessions_spawn`：创建子 Agent 执行隔离任务
- `subagents`：管理子 Agent（list、steer、kill）

示例场景：主 Agent 处理敏感任务（部署、支付），博客 Agent 处理写作，工具 Agent 处理数据抓取。

主 Agent 可以通过 `sessions_send` 委派任务：

```
sessions_send(sessionKey="agent:blog:telegram:123456", message="写一篇关于 OpenClaw Memory 的文章")
```

博客 Agent 完成后，通过 `sessions_send` 返回结果。

这种架构的好处：
- 隔离性：每个 Agent 有独立的 workspace 和记忆
- 安全性：敏感信息只在主 Agent 的 MEMORY.md 中
- 专业性：每个 Agent 可以加载不同的 skills 和配置

## 常见问题与解决方案

### 1. 检索不准确

**症状**：`memory_search` 返回无关结果，或漏掉明显相关的内容。

**可能原因**：
- 纯向量检索在精确 token（ID、代码符号）上较弱
- 嵌入模型与查询语言不匹配（比如用英文模型检索中文）
- 索引未更新（文件修改后未重新索引）

**解决方案**：

1. 启用混合检索（Vector + BM25）：

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

2. 检查嵌入模型：如果主要使用中文，考虑用多语言模型（如 `text-embedding-3-small`）或本地 GGUF 模型。

3. 手动触发重新索引：修改 `memorySearch.model` 配置，OpenClaw 会自动检测到变化并重建索引。

### 2. Context 爆满

**症状**：`/status` 显示 token 接近上限，对话开始变慢或报错。

**可能原因**：
- TOOLS.md 太长（常见！）
- Skills 列表过多
- 会话历史积累太多工具调用结果
- 大文件频繁注入

**解决方案**：

1. 清理 TOOLS.md：删除过时配置，只保留当前需要的内容。或拆分到多个文件（只注入主文件）。

2. 禁用不需要的工具：通过 tool policy 限制可用工具。

3. 手动压缩：

```
/compact Focus on decisions and current tasks
```

4. 调整 bootstrap 限制：

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

5. 启用 session pruning：自动移除旧的工具调用结果（不影响对话文本）。

### 3. 记忆丢失

**症状**：Agent 忘记之前的决策或用户偏好。

**可能原因**：
- 信息没有写入文件，只在 context 中
- 写入了 `memory/YYYY-MM-DD.md`，但已经超过"今天+昨天"的加载范围
- 写入了 MEMORY.md，但在群组会话中（不加载 MEMORY.md）

**解决方案**：

1. 检查文件是否存在：

```bash
cat ~/.openclaw/workspace/MEMORY.md
cat ~/.openclaw/workspace/memory/2026-02-23.md
```

2. 测试 memory_search：

```
memory_search("部署确认规则")
```

如果搜不到，说明没写入或索引未更新。

3. 确保在主会话中操作：如果你在群组中提到重要信息，Agent 可能无法访问 MEMORY.md。切换到私聊，或明确要求 Agent 写入 daily log。

4. 定期回顾 MEMORY.md：在 HEARTBEAT.md 中设置周任务，让 Agent 定期从 daily log 中提取重要信息更新到 MEMORY.md。

### 4. 隐私泄露

**症状**：在群组中暴露了不该公开的信息（IP 地址、API key、个人 Telegram ID）。

**可能原因**：
- MEMORY.md 在群组中被加载（配置错误）
- Agent 在回复时引用了隐私文件的内容
- 文件本身包含敏感信息（不应该存在）

**解决方案**：

1. 确认 MEMORY.md 加载范围：默认应该只在主会话加载。检查配置：

```json5
{
  "agents": {
    "defaults": {
      // 确保没有覆盖默认行为
    }
  }
}
```

2. 在 AGENTS.md 中添加隐私规则：

```markdown
## 隐私保护
- 不暴露真实 IP、密码、API key
- 群组对话中不引用 MEMORY.md 内容
- 示例数据用占位符（example.com、192.0.2.1）
```

3. 审查 workspace 文件：确保 TOOLS.md 和其他公共文件中没有敏感信息。

4. 使用环境变量或 credentials 目录存储敏感数据，而不是写入 workspace。

## QMD Backend：实验性的高级检索（可选）

OpenClaw 支持用 [QMD](https://github.com/tobi/qmd) 替代内置的 SQLite 索引器。QMD 是一个本地优先的搜索引擎，结合了 BM25、向量检索和重排序（reranking）。

**启用 QMD**：

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

**优点**：
- 更强的重排序能力（语义相关性更高）
- 可以索引 workspace 之外的文件
- 支持会话历史索引（`sessions.enabled = true`）

**缺点**：
- 需要单独安装 QMD CLI（`bun install -g qmd`）
- 首次检索可能触发 GGUF 模型下载（较慢）
- 增加维护复杂度

对大多数用户，默认的内置 SQLite 检索已经足够。只有在以下情况考虑 QMD：
- 你有大量笔记（数万条）需要高精度检索
- 你需要索引多个目录（workspace + 其他文档库）
- 你愿意投入时间调试和优化

## 让你的 Agent 应用这些最佳实践

**如果你在使用 OpenClaw**，可以让你的 Agent 立即优化它的记忆管理。将这篇文章发给它，并要求执行以下步骤：

**步骤 1：检查当前配置**
```
请运行 /context detail，检查我的 workspace 文件结构和 token 使用情况，告诉我哪些地方需要优化。
```

**步骤 2：应用推荐配置**
```
请根据这篇文章的建议，帮我优化 memory 配置：
1. 启用混合检索（Vector 70% + BM25 30%）
2. 启用时间衰减（halfLifeDays=30）
3. 启用 MMR 去重（lambda=0.7）
4. 启用 Memory flush（compaction 前自动存储）

优化后告诉我具体改了什么。
```

**步骤 3：整理 workspace 文件**
```
请按照文章中的文件分层策略，帮我整理 workspace：
1. 检查 MEMORY.md 是否包含策略性信息
2. 将近期操作日志移到 memory/YYYY-MM-DD.md
3. 清理 TOOLS.md 中的过时内容
4. 在 AGENTS.md 中添加记忆写入规则
```

**步骤 4：设置定期回顾**
```
请在 HEARTBEAT.md 中设置周任务，让我定期回顾 daily logs 并更新 MEMORY.md。
```

这些步骤不需要你手动配置文件，让 Agent 自己完成即可。执行后，你的 Agent 会有更可靠的记忆管理，不会忘记重要信息，也不会因为 context 爆满而变慢。

## 总结与资源

OpenClaw 的记忆系统核心思想很简单：**文件就是记忆**。但在这个简单原则之上，有丰富的机制来优化检索、管理 context、保护隐私。

**核心原则**：
1. **写下来！** 不要依赖"心智笔记"，文件是唯一的真相
2. **分层管理**：MEMORY.md（长期） + memory/日志（短期） + AGENTS.md（规则）
3. **定期回顾**：通过 heartbeat 或手动，从 daily log 提炼到 MEMORY.md
4. **隐私第一**：敏感数据分离，MEMORY.md 只在主会话加载

**推荐配置**：
- 混合检索（Vector 70% + BM25 30%）
- 时间衰减（halfLifeDays=30）
- MMR 去重（lambda=0.7）
- Memory flush（compaction 前自动存储）

**相关资源**：
- [OpenClaw 官方文档](https://docs.openclaw.ai)
- [Memory 概念详解](https://docs.openclaw.ai/concepts/memory)
- [Context 管理指南](https://docs.openclaw.ai/concepts/context)
- [GitHub: OpenClaw](https://github.com/openclaw/openclaw)

---

如果你在使用 OpenClaw 记忆系统时遇到问题，欢迎在 [Discord 社区](https://discord.com/invite/clawd) 讨论。这套机制仍在快速演进，你的反馈可能影响未来的设计方向。

最后，记住：AI Agent 不是魔法，它只是软件。好的记忆管理不是让 Agent"更聪明"，而是让它**更可靠**。当你能清楚地看到 Agent 记住了什么、为什么记住，你就能真正信任它来处理重要任务。
