---
author: Gerald Chen
pubDatetime: 2026-05-02T11:00:00+08:00
title: "Claude Code's Five-Layer Architecture Explained: How MCP, Skills, Agent, Subagents, and Agent Teams Work Together"
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
description: "Anthropic officially describes Claude Code as a five-layer architecture: MCP for connectivity, Skills for task knowledge, Agent as the main worker, Subagents for parallel isolation, and Agent Teams for coordination. This post breaks down each layer's role and collaboration patterns, with a real-world example from my blog's blog-preflight Skill showing three layers working together."
---

After writing [Claude Code Skills in Practice](/en/posts/blog158_claude-code-skills-practical-guide/), I realized something: Skills are hard to explain in isolation — their value only becomes clear once you see how they relate to Subagents, MCP, and Agent Teams.

In early May, Anthropic officially laid out Claude Code's "five-layer architecture": MCP / Skills / Agent / Subagents / Agent Teams. This isn't marketing speak — each layer has a clear responsibility boundary and a defined direction of collaboration. This post breaks down each layer's role, configuration fields, and when to use which, and ends with the `blog-preflight` setup actually running on my blog to demonstrate how three of the layers work together.

## The Five Layers at a Glance

One sentence per layer:

| Layer | Role | Core question |
|---|---|---|
| **MCP** | Connectivity layer | How does the Agent reach the outside world (APIs, databases, private tools)? |
| **Skills** | Task knowledge layer | How do you turn a playbook into reusable steps that load automatically? |
| **Agent** | Main worker | Drives your main conversation thread, calls tools to get work done |
| **Subagents** | Parallel, isolated workers | Where to offload work that would pollute your context |
| **Agent Teams** | Multi-agent coordination layer | Agent collaboration across sessions and independent contexts |

The most confusing trio is Skills, Subagents, and Agent Teams — they all deal with "tasks." The distinction is the **granularity of context isolation**:

- Skills: run inside the main conversation context (unless `context: fork`)
- Subagents: each gets its own context, collaborating **within a single session**
- Agent Teams: each member gets its own session and context, coordinating **across sessions**

## Layer 1: MCP (Model Context Protocol)

MCP is the low-level connector. The problem it solves: "let Claude access GitHub, databases, Notion, internal APIs, Linear — **without writing custom code for each service**."

### Three Usage Modes

**1. Global configuration (`.mcp.json`)**

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

Any Claude Code session can use the `github` server.

**2. Subagent inline (visible only to that Subagent)**

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

The Playwright MCP connects only when this Subagent starts and disconnects when it finishes. **The main conversation never sees its tool descriptions, which saves tokens.**

**3. Referencing a global server**

```yaml
mcpServers:
  - github   # 引用 .mcp.json 中已配置的服务器
```

### When to Use MCP

- You need access to **stateful external systems** (GitHub issues, Linear tickets, databases)
- The tooling is **generic and reusable across projects** (not logic specific to one project)
- You don't want the tool's implementation details leaking into your project code

If all you need is purely local script logic like "format my blog frontmatter," a Skill is an order of magnitude simpler than writing an MCP server.

## Layer 2: Skills

Skills are the "task knowledge" layer — they turn instructions you keep copy-pasting into resources Claude loads automatically. I covered the details in [blog158](/en/posts/blog158_claude-code-skills-practical-guide/), so here I'll only add two points that matter for the layers above:

### The Two-Way Relationship Between Skills and Subagents

This is the single most confusing point in the five-layer model. Skills and Subagents collaborate in **two opposite directions**:

| Direction | How to configure | Who owns the system prompt |
|---|---|---|
| **Skill calls a Subagent** (context: fork) | `context: fork` + `agent: Explore` in the Skill frontmatter | The Subagent type sets the system prompt; the Skill content becomes the task |
| **Subagent uses Skills** (preload) | `skills: [api-conventions, ...]` in the Subagent frontmatter | The Subagent's own prompt; Skill content is injected into the context |

Under the hood it's the same mechanism, but the **trigger direction is reversed**:

```text
Skill calls a Subagent               Subagent preloads a Skill
─────────────────────                ─────────────────────────
You → Skill                          You → Subagent
       ↓ context: fork                       ↓ skills: [...]
     Subagent (Explore/Plan/...)             Subagent with Skill content baked in
       ↓ uses SKILL.md as the task           ↓ its own prompt + Skill knowledge
     Returns conclusions                     Returns conclusions
```

### Decision Tree: Which One When

```text
Got an "instruction template" you want to lock in?
  └─ Yes → Skill
       ↓
       Is the Skill long AND does it produce lots of exploration/debug output?
         └─ Yes → Add context: fork (let a Subagent run the Skill)
         └─ No  → Plain Skill, runs in the main conversation

Need a "specialized worker type" that shows up repeatedly (e.g. code-reviewer, db-reader)?
  └─ Yes → Subagent
       ↓
       Does this worker rely on domain knowledge you reuse over and over?
         └─ Yes → Preload Skills in the Subagent
         └─ No  → Write it directly into the Subagent's system prompt
```

