---
author: 陈广亮
pubDatetime: 2026-05-02T11:00:00+08:00
title: Claude Code 五层架构详解：MCP、Skills、Agent、Subagents、Agent Teams 怎么协作
slug: claude-code-five-layer-architecture
featured: true
draft: false
reviewed: true
approved: true
tags:
  - Claude Code
  - AI Agent
  - 自动化
  - 开发效率
description: Anthropic 官方把 Claude Code 拆成五层架构：MCP 连接、Skills 任务知识、Agent 主工作者、Subagents 并行隔离、Agent Teams 协调。本文逐层拆解定位与协作模式，结合自己博客 blog-preflight Skill 的真实代码案例演示三层联动。
---

写完 [Claude Code Skills 实战](/posts/blog158_claude-code-skills-practical-guide/) 之后，我意识到一个问题：单看 Skills 是很难讲清楚的——Skills 的价值要通过它和 Subagents、MCP、Agent Teams 之间的关系才能体现出来。

5 月初 Anthropic 官方公布了 Claude Code 的"五层架构"——MCP / Skills / Agent / Subagents / Agent Teams。这个分层不是营销话术，每层都有明确的职责边界和协作方向。文章按层拆解定位、配置字段和何时用哪一层，最后用我博客里实际跑的 `blog-preflight` 案例演示三层是怎么联动的。

## 五层架构总览

先用一句话概括每层的角色：

| 层 | 角色 | 核心问题 |
|---|---|---|
| **MCP** | 连接层 | Agent 怎么访问外部世界（API、数据库、私有工具）|
| **Skills** | 任务知识层 | 把"playbook"变成可被自动加载的可复用步骤 |
| **Agent** | 主工作者 | 处理你的对话主线，调用工具完成任务 |
| **Subagents** | 并行隔离工作者 | 把"会污染上下文的活"派出去做 |
| **Agent Teams** | 多 Agent 协调层 | 跨会话、跨独立上下文的 Agent 协作 |

最容易混淆的是 Skills、Subagents、Agent Teams——它们都和"任务"有关。区分点在**上下文隔离粒度**：

- Skills：在主对话上下文里执行（除非 `context: fork`）
- Subagents：每个 Subagent 独立上下文，**单会话内**协作
- Agent Teams：每个成员独立会话 + 独立上下文，**跨会话**协调

## 第一层：MCP（Model Context Protocol）

MCP 是底层连接器。它解决的问题是："让 Claude 能访问 GitHub、数据库、Notion、内部 API、Linear，**而不需要给每个服务写自定义代码**。"

### 三种使用模式

**1. 全局配置（`.mcp.json`）**

```json
{
  "mcpServers": {
    "github": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"]
    }
  }
}
```

任何 Claude Code 会话都能用 `github` 这个服务器。

**2. Subagent 内联（仅 Subagent 可见）**

```yaml
---
name: browser-tester
description: 用 Playwright 在真实浏览器里测试功能
mcpServers:
  - playwright:
      type: stdio
      command: npx
      args: ["-y", "@playwright/mcp@latest"]
---
```

Playwright MCP 只在这个 Subagent 启动时连接，结束时断开。**主对话看不到它的工具描述，节省 token**。

**3. 引用全局服务器**

```yaml
mcpServers:
  - github   # 引用 .mcp.json 中已配置的服务器
```

### 什么时候用 MCP

- 需要访问**带状态的外部系统**（GitHub Issue、Linear ticket、数据库）
- 工具能力是**通用、跨项目复用**的（不是某个项目特有逻辑）
- 不希望工具的实现细节侵入项目代码

如果只是"格式化博客 frontmatter"这种纯本地脚本逻辑，用 Skill 比写一个 MCP server 简单一个量级。

## 第二层：Skills

Skills 是"任务知识"层——把你重复粘贴的指令变成 Claude 自动加载的资源。这部分细节我在 [blog158](/posts/blog158_claude-code-skills-practical-guide/) 写过，这里只补两点和后面层级有关的：

### Skill 与 Subagent 的双向关系

这是五层架构里最容易绕晕的点。Skill 和 Subagent 之间存在**两个相反方向的协作**：

| 方向 | 配置方式 | 谁定 system prompt |
|---|---|---|
| **Skill 调 Subagent**（context: fork）| Skill frontmatter 写 `context: fork` + `agent: Explore` | Subagent 类型决定 system prompt，Skill 内容作为 task |
| **Subagent 用 Skills**（preload）| Subagent frontmatter 写 `skills: [api-conventions, ...]` | Subagent 自己的 prompt，Skill 内容注入到 context |

两者底层是同一套机制，但**触发方向相反**：

