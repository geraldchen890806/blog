---
author: 陈广亮
pubDatetime: 2026-06-22T09:50:00+08:00
title: "Stop Re-Introducing Your Project to AI Every Session: A Project Passport with AGENTS.md, CLAUDE.md, and memory"
slug: blog194_project-passport-agents-md-claude-md-memory
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI Agent
  - 开发效率
  - Claude Code
  - 自动化
description: AGENTS.md is the de facto standard in 2026, CLAUDE.md is still Claude Code's richer format, and project memory holds a different class of information altogether. Stitch them into a "Project Passport" so every new session begins with the AI clearing customs in seconds instead of asking you to paste context again.
---

Every morning, when you open a fresh Claude Code or Cursor session, there's that familiar choice: either the AI treats your project like a stranger and starts from zero, or you paste the same "this project is about X, the stack is Y, owner of Z is..." spiel for the hundredth time.

That was me last year. This year I run a different setup: **manage AGENTS.md, CLAUDE.md, and project memory as your project's "passport."** Every new session is a flight landing; the AI is the passenger; the passport states identity, rules, and what's off-limits. Customs takes three seconds, then we get to work.

This post walks through the framework, plus dogfooding notes from 7 real repos and 14 memory entries of my own.

## First, disambiguate: this is not "Agent Passport"

In 2026 a few vendors already grabbed the word "Passport" in the AI space:

- **Workday Agent Passport** (2026/6) — compliance testing and continuous monitoring for enterprise AI agents, mapped to OWASP LLM Top 10 and NIST AI RMF
- **Vercel Passport** — OpenID Connect identity in front of your team's apps and agents
- **APort Agent Passport** — issues "credentials" to agents, authorizing tool calls before they run

All three issue an ID to the **agent itself**. What I'm calling a "**Project Passport**" goes the other way around — **issue the passport to the project, and let the agent clear customs against the project's rules**. The two concerns don't conflict, but the scenarios are completely different. This post isn't about enterprise governance; it's about the personal / small-team problem of "stop making the AI relearn the project every session."

## What each of the three files actually does

A common mistake is to treat AGENTS.md, CLAUDE.md, and memory as "different implementations of the same thing," and then either use only one of them or cram the same content into all three. Wrong framing. The information dimensions don't overlap:

| File | Where it lives | Who reads it | What goes in | Lifecycle |
|---|---|---|---|---|
| **AGENTS.md** | Project root + subdirectories | OpenAI Codex / Cursor / Windsurf / Aider / 30+ tools (**Claude Code does NOT read it natively today** — use the symlink or `@import` workaround below) | **Project-wide consensus**: stack, commands, conventions, directory boundaries | Lives with the code, committed to git |
| **CLAUDE.md** | Project root / `~/.claude/` | Claude Code only | **Claude-specific instructions**: triggers, skill invocations, harness hooks | Lives with the code, committed to git |
| **memory (project-level)** | `~/.claude/projects/<slug>/memory/` | The current user's Claude Code instance | **Personal sediment**: user role, feedback, gotchas you've already hit, external resources | Accumulates over time, **not in git** |

The last column is the real differentiator. AGENTS.md and CLAUDE.md are **shared across everyone working on the project**; memory is **a single user's sediment across sessions**. Push personal preferences into AGENTS.md and you poison your teammates' context. Push project commands into memory and they disappear the moment anyone else clones the repo.

## Why you actually need all three

Reasonable objection: can't we just merge them? AGENTS.md is the de facto standard now — why keep CLAUDE.md and memory around?

Here's the counterintuitive reality first — **as of June 2026, Claude Code still does not natively read AGENTS.md** ([anthropics/claude-code#6235](https://github.com/anthropics/claude-code/issues/6235) has accumulated thousands of upvotes; Anthropic has not committed to a timeline). That alone is one practical reason CLAUDE.md needs to exist independently — either you bridge to AGENTS.md via the symlink / `@import` trick I'll cover below, or you keep CLAUDE.md as its own file.

But even if you set that inconvenience aside, the answer is still the same phrase — **information layering**. These three files aren't redundant; they hold **three classes of knowledge with different lifecycles**:

1. **Project consensus (AGENTS.md)** — every AI tool, every collaborator reads it; rides along in git with the code
2. **Tool-specific (CLAUDE.md)** — extra instructions only Claude Code sees (e.g., `@import` pulling in other files, triggering a specific skill)
3. **Personal trail (memory)** — sediment for *this* machine, *this* account, *your* working style; nothing to do with the repo

A concrete example:
- "This project uses pnpm + Turborepo 2.x" — project consensus, goes in AGENTS.md
- "On startup, Claude Code auto-loads `@~/.claude/agents/playwright-runner.md`" — Claude-specific, goes in CLAUDE.md
- "The user prefers writing tests before implementation" — personal working habit, goes in memory

Force a merge and you get:
- memory bleeding into AGENTS.md → your teammate is confused
- Claude-specific instructions in AGENTS.md → other tools either error out or behave weirdly
- Project consensus in memory → switch machines or users and it's all gone