## Layer 3: Agent (the Main Worker)

The Agent is the main thread of your conversation with Claude Code. The `claude` command launches the default Agent, using Claude Code's default system prompt plus your CLAUDE.md.

### Turn the Whole Session into a Specialized Agent with `--agent`

```bash
# 启动后整个会话都是 code-reviewer，使用它的 system prompt 和工具限制
claude --agent code-reviewer
```

Or set a project default:

```json
// .claude/settings.json
{
  "agent": "code-reviewer"
}
```

This promotes a "specialized worker" to the main thread. The difference from a Subagent: **you can converse freely with the main Agent, while a Subagent is task-driven — it runs once and exits**.

### The Main Agent Can Spawn Subagents, but Subagents Cannot

This is a hard constraint. Architecturally:

```text
Main Agent (claude or claude --agent <name>)
  ├── can spawn Subagent A
  ├── can spawn Subagent B
  └── can spawn Subagent C
        └── ❌ cannot spawn further Subagents
```

If you need nested delegation, use Skills (a Skill can fork out a Subagent, sidestepping this limit) or chain subagents (have the Main Agent call multiple Subagents in sequence).

## Layer 4: Subagents

A Subagent is a specialized worker within a single session. Its frontmatter has more fields than a Skill's — here are the key ones:

| Field | Description |
|---|---|
| `name` | Unique identifier |
| `description` | The key text Claude uses to decide when to delegate |
| `tools` / `disallowedTools` | Tool allowlist / denylist |
| `model` | `sonnet` / `opus` / `haiku` / full ID / `inherit` |
| `permissionMode` | Permission mode (`default` / `acceptEdits` / `auto` / `bypassPermissions` / `plan`) |
| `skills` | Skills preloaded at startup |
| `mcpServers` | MCP servers visible only to this Subagent |
| `memory` | `user` / `project` / `local` — persistent memory scope |
| `isolation: worktree` | Runs in a git worktree, isolated repo copy |
| `background: true` | Runs in parallel in the background |

