---
author: Gerald Chen
pubDatetime: 2026-05-15T15:00:00+08:00
title: "AI Model Comparison, Mid-2026 Edition: Two Months After blog080, the Model Layer Has Turned Over"
slug: blog166_ai-models-mid-2026-update
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI
  - LLM
  - 开发效率
  - 开源
description: "blog080 was written in early March 2026. Two-plus months later, GPT-5.5, Claude Opus 4.7, and Gemini 3.1 Pro have all shipped, and open-source flagships GLM-5.1/Qwen 3 Coder have closed the gap to within 5-15 points of closed models. This is the May update: what changed, and how to adjust your March picks."
---

In early March I published a [full 2026 AI model comparison](/en/posts/blog080_ai-models-comparison-2026/), covering 12 models at the time: GPT-4 Turbo / GPT-4o / Claude 3 Opus / Claude 3.5 / Gemini 2.0 Pro / Qwen 2.5 Max / Kimi, and others. It became the highest-traffic post on my blog — but two-plus months later, **I've changed my own model lineup twice**, and almost every conclusion in that post is now stale.

This is my second-pass retrospective, written after actually running the migration myself.

## My real-world testing context

To keep this from becoming yet another "benchmark dump" post, here's how I actually used these models over the past two-plus months:

- **March**: Daily driver was ChatGPT Plus (GPT-4o) + Claude Pro (3.5 Sonnet) dual subscription, $40/month
- **April**: Switched my primary to Claude Opus 4.6 the week it launched, added a Cursor subscription, monthly cost jumped to $80
- **May (now)**: Claude Code (Opus 4.7 + Sonnet 4.6) + self-hosted Qwen 3 Coder for batch work, monthly cost back down to $35

Projects I ran them on: this blog itself (Astro 5→6 migration, URL restructuring, JSON-LD fixes), a separate tools site (50+ frontend tools under continuous iteration), and an internal blog-preflight subagent ([covered in detail in blog158](/en/posts/blog158_claude-code-skills-practical-guide/)). **Total token consumption over the two-plus months was roughly 8M+** — enough to form a real feel for each model, not a paper analysis built on benchmark scores alone.

This post answers one question based on those projects and the bumps along the way: **if you made model choices in March based on blog080, how should you adjust now?** I won't rehash the basics (what GPT/Claude/Gemini are) — just what changed, why, and whether you should follow.

## Overview of the key changes

| Dimension | March (blog080) | May (now) | Magnitude |
|---|---|---|---|
| OpenAI flagship | GPT-4 Turbo / GPT-4o | **GPT-5.5** (released in April) | Generational leap, step change for coding |
| Anthropic flagship | Claude 3 Opus / Claude 3.5 Sonnet | **Claude Opus 4.7** (fully replaces 4.6 on 6/15) | Big jump on SWE-bench Pro |
| Google flagship | Gemini 2.0 Pro / Flash | **Gemini 3.1 Pro** | New king of scientific reasoning |
| xAI flagship | Not covered | **Grok 4 / 4.3** | New entrant in the top tier |
| Alibaba Qwen | Qwen 2.5 Max | **Qwen 3 Coder 32B** (open source, self-hostable) | Major catch-up on coding |
| New Chinese open-source players | Not covered | **GLM-5.1 / DeepSeek V4** | Within 5-15 points of closed models |
| Moonshot Kimi | Kimi (no clear version number) | **K2.6** | Long context + value pick |
| Overall pricing | — | **OpenAI / DeepSeek cut in half; Anthropic flat; Google up ~10%** | Frontier API costs dropped a tier |

## Change 1: A new landscape for coding ability

When blog080 was written, "which model is best at coding" was a two-way Claude vs GPT choice. The actual landscape now:

| Task type | Current leader | Score |
|---|---|---|
| SWE-bench Pro (real GitHub issues) | **Claude Opus 4.7** | 64.3% |
| Terminal-Bench 2.0 (agentic terminal tasks) | **GPT-5.5** | 82.7% |
| GPQA Diamond (scientific reasoning) | **Gemini 3.1 Pro** | 94.3% |
| Open-source SWE-bench Pro | **GLM-5.1** | 58.4% (near the closed-source frontier) |

