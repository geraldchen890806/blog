---
author: 陈广亮
pubDatetime: 2026-06-27T11:21:19+08:00
title: "The 90-Day Spaghetti Point: Why Maintenance Is Vibe Coding's Real Exam"
slug: blog197_vibe-coding-maintenance-real-test
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI Agent
  - Claude Code
  - 开发效率
  - 自动化
description: When Karpathy coined Vibe Coding in Feb 2025, he only talked about how good it felt to write. GitClear's 211M-line study and the 2026 wave of rescue jobs both map that feeling onto a 4x maintenance bill in year two. This post unpacks the three mechanisms that detonate around day 90 — the Spaghetti Point — and how to keep AI speed without paying that bill.
---

## The pattern: from "AI shipped my SaaS in two days" to "I spend every day cleaning up after AI"

In February 2025, Karpathy posted the tweet that lit vibe coding on fire. The most-quoted line: "I 'Accept All' always, I don't read the diffs anymore" — when there's an error, you paste it back and it usually fixes itself. That single post got vibe coding picked as Collins' word of the year for 2025, and by year-end it was the default verb among founders, indie hackers, and even big-company internal hackathons.

Then the first half of 2026 flipped the script.

I have personally inherited two vibe-coded projects — a friend's solo SaaS and a small tool left behind by an internal hackathon. Both had the same symptoms: **velocity was great for the first two months, weird bugs started multiplying in month three, and by month four every small change required half a day of regression testing**. After I refactored each of them end-to-end, the total time I spent was higher than if I had "just written it normally" from day one.

This is not anecdotal. The Autonoma piece from April 2026 gives it a name: **the "Spaghetti Point."** Vibe coding is clearly faster than normal coding in week one, but **the curves cross around month three**, and after that every new feature breaks something that already worked. GitClear's longitudinal study over 211M lines of code provides the hard numbers: the share of refactored code dropped from **24.1% in 2020 to 9.5% in 2024**, while the frequency of duplicated code blocks rose **8x** over the same period. Multiple independent sources land on the same year-two number: maintenance costs about **4x** more than traditionally-written code.

This post is about that gap — **Vibe Coding looks like a product problem while you're writing it, and only reveals itself as an engineering problem when you maintain it**. Below: three mechanisms behind the 90-day Spaghetti Point, plus the compromise workflow I now use.

## Mechanism 1: a single prompt cannot see the system

The first and most fundamental mechanism: **the LLM only sees the current prompt plus whatever code it can fit into context, but it never sees the system as a whole**.

Every answer it gives is doing one thing — "given the local slice you showed me, what is the most reasonable edit." That **local optimum** is high quality inside a single prompt: clean function signatures, clear variable names, decent comments. But across 100 prompts, **nobody is minding the global structure**.

The typical symptoms:
- **The same data model gets defined three slightly-different times** — one prompt has AI define `User` in `api/user.ts`, another prompt creates `UserProfile` in `services/profile.ts`, and a third invents `UserRecord` in `db/queries.ts`. They look alike but the fields don't quite match.
- **Error-handling style is all over the place** — last session's module uses throw + try/catch, this session's uses `Result<T, Error>`, the next one stuffs an error field into a callback. **Each piece is fine in isolation, the union is chaos.**
- **No module boundaries** — AI doesn't know that "the auth subsystem should never import billing directly" in your project, because that boundary **lives only in your head** and was never physically expressed in code.

GitClear's "8x duplication" and "halved refactor ratio" both point at this mechanism: AI doesn't refactor, AI duplicates, AI makes one-shot decisions. Each shot is correct; nobody is drawing the map.

**The biggest difference vs. a human writing code: a human who works on the same system long enough builds a mental model and unconsciously preserves consistency on the next edit. AI is always on its first day at work, asking "what should I change right now," with zero continuity of "what similar decisions did I make before."**

## Mechanism 2: "Accept All + don't read diffs" downgrades you from reviewer to typist

Karpathy's "I 'Accept All' always, I don't read the diffs anymore" is the aesthetic core of vibe coding. But the real price of that habit isn't paid today — it's paid **six months later**.

Not reading diffs while writing means:
1. You have no memory of **why this code is shaped this way**.
2. You have no idea **what alternatives AI didn't pick**.
3. You have no clue **what implicit assumptions are baked in**.

