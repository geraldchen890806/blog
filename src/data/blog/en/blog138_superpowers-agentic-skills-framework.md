---
author: Gerald Chen
pubDatetime: 2026-04-20T11:00:00+08:00
title: "obra/superpowers: A Methodology Framework That Makes AI Coding Agents Think Before They Act"
slug: blog138_superpowers-agentic-skills-framework
featured: true
draft: true
reviewed: false
approved: false
tags:
  - AI Agent
  - 开发效率
  - Claude Code
  - 自动化
description: "A deep dive into obra/superpowers, an open-source framework that forces AI coding agents to follow structured workflows through composable \"skill\" files — covering how it works under the hood, its 14 core skills, and how to use it in Claude Code."
---

The most common failure mode of AI coding agents isn't a lack of capability — it's being too eager to act. You describe a requirement, and the agent immediately starts writing code, skipping design, skipping tests, skipping verification, ultimately delivering a pile of code that runs but is hard to maintain.

[obra/superpowers](https://github.com/obra/superpowers) is a framework built specifically to solve this problem. It doesn't add new capabilities. Instead, through a set of composable Markdown "skill" files, it forces the agent to stop and think at every key decision point before taking action.

As of April 2026, the project has over 160k stars, making it one of the fastest-growing AI tooling methodology projects on GitHub.

## The Core Idea: Workflow Constraints, Not Capability Enhancement

The Superpowers README opens by explaining what it is not:

> "It doesn't just jump into trying to write code. Instead, it steps back and asks you what you're really trying to do."

The framework's premise: the agent's problem isn't that it's not smart enough — it's that it isn't constrained to the right workflow. Like a talented but impatient engineer who needs team processes (design reviews, code review, TDD) to ensure quality, not just stronger individual skills.

### Under the Hood: Zero-Dependency Context Injection

The implementation of Superpowers is remarkably simple:

- **Built entirely from Markdown files + shell scripts**
- **No runtime dependencies, no external services, no build step**
- Uses a hook mechanism to inject core skills into the agent's context at session start

```
superpowers/
├── skills/
│   ├── using-superpowers/
│   │   └── SKILL.md              ← Meta skill, the gateway
│   ├── brainstorming/
│   │   └── SKILL.md
│   ├── writing-plans/
│   │   └── SKILL.md
│   ├── test-driven-development/
│   │   └── SKILL.md
│   ├── subagent-driven-development/
│   │   └── SKILL.md
│   └── ...(14 skill directories in total)
├── hooks/
│   ├── session-start             ← Injection script
│   ├── hooks.json                ← Claude Code hook config
│   └── hooks-cursor.json         ← Cursor hook config
├── CLAUDE.md                     ← Claude Code integration entry point
├── GEMINI.md                     ← Gemini CLI integration entry point
├── AGENTS.md                     ← Generic agent integration entry point
└── docs/
    ├── superpowers/specs/         ← Design spec storage
    └── superpowers/plans/         ← Execution plan storage
```

At session start, `session-start.sh` injects `using-superpowers.md` into the agent's context. The format varies by platform:

- **Claude Code**: `hookSpecificOutput.additionalContext`
- **Cursor**: `additional_context`
- **Gemini CLI**: native format

`using-superpowers.md` acts as the gateway. It tells the agent: when you receive any task, first check whether an applicable skill exists, and if it does, **you must use it**. Skill files wrap critical constraints in `<EXTREMELY_IMPORTANT>` tags, formatted as JSON and embedded into the context.

## The 14 Core Skills

### 1. brainstorming

Refine requirements through Socratic questioning before any code gets written:

- Ask 3-5 clarifying questions, not all at once
- Offer 2-3 implementation options with their trade-offs spelled out
- Present the design in sections, only proceeding after approval

This skill exists specifically to counter the agent's "I know what you want" assumption — even a clearly worded task description can diverge from your actual intent.

### 2. writing-plans

Break work down into a concrete, executable task list:

- Each task estimated at 2-5 minutes
- Full file paths required (vague descriptions like "and other files" are not allowed)
- Every task comes with a verification step (how to confirm it's actually done)
- Plans are saved to `docs/superpowers/plans/` for traceability

### 3. test-driven-development (TDD)

Enforces the RED-GREEN-REFACTOR loop:

```
RED:     Write a failing test first; confirm the test can detect the problem
GREEN:   Write the minimal implementation to make the test pass
REFACTOR: Refactor the code while keeping the tests green
```

The skill file lists the agent's common evasion tactics ("The tests pass!" — without running the full test suite) and provides counters for each.

### 4. subagent-driven-development

Dispatch an independent subagent for each plan task, with a two-stage review:

1. **Spec compliance review**: does the implementation match the plan and design spec?
2. **Code quality review**: test coverage, edge cases, maintainability

Subagents only receive the context necessary for their current task, preventing context window pollution. On completion they return a status: `DONE`, `DONE_WITH_CONCERNS`, `BLOCKED`, or `NEEDS_CONTEXT`.

### 5. using-git-worktrees

Create an isolated Git worktree for each feature:

```bash
# 创建隔离工作区
git worktree add ../feature-auth feature/auth

# 在隔离环境开发
cd ../feature-auth
# 做所有改动...

# 完成后清理
git worktree remove ../feature-auth
```

This lets multiple tasks run in parallel without interfering with each other, and makes diffs easier to compare during code review.

### 6. systematic-debugging

Four-phase root cause analysis:

1. **Reproduce**: confirm the problem reproduces reliably
2. **Isolate**: narrow down the scope of the problem
3. **Hypothesize**: list possible causes, ranked by probability
4. **Verify**: validate each one, no skipping steps

This counters the agent's "tried a few things, nothing worked, giving up" pattern.

### Other Skills

| Skill | Purpose |
|------|------|
| `requesting-code-review` | Kick off peer review and prepare review materials |
| `receiving-code-review` | Process review feedback, responding point by point |
| `dispatching-parallel-agents` | Coordinate multiple agents executing independent tasks in parallel |
| `executing-plans` | Implement according to plan, tracking progress step by step |
| `verification-before-completion` | Quality checklist before declaring done |
| `finishing-a-development-branch` | Branch merge decisions and workspace cleanup |
| `writing-skills` | Write custom skill docs to extend the framework |
| `using-superpowers` | Meta skill that acts as the gateway for detecting applicable skills |

## The Full Development Workflow

These 15 skills chain together into a complete development pipeline:

```
Requirement input
  └─> brainstorming              Refine requirements, confirm direction
      └─> writing-plans          Break down tasks, draw up a plan
          └─> using-git-worktrees    Create an isolated workspace
              └─> subagent-driven-development  Dispatch a subagent per task
                  └─> test-driven-development  Implement via TDD
                      └─> requesting-code-review   Submit for code review
                          └─> receiving-code-review    Process review feedback
                              └─> verification-before-completion  Pre-completion checks
                                  └─> finishing-a-development-branch  Merge and wrap up
```

Whenever a problem comes up, `systematic-debugging` steps in.

## Using It in Claude Code

### Installation

Superpowers is available in the official Claude Code plugin marketplace — one command installs it:

```bash
/plugin install superpowers@claude-plugins-official
```

Or install via the Superpowers self-hosted marketplace:

```bash
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

Once installed, the plugin automatically registers a SessionStart hook — no manual `settings.json` configuration needed.

**Installing on other platforms**:

```bash
# Cursor：在 Agent Chat 中执行
/add-plugin superpowers

# OpenCode：在 opencode.json 中添加
{
  "plugin": ["superpowers@git+https://github.com/obra/superpowers.git"]
}
```

GitHub Copilot CLI and OpenAI Codex CLI are also supported — see the corresponding sections in the repo's README.

### Verifying the Installation

Start a new session and describe a feature request (e.g. "add a user login feature for me"). If everything is working, the agent should trigger the `brainstorming` skill first and start asking clarifying questions, rather than jumping straight into code.

### Triggering Skills on Demand

You can also invoke a specific skill manually:

```
# Trigger brainstorming
Start brainstorming: I want to add rate limiting to the API

# Trigger plan writing
Write an implementation plan for the following requirement: [requirement description]

# Trigger TDD
Implement with TDD: [feature description]
```

## Why It Works: The Principles Behind Behavioral Constraints

The design of Superpowers' skill files borrows from behavioral science:

**Anticipated evasion tables**: each skill doc pre-lists the excuses the agent might reach for, along with how to respond:

| What the agent might think | The skill's response |
|---------|---------|
| "This is too simple to need a design" | Simple things don't need lengthy design, but skipping design accumulates technical debt |
| "The tests pass!" | Did you run the full test suite, or only the tests you just wrote? |
| "I just need a quick fix" | Quick fixes can introduce new bugs; the planning step only takes 2 minutes |

**Forced choice rather than defaults**: skill files use explicit directives like "YOU DO NOT HAVE A CHOICE. YOU MUST USE IT." to prevent the agent from deciding on its own that "this time it's fine to skip."

This design makes the workflow constraints hold at a psychological level, not just as a formal process.

## Where It Fits — and Where It Doesn't

**Good fit**:
- Complex feature development where requirements may shift as work progresses
- Team collaboration scenarios that need traceable plans and review records
- Projects with high code quality bars (test coverage, maintainability)
- Developers already accustomed to TDD

**Poor fit**:
- Quick prototype validation where production quality isn't needed
- Simple one-off scripts
- Conversational exploration ("explain this code to me")

**Limitations**:
- Adds upfront overhead to every task (brainstorming and plan writing require extra interaction rounds)
- Relies on the hook mechanism, so integration quality varies across platforms
- Skill files consume context tokens, which matters for models with short context windows

---

The value of obra/superpowers isn't in adding new features to the agent — it's in encoding workflows engineers already know (design review, TDD, code review) as constraints the agent can follow. A methodology project with 160k stars whose core is Markdown files says something: the problem it solves — making agent behavior predictable and auditable — genuinely troubles a lot of developers.

Project repository: [https://github.com/obra/superpowers](https://github.com/obra/superpowers)