**Before April**: default to Claude or GPT, pick one.
**After May**: choose by **task type** — a level of specialization that simply didn't exist in the blog080 era.

**My hands-on take**: I ran multi-file refactors on the blog project (Opus 4.7) and one-off scripts for the tools site (GPT-5.5) side by side. Opus 4.7 is clearly better at cross-file understanding — it remembers what I did five files ago, while GPT-5.5 starts getting "forgetful" after file 3. But GPT-5.5 is smoother on the agentic workflow of "open a terminal, run a chain of commands, read the output, decide the next step" — which matches its 82.7% on Terminal-Bench 2.0. For SWE-bench Pro-style work — "read the whole repo and fix one issue" — Opus 4.7 is still the best, consistent with its 64.3% lead.

My personal conclusion: **staring at a single benchmark number is useless**. You have to map "what you actually run day to day" onto "what each benchmark actually measures."

In [blog156](/en/posts/blog156_gpt5-claude-gemini-coding-comparison-2026/) I compared GPT-5.5 vs Claude Opus 4.6 vs Gemini 2.5 Pro for coding — that was April data, and the Claude 4.6 / Gemini 2.5 numbers are already outdated. **For the May comparison, use the tables in this post.**

## Change 2: Price divergence — frontier prices halved, Anthropic flat, Google up

This is one of the most important shifts of the past two-plus months. But it's **not an industry-wide price cut** — it's divergence: OpenAI and DeepSeek cut prices sharply, Anthropic held its prices (which makes it relatively more expensive while everyone else cuts), and Google actually raised prices.

| Model family | March (flagship pricing when blog080 was tested) | May (latest version pricing) | Change |
|---|---|---|---|
| OpenAI (flagship) | GPT-4 Turbo $10 / $30 | **GPT-5.5 $1.75 / $14** | Generational leap + real cost halved |
| Anthropic (flagship) | Claude 3 Opus $15 / $75 | **Opus 4.7 $5 / $25** | Generational leap + cost down 2/3 |
| Google (flagship) | Gemini 2.0 Pro paid $1.25 / $5 | **Gemini 3.1 Pro $1.50 / $12** | input +20% / output +140% — big capability gain, but clearly more expensive |
| DeepSeek | V3 / V3-Flash | **V4-Flash $0.14 / $0.56** | Price halved + step change in reasoning |
| Kimi | Domestic subscription only | **K2.6 $0.95 / M (blended)** | New international API |
| Qwen 3 Coder | Qwen 2.5 Max (cloud API) | **$0.30 / $1.50 (self-hostable)** | Open source + self-hosting cuts cost |

The overall trend: **OpenAI cut prices dramatically** (GPT-4 Turbo → GPT-5.5: input -82.5% / output -53%), **DeepSeek halved its prices**, **Anthropic held flat** (Opus 4.7 still $5/$25, relatively more expensive now), and **Google actually went up** (Gemini 3.1 Pro output price +140%).

**What this really means for indie developers**: before April, running a full agent workflow cost roughly $80-100/month. Now, with a DeepSeek V4-Flash + Qwen 3 Coder combo, you can get that down to **$15-20**. This is an inflection point in user behavior — not "AI tools got cheaper," but "indie developers can now afford the full toolchain."

## Change 3: Open-source flagships have caught up

When blog080 was written, the gap between open-source models and the closed-source frontier was 25-40 points (on SWE-bench / MMLU, take your pick). **It has now shrunk to 5-15 points.**

The open-source candidates most worth your attention:

- **GLM-5.1**: 58.4% on SWE-bench Pro, just 5.9 points behind Claude Opus 4.7's 64.3%. Fully open source + commercially usable
- **Qwen 3 Coder 32B**: runs on a single H100 or 2×4090, API priced at $0.30/$1.50 (6-9x cheaper than GPT-5.5, depending on input vs output)
- **DeepSeek V4-Pro**: specifically optimized for long context + agentic reasoning, staggering value for money