```text
Skill 调 Subagent                    Subagent 预加载 Skill
─────────────────                    ────────────────────
你 → Skill                            你 → Subagent
       ↓ context: fork                       ↓ skills: [...]
     Subagent (Explore/Plan/...)             含 Skill 内容的 Subagent
       ↓ 用 SKILL.md 作为 task               ↓ 自己的 prompt + Skill 知识
     返回结论                                返回结论
```

### 决策树：什么时候用哪个

```text
有"指令模板"想固化下来？
  └─ 是 → Skill
       ↓
       Skill 内容很长 + 会产生大量探索/调试输出？
         └─ 是 → 加 context: fork（让 Subagent 跑这个 Skill）
         └─ 否 → 普通 Skill，主对话执行

需要"专门类型的工作者"反复出现（比如 code-reviewer、db-reader）？
  └─ 是 → Subagent
       ↓
       这个工作者有反复使用的领域知识？
         └─ 是 → 在 Subagent 里 preload Skills
         └─ 否 → 直接写在 Subagent 的 system prompt 里
```

## 第三层：Agent（主工作者）

Agent 是你和 Claude Code 对话的主线。`claude` 命令启动的就是默认 Agent，使用 Claude Code 默认 system prompt + 你的 CLAUDE.md。

### 用 `--agent` 让整个会话变成专项 Agent

```bash
# 启动后整个会话都是 code-reviewer，使用它的 system prompt 和工具限制
claude --agent code-reviewer
```

或在项目里设默认：

```json
// .claude/settings.json
{
  "agent": "code-reviewer"
}
```

这是把"专门工作者"提升到主线层级的方式——和 Subagent 的区别是：**主 Agent 你能自由对话，Subagent 是被任务驱动跑完一次就结束**。

### 主 Agent 能 spawn Subagent，但 Subagent 不能 spawn Subagent

这是个硬约束。从架构图看：

```text
Main Agent (claude 或 claude --agent <name>)
  ├── 可以 spawn Subagent A
  ├── 可以 spawn Subagent B
  └── 可以 spawn Subagent C
        └── ❌ 不能再 spawn 其他 Subagent
```

如果你需要嵌套委派，用 Skills（Skill 可以 fork 出 Subagent，绕开这个限制）或者 chain subagents（让 Main Agent 顺序调用多个 Subagent）。

## 第四层：Subagents

Subagent 是单会话内的专项工作者。它的 frontmatter 字段比 Skill 多一些，列几个最关键的：

| 字段 | 说明 |
|---|---|
| `name` | 唯一标识符 |
| `description` | Claude 决定何时委派的关键文本 |
| `tools` / `disallowedTools` | 工具白/黑名单 |
| `model` | `sonnet` / `opus` / `haiku` / 全 ID / `inherit` |
| `permissionMode` | 权限模式（`default` / `acceptEdits` / `auto` / `bypassPermissions` / `plan`）|
| `skills` | 启动时预加载的 Skills 列表 |
| `mcpServers` | 仅本 Subagent 可见的 MCP 服务器 |
| `memory` | `user` / `project` / `local` — 持久记忆作用域 |
| `isolation: worktree` | 在 git worktree 里跑，仓库副本隔离 |
| `background: true` | 后台并行执行 |

