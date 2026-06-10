---
author: Gerald Chen
pubDatetime: 2026-04-20T09:00:00+08:00
title: "Two Claude Code Environment Variables You've Probably Never Used: EFFORT_LEVEL and ADDITIONAL_DIRECTORIES_CLAUDE_MD"
slug: blog134_claude-code-env-vars-guide
featured: true
draft: false
reviewed: true
approved: true
tags:
  - Claude Code
  - 开发效率
  - AI
description: "A deep dive into two underrated Claude Code environment variables: CLAUDE_CODE_EFFORT_LEVEL controls the reasoning effort tier, and CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD enables sharing rules across projects — with complete configuration examples and use cases."
---

After using Claude Code for a while, you'll notice its behavior can be hit or miss: sometimes the code it writes is impressive, other times it makes embarrassingly basic mistakes. There's actually a control mechanism behind this that most people never notice — the **reasoning effort level**.

Meanwhile, if you maintain multiple projects, you've probably run into this too: every project needs a nearly identical CLAUDE.md, duplicating team conventions, coding style, and so on. Is there a way to share these rules?

This post covers two seriously underrated Claude Code environment variables.

## First: CLAUDE_CODE_EFFORT_LEVEL

### What is the effort level?

Every time Claude Code responds, it allocates a "reasoning budget" — how deeply to think, how many approaches to consider, how many edge cases to verify. That budget is the effort level.

**Supported levels**:

| Level | Description | Best for |
|------|------|----------|
| `low` | Minimal reasoning budget, fastest responses | Simple renames, formatting, one-line changes |
| `medium` | Moderate budget, balances cost and quality | Everyday dev tasks, writing functions, fixing bugs |
| `high` | Large budget, traces complex logic | Complex refactors, multi-file changes, hard-to-pin-down bugs |
| `xhigh` | Extra-high budget (Opus 4.7 only) | Long-running agent tasks, complex architecture design |
| `max` | No cap, full reasoning power | The hardest tasks — use sparingly |

Note: `xhigh` is a new level introduced in 2026 alongside Opus 4.7. **Opus 4.7's default effort level is already `xhigh`**, so no manual setup is needed. If you're on Opus 4.6 or Sonnet 4.6, setting `xhigh` automatically falls back to `high`.

### Why you might need to set it manually

**In March 2026, Anthropic lowered the default level for Pro/Max subscribers from `high` to `medium`** (for Opus 4.6/Sonnet 4.6).

If you've recently felt Claude Code's quality slipping, it's likely not that the model got worse — your reasoning budget got dialed down. There was no prominent changelog entry for this change, and many users have no idea it happened.

It gets worse: at the medium level, adaptive thinking sometimes allocates zero reasoning tokens on certain turns, causing the model to start "making things up" — fabricating commit SHAs that don't exist, citing packages that don't exist. The community-verified workaround:

```bash
export CLAUDE_CODE_EFFORT_LEVEL=high
# 如果问题严重，可以加上：
export CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1
```

### Four ways to set it

**Option 1: Environment variable (recommended — persists across sessions)**

```bash
# 加到 ~/.zshrc 或 ~/.bashrc
export CLAUDE_CODE_EFFORT_LEVEL=high

# 单次覆盖
CLAUDE_CODE_EFFORT_LEVEL=low claude --model sonnet
```

**Option 2: settings.json (project-level configuration)**

```json
{
  "effortLevel": "high"
}
```

**Option 3: Launch flag (single session)**

```bash
claude --effort high
```

**Option 4: Switching dynamically within a session**

```
/effort high
/effort low
/effort auto   # 重置为默认值
```

**Precedence**: environment variable > session setting (/effort) > model default

### One important detail: max is special

The `max` level (full reasoning, no token cap) only persists across sessions when set via an **environment variable**. Using `/effort max` or `--effort max` applies to the current session only — the next launch reverts it.

That said, Anthropic's official guidance: **run an eval to verify that max meaningfully outperforms xhigh before adopting it**. max carries an "overthinking" risk — the bigger the reasoning budget, the more likely the model goes down rabbit holes and actually produces worse output.

### How this differs from the think trigger words

Many people assume writing keywords in the prompt and setting the effort level are the same thing. They're completely different:

- **`/effort` / `CLAUDE_CODE_EFFORT_LEVEL`**: controls the effort level via an API parameter — a **persistent, system-level setting**
- **`think` / `think hard` / `think harder`**: text trigger words inserted into the prompt — a **one-off, in-context instruction** that does not change the effort level sent to the API