**Why it matters**: the blog080-era assumption that "open-source models are demo-only" **is now obsolete**. From May on, "open source as the workhorse + closed source for the hard stuff" is a genuinely executable strategy for serious projects.

**My own field test**: I moved all the "repetitive batch work" on the tools site (fixing old post frontmatter, batch-updating tags, scanning for privacy-sensitive keywords) to self-hosted Qwen 3 Coder 32B. The cost is effectively zero — the server was already running, and inference uses idle compute. My Claude Code primary is still Opus 4.7 (new features, architectural changes), but **70% of the "mechanical work" no longer needs Claude at all**. In March this was impossible — Qwen 2.5 routinely went off the rails on those tasks.

One caveat: self-hosted Qwen 3 Coder 32B is still less reliable than Claude on long Chinese context (beyond 50k tokens). Don't bet important documents entirely on it.

## Change 4: Anthropic's internal release cadence

Things have moved fast on the Claude side, so it gets its own section:

- **Opus 4.7** (released 2026-04-16) — main improvements over 4.6: coding tasks +5%, notably better long-context consistency
- **Opus 4.6 retirement date**: **2026-06-15** — after mid-June, API calls pointing at the opus alias automatically resolve to 4.7
- **Pricing unchanged**: $5/$25 — 4.7 didn't raise prices (which, against GPT-5.5's deep cuts, effectively makes it more expensive)
- **Sonnet 4.6 is still the value pick**: $3/$15 — Sonnet is fully sufficient for most everyday coding tasks

**Practical advice for blog080 readers**: if you picked Claude 3.5 Sonnet as your daily default back then, **just upgrade to Sonnet 4.6 ($3/$15)** — same price point, dramatically better at coding. If you picked Claude 3 Opus for complex tasks, go straight to Opus 4.7 ($5/$25) — a third of the cost and a generational leap in capability.

**How I use them**: Sonnet 4.6 for 90% of tasks (the value pick), switching to Opus 4.7 for critical architectural decisions and complex multi-file refactors. I've deliberately tested the same task on Sonnet vs Opus — for most everyday CRUD work you can't feel the difference, but for the kind of work where "one wrong call burns a day" (distributed state, cross-module dependencies, data migrations), the extra tokens Opus burns are worth it.

A counterintuitive take: **4.7 holding its price is not good news**. GPT-5.5 cut prices sharply, Gemini effectively raised them, and Anthropic stayed flat — on the surface Anthropic looks stable, but in reality it's passively losing cost competitiveness under GPT-5.5's price-performance offensive. If price is all you care about, Anthropic stopped being the optimal pick as of May.

## Change 5: Acquisitions at the infrastructure layer

Two far-reaching acquisitions within 4 months:

- **December 2025: Anthropic acquired Bun** — Claude Code's underlying runtime switched from Node.js to Bun, with ~28% faster startup
- **Q4 2025: Cloudflare acquired Astro** — Astro 6 makes Cloudflare Workers a first-class deployment target

**Impact on model selection**:

- If you deploy on Vercel or Cloudflare, how well a model integrates with your infrastructure matters more than "which model scores higher"
- If you go with the Claude family, there are unexpected wins from pairing it with the Bun ecosystem
- If you use Vercel v0 (which pivoted to agentic workflows in May), you need to re-evaluate where its boundary with Claude Code sits

## Change 6: The developer cost floor dropped a tier

This is the cumulative result of everything above — not a single event.

| Role | Workable monthly budget in March | Workable monthly budget in May |
|---|---|---|
| Indie developer, baseline | $50 (one Claude Pro) | $20 (DeepSeek + Qwen + Claude Sonnet) |
| Mid-tier (multi-model mix) | $200 | $80 |
| Pro, fully loaded (Claude Code + Cursor + multiple models) | $400+ | $200 |

The hottest HN thread in May was "I run a full AI workflow for under $20/month" — a direct reflection of this shift.

## Should you change the picks you made in March?

