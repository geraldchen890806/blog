---
author: Gerald Chen
pubDatetime: 2026-03-26T10:00:00+08:00
title: "GitHub Squad: Drop an AI Dev Team Straight into Your Repo"
slug: blog101_github-squad-multi-agent
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI
  - AI Agent
  - 开发效率
description: "Squad, an open-source project, lets you spin up an AI dev team inside your repo with two commands—an architect, frontend dev, backend dev, and tester, each with their own job, collaborating on top of Copilot. A look at its architecture, what it's like to use, and the multi-agent collaboration patterns behind it."
---

For most people, coding with AI looks like this: open Copilot or Cursor, type a prompt, the model gets it wrong, tweak the prompt, try again. That works fine on small projects. On larger ones, the cracks show—in a single conversation window, you ask it to write a backend API, then a frontend component, and the context starts bleeding together. Decisions made for the backend get "forgotten" mid-frontend discussion.

Squad is built to fix exactly that. It's an open-source project featured on the official GitHub blog (by Brady Gaster of Microsoft's CoreAI team), and the core idea is simple: **don't make one AI play every role—give yourself an AI team instead**.

Two commands and you're running:

```bash
npm install -g @bradygaster/squad-cli
squad init
```

After that, your repo gains a `.squad/` directory housing a pre-configured AI team: Lead (architect), Frontend, Backend, Tester, and Scribe (a silent memory manager responsible for knowledge persistence). Each agent has its own identity definition, project memory, and an independent context window.

## How It Differs from Single-Agent Coding

Traditional AI-assisted coding is "one person does everything." You tell Copilot Chat "add JWT auth for me," and the model juggles route design, database schema, middleware implementation, the frontend login page, and test cases all in one context. The context keeps growing, and earlier decisions get overwritten or forgotten later on.

Squad's approach is to dispatch work to different agents. You say "Team, I need JWT auth—refresh tokens, bcrypt, the works," and then:

1. The coordinator parses your request and decides who to assign
2. The Backend agent writes the auth logic and APIs
3. The Frontend agent builds the login page
4. The Tester starts writing test cases
5. These agents run **in parallel**, each working in its own context window

The key difference: every agent gets its own independent context window (up to 200K tokens on supported models). You're not splitting one window's space four ways—everyone gets the full space. That means the backend agent can focus on loading and understanding backend code without frontend CSS cluttering its head.

Even more interesting is the review mechanism: Squad's reviewer protocol can **block the original author from modifying their own rejected code**. If the Backend agent's code fails the tests, the Tester rejects it, and the fix gets handed off to a different agent. This enforces genuinely independent review—different context windows, different "perspectives."

## Three Core Architecture Patterns

There are three patterns in Squad's design worth digging into. Whether or not you ever use Squad, they're valuable for understanding multi-agent systems in general.

### 1. The Drop-box Pattern: Files as Shared Memory

Most multi-agent frameworks use real-time message passing or vector databases to synchronize state. Squad doesn't. It uses a `decisions.md` file.

Every time the team makes an architectural decision—say, choosing PostgreSQL over MongoDB, or camelCase over snake_case—the decision is appended to `decisions.md`. All agents read this file on their next startup.

```text
.squad/                        # Core files (the full structure includes more directories)
├── agents/
│   ├── lead/
│   │   ├── charter.md         # Role definition
│   │   └── history.md         # Project experience
│   ├── backend/
│   │   ├── charter.md
│   │   └── history.md
│   └── ...
├── casting/                   # Agent naming theme config
├── decisions.md               # Shared team decisions
└── team.md                    # Team configuration
```

This design has several upsides:

- **Auditable**: every decision is on record—you can `git blame` to see who decided what, and when
- **Recoverable**: after a disconnect, an agent restores context just by reading the files, with no dependency on a live session
- **Versionable**: the `.squad/` directory is committed alongside your code, so cloning the repo gets you an AI team that's already "onboarded"

It's cruder than real-time sync, but also more reliable. Asynchronous file writes don't lose data to network hiccups.

### 2. Context Replication, Not Context Splitting

