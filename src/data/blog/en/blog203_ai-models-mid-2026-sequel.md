---
author: 陈广亮
pubDatetime: 2026-07-06T14:08:21+08:00
title: "AI Model Comparison Mid-2026 Sequel: 52 Days After blog166, Here's What I Got Wrong in May"
slug: blog203_ai-models-mid-2026-sequel
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI
  - LLM
  - 开发效率
  - 开源
description: "A line-by-line self-audit 52 days after blog166: of 5 predictions, 2 retracted (the Sonnet/Opus advice is stale, the open-source gap was underestimated), 1 still pending (Anthropic pricing), 2 held up. Plus six months of real model-routing observations from this blog and the checkpoints for the next audit."
---

## Why a "sequel" instead of yet another comparison

blog166 is the ["AI Model Comparison: Mid-2026 Edition"](/en/posts/blog166_ai-models-mid-2026-update/) I published on May 15, barely two months after blog080, when the model layer had already turned over once. This piece comes **52 days** after blog166 — July 6, 2026.

Of all the reader feedback in those 52 days, the most frequent line wasn't "publish another update." It was this:

> "Does the advice you gave in May still hold?"

Writing a "July edition" in blog166's format would be **duplicated labor**, and it would collide head-on with blog166. So this time I'm doing something more honest — **going back to check what exactly blog166 said, what held up, and what didn't**.

The value for readers: the right posture for any **model comparison article** is not "what's optimal right now" (that changes every two months). It's "**where was my last analysis wrong, why, and how do I avoid repeating it**." That's something a news rehash can't deliver.

## Scorecard for blog166's 5 main predictions

First, every verifiable claim blog166 made, each with its current status:

| # | blog166's May prediction | July reality | Verdict |
|---|---|---|---|
| 1 | Opus 4.6 → **upgrade to Sonnet 4.6 ($3/$15) as the daily default**, Opus 4.7 ($5/$25) for complex tasks | Opus 4.8 / Fable 5 are out; the Sonnet line jumped straight from 4.6 to Sonnet 5 on 6/30; the whole cost-capability curve shifted forward | ❌ **Stale** |
| 2 | Open-source vs closed frontier gap **shrinks to 5-15 points** (any benchmark, SWE-bench / MMLU) | GLM-5.2 scores **91/100** on the BenchLM composite board, the Claude line sits around 93 — **a gap of about 2 points** | ⚠️ **Right direction, badly underestimated magnitude** |
| 3 | Opus 4.6 retirement date **2026-06-15**; the API opus alias auto-switches to 4.7 | After 6/15 Opus 4.6 did enter deprecated status; Anthropic's release cadence then stacked Opus 4.7 → 4.8 → Fable 5 | ✅ **Held** |
| 4 | Anthropic keeps pricing flat, becoming relatively more expensive as others cut prices | Opus 4.8 officially still $5/$25 input/output (GPT-5.5 has cut prices noticeably; GLM-5.2's official $1.40/$4.40 cuts even deeper) | ⚠️ **Held, still being tested** — whether Fable 5 opens a new pricing tier remains to be seen |
| 5 | "The economic barrier for developers drops a notch" (an indie developer's monthly budget falls from $50 in March to $20 in May for a full workflow) | More extreme now: ZCode's official Coding Plan Lite at **$16.2/month**, GLM Coding Plan's free tier at 5M tokens/day, and skills like Ponytail cutting another ~54% of code volume and ~22% of tokens per task | ✅ **Exceeded expectations** |

**Out of 5: 1 stale (#1, the Sonnet/Opus advice), 1 right in direction but wrong in magnitude (#2, the open-source gap), 1 held (#3, Opus 4.6 retirement), 1 held but still being tested (#4, Anthropic pricing), 1 exceeded expectations (#5, the developer barrier).** Strictly counted: 2 fully held, 1 held-but-needs-reassessment, 1 right-direction-wrong-magnitude, 1 fully stale. A 60% hit rate by the loose count, 40% by the strict count — **either way, not the "just follow it blindly" tier**.

Below I unpack the 3 that matter most: **retraction 1 + retraction 2 + the one still being tested**.

## Retraction 1: the Sonnet 4.6 + Opus 4.7 advice is stale

The practical advice I gave readers in blog166:

> **If you picked Claude 3.5 Sonnet as your daily default back then, just upgrade to Sonnet 4.6 ($3/$15)** — same price point with a big jump in coding ability. If you picked Claude 3 Opus for complex tasks, go straight to Opus 4.7 ($5/$25).

Why that's stale 52 days later:

- **Opus 4.7 → Opus 4.8** has shipped, with overall gains but some benchmarks moving backwards (in [blog199](/en/posts/blog199_glm-5-2-cyber-benchmark-scenario-specific-breakthrough/) I broke down how Opus 4.8 scores F1 = 28% on Semgrep IDOR versus Opus 4.6's 37% — 9 points lower. A newer model isn't stronger on every sub-task)
- **Anthropic shipped Fable 5 in June** (in [blog190](/en/posts/blog190_claude-fable-5-integration-guide/) I covered the 5 things API integrators genuinely need to change) — the model family name changed, the API added a refusal stop_reason, and dual-model fallback became a de facto requirement
- **Sonnet 5** shipped on 2026-06-30 (Sonnet 4.6 jumped straight to 5 with no 4.7 in between — the unsynchronized Sonnet/Opus version numbers are a deliberate choice by Anthropic) — purely on the price-performance curve, Sonnet 5 already beats the 4.6 I recommended in May

**Corrected practical advice (2026-07-06 edition)**:

| Scenario | May advice (blog166) | July update |
|---|---|---|
| Daily coding default | Sonnet 4.6 ($3/$15) | **Sonnet 5** ($3/$15, released 2026-06-30, better at the same price) |
| Complex multi-file refactors | Opus 4.7 ($5/$25) | **Opus 4.8** ($5/$25), but **note** that on offensive security / IDOR-style sub-tasks 4.6 is actually stronger |
| Long-context agent tasks | Opus 4.7 | Opus 4.8, or consider **GLM-5.2's 1M context** (1/6 the price — see retraction 2) |
| Refusal-sensitive scenarios | Not considered | **Dual-model fallback is mandatory** (details in blog190) |

**Lesson**: the imperative tone of "just pick X" in blog166 was itself the problem. Any model recommendation goes stale on a 2-month horizon. An article must **state explicitly "this is data as of May 15; revisit the decision every 45-60 days"** — otherwise readers will treat a 3-month-old recommendation as today's optimum, and that's on me.

## Retraction 2: "a 5-15 point gap" between open and closed is stale — it's about 2 points

What I wrote in blog166:

> When blog080 was written, the gap between open-source models and the closed frontier was 25-40 points (any benchmark, SWE-bench / MMLU). **It has now shrunk to 5-15 points**.

**July reality**: GLM-5.2 scores **91/100**, ranked 4th on the BenchLM composite board; the Claude line sits around 93. **A gap of about 2 points** (I broke this down in detail in [blog199](/en/posts/blog199_glm-5-2-cyber-benchmark-scenario-specific-breakthrough/)). **The "5-15 point" range was underestimated at the top and badly underestimated at the bottom.**

What's more interesting is what sits behind that "2-point gap":

- **Single scenario**: GLM-5.2 scores F1 = 39% on Semgrep IDOR vulnerability detection, actually beating Claude Code Opus 4.8's 28% ([full breakdown in blog199](/en/posts/blog199_glm-5-2-cyber-benchmark-scenario-specific-breakthrough/))
- **Cost**: a single vulnerability-detection run costs roughly 1/6 of Claude's
- **Open weights**: GLM-5.2 is MIT-licensed open source; any team can fine-tune it
- **Context**: 1M context is 5x the Claude Opus line's 200K

**Corrected judgment**: **the "5-15 points" range can no longer describe reality.** "About a 2-point composite baseline gap + outright wins in specialized scenarios + 5x the context + 1/6 the cost" is the accurate description. **Which means the closed frontier's moat is no longer "model capability" — it's the non-technical side: overall stability, ecosystem maturity, and brand trust.**

For developers who already started migrating in May, **now is the time to swap more aggressively in specialized scenarios**. For those who haven't, a **small pilot** (one or two non-core scenarios, run for 30 days) is far safer than a big-bang migration.

## Still being tested: Anthropic's pricing strategy

What I said in blog166:

> Anthropic keeps pricing flat, becoming relatively more expensive as others cut prices.

**This still holds, but the picture is more complicated than expected**:

- **Opus 4.8 is still $5/$25** — Anthropic's mainline pricing hasn't moved
- **The GPT line keeps cutting prices** (verifiable on OpenAI's official pricing page — blog166 called this direction correctly)
- **GLM-5.2's official $1.40/$4.40 input/output** cuts straight through the half-price line (blog166 didn't predict this; it arrived with GLM-5.2's June release)
- **Anthropic didn't follow the cuts**: its chosen path is a triple bet on "hold pricing + hold the capability growth rate + hold enterprise trust," not price competition

**The open question**: Fable 5 changed the family name (it's not called Opus 5 or Claude 5), which may signal a new pricing strategy. As of July there's no public data showing whether Fable 5 is a "premium up-charge tier" or a "parallel new tier" — that needs the August-September market reaction to settle.

**What readers should do now**: if you're evaluating a long-term commitment to Anthropic, **don't assume it will match competitors' price cuts** — it has clearly chosen a different strategy. For 6-month budget planning, Opus 4.8 at $5/$25 is the safer baseline.

## Six months of real routing observations from my blog project

From January 2026 to today (the two review checkpoints, blog080 and blog166, landed in March and May), my blog's agent layer has used (or trialed) these model routes:

- **Jan-Feb**: mostly Claude 3.5 Sonnet (generation + proofreading on the same model, $3/$15 per token)
- **Mar-Apr**: switched to Sonnet 4.6 ([blog166's recommendation](/en/posts/blog166_ai-models-mid-2026-update/)), generation and proofreading separated
- **May**: Sonnet 4.6 generation + Opus 4.7 second-pass proofreading (the dual-model fallback covered in [blog190](/en/posts/blog190_claude-fable-5-integration-guide/))
- **June**: after Fable 5 shipped, briefly moved everything to Fable 5; the stop_reason:refusal trigger rate was high and the refusal style changed, so proofreading went back to Opus 4.7
- **July, current**: **Sonnet 5 (released 6-30) for generation + Opus 4.8 for second-pass proofreading** — the refusal rate in proofreading dropped noticeably, and Opus 4.8 has a perceptible edge over 4.7 on numeric/citation precision ([blog199](/en/posts/blog199_glm-5-2-cyber-benchmark-scenario-specific-breakthrough/) shipped with the composite gap miswritten as 9 points — really about 2; the 9 belongs to the single IDOR scenario — and it was this combo that caught it: the proofreading pass found 8 consistent instances of the same directional error across the article)

**Not yet in production**: GLM-5.2 is **not in my blog's generation path**. Not because of capability — it's the **Chinese SEO / AdSense re-review window** risk. My blog's main market is Chinese, AdSense is in re-review on 7/10, and introducing any non-Anthropic mainline model right now would disrupt the predictability of the content style. **After AdSense clears, I'll evaluate a GLM-5.2 pilot on isolated tasks.**

This is not the optimal path; it's the **conservative path**. **A prudent routing decision means "know every option, then pick the one that fits your current risk budget"** — GLM-5.2 is 1/6 the cost overall, but right now it doesn't pay off for me.

## What May got right

Not everything in blog166 gets thrown out. Two calls held up:

**Held 1: Opus 4.6 retirement on 2026-06-15.**
It happened. Anthropic shipped on its announced cadence, and the API opus alias transitioned smoothly to 4.7 and then 4.8. This was predictable in May because Anthropic's official blog had stated it explicitly. **Model lifecycle management stayed on script from blog166 through blog203** — a genuine trust signal for Anthropic.

**Held 2: the developer economic barrier dropped a notch.**
July is more extreme. ZCode Coding Plan from $16.2/month, GLM Coding Plan free at 5M tokens/day, and skills like Ponytail cutting per-task tokens by ~22% and code volume by ~54% ([in blog202 I ran a firsthand test cutting one component from 196 lines to 25-30, about -84%](/en/posts/blog202_ponytail-73k-stars-three-weeks-lazy-senior-dev/)).

**These two didn't hold by coincidence** — neither was a prediction about whether some model "would ship" or "would be strong." Both were calls on **structural trends** (Anthropic's internal lifecycle cadence, the race-to-the-bottom in developer pricing). **Structural trends are easier to call than single-model predictions** — they're driven by market and business dynamics, not decided by one release.

**Lesson for the methodology**: of this round's 5 calls, both structural-trend calls hit, while only 1 of the 3 model-level predictions fully held (the Opus 4.6 retirement date) — 2 missed (the specific Sonnet/Opus advice, the open-source gap magnitude). **A sample of n=5 can't establish a stable hit rate**, but the direction is clear: **the predictive part of a model comparison article should lean into structural trends and away from "which model leads two months from now."**

## The next audit: when to write the next edition

blog166 → blog203 took 52 days, with a 60% loose-count hit rate. For the next audit checkpoint I have three hard triggers in mind:

1. **Anthropic's Fable 5 pricing becomes clear** (expected August) — if a new tier opens, call #4 ("Anthropic holds pricing") flips
2. **Whether GLM-5.2 is followed by GLM-5.3 / K2.6** (expected September) — if the composite gap compresses to within 1 point, retraction 2 upgrades to "the closed-frontier gap can no longer be described by a single number"
3. **The AdSense re-review result (2026-07-10)** — directly determines whether GLM-5.2 enters production in my dogfooding observations

My personal bet: **the next audit lands mid-August or early September**, keyed to the Fable 5 pricing clarity. **No daily publishing** — that's the hard "at most 2 posts per week" constraint in my blog's new WRITE_RULES, and the single most applicable lesson from this audit.

## Closing

blog166 plus this blog203 together form a set of "**meta-rules for model comparison articles**" — not telling readers "which one to pick," but telling them "**where the last edition's advice was wrong, why it was wrong, and how the next edition gets written better**."

If you're making long-term model selection decisions, more valuable than "the newest comparison table online" is this: **do the judgments you made 3 months ago still hold? Did the ones that held come from structural trends or from luck? Did the wrong ones fail because the model layer moves too fast, or because the judgment dimension was wrong?**

Of what I said 52 days ago, 40% is stale by the strict count and 60% hit by the loose count — but **the stale judgments are themselves the most valuable data**. Next audit, next prediction, I'll write less "which model leads in two months" and more "what structural force sits behind this price cut / this open-source cadence / this API naming change."

---

**Further reading**:

- [blog166 - AI Model Comparison: Mid-2026 Edition](/en/posts/blog166_ai-models-mid-2026-update/) - the original edition this article audits
- [blog080 - The 2026 AI Model Landscape](/en/posts/blog080_ai-models-comparison-2026/) - the earlier original blog166 audited; see 5 months of continuous evolution
- [blog190 - Two Days Hands-On with Claude Fable 5](/en/posts/blog190_claude-fable-5-integration-guide/) - the Fable 5 naming change and 5 things for API integrators
- [blog199 - GLM 5.2's Scenario-Specific Breakthrough](/en/posts/blog199_glm-5-2-cyber-benchmark-scenario-specific-breakthrough/) - the data foundation for retraction 2
- [blog202 - Ponytail Hit 73k Stars in Three Weeks](/en/posts/blog202_ponytail-73k-stars-three-weeks-lazy-senior-dev/) - the validation case for call #5, "the developer barrier drops a notch"