## The "Project Passport" metaphor

Picture the project as a country. Each new session is a plane landing. The AI agent is the passenger.

The passport answers **three questions from the customs officer**:

1. **Who are you?** (project identity) — what is this repo, which packages exist, where are the entry points
2. **What are you here for?** (rules of behavior) — which command runs the tests, what must happen before a PR, which files are no-touch
3. **What can't you do?** (red lines) — don't commit to main, don't push to prod, don't delete .env

Mapping back to the three files:

| Customs question | Primary home | Notes |
|---|---|---|
| Who are you | **AGENTS.md** | Project-wide consensus; can be nested across subdirectories |
| What are you here for | **AGENTS.md + CLAUDE.md** | Consensus in AGENTS.md; Claude-specific bits (e.g., skill triggers) in CLAUDE.md |
| What can't you do | **AGENTS.md + memory (feedback class)** | Team-wide red lines in AGENTS.md; personal scars in memory |

A passport is not "the longer the better" — research shows that once AGENTS.md goes past **150 lines**, reasoning cost rises by 20-23%. An overweight passport slows customs down rather than speeding it up.

## In practice: the minimum viable setup for each

### How to write AGENTS.md

By 2026 convention AGENTS.md has no enforced schema, but a working template has settled in. All 7 of my repos use this structure:

```markdown
# Project Name

One-line positioning (under 30 words).

## Tech stack
- Language / runtime (with version)
- Package manager
- Main frameworks
- Test tooling

## Commands
- `pnpm dev` — start dev server
- `pnpm test` — run tests (watch off by default)
- `pnpm build` — production build
- `pnpm lint` — ESLint

## Project layout
- `apps/` — deployables
- `packages/` — shared libraries
- `tools/` — internal scripts

## Conventions
- Commit messages in Chinese, subject < 50 chars
- Any new dependency must be discussed first
- Test coverage must not drop

## Don'ts
- No commits to main, PR only
- Don't touch `legacy/` (scheduled for deletion)
- Don't bump versions outside the lockfile
```

**Key principle**: every section is hard, locatable information. **Do not** write "this project is committed to crafting an excellent user experience" — correct, useless, wastes tokens, and dilutes reasoning quality.

### How to write CLAUDE.md

Given that AGENTS.md already exists, CLAUDE.md should hold **only the Claude-specific bits** and pull the rest in with `@import`:

```markdown
@AGENTS.md

## Claude-specific

Auto-load these skills at startup:
- @~/.claude/skills/playwright-runner.md
- @~/.claude/skills/security-review.md

## Hooks

Must run `bash scripts/claude-precheck.sh` before committing.

## Triggers

When the user says "deploy" — follow `~/.claude/agents/deploy-playbook.md`.
```

If your project is Claude-Code-only, **the symlink approach is cleaner**:

```bash
ln -s CLAUDE.md AGENTS.md
```

Claude Code reads CLAUDE.md, other tools read AGENTS.md, single source of truth, no drift. This is the best practice for multi-tool repos in 2026.

### What memory should and shouldn't hold

Memory is the easiest of the three to abuse. The principle I've earned the hard way: **memory should hold facts that can't be inferred from the current git state of the repo.**

Concretely, four classes (all 14 of my own memory entries fall in here):

1. **user class** — user role, background, preferences. e.g., "User is a backend engineer, weak on frontend; explain frontend by analogy to backend concepts."
2. **feedback class** — ways of working you've been corrected on or praised for. e.g., "On the i18n project, when looking up a Chinese UI string, you must go locals → reverse-lookup key → grep key → trace data source. Do not grep Chinese directly."
3. **project class** — dynamic state, decisions, deadlines. e.g., "After 2026-06-15 the mobile team enters code freeze; defer non-urgent PRs."
4. **reference class** — pointers to external resources. e.g., "Backend routine cron job ID is trig_XXXXXXXX, fires 09:00 Beijing time."

**Things that absolutely do not belong in memory**: code patterns, file paths, architecture, git history, recent bug fixes — grep / git log / Read already covers all of these; writing them into memory is redundant and rots fast.

Current breakdown of my 14 memory entries: 0 user / 8 feedback / 2 project / 4 reference. **A skewed mix is a bad signal** — more than half being feedback means I keep getting corrected on the same class of thing, so the next move is to promote those high-frequency entries into AGENTS.md so the whole team (and every other tool) absorbs the same consensus.

## Dogfooding: how my 7 repos split it up

My `~/ai/agents/` is a mono-style working directory; 7 subprojects each carry their own AGENTS.md:

```
ai/agents/
├── blog/AGENTS.md          # blog publishing flow
├── service-a/AGENTS.md     # internal backend service
├── translation/AGENTS.md
├── tools/AGENTS.md
├── novel/AGENTS.md
├── service-b/AGENTS.md
└── main/AGENTS.md
```

