---
author: Gerald Chen
pubDatetime: 2026-05-11T11:00:00+08:00
title: "Claude Code Workflow Plugins Compared (2026): Superpowers, Shipyard, Ralph Loop, Maestro, or Karpathy CLAUDE.md?"
slug: claude-code-workflow-plugins-comparison
featured: true
draft: false
reviewed: true
approved: true
tags:
  - Claude Code
  - AI Agent
  - 开发效率
  - 自动化
description: "The Claude Code ecosystem has splintered into 100+ plugins as of May. This post zooms in on the \"workflow methodology\" category—Superpowers, Shipyard, Ralph Loop, Maestro, and Karpathy CLAUDE.md. Design philosophy, context overhead, fit, and combination strategies, plus a decision tree for indie developers."
---

After writing [Claude Code's five-layer architecture](/en/posts/claude-code-five-layer-architecture/), one thing became clear to me: the architectural capabilities (Skills, Sub Agents, MCP) are just the foundation. **What actually shapes your day-to-day experience is the "methodology framework" layer on top**—plugins that compose Anthropic's raw primitives into an executable process.

By May 2026, the Claude Code ecosystem has settled into three clear tiers:

1. **Anthropic's official marketplace** (101+ plugins, installed by default)
2. **obra-style engineering methodologies** (Superpowers, Shipyard—the "think before you code" camp)
3. **Multi-agent orchestration** (Maestro and friends—the "let N specialists collaborate automatically" camp)

Plus standalone projects (Karpathy CLAUDE.md, Ralph Loop, etc.).

This post covers **workflow methodology plugins only**—they don't change what the tools can do, they change *the rhythm at which AI writes code*. I installed the 5 most-discussed ones into two real projects (this blog and anyfreetools.com) and used them for a week or two each, comparing design philosophy, token overhead, and where each one fits.

## One-line positioning

| Plugin | One-line positioning | Philosophy | Weight |
|---|---|---|---|
| **Superpowers** (obra) | Enforces the full SDLC: brainstorm → plan → TDD → implement → review | "AI loves to skip steps" | Medium (chained Skills) |
| **Shipyard** | Superpowers + IaC validation + security audits | "AI belongs in production" | Medium-heavy |
| **Ralph Loop** | Autonomous while-true loop mode | "Repetitive work should be fully automated" | Light |
| **Maestro** | 39 specialists + four-phase workflow orchestration | "AI needs division of labor" | Heavy |
| **Karpathy CLAUDE.md** | A single always-on rules file | "Block the known LLM pitfalls up front" | Featherweight |

## 1. Superpowers: the obra-school engineering methodology

[Superpowers](https://github.com/obra/superpowers) is a multi-Skill framework released earlier this year by obra (David Obrador), positioned as "a complete software development lifecycle for Claude Code."

### Core mechanism

Superpowers is a set of **Skills that chain into each other**, one per SDLC phase:

```text
/brainstorm    Brainstorm + validate assumptions
   ↓
/plan-feature  Implementation plan + task breakdown
   ↓
/git-worktree  Spin up a new worktree to isolate the dev environment
   ↓
/implement     Execute against the plan
   ↓ (every step is TDD: tests first, then implementation)
/code-review   Multi-angle code review
   ↓
Merge back to main
```

Every Skill has explicit inputs/outputs and "done criteria." You can't move to the next step until the current one passes—this is what fundamentally separates Superpowers from "just dump a pile of .claude/commands into a repo."

### Field notes

I ran Superpowers on this blog through 3 complete features (including the RelatedPosts component mentioned earlier):

- **Slower but steadier**: small changes that used to take 5 minutes now take 15, but **rework dropped to zero**
- **TDD is mandatory**: the Skill won't let you skip tests. Uncomfortable at first, but the code is far more trustworthy
- **Token cost**: a full SDLC run is roughly 50-80k tokens, 2-3x more than writing the code directly

### When to use it

- ✅ Team projects, production code, new feature work
- ✅ Languages/frameworks you don't know well (Superpowers forces you to understand before you touch anything)
- ❌ Running the full SDLC to fix a typo is a waste
- ❌ Throwaway experiment scripts, debugging code

## 2. Shipyard: Superpowers, hardened for production

[Shipyard](https://shipyard.build/blog/claude-code-multi-agent/) has a blunt pitch: **Superpowers is great for application code; Shipyard adds everything you need to do before shipping to production.**

### What it adds on top of Superpowers

- **IaC (Infrastructure as Code) validation**: scans Terraform / Pulumi / CloudFormation configs for permissions, network isolation, and encryption
- **Security audits**: dependency vulnerability scanning, secret leak detection, IAM permission review
- **Deployment rehearsals**: validates the full migration in a staging environment before production

### Field notes

I don't have a large IaC setup to test against, so I only used Shipyard to audit this blog's nginx configs (410-gone.conf, 301-redirects.conf, and friends):

- **The security audit works**: it caught the `X-XSS-Protection` header I'd forgotten to configure
- **The IaC checks did little for me**: the blog has no Terraform
- **~30% heavier than Superpowers**: noticeably slower load times and first execution

### When to use it

- ✅ Anything touching production deploys, IaC, or security-sensitive operations
- ✅ Teams with compliance requirements
- ❌ Small personal projects—Superpowers is already enough

## 3. Ralph Loop: autonomous looping

[Ralph Loop](https://claude.com/plugins/ralph-loop) is a counterintuitive design—it **gives Claude no instructions at all about what to do**. Instead, it drops Claude into a `while true` loop, re-running the same prompt until the task is done.

### How it works

```text
User: Use Ralph Loop to migrate every React component in src/components to TypeScript
  ↓
Ralph starts the loop:
  for each iteration:
    1. Find an unfinished component
    2. Migrate it
    3. Run tests
    4. Commit
    5. Check whether anything is left
    6. Nothing left → exit; otherwise → back to 1
```

Every iteration auto-commits, so even a mid-run crash is recoverable.

### Field notes

I gave Ralph Loop a real job—adding OG image alt text to 50 blog posts in batch (an item flagged by an earlier SEO audit):

- **1 hour 8 minutes, 47 iterations**, 47 commits, all successful
- **Token cost is brutal**: that single task cost ~$8 in API fees (a normal Claude Code session is about $1)
- **Zero mental load**: I didn't intervene once—went for a coffee, came back, it was done

### When to use it

- ✅ Bulk CRUD-style changes (migrations, backfilling tests, adding comments, reformatting)
- ✅ Tasks with a clear spec, enumerable units, and an objective completion criterion
- ❌ Work requiring judgment and tradeoffs (product decisions, architecture choices)
- ⚠️ **Token cost is 5-10x normal usage**—be careful if you're budget-sensitive

## 4. Maestro: 39-specialist orchestration

[Maestro](https://github.com/josstei/maestro-orchestrate) (maintained by josstei, works across Gemini CLI / Claude Code / Codex / Qwen Code) is a **multi-agent orchestration platform** that ships with 39 dedicated specialists (early versions had 22; it grew to 39 in May).

### Design

Each specialist owns a narrow domain:

```text
Partial list of Maestro's specialists (39 total):
├── code-architect       Architecture design
├── code-reviewer        Code review
├── security-auditor     Security audits
├── seo-specialist       SEO optimization
├── accessibility-checker  Accessibility
├── compliance-officer   Compliance checks
├── debug-specialist     Debugging expert
├── performance-tuner    Performance tuning
└── ...(39 total)
```

The workflow runs in four phases:

```text
Phase 1: Design       — break down the task, decide which specialists to call
Phase 2: Plan         — produce a concrete execution plan
Phase 3: Execute      — call the relevant specialists in parallel
Phase 4: Complete     — review + summary, approval gates enforce quality
```

There's also an "Express path"—simple tasks skip Phase 1 and call a single specialist directly.

### Field notes

I used Maestro to build a new tool page for anyfreetools.com:

- **Phase 1 alone had 5 specialists deliberating** for about 15 minutes—not cheap in tokens
- **Parallel execution is genuinely fast**—SEO / a11y / security checks all run at once
- **Over-engineered for the job**: calling 6 specialists for a small standalone tool page is a sledgehammer for a nut

### When to use it

- ✅ Medium-to-large projects, team settings
- ✅ When you need multi-dimensional review (security + SEO + a11y + performance all at once)
- ❌ An indie developer's small project (cost far outweighs benefit)
- ⚠️ Steepest learning curve of the five—until you know the 39 specialists, your productivity actually drops

## 5. Karpathy CLAUDE.md: one file, zero dependencies

The most counterintuitive option: [Karpathy CLAUDE.md](/en/posts/blog139_karpathy-skills-claude-md-guide/)—it's **not a plugin**. It's a single CLAUDE.md file.

### What it does

It systematizes Karpathy's "mistakes AI keeps making when writing code" list from X into one CLAUDE.md:

```markdown
## 写代码原则（基于 Karpathy 总结）

1. 不要发明 API。先 grep / 读源码确认存在
2. 不要 try/catch 后 return null。让错误冒到顶层
3. 不要为了"完整性"加从未被用到的辅助函数
4. 不要写注释解释代码做了什么——代码本身应该自明
5. 不要在没看过最简版本能跑前就开始优化
...
```

Drop it into the project root as CLAUDE.md and Claude Code injects it into every session automatically.

### Field notes

I've been using this one for months ([blog139](/en/posts/blog139_karpathy-skills-claude-md-guide/) covers the full experience):

- **Zero overhead**: write it once, every session uses it automatically, no extra token cost
- **Surprisingly effective**: 80%+ success rate at avoiding pitfalls, especially the classic "AI invents an API" failure
- **Conflicts with nothing**: works alongside Superpowers / Maestro just fine

### When to use it

- ✅ Every project should have it
- ✅ There's no choosing involved—this is infrastructure-grade "free upside"
- ❌ There is no scenario where it doesn't apply

## Decision tree

```text
What kind of project?
│
├── Indie developer's personal project
│     ├── Must-have: Karpathy CLAUDE.md (infrastructure)
│     └── Optional: Superpowers (new features) / Ralph Loop (bulk changes)
│
├── Team collaboration / production code
│     ├── Must-have: Karpathy CLAUDE.md
│     ├── Workhorse: Superpowers (daily development)
│     └── Deploys/security involved: Shipyard
│
├── Medium-to-large project + multiple contributors
│     ├── Must-have: Karpathy CLAUDE.md
│     ├── Workhorse: Maestro (specialists in parallel)
│     └── Alternative: Shipyard (production deployment phase)
│
└── Specific bulk tasks (migrations, backfilling tests, reformatting)
      └── Ralph Loop (the scenario where every other tool is at its worst)
```

## Real-world cost comparison

Measured against "complete one moderately complex feature (~200 lines of code changed)":

| Plugin | Time | Tokens | Onboarding difficulty |
|---|---|---|---|
| No plugin (bare Claude Code) | 5 min | 20k | 0 |
| Karpathy CLAUDE.md | 5 min | 21k (extra 1KB CLAUDE.md) | 0 |
| Superpowers | 15 min | 60k | Medium (1-2 weeks to adjust to the TDD rhythm) |
| Shipyard | 18 min | 75k | Medium |
| Ralph Loop | 25 min (autonomous) | 200k+ | Low (just describe the task clearly) |
| Maestro | 22 min | 120k | High (39 specialists to learn) |

**Bottom line**: **there is no "best" plugin—only the combination that best fits your current situation**.

## My actual setup (indie blog + tools site)

Here's the current configuration for my two projects, for developers at a similar scale:

### chenguangliang.com (Astro blog)

```text
~/.claude/skills/blog-preflight/     ← my own Skill (the one from the blog158 walkthrough)
CLAUDE.md at project root              ← Karpathy principles
Occasional Ralph Loop                  ← bulk jobs like processing 410/301 configs
```

No Superpowers / Shipyard / Maestro—the blog is too small to justify the overhead.

### anyfreetools.com (tools site)

```text
CLAUDE.md at project root              ← Karpathy principles
Superpowers                            ← enforced SDLC for every new tool
Switch to Shipyard when needed         ← nginx changes, production deploys
```

Every new feature on the tools site goes through an audit, and Superpowers' mandatory TDD is genuinely useful for building up test coverage.

### What I don't use

**Maestro is too heavy for me**—an indie developer has no use for 39 specialists. It's built for medium-to-large projects with teams of 5+.

## Common misconceptions

### "More plugins is better"

Wrong. I once had 8 plugins enabled simultaneously and half my context budget got eaten by Skill descriptions—Claude got noticeably sluggish. **3-4 core plugins + Karpathy CLAUDE.md is the sweet spot**.

### "Superpowers vs. Maestro is an either/or"

Not necessarily. They solve different problems:

- Superpowers = a **process** problem (how to follow the SDLC)
- Maestro = a **division-of-labor** problem (who does which part)

For a large team on a complex project, using both works—Superpowers sets the process, Maestro calls in the experts during the implement phase.

### "Ralph Loop automates everything"

⚠️ Ralph Loop's autonomy cuts both ways—it will execute whatever task you describe, including accidentally deleting files. Before every Ralph Loop run you **must** confirm git is in a clean state and you have a recent backup.

### "Karpathy CLAUDE.md is just a checklist, nothing magical"

Quite the opposite—its value is **suppressing AI's tendency to over-deliver**. By default, AI wants to do things "completely and beautifully," but in many situations all you need is "simple, working, and free of the classic mistakes." That's exactly what the Karpathy checklist enforces: it kills the unnecessary "completeness."

## How to get started

If you're just starting to experiment with Claude Code workflow plugins:

1. **Install Karpathy CLAUDE.md first**: zero cost, immediate effect, can never go wrong
2. **Observe for a week**: feel out where bare Claude Code hurts in your project
3. **Pick your second plugin based on the pain**:
   - Constant rework → Superpowers
   - Constantly forgetting tests → Superpowers
   - Constantly bitten by production bugs → Shipyard
   - Large piles of repetitive work → Ralph Loop
   - Complex multi-person project → Maestro
4. **Never install more than 3 at once**: your context budget can't take it

The core value of workflow plugins isn't "making AI smarter"—it's "making AI's output more predictable." And predictability is the single most important capability when moving from a one-person workshop to serious engineering.

---

**Further reading**:
- [Superpowers Marketplace](https://github.com/obra/superpowers-marketplace) - the obra family of workflow plugins
- [Maestro Orchestrate](https://github.com/josstei/maestro-orchestrate) - multi-agent orchestration platform
- [Ralph Loop on Anthropic](https://claude.com/plugins/ralph-loop) - official page for the autonomous loop plugin
- [10 Top Claude Code Plugins 2026 - Composio](https://composio.dev/content/top-claude-code-plugins) - full plugin ecosystem overview