None of these matter at write time — it runs, ship it. But **at maintenance time they are everything** — you want to add a feature, which requires answering "why is this logic designed this way," and you cannot. **You become a stranger to your own code.**

The Wharton 1372-person study I cited in [blog195](https://chenguangliang.com/en/posts/blog195_loop-engineering-three-debts-playbook/) — humans adopted AI answers 73% of the time even when wrong. The follow-on effect here is: **that 73% adoption happens at write time**; at maintenance time a meaningful chunk turns out to have been wrong, but **by then nobody remembers why A was picked over B**. Comprehension debt accrues on a buy-now-pay-later schedule, and vibe coding is exactly what drives it to peak.

The GitClear numbers have one figure that nails this point: **moved lines (refactored lines) dropped from 24.1% to 9.5%**. Refactoring is "understood the old code → saw a better shape → rewrote it." A drop in refactoring means **nobody is actually understanding the code** — people are **appending** instead of **refactoring**. Refactoring requires a mental model, and vibe coding cuts the mental-model link out of the loop.

There's a direct corresponding number from the field: **67% of developers report that debugging takes longer since they started using AI assistants** (Stack Overflow 2025 puts it at 45.2% under a different framing). Debugging is slow precisely because you're debugging code you never really wrote.

## Mechanism 3: the tests are AI-written too — double hallucination

The third mechanism is the most hidden: in vibe-coded projects, **the tests are usually AI-written as well**. Developers ask AI to generate tests, AI happily obliges — the tests look polished and coverage metrics look great.

The problem is that **AI-written tests almost exclusively cover the cases AI considered while writing the code**. They don't cover:
- The **edge case a user reported yesterday** in real ops (AI doesn't know that feedback exists).
- The **implicit requirements you discussed verbally but never wrote into the PRD** (AI never saw them).
- The **weird cross-module interactions only a human catches** (AI looks at one module at a time).

Worse, this is **double hallucination**: the business code has its hallucination, the test code has its hallucination, and **the two layers hallucinate in lockstep** — the business code assumes input X looks like this, the test mocks input X the same way, **tests pass green, prod blows up**.

The OWASP number that gets quoted everywhere — **45% of AI-generated code contains CWE-level vulnerabilities** (with similar findings echoed by Veracode and others) — includes plenty of cases where coverage is high but the actual vulnerability is wide open. "It's tested" no longer functions as evidence for "this is correct" in vibe-coded projects, because the maker and the verifier **are not truly independent** (which echoes the blog195 principle that a verifier sub-agent must have its own prompt and its own context).

The end result is a very public mid-2026 phenomenon: **a large wave of vibe-coded SaaS projects has entered rescue engineering**, with market rates landing in the **$50,000 - $500,000** range. The money many founders thought they saved through AI speed gets paid back here — the cost moves from "R&D" to "rescue," and **the ledger comes out negative**.

## Three mechanisms stacked: the compound interest of the 90-day Spaghetti Point

Put the three together:

| Month | What it looks like | What's actually happening |
|---|---|---|
| Month 1 | "I shipped the MVP in two days" | Local optima, duplicated definitions, unread diffs, tests all green |
| Month 2 | "Three more features, AI's still helping" | Global structure starts drifting, module boundaries already blurred |
| Month 3 (**Spaghetti Point**) | "Weird bugs keep multiplying" | Fixing A breaks B because A and B share state AI implicitly assumed months ago |
| Month 4 | "Every change needs a full regression" | Tests untrustworthy, docs don't exist, nobody remembers the design |
| Month 6 | "Should we just rewrite it?" | Rescue costs walk in |

The shape of this curve is **compound interest** — the three mechanisms don't add, they **amplify each other**:
- Inconsistent local decisions → make "read the diff to reconstruct understanding" prohibitively expensive
- "Don't read diffs" → makes it impossible to quickly identify which decisions are wrong during maintenance
- AI-written tests → make the traditional "all green = safe" signal worthless

Together these three cancel out every checks-and-balances mechanism normal engineering depends on — code review, tests, architectural continuity. **A system with no checks-and-balances goes spaghetti at day 90, with no exceptions.**

## A compromise workflow: how to use AI without breaking yourself six months later

Karpathy himself later went on stage at the **YC AI Startup School** and framed this whole paradigm as "**Software 3.0**" (Software 1.0 = code, 2.0 = weights, 3.0 = prompts), proposing the upgrade from pure vibe coding to "**agentic engineering**" — treat AI as a collaborator rather than a black-box generator, with **humans keeping directional decision rights**. The compromise workflow I've converged on across a few projects points in the same direction.

Three classes of code, three different treatments:

**Class A: write-once-throw-away / one-shot scripts / hackathon / spike**
Vibe-code freely, **Accept All the whole way**. This code's lifespan is under two weeks, so comprehension debt cannot compound.
- One rule: **mark it deprecated the moment you're done**, and nobody is allowed to "borrow from" it into production.
- In practice: drop a `.experimental` marker at the repo root and write into `AGENTS.md` that "code under this directory does not enter main."

**Class B: MVP / early product / possibly long-term, not sure yet**
**Vibe-write, but re-read every diff before the first major change.** Enjoy AI speed up front, but force a review cycle "before feature number 2."
- In practice: have AI write an `ARCHITECTURE.md` summarizing current module boundaries + data flow + explicit decisions, then **sit down with a blank piece of paper and read the code against it**.
- This step usually surfaces 30%-50% of the implicit inconsistencies, which is 10x cheaper than catching them three months later.

**Class C: production code / long-term maintenance / multi-person team**
**No vibe coding.** Back to AI-assisted, with humans deciding on every diff:
- AI proposes options, human picks one, human writes the critical path, AI fills in the skeleton (AI does not pick the direction).
- Code review is mandatory and the diff must be read (echoing the "why-not-what" PR template from blog195).
- Tests are spawned by a verifier sub-agent that does not share a prompt with the maker.
- **Any "inherit AI-written legacy code" task is treated as code archaeology** — spend half a day reading it and writing out a mental model before touching anything.

The core distinction across the three classes: **comprehension debt compounds, and before it compounds you either pay it down early or commit to never paying it (write-once-throw-away)**. The worst case is "I thought it was Class A, then six months later it shipped to production" — that's the shape of every single rescue case.

## Last word

Karpathy's original tweet is still on X, posted in February 2025. A year and a half later, his "**fully give in to the vibes, embrace exponentials, and forget that the code even exists**" turns out to be true — except exponentials go both ways. **The better it felt to write, the worse it feels to maintain**. That is vibe coding's least-discussed and most expensive bill.

If you are currently vibe coding something, answer one question first: **in three months, who maintains this code — you, someone else, or the trash bin?**

- Trash bin in three months → keep vibing.
- You maintain it → start writing the mental model now.
- Someone else maintains it → don't vibe, treat it as production code.

Answering that one question saves you half the pain of the next six months. The Spaghetti Point is real, but **it only arrives while you're not looking at it**.

---

**Further reading**:

- [Karpathy's original vibe coding tweet](https://x.com/karpathy/status/1886192184808149383) — the Feb 3, 2025 post that lit it all up
- [Vibe coding - Wikipedia](https://en.wikipedia.org/wiki/Vibe_coding) — origin of the term and the Collins 2025 word-of-the-year context
- [GitClear AI Code Quality 2025 Research](https://www.gitclear.com/ai_assistant_code_quality_2025_research) — 211M-line longitudinal study: refactor ratio, duplication, churn, all the raw numbers
- [Debt Behind the AI Boom - arXiv 2603.28592](https://arxiv.org/abs/2603.28592) — academic-grade large-scale empirical study of AI code debt
- [Autonoma: Vibe Coding Technical Debt - The 90-Day Reckoning](https://getautonoma.com/blog/vibe-coding-technical-debt) — the original "Spaghetti Point" piece
- [Vibe Coding's 90-Day Reckoning (buildthisnow synthesis)](https://www.buildthisnow.com/blog/guide/mechanics/vibe-coding-technical-debt) — a synthesis covering the Spaghetti Point phenomenon
- [blog195 - Loop Engineering's three debts playbook](https://chenguangliang.com/en/posts/blog195_loop-engineering-three-debts-playbook/) — concrete tactics for verification / comprehension / cognitive surrender debt, complementary to this post