Approximate token budgets for the trigger words (for reference; check the latest official docs):
- `think`: ~4,000 tokens
- `think hard`: ~10,000 tokens
- `think harder`: ~31,999 tokens (since Claude 4, thinking mode is on by default — trigger words mainly tune the budget)

The two can be combined, but neither replaces the other.

### Recommended real-world setup

```bash
# ~/.zshrc
# 日常编码任务，均衡成本和质量
export CLAUDE_CODE_EFFORT_LEVEL=high

# 如果用 Opus 4.7 做重型 agent 任务，改为：
# export CLAUDE_CODE_EFFORT_LEVEL=xhigh

# 子 agent 用更便宜的模型（节省成本）
export CLAUDE_CODE_SUBAGENT_MODEL=claude-sonnet-4-6
```

---

## Second: CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD

### The problem

Say you maintain a monorepo with this structure:

```
my-company/
├── CLAUDE.md          ← Team conventions (coding style, security requirements, API contracts)
├── packages/
│   ├── frontend/
│   │   └── CLAUDE.md  ← Frontend-specific rules (React component standards, CSS conventions)
│   └── backend/
│       └── CLAUDE.md  ← Backend-specific rules (database conventions, API design)
```

When you launch Claude Code from `packages/frontend`, it only reads `packages/frontend/CLAUDE.md` — it does **not** automatically read the team conventions at the repo root.

To make Claude aware of the root conventions, you'd use `--add-dir ../..`:

```bash
cd packages/frontend
claude --add-dir ../..
```

But here's the catch: **by default, `--add-dir` only grants Claude access to the directory — it does not load that directory's CLAUDE.md**. This is for backward compatibility, to avoid accidentally pulling in unrelated rule files.

### The fix: CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD

With this environment variable set, directories added via `--add-dir` also have their CLAUDE.md family of files loaded:

```bash
export CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1

# 现在启动时，根目录的 CLAUDE.md 也会被加载
cd packages/frontend
claude --add-dir ../..
```

The files loaded from the target directory include:
- `CLAUDE.md`
- `.claude/CLAUDE.md`
- `.claude/rules/*.md`
- `CLAUDE.local.md`

### Real-world use cases

**Use case 1: Multi-package development in a monorepo**

Launch Claude from a sub-package directory while also loading the root-level team conventions:

```json
{
  "env": {
    "CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD": "1"
  },
  "additionalDirectories": ["../.."]
}
```

The root CLAUDE.md (team conventions) and the subdirectory CLAUDE.md (module rules) stack — Claude knows both rule sets at once.

**Use case 2: Cross-repo microservice development**

The frontend needs to understand the backend's API conventions, and the backend CLAUDE.md documents the endpoint formats and error code conventions:

```bash
alias claude-fs="CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1 claude --add-dir ../backend"
```

**Use case 3: Company-wide shared conventions**

Maintain a standalone conventions directory that every project references:

```
~/company-rules/
└── CLAUDE.md   ← Security policies, compliance requirements, tech stack conventions
```

```bash
# ~/.zshrc
export CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1
# 在每个项目的 settings.json 中添加
# "additionalDirectories": ["~/company-rules"]
```

### Fine-grained control with claudeMdExcludes

Sometimes `--add-dir` pulls in rules you don't want (say, another team's conventions that conflict with your project). Filter them out with `claudeMdExcludes`:

```json
{
  "claudeMdExcludes": [
    "**/other-team/.claude/rules/**",
    "**/irrelevant-package/CLAUDE.md"
  ]
}
```

---

## Appendix: Other environment variables worth knowing

While researching these two variables, I came across a few equally useful settings:

```bash
# 关闭 adaptive thinking（中等档位下出现幻觉时的临时修复）
export CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1

# 触发自动压缩的上下文阈值（默认约 83%，只能降低不能升高）
export CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=70

# 子 agent 使用更便宜的模型
export CLAUDE_CODE_SUBAGENT_MODEL=claude-sonnet-4-6

# 日志审计：所有 bash 命令都通过包装脚本执行
export CLAUDE_CODE_SHELL_PREFIX=/path/to/audit.sh

# 多账户场景：指定不同的配置目录
export CLAUDE_CONFIG_DIR=~/.claude-work
```

---

## Wrapping up

These two variables solve different problems, but both are worth configuring based on your situation:

- **`CLAUDE_CODE_EFFORT_LEVEL`**: if Claude Code's quality feels inconsistent, check this first. The default medium level can cause hallucinations in some cases — setting it to `high` is the sensible choice for most developers.
- **`CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD`**: if you work in a monorepo or need to share conventions across projects, this variable eliminates a lot of duplicated configuration.

Drop both into `~/.zshrc` and they take effect permanently, at virtually zero cost.

---