Each AGENTS.md captures local consensus for its own subproject. When I'm working in one of them, AGENTS.md's nested model ("closest file wins") makes sure the AI sees that subproject's rules and won't, say, apply blog publishing commands to the backend service.

Cross-project commonalities (e.g., "always run lint before committing") live in a root `~/ai/agents/AGENTS.md`; subdirectories inherit automatically via nesting.

**The Claude-Code-only configuration** lives under `~/.claude/projects/-Users-<username>-ai-agents/`:

- `memory/` holds my working preferences (e.g., "in the agents context, an unqualified mention of 'the backend service' defaults to service-a" — that kind of personal default)
- `settings.json` configures hooks ("after each blog md is written, auto-run the reviewer agent")

This setup has been running for 4 months. The biggest payoff is that **the "startup cost" for handing the AI a new task has essentially gone to zero** — what used to take 5-10 minutes of context-pasting now skips straight to "ah, this project is X, I should follow flow Y, absolutely don't touch Z."

## Five most common ways to mess it up

Real holes I (and a few friends) have stepped into in practice. **Writing them down beats reading 10 official docs**:

**Pitfall 1: putting memory in AGENTS.md and poisoning teammates' AI context**
One time I wrote "user prefers to be asked first rather than defaulted-into-a-decision" into AGENTS.md. After my teammate pulled the code, his Cursor started asking him questions constantly too. He complained. Personal preferences belong in memory; they shouldn't cross users.

**Pitfall 2: 300-line AGENTS.md and the AI performs worse, not better**
A 2026 ETH Zurich study ([arXiv 2601.20404](https://arxiv.org/abs/2601.20404)) covering 2,500+ real repos shows reasoning cost climbs 20-23% once AGENTS.md crosses roughly 150 lines, and the AI loses the thread. I trimmed one of my own AGENTS.md from 280 lines down to 120 lines and Claude Code's accuracy on the same task actually went up. **A passport is not a résumé. Keep it tight.**

**Pitfall 3: CLAUDE.md and AGENTS.md duplicate, then drift**
Early on I maintained a command list in both. Three months later they had drifted — `pnpm test` had been renamed in one file but not the other. **Single source of truth** — CLAUDE.md either imports `@AGENTS.md` or symlinks to it.

**Pitfall 4: Cursor still on the single-file `.cursorrules`**
Cursor has marked `.cursorrules` deprecated and moved to `.cursor/rules/*.mdc` directory format (with frontmatter, glob-based auto-activation). New projects: dual-track with the new format + AGENTS.md — AGENTS.md for every tool, `.cursor/rules/` for Cursor-specific IDE-only rules (e.g., "auto-apply React rules when editing .tsx files").

**Pitfall 5: memory only ever grows, never gets pruned**
Memory rots like code does. I run a monthly sweep — feedback entries already promoted into AGENTS.md get deleted; project entries whose deadline has passed (e.g., the "freeze until 6/15" memo) get cleared out. **Memory is not a diary, it's working context — it has to track current reality.**

## Going further: making the passport "self-update"

The ideal state is a passport that evolves alongside the work. What I do today:

1. **Hook-driven prompts** — Claude Code's settings.json has a PostToolUse hook that pops "want to update AGENTS.md?" after large changes
2. **Front-load the memory-write policy** — my system prompt carries an "auto memory" instruction telling the AI when to save without asking and when not to
3. **Bi-weekly review** — every two weeks I let Claude itself read AGENTS.md + memory end-to-end and surface "stale / contradictory / mergeable" entries for me to decide on

Item 3 is the interesting one — the AI is better than I am at noticing inconsistencies in its own context. Once you let it periodically audit its own passport, the whole system becomes alive.

## Closing

Back to the opening picture: every morning, a fresh session, and either the AI treats the project as a stranger or you paste context again.

The "Project Passport" framework isn't an invention — AGENTS.md, CLAUDE.md, and memory already exist. The value is in **stitching three previously scattered mechanisms into one coherent whole**: project consensus, tool-specific config, and personal sediment each in their proper place, so the AI knows from the first line of every session "what this project is, what I'm allowed to do, and what I must not do."

If your AI-coding workflow today still boils down to "paste context, repeat," start with the simplest step: drop a 100-line AGENTS.md in your project root with the stack, commands, and 3 Don'ts. Tomorrow's AI will already feel different.

---

**Further reading**:
- [AGENTS.md spec](https://agents.md/) — vendor-neutral standard proposed by OpenAI, stewarded by the Linux Foundation
- [Claude Code Memory Best Practices](https://docs.claude.com/en/docs/claude-code/memory) — CLAUDE.md and the import syntax
- [Cursor Rules Migration](https://docs.cursor.com/context/rules) — from `.cursorrules` to `.cursor/rules/*.mdc`
- [Earlier post: blog186 — The three-layer prompt context harness](https://chenguangliang.com/en/posts/blog186_prompt-context-harness-agentic-layers/) — a lower-level take on context engineering