Here's my "switch or stay" advice for the typical blog080 scenarios:

| What you picked in March | Should you switch in May | Why |
|---|---|---|
| Claude 3 Opus (high-quality coding) | Upgrade straight to Claude Opus 4.7 | Generational improvement + 1/3 the cost |
| Claude 3.5 Sonnet (daily driver) | Upgrade to Claude Sonnet 4.6 (the value pick) | Same price point + much stronger coding |
| GPT-4 Turbo / GPT-4o | Upgrade straight to GPT-5.5 | Cost halved + generational leap on Terminal-Bench |
| Gemini 2.0 Pro / Flash | Upgrade to Gemini 3.1 Pro | New king of scientific reasoning + stable long context |
| Qwen 2.5 Max (Chinese) | Upgrade to Qwen 3 Coder (coding) or stay on Qwen 3.x (Chinese) | Full refresh of Alibaba's Qwen 3 lineup |
| Never tried open source (assumed it wasn't good enough) | At least try GLM-5.1 or Qwen 3 Coder | Open-source gap is down to 5-15 points |
| All-in on a single vendor (cost anxiety) | Add DeepSeek V4-Flash for simple tasks | Costs can drop 80% |
| Cursor subscription as your only tool | Re-evaluate Claude Code + a multi-model mix | The ecosystem clearly diverged in May |

## Summary

blog080's core conclusion — "there is no absolute best model, only the best fit" — **still holds**.

What changed is the **decision criteria**. In March it was a three-way pick among closed models (GPT vs Claude vs Gemini); in May it's a fine-grained decision across 6+ dimensions, open-source flagships included:

- Deep coding tasks → Claude Opus 4.7 / GPT-5.5
- Agentic / terminal tasks → GPT-5.5
- Scientific reasoning → Gemini 3.1 Pro
- Cost-sensitive → DeepSeek V4-Flash / Qwen 3 Coder
- Self-hosting / compliance → GLM-5.1
- Long context → Gemini 3.1 Pro / Kimi K2.6

**Bottom line**: if you haven't revisited your model choices since March, **spend one hour reviewing them against the table above**. Most people will find 30%+ in cost savings or capability gains.

## My take: the fundamental shift in selection methodology after May

After writing this, I came away with three realizations that matter more than "which model to switch to":

**1. "Pick the single strongest model" is an outdated mindset** — In March I ran everything on one ChatGPT Plus subscription, and back then that was reasonable. But the optimal answer in May is unequivocally a "portfolio": Sonnet 4.6 + Opus 4.7 (critical tasks) + Qwen 3 Coder (batch mechanical work) + Gemini (occasional scientific reasoning). **There is no all-around champion anymore — anyone who believes one model can do everything is overpaying.**

**2. Self-hosted open source is no longer the "budget option" — it's the "professional option"** — My old bias against self-hosting was "worse quality, more hassle, not worth it." Qwen 3 Coder 32B changed that: the cost of running mechanical work drops to near zero, and the quality is good enough. **The point isn't "can open source keep up with closed source" — it's that mechanical work never needed a frontier model in the first place.**

**3. Watch a model company's "posture," not just its "performance"** — In the May reshuffle, the biggest losers were Google (price hike) and Anthropic (passivity). On the surface, Anthropic still tops SWE-bench, but its relative position on price-performance has slipped. **A model company's pricing strategy and product cadence are leading indicators of where its capability standing will be in 6-12 months.** Indie developers especially should watch this — your switching cost is lower than an enterprise's, and you're more sensitive to price changes.

These three dimensions of judgment simply didn't exist in the blog080 era. If you remember only one line: **after May, AI model selection is no longer "picking a product" — it's "building a portfolio."**

---

**Further reading**:
- [Vellum LLM Leaderboard](https://www.vellum.ai/llm-leaderboard) - Real-time model rankings
- [LM Council Benchmarks](https://lmcouncil.ai/benchmarks) - Multi-dimensional benchmark comparisons
- [LLM Stats - 300+ model comparison](https://llm-stats.com/) - Covers price / speed / intelligence in three dimensions
