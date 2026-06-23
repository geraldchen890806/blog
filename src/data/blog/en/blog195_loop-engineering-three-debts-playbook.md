---
author: 陈广亮
pubDatetime: 2026-06-23T11:21:58+08:00
title: "After the Loop Is Running: A Playbook for Verification, Comprehension, and Cognitive-Surrender Debt"
slug: blog195_loop-engineering-three-debts-playbook
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI Agent
  - Claude Code
  - 开发效率
  - 自动化
description: "blog191 walked through the five components of Loop Engineering and named three debts—verification, comprehension, cognitive surrender—without offering a treatment plan. This post fills that gap: a Wharton 1,372-person experiment, Anthropic's 52-engineer study with a 17% comprehension gap, a real $4,200 overnight bill, Claude Code's PreToolUse rejection hook, and three checkpoint patterns—the full playbook in one place."
---

[blog191](https://chenguangliang.com/en/posts/blog191_loop-engineering-design-loops-prompt-agents/) broke Loop Engineering into five components plus one state, and ended by naming three debts straight out of Addy Osmani's piece: **verification debt, comprehension debt, and cognitive surrender**. But the post only flagged the problems—no treatment plan. That gap is what readers have asked about most.

This post fills it. Hard facts first, then a concrete playbook, and one real number at the end as a reminder: **the smoother the loop runs, the faster the three debts pile up**.

## The three debts aren't metaphors—they're engineering problems with data behind them

Osmani's original wording leans philosophical, which makes it easy to misread as a "don't lean too hard on AI" pep talk. But research that landed in the first half of 2026 gave each debt a hard substrate. They aren't attitude problems; they're quantifiable, treatable engineering problems.

**Hard data on comprehension debt**: an Anthropic 2026 [skill formation study](https://arxiv.org/abs/2601.20245)—52 engineers learning an unfamiliar async programming library—found the AI-assisted group and the control group **finished tasks in roughly the same time**, but on a follow-up comprehension quiz the **AI-assisted group scored 17% lower**. The AI got people across the task finish line without getting them across the understanding finish line.

**Hard data on cognitive surrender**: a Wharton experiment with 1,372 participants exposed people to AI suggestions, a meaningful fraction of which were wrong. Even when the AI was wrong, participants **still accepted the AI answer roughly 73% of the time** (the figure Addy Osmani cites in [Cognitive Surrender](https://addyosmani.com/blog/cognitive-surrender/)). Bad AI output mostly does not get caught.

**The real bill on verification debt**: a public LeanOps case—one developer kicked off an autonomous refactor loop over a weekend and **burned $4,200 in API spend in a single run**, on code whose business requirements hadn't even been confirmed. The loop emitted a "done" signal, the PR opened itself, CI went green—and at review the entire direction turned out to be wrong. Verification debt is paid in real dollars.

Pin the baselines: **17% comprehension gap, ~73% wrong-acceptance rate, a single $4,200 burn**. The playbook below works backwards from those three numbers.

## Verification Debt: replace "the agent says it's done" with "the system says it's done"

The core of verification debt: **a loop's self-assessment of "done" is not trustworthy**. A model plus its own grader will hand itself high marks; 50 tool calls without an error is not evidence the change is correct.

Three treatments, ordered from cheapest to hardest:

**1. Mandatory evidence (lowest cost, highest payoff)**
Every loop task must produce **externally verifiable artifacts** at the finish line. Anything less is not done. The checklist below is what I converged on after running my own loops for a few months ([Margaret Storey's 2026/2 cognitive debt post](https://margaretstorey.com/blog/2026/02/09/cognitive-debt/) offers the broader prescription—"periodic checkpoints to rebuild shared understanding"—but the concrete shape of evidence is yours to define):

- **Tests**: new features must ship with a failing-to-passing rerunnable test
- **Screenshots / screen recordings**: UI changes need visual evidence
- **Runtime logs**: service changes attach happy-path log plus exception log
- **Runtime traces**: performance changes attach before/after trace comparison
- **Third-party signoff**: a sub-agent or human reviewer explicitly approves

A loop may only declare done after producing **at least two categories** of evidence. One is too easy for a model to game (a test can be self-authored and self-passing); two creates cross-validation.

**2. Decouple the verifier sub-agent from the maker**
blog191 covered this split in section three. Worth restating: **the maker and the verifier must not share an agent context**. They must:

- Spawn as independent sub-agents
- Not share a system prompt (the verifier's prompt leans skeptical: distrust the maker's output by default)
- Receive only "the original task description plus the maker's evidence"—**not the maker's chain of thought**—or it will get hypnotized by the maker's reasoning chain

**3. Hard-stop with Claude Code's PreToolUse hook**
Claude Code supports a PreToolUse hook: a callback that fires before any tool call, and **the callback must exit 2 (not exit 1) to actually block the tool**. This is the most common rookie trap—exit 1 is non-blocking, the tool runs anyway. You can also emit JSON `{"decision":"block","reason":"..."}` for an explicit rejection. Claude reads the rejection message and adjusts. Three places this hook earns its keep:

- Before `bash` tool calls—reject anything containing `rm -rf`, `git push --force`, `DROP TABLE`, etc.
- Before `Write` tool calls into `.env*`, `config/secrets/**`, or similar sensitive paths—reject outright
- When a single loop's cumulative tool calls cross N—hard stop, require human intervention

The PreToolUse hook is **the cheapest guardrail you can put on a loop**—no agent changes, no prompt edits, no reliance on model self-discipline. It's OS-level interception. A 50-line shell script blocks 80% of runaway patterns.

## Comprehension Debt: replace "read the PR" with "rebuild understanding"

The core of comprehension debt: **code review is not sufficient to restore understanding**. Reading a PR is "did this hunk of code do the right thing locally"; a loop can ship 30 PRs in a week, each one fine in isolation, and **no one knows what the whole looks like anymore**.

Three treatments, ordered short to long:

**1. Force a "why, not what" review checkpoint on every PR**
Delete `## What changed` from your PR template; replace it with `## Why this change` + `## What it replaces` + `## Risk`. Move reviewer attention off line-by-line verification and onto why this path beat the alternatives. Model-generated diffs almost never get the `## What` wrong—what they get wrong are the tradeoffs they never considered.

Tooling: enforce via GitHub PR template; add a CI lint that fails the build when description fields are empty.

**2. A 30-minute weekly "loop diff review" ritual**
After the loop has been running for a week, hold a 30-minute meeting that does exactly one thing: **one person walks the team through every PR title plus key files the loop opened this week**, and asks three questions:

- Which parts of the code did the loop touch this week?
- Which changes **surprised** us? (this is the important one)
- If a new hire showed up tomorrow, could you explain the current state of these modules?

When you can't answer the third question, that's your comprehension debt balance. The ritual's goal is not to review code—it's to **periodically rebuild the team's mental model of its own system**.

**3. A monthly "auto-debrief" where the loop writes its own architecture-change report**
Give the loop one more task: scan the last month of git history, PR descriptions, and CI metrics, and **write a "architecture / modules / data flow changes over the past month" summary**. Distribute to everyone on the team; half an hour to digest.

This sounds like asking the loop to grade itself—but **generating a structured summary** is much easier than **making good engineering decisions**, so the output is credible enough. The value is pulling implicit changes scattered across 30 PRs into a single document, giving people a hook to ask "wait, when did we agree to the second part of that?"

## Cognitive Surrender: turn "do we follow the AI?" into an explicit decision

Cognitive surrender is the hardest of the three to treat—it's not a technical problem, it's **psychology plus habit**. The better the loop works and the more confidently it answers, the more readily humans accept without thinking. Wharton's ~73% wrong-acceptance rate occurred in a trained experimental setting—day-to-day work runs higher.

Three treatments, ordered light to heavy:

**1. Force a "reasoning separation" prompt**
When the loop emits a result, require it to **list three things explicitly**:

- **Conclusion**: I recommend X
- **Reasoning**: because of A, B, C
- **Not considered**: D and E—I did not weigh these fully

The third item is the key. Making the AI confess uncaught dimensions puts "unknown risk" on the table. A human reading "I did not fully weigh performance impact" instinctively pauses; without it, they assume the AI already considered it.

Implementation: bake it into the loop's system prompt, and have the verifier sub-agent check that the "not considered" field is non-empty, kicking back the output if it isn't.

**2. Counterfactual check ("what if you're wrong?")**
On high-stakes tasks, after the maker emits its output, route it through a "devil's advocate" sub-agent. Its only job: **assume the maker's proposal is wrong, list the three most likely reasons it's wrong**.

The point isn't necessarily to overturn the maker—it's to **put the counter-arguments in front of a human before they accept**. After reading three counter-arguments, attention to "is this actually right?" returns sharply.

**3. Mandatory cooling-off on high-stakes tasks**
Deployment-class and irreversible tasks (prod database migrations, external API canary cutovers, etc.)—even if the loop emits "done", **enforce a 1-hour delay** before the next step. That hour isn't for the loop—it's an **un-rushed window** for a human to reconsider whether to actually hit enter.

Claude Code's SessionEnd hook or a custom schedule can implement this.

## Three-layer defense: weld Verification / Comprehension / Cognitive Surrender together

The nine treatments above mapped to a grid—three debts by three intervention points:

| | Real-time (the moment the loop runs) | Short-term (PR / within a week) | Long-term (a month or more) |
|---|---|---|---|
| **Verification** | PreToolUse hook interception | verifier sub-agent + two evidence categories | monthly runaway-bill review |
| **Comprehension** | "reasoning separation" prompt | "why, not what" PR template + weekly diff ritual | monthly auto-debrief architecture report |
| **Cognitive Surrender** | counterfactual check sub-agent | 1-hour cooling-off on high-stakes tasks | quarterly "AI off for a day" drill |

The last cell, "AI off for a day", is a reverse experiment I proposed to my own team after running loops for half a year ([the Stack Overflow 2026/5/21 post on decision fatigue](https://stackoverflow.blog/2026/05/21/coding-agents-are-giving-everyone-decision-fatigue/) discusses the macro question of how the SDLC absorbs decision fatigue; this section is my version of pinning it to a concrete ritual)—pick one day per quarter, turn off every AI coding tool company-wide, and have everyone write code, read code, and solve problems the old way. The point isn't nostalgia, it's **recalibration**: do we still produce working code on our own, do we still remember how these systems work? If two consecutive "AI off" days produce collective collapse, cognitive surrender has already happened and is irreversible.

## The real bill: how the three debts burned $4,200

Back to the $4,200 overnight case. The post-mortem maps cleanly onto the three debts:

- **Verification debt**: the loop had no mandatory evidence regime—it called the refactor "done" because the tests it wrote itself passed itself, but **no external signal** said the direction was right (the business side hadn't even confirmed the work)
- **Comprehension debt**: Monday morning the developer walks in to an 8,000-line PR, skims it, decides "the loop ran fine"—he had **no mental model** for whether 8,000 lines was the path that should have been taken
- **Cognitive Surrender**: the loop's PR description read with high confidence ("This refactor improves maintainability..."), and the developer had **no instinct to push back**—until the API bill showed the price of 64 uninterrupted hours of loop

Any single guardrail would have cut the bill off:

- A PreToolUse hard stop at N cumulative tool calls → killed within hours
- Mandatory evidence + business signoff → the first PR doesn't pass
- A daily API budget of $50 soft cap + $100 hard cutoff → first day triggers a warning

The LeanOps recommendation is simple and effective: **$50/day soft cap with email alert + $100/day hard cutoff**—blocks 95% of runaway patterns. This is loop engineering's step zero, and it matters 100x more than prompt tuning.

## One line: the smoother the loop, the earlier the debt treatment

blog191 closed with "the loop changed your job, not you". This post's version is:

**The loop moved your job from 'hitting enter' to 'designing guardrails'. Until the guardrails are designed, the smoother the loop runs, the faster the three debts pile up.**

If you're standing up a loop, this is the order:

1. **First**: API budget + PreToolUse hook (lowest cost to add, highest risk if skipped)
2. **Then**: verifier sub-agent + "why, not what" PR template
3. **Then**: weekly diff ritual + 1-hour cooling-off on high-stakes tasks
4. **Last**: monthly auto-debrief + quarterly AI-off day

Skipping any of these isn't fatal. Skipping step 1 generates a bill.

---

**Further reading**:

- [Addy Osmani: Cognitive Surrender](https://addyosmani.com/blog/cognitive-surrender/) - Addy's standalone piece on cognitive surrender, outside the Loop Engineering essay
- [Margaret Storey: Cognitive Debt](https://margaretstorey.com/blog/2026/02/09/cognitive-debt/) - the original source for mitigation practices
- [Stack Overflow: Coding agents are giving everyone decision fatigue](https://stackoverflow.blog/2026/05/21/coding-agents-are-giving-everyone-decision-fatigue/) - industry acknowledgment of decision fatigue
- [LeanOps: AI Agents Burn 50x More Tokens Than Chats](https://leanopstech.com/blog/agentic-ai-cost-runaway-token-budget-2026/) - the $4,200 case and budget practices
- [This blog: blog191 - Loop Engineering concepts and components](https://chenguangliang.com/en/posts/blog191_loop-engineering-design-loops-prompt-agents/) - the prequel to this post