A common misconception: multi-agent systems take one big context and slice it up across agents. Squad doesn't work that way. Each agent has its own full context window (up to 200K tokens on supported models), and each loads the parts of the repo relevant to its own responsibilities.

That means the same code may be read by multiple agents simultaneously. It looks wasteful in tokens, but it works far better than splitting—every agent has complete "working memory" and never has its reasoning polluted by another agent's information.

### 3. Explicit Memory: Everything Lives in Files

Squad's agents don't rely on "implicit memory" baked into model weights. Their identity comes from `charter.md` (role definition), their experience from `history.md` (project history), and team knowledge from `decisions.md` (shared decisions). All plain text files.

You can open these files and see exactly what an agent "knows." No guessing, no probing questions. Want to change an agent's behavior? Edit `charter.md`. Want an agent to forget an outdated decision? Delete that line from `decisions.md`.

This matches exactly how we manage agent identity and memory in OpenClaw with `SOUL.md` and `MEMORY.md`—an agent's state should be readable, editable, versionable files, not a black box.

## What It's Actually Like to Use

A few notes from hands-on experience:

**The onboarding is good.** `squad init` doesn't just dump a pile of agent files. It starts a conversation, learns what your project does, and then proposes a team composition based on it. If your project has no frontend, it won't force a Frontend agent on you.

**Agents get themed names.** Squad skips boring names like "backend-agent" in favor of themed ones (movie characters, mythological figures, that sort of thing). You can say "have Ripley review the test coverage." It's a small detail, but it genuinely makes the interaction feel more natural.

**It's not autopilot.** Agents will ask you questions and will make reasonable-but-wrong assumptions. You still review and merge every PR. Squad positions itself as "collaborative orchestration," not "autonomous execution."

**As of March 2026 it's at v0.8.25, explicitly labeled alpha.** The API, command format, and file structure can all change. It's not something to lean on heavily in production today, but as a tool for experimenting with and learning multi-agent patterns, it's well worth your time.

## Squad vs. Other Multi-Agent Approaches

Here's how it stacks up against the mainstream multi-agent frameworks:

| Dimension | Squad | CrewAI | LangGraph | AutoGen |
|:-----|:------|:-------|:----------|:--------|
| Positioning | AI team inside a code repo | General multi-agent framework | Agent workflow engine | Multi-agent conversation framework |
| Setup cost | Two commands | Write Python orchestration code | Define a state graph | Configure Agents and GroupChat |
| State management | Files (Markdown) | In-memory + optional persistence | State graph | Conversation history |
| Auditability | Auditable by default (Git-versioned) | Requires extra logging | Requires extra logging | Requires extra logging |
| Codebase integration | Native (lives in the repo) | External orchestration | External orchestration | External orchestration |
| Best fit | Software development | General tasks | Complex workflows | Conversational collaboration |

Squad's biggest differentiator is being **repository-native**. The other frameworks orchestrate agents from "outside" the codebase; Squad's agents live right inside it. That means agent identity, memory, and decisions get versioned, migrated, and shared together with the code.

The limitations are equally clear: it only supports GitHub Copilot as the backend, so you can't choose your own model; it only fits software development scenarios; and as an alpha, it's still unstable.

## What This Means for AI-Assisted Development

Whether or not Squad ends up a mainstream tool, it validates a few important design directions:

**1. Multi-agent > single agent (for complex tasks)**

A single AI performs well on small tasks, but when work spans multiple domains (frontend + backend + tests + docs), multi-agent collaboration with independent contexts is more reliable than one bloated, endless conversation.

**2. Files are the best medium for agent memory**

Not Redis, not a vector database—plain text files. Readable, editable, Git-able, diff-able. Squad's decisions.md and OpenClaw's MEMORY.md arrive at the same place by different roads.

**3. Low ceremony matters**

Two commands to launch an AI team. No framework to learn, no orchestration code to write, no vector database to configure. Lowering the barrier is what gets multi-agent setups into actual use.

Squad is open source on GitHub: [github.com/bradygaster/squad](https://github.com/bradygaster/squad), v0.8.25 alpha. Worth trying on an experimental project to get a feel for what "collaborating with an AI team" is actually like.

---