The full field list also includes `maxTurns`, `hooks`, `effort`, `color`, `initialPrompt`, and more — see the [official docs](https://code.claude.com/docs/en/sub-agents).

> **Naming-style gotcha**: Skills use `allowed-tools` (kebab-case), Subagents use `tools` / `disallowedTools` (camelCase). The two styles are inconsistent and easy to mix up when writing configs.

### Subagent Persistent Memory (the Most Underrated Feature)

With `memory: project`, a Subagent gets a persistent directory:

```text
.claude/agent-memory/<subagent-name>/
├── MEMORY.md     # Claude reads the first 200 lines on startup
└── other note files
```

The Subagent **proactively updates its own memory** after each task — e.g. a code-reviewer notes "this project always wraps React components in forwardRef" or "bugs often come from useEffect with missing dependencies." The next time it's invoked, it reads its MEMORY.md first and applies those accumulated insights.

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

Three scopes to choose from:

- `user` (`~/.claude/agent-memory/<name>/`) — spans all projects, for global preferences like "I prefer TypeScript strict mode"
- `project` (`.claude/agent-memory/<name>/`) — project-specific, can go into git, shared with the team
- `local` (`.claude/agent-memory-local/<name>/`) — project-specific but git-ignored, e.g. personal debugging notes

### Built-in Subagents

Claude Code ships with a few:

| Subagent | Model | Purpose |
|---|---|---|
| **Explore** | Haiku | Read-only codebase exploration: finding files, reading references |
| **Plan** | inherit | The research agent in plan mode |
| **general-purpose** | inherit | Multi-step tasks that need exploration + modification |
| statusline-setup | Sonnet | Configures the status line (hidden, invoked automatically) |
| claude-code-guide | Haiku | Answers questions about Claude Code itself |

Explore running on Haiku is a deliberate design choice — most code-search tasks don't need Opus-level reasoning depth, and Haiku is fast and cheap.

## Layer 5: Agent Teams

Agent Teams handle the scenario Subagents can't — **long-running multi-agent parallelism with cross-session coordination**.

Subagent limitations:
- Confined to a single session
- Terminates when the task is done
- Main Agent → Subagent is a one-way relationship

Agent Teams upgrade each member to an **independent session with an independent context**. Members talk to each other via the `SendMessage` tool, orchestrated by a coordinator Agent.

Enabling it:

```bash
CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 claude
```

When it fits:

- Long-running, complex projects (e.g. full product feature development: design → implementation → testing → docs)
- Members need long-lived memory and persistent state
- The work decomposes into several **independent but interacting** subtasks

If your workflow finishes within a single session, **don't use Agent Teams**. Its complexity is negative value for single-session scenarios.

### A Side-by-Side Comparison

```text
Subagents (single session)                 Agent Teams (multi-session coordination)
──────────────────────────                 ────────────────────────────────────────
Main Agent                                 Coordinator Agent
  ├── Subagent A runs and returns            ├── ← Teammate A (own session)
  ├── Subagent B runs and returns            │     ↕ SendMessage
  └── Results synthesized for you            ├── ← Teammate B (own session)
                                             └── Long-running collaboration

Traits:                                    Traits:
- One-shot                                 - Persistent
- A and B never talk to each other         - Members communicate directly
- Single context tree                      - Each member has its own session
```

## In Practice: Three Layers Working Together in My Blog Preflight

My blog's `blog-preflight` Skill is a real example of combining Skills, Subagents, and MCP.

### Current Implementation (Skill Layer Only)

See [blog158](/en/posts/blog158_claude-code-skills-practical-guide/) — `context: fork` runs the Skill inside the Explore Subagent:

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

That's only **Skill + Subagent** working together.

### Upgrading to All Three Layers

If I want Claude to **remember** problem patterns it found in previous reviews (e.g. "last time an article used '标志着' and I had to fix it — avoid it proactively next time"), I need to upgrade preflight into a Subagent with persistent memory, and have the original Skill call it:

**Step 1: Define the Subagent**

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

**Step 2: Trigger It**

```text
You: check blog160 with blog-preflight-checker
  ↓
Main Agent → delegates to the Subagent
  ↓
Subagent starts:
  - Loads the blog-preflight Skill content (preloaded)
  - Reads MEMORY.md for historical issues
  - Queries recent article revision history via the GitHub MCP (optional)
  - Runs the check scripts
  - Writes the report + updates MEMORY.md
  ↓
Back to the main conversation: a short report ("3 🔴, 2 🟡")
```

**This is the five-layer architecture in action**: MCP (GitHub history) + Skills (the checklist) + Subagent (persistent memory + isolated context), each layer doing its own job. Pile all of that into one main conversation and Claude's context fills up instantly.

> **Note**: The Subagent config above is a design sketch demonstrating the three-layer combination. Whether it runs end-to-end depends on how `memory` and `skills` preload behave in your project — validate on a small scale first.

## A Decision Framework

To answer "which layer should I use":

```text
What do I have?
│
├── A repeatedly copy-pasted instruction / playbook?
│     → Skill (add context: fork if it produces lots of output)
│
├── Logic that needs to pull data from an external system?
│     → MCP server (if it's a general-purpose tool)
│       or Subagent inline mcpServers (if it's used in just one scenario)
│
├── A recurring worker type (reviewer / debugger / db-reader)?
│     → Subagent
│       └── Needs to accumulate knowledge across sessions? → add memory: project
│       └── Has domain knowledge to inject up front? → add skills: [...]
│
├── The entire session should play one specialized role?
│     → claude --agent <name>
│
└── Long-running multi-agent parallelism + cross-session coordination?
      → Agent Teams (experimental, use with caution)
```

## Clearing Up Common Misconceptions

### "Subagents Are More Advanced Than Skills"

**Wrong.** They solve different problems:

- Skills = "lock instructions in so they can be loaded"
- Subagent = "isolate a worker with its own context and tools"

For simply "doing work according to a playbook," a Skill is enough. **Only reach for a Subagent when the task would pollute the main conversation context.**

### "Using a Subagent Is Slower/More Expensive Than a Skill"

Partially true. A Subagent has startup latency (it rebuilds its context), but it **saves tokens** — the bulk of exploration/debug output stays in the child context and never enters your main conversation history. Once a task's output exceeds about 5K tokens, the Subagent is actually cheaper.

### "Subagents Can Spawn Other Subagents"

**They can't.** It's a hard limit. If you want nested delegation:

- Use Skills (a Skill can fork a Subagent, getting past this limit)
- Or chain from the Main Agent: Subagent A finishes → Main Agent takes the result → delegates to Subagent B

### "The skills Field Registers a Skill with the Subagent, Which Can Invoke It as a / Command"

**Wrong.** The `skills` field is a **preload** — it **injects the Skill content directly** into the Subagent's system prompt. The Subagent sees the Skill's instruction text, not a command it can invoke as `/skill-name`.

### "User-Scope Memory Bleeds Across Projects"

It does — and that's exactly its value. If you don't want cross-project sharing, use `memory: project` (in the repo) or `memory: local` (git-ignored).

## Adoption Advice

If you're just starting with Claude Code's advanced features, learn them in this order:

1. **Week 1**: Turn every repeated instruction into Skills first; get a feel for on-demand loading
2. **Week 2**: When a Skill's output explodes, add `context: fork`; get a feel for context isolation
3. **Week 3**: Design your first Subagent with `memory` and let it accumulate knowledge across sessions
4. **Week 4**: Hook your project's "external state" — GitHub / Linear / databases — into MCP
5. **Week N**: Only consider Agent Teams for genuinely complex, product-level collaboration

Don't jump straight to Agent Teams — for most scenarios, Subagents + Skills + MCP are already enough. "It's not about how many tools you have, but using the right one in the right place" — that line fits this Claude Code architecture remarkably well.

---

**Further reading**:
- [Anthropic Subagents official docs](https://code.claude.com/docs/en/sub-agents) - full frontmatter field reference
- [Claude Code Advanced Patterns Webinar](https://www.anthropic.com/webinars/claude-code-advanced-patterns) - official multi-layer collaboration webinar