完整字段还有 `maxTurns`、`hooks`、`effort`、`color`、`initialPrompt` 等，参见 [官方文档](https://code.claude.com/docs/en/sub-agents)。

> **命名风格提醒**：Skill 用 `allowed-tools`（短横线），Subagent 用 `tools` / `disallowedTools`（驼峰）。两套风格不一致，写的时候容易抄错。

### Subagent 持久记忆机制（最被低估的特性）

加 `memory: project` 后，Subagent 获得一个持久目录：

```text
.claude/agent-memory/<subagent-name>/
├── MEMORY.md     # Claude 启动时读前 200 行
└── 其他笔记文件
```

Subagent 在每次任务后**主动更新自己的记忆**——比如 code-reviewer 会记下"这个项目的 React 组件总是用 forwardRef 包装"、"BUG 经常出在 useEffect 没列依赖"。下次它再被调用时，会先读自己的 MEMORY.md，然后把这些累积的洞察用上。

```yaml
---
name: code-reviewer
description: 审查代码质量。审完总是更新自己的记忆
memory: project
---

You are a code reviewer. Before reviewing, read your MEMORY.md to recall
patterns from past reviews. After reviewing, update MEMORY.md with new
patterns, anti-patterns, and recurring issues you discovered.
```

三个作用域选择：

- `user`（`~/.claude/agent-memory/<name>/`）—— 跨所有项目，比如"我喜欢用 TypeScript 严格模式"这种全局偏好
- `project`（`.claude/agent-memory/<name>/`）—— 项目特定，可入 git，团队共享
- `local`（`.claude/agent-memory-local/<name>/`）—— 项目特定但不入 git，比如个人调试笔记

### 内置 Subagent

Claude Code 自带几个：

| Subagent | 模型 | 用途 |
|---|---|---|
| **Explore** | Haiku | 只读探索代码库，找文件、读引用 |
| **Plan** | inherit | plan mode 下的研究 Agent |
| **general-purpose** | inherit | 多步任务，需要探索+修改 |
| statusline-setup | Sonnet | 配置 status line（隐藏，自动调用）|
| claude-code-guide | Haiku | 回答 Claude Code 自身的问题 |

Explore 用 Haiku 是设计选择——大多数代码搜索任务不需要 Opus 的推理深度，Haiku 快且便宜。

## 第五层：Agent Teams

Agent Teams 解决的是 Subagent 解决不了的场景——**多 Agent 长期并行 + 跨会话协调**。

Subagent 的限制：
- 单会话内
- 任务完成就结束
- 主 Agent → Subagent 是单向关系

Agent Teams 把每个成员升级为**独立会话 + 独立上下文**，成员之间通过 `SendMessage` 工具互相对话，由协调者 Agent 编排。

启用方式：

```bash
CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 claude
```

适用场景：

- 长时间运行的复杂项目（比如完整产品功能开发：设计 → 实现 → 测试 → 文档）
- 各成员需要长记忆和持续状态
- 任务能拆解成几个**独立但有交互**的子任务

如果你的工作流单会话就能跑完，**别用 Agent Teams**。它的复杂度对单会话场景是负价值。

### 一个直观对比

```text
Subagent（单会话）                         Agent Teams（多会话协调）
──────────────────                         ────────────────────────
Main Agent                                 Coordinator Agent
  ├── Subagent A 跑完返回                    ├── ← Teammate A（独立会话）
  ├── Subagent B 跑完返回                    │     ↕ SendMessage
  └── 综合结果给你                            ├── ← Teammate B（独立会话）
                                             └── 长期协作

特点：                                      特点：
- 一次性                                    - 持续性
- A 和 B 不互相通讯                          - 成员间直接通讯
- 单上下文树                                 - 每个成员自己的会话
```

## 实战：博客发布前自检的三层联动

我博客的 `blog-preflight` Skill 就是 Skills + Subagents + MCP 三层组合的真实例子。

### 当前实现（仅 Skill 层）

参见 [blog158](/posts/blog158_claude-code-skills-practical-guide/) — 用 `context: fork` 把 Skill 跑在 Explore Subagent 里：

```yaml
---
name: blog-preflight
description: 博客发布前自检。在我说"准备发布"或部署前主动调用
context: fork
agent: Explore
allowed-tools: Read Grep Bash(grep:*) Bash(node:*)
---

# 检查清单
1. frontmatter 完整性
2. 隐私扫描
3. AI 味词汇
...
```

这只是 **Skill + Subagent** 联动。

### 升级为三层联动

如果我想让 Claude 在审查时**记住**前几次发现的问题模式（比如"上次某篇文章用了'标志着'被我改了，下次写时优先避开"），就需要把 preflight 升级成一个带持久记忆的 Subagent，再让原 Skill 调用它：

**第一步：定义 Subagent**

```yaml
# .claude/agents/blog-preflight-checker.md
---
name: blog-preflight-checker
description: 博客发布前自检专家。审查 frontmatter、隐私、AI 痕迹，并积累项目特定的写作问题模式
tools: Read, Grep, Bash
model: sonnet
memory: project
mcpServers:
  - github  # 复用全局 GitHub MCP，用来查 PR 历史
skills:
  - blog-preflight  # 复用已有的检查清单 Skill
---

You are a blog preflight checker. Before reviewing:
1. 读 .claude/agent-memory/blog-preflight-checker/MEMORY.md，回顾以往发现的常见问题
2. 应用 preloaded blog-preflight skill 的检查清单

After reviewing, update MEMORY.md with:
- 这次新发现的问题模式
- 历史问题在新文章里是否仍出现
- 哪些检查项是过度的（被作者反复忽略，可降级）
```

**第二步：触发**

```text
你: 用 blog-preflight-checker 检查 blog160 这篇
  ↓
Main Agent → 委派 Subagent
  ↓
Subagent 启动:
  - 加载 blog-preflight Skill 内容（preloaded）
  - 读 MEMORY.md 看历史问题
  - 通过 GitHub MCP 查最近几篇文章的修订历史（可选）
  - 跑检查脚本
  - 写报告 + 更新 MEMORY.md
  ↓
返回主对话: 简短报告（"3 个 🔴，2 个 🟡"）
```

**这就是五层架构的实际效果**：MCP（GitHub 历史）+ Skills（检查清单）+ Subagent（持久记忆 + 隔离上下文）三层各司其职。如果都堆在一个主对话里，会立即把 Claude 的上下文塞满。

> **说明**：上面的 Subagent 配置是设计方案，演示三层组合，实际跑通还要看 `memory` 和 `skills` preload 在你项目里的兼容性，建议先小流量验证。

## 决策框架

回答"我该用哪一层"的问题：

```text
我有的是什么？
│
├── 一段重复粘贴的指令 / playbook？
│     → Skill（如果产生大量输出，加 context: fork）
│
├── 一段需要从外部系统拉数据的逻辑？
│     → MCP server（如果是通用工具）
│       或者 Subagent inline mcpServers（如果只在某场景用）
│
├── 一类反复出现的工作者（reviewer / debugger / db-reader）？
│     → Subagent
│       └── 需要跨会话累积知识？→ 加 memory: project
│       └── 有领域知识要预先注入？→ 加 skills: [...]
│
├── 整个会话都用某个专项角色？
│     → claude --agent <name>
│
└── 多 Agent 长期并行 + 跨会话协调？
      → Agent Teams（experimental，慎用）
```

## 常见误解澄清

### "Subagent 比 Skill 更高级"

**错。**它们解决的是不同问题：

- Skills = "把指令固化，可被加载"
- Subagent = "把工作者隔离，可有独立 context 和工具"

简单的"按某 playbook 做事"用 Skill 就够了。**只有当主对话上下文会被这次任务污染时，才考虑用 Subagent**。

### "用了 Subagent 就比 Skill 慢/贵"

部分对。Subagent 启动有 latency（要重新建上下文），但它**省 token**——大量探索/调试输出留在子上下文里，不会进主对话历史。当任务输出超过 5K token 时，用 Subagent 反而更便宜。

### "Subagent 能 spawn 其他 Subagent"

**不能**。这是硬限制。如果你想嵌套委派，方案是：

- 用 Skills（Skill 可以 fork Subagent，跨过这个限制）
- 或者从 Main Agent chain：Subagent A 完成 → Main Agent 拿结果 → 委派 Subagent B

### "skills 字段把 Skill 注册给 Subagent，Subagent 能用 / 命令调用"

**错**。`skills` 字段是**预加载**——把 Skill 内容**直接注入** Subagent 的 system prompt。Subagent 看到的是 Skill 的指令文本，不是一个可被 `/skill-name` 调用的命令。

### "User scope memory 会跨项目串味"

会，但这正是它的价值。如果你不想跨项目共享，用 `memory: project`（仓库内）或 `memory: local`（不入 git）。

## 落地建议

如果你刚开始用 Claude Code 的高级功能，按这个顺序学：

1. **第 1 周**：先把所有重复指令变成 Skills，体会"按需加载"的效果
2. **第 2 周**：当某个 Skill 输出爆炸时，加 `context: fork`，体会上下文隔离
3. **第 3 周**：设计第一个带 `memory` 的 Subagent，让它跨会话累积知识
4. **第 4 周**：把项目里 GitHub / Linear / 数据库这种"外部状态"接入 MCP
5. **第 N 周**：真正复杂的产品级协作再考虑 Agent Teams

不要一开始就上 Agent Teams——多数场景 Subagent + Skills + MCP 已经够了。"工具不在多，而在用对地方"——这句话在 Claude Code 这套架构上格外贴切。

---

**相关阅读**：
- [Claude Code Skills 实战：从 0 到 1 写一个能在多项目复用的 Skill](/posts/blog158_claude-code-skills-practical-guide/) - Skills 单层深度实战，本文的前置阅读
- [一个 CLAUDE.md 文件，一周涨了 44K Star：Karpathy 的 AI 编程四原则](/posts/blog139_karpathy-skills-claude-md-guide/) - CLAUDE.md（Memory 层）的设计原则
- [obra/superpowers：让 AI 编程 Agent 先思考再动手的方法论框架](/posts/blog138_superpowers-agentic-skills-framework/) - 把多层架构封装成完整 SDLC 框架的代表

**延伸阅读**：
- [Anthropic Subagents 官方文档](https://code.claude.com/docs/en/sub-agents) - frontmatter 全字段说明
- [Claude Code Advanced Patterns Webinar](https://www.anthropic.com/webinars/claude-code-advanced-patterns) - 官方多层协作 webinar
