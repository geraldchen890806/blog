---
author: Gerald Chen
pubDatetime: 2026-06-15T21:30:00+08:00
title: "Monorepo Is an Org Decision, Not a Tech One: Lessons from Babel, Lerna, and Mercari"
slug: blog192_monorepo-not-tech-but-org-decision
featured: true
draft: false
reviewed: true
approved: true
tags:
  - 前端
  - 开发效率
  - 开源
  - 工具
description: "Monorepo isn't a yes/no technical choice. Babel went in and then quietly walked half of it back, Lerna spent a stretch with no maintainer, and Mercari's cross-region CI burned real money for a year. All three cases point at the same thing: what decides whether a monorepo works isn't Turborepo or Nx, it's your team and how it's organized."
---

## The judgment everyone keeps skipping

Open any "2026 monorepo guide" and the conversation orbits three things: Turborepo vs Nx, how to set up pnpm workspaces, how to wire up remote cache. As if picking the right three tools makes team velocity take off on its own.

I've maintained polyrepos, lived through Lerna, migrated to pnpm workspaces, and today my blog and trade project run on different repo shapes. Three years in, my view has shifted: **what makes or breaks a monorepo has almost nothing to do with tooling and almost everything to do with three organizational variables: team size, ownership boundaries, and CI budget.**

Tool differences are trivial on small projects, and on large ones they get drowned out entirely by organizational reality. This post uses three real cases — Babel's partial walk-back, Lerna's governance collapse, and Mercari's 2026 CI bill — to spell that out.

## Case 1: Babel went monorepo, then quietly swapped out half of it

In 2017, Babel folded `babel-preset-env`, `babylon` (later renamed `@babel/parser`), and other repos back into a single main repo. Lerna was the de facto standard at the time. The migration was right for that moment — cross-package changes in Babel were frequent enough that the polyrepo version of any PR meant five reviews and five releases.

What people rarely notice is what happened next: **the Babel main repo's `packageManager` is now `yarn@4.x`, and Lerna is no longer in `devDependencies`.** They kept the monorepo shape but dropped Lerna's versioning and publishing abstractions. The reasoning is subtle. The Babel team figured out that:

- Cross-package code sharing and atomic changes can be handled by workspaces alone
- `lerna version` and `lerna publish` were a tax, not a benefit, in a project where almost every package gets released together
- Maintaining the Lerna config itself cost effort that the project no longer recouped

Babel's move is the textbook case of "the monorepo is fine, the monorepo tooling isn't." The lesson: what you actually need may not be a full monorepo framework, but the underlying workspace protocol plus a handful of custom scripts.

## Case 2: Lerna half-dead, then taken over by Nrwl

Lerna had issues filed back in 2020 noting that almost no one was maintaining it. In April 2022 a PR put "unmaintained" at the top of the README. The next month, Nrwl (the Nx team) took it over, did a serious rework — dependency upgrades, a doc rewrite, and delegation of task scheduling to the Nx engine — and shipped Lerna 6 by the end of 2022.

The real signal here isn't "Lerna died." It's that **the most widely used monorepo tool in the ecosystem spent a stretch with literally no one to catch it.**

Why? Lerna's core abstractions (version management, cross-package publishing) aren't a technical problem — they're a community-governance problem:

- The user base spans early-stage startups to Fortune 500, with wildly different needs
- Most large-company users fork it and maintain internally, never upstreaming anything back
- Maintainers carry the full compatibility burden — any breaking change blows up thousands of CIs
- No commercial model behind it, all volunteer effort

This pattern repeats across every "infrastructure-class" open source project. **When you pick a monorepo tool, you're betting your team's critical CI path on the governance health of that project.** Part of the reason Nx gets recommended so heavily today is that Nrwl has a clear commercial model behind it, so the governance risk is lower. Same story for Turborepo (Vercel).

The takeaway for tool selection: **weight governance sustainability above benchmark performance.** A solution that's 10% slower but has a company maintaining it full-time deserves more long-term trust than one that's 30% faster but kept alive on the side.

## Case 3: Mercari's cross-region CI in production

In February 2026 the Mercari engineering team published a piece on Turborepo remote cache. (The post is dated 2025 and the work itself goes back earlier.) The most interesting thing isn't the performance number, it's **why they had no choice but to build remote cache**:

- CI cluster in the US
- Primary GKE cluster in Japan
- Data transfer at $0.08/GiB
- A large enough monorepo that an uncached CI run means re-executing every task

In that combination, remote cache isn't "nice to have," it's "or your cost spirals." The numbers they shared: Turbo task time down ~50%, overall job time down ~30%.

Flip it around: **if your team isn't running CI across regions and your monthly build volume isn't at Mercari's scale, the complexity-to-benefit ratio of remote cache is negative.** My blog project is the counter-example. An Astro site builds in 20 seconds — the operational cost of running remote cache would dwarf the savings.

Stitched together with the first two cases, this exposes one of the monorepo's hidden costs: **the bigger it gets, the more engineering it demands, and that engineering piles up its own maintenance cost.** A company like Mercari can absorb it. Small teams routinely underestimate it.

## In the AI agent era, the monorepo cost structure has shifted

This section comes from dogfooding.

Historically, one big payoff of a monorepo has been "code discoverability" — everything is in one repo, and developers can full-text-search across it in their IDE. That benefit is real for humans, but it's **fading for AI agents**:

- Tools like Claude Code and Cursor find code via grep and glob. Their search efficiency doesn't care about repo shape — as long as the tool can access multiple workspaces in parallel, polyrepo and monorepo look about the same from an AI's vantage point
- What actually drives AI agent productivity is **how much relevant code you can fit into a single context**, not whether the repos are merged

The more interesting shift: monorepos pick up a new cost in the AI era — **context pollution.** Point an AI agent at a 300k-line monorepo to fix a bug and its scans will pull in huge amounts of unrelated package code, eating context window and bumping hallucination rates. Polyrepos give you a natural context boundary for free.

This doesn't mean the AI era calls for a full retreat to polyrepos. It does mean **the "code discoverability" argument for monorepos deserves a haircut.** If you're using "should we go monorepo" to drive a team decision, this factor needs to be re-weighted.

## The three organizational variables that actually decide it

Combining the three cases with the AI angle, when I evaluate a monorepo for a team today I only ask three questions.

**One: how often do you make atomic changes across packages?**
If "fixing this bug needs synchronized changes across three packages" is the norm, monorepo wins big. If your packages evolve on completely independent cadences, the coordination cost of a monorepo is a tax, not a benefit. Babel is the first case, which is why it kept the monorepo shape even after swapping tools. A lot of mid-sized projects that go "monorepo for the sake of monorepo" are the second case, and end up strangled by CI complexity.

**Two: can the team carry the CI engineering?**
Something like Mercari's remote cache setup requires dedicated engineers to design, run, and watch it. If you don't have 1-2 people who can keep investing in CI optimization, don't touch a large monorepo — build times explode as the project grows and developer experience falls off a cliff. pnpm workspaces plus a simple CI is a more honest starting point.

**Three: can ownership boundaries be expressed clearly inside the repo?**
Monorepos work fine on small teams because ownership boundaries are held together by "everyone knows everything." Past 50+ engineers you have to enforce ownership through CODEOWNERS, package boundaries, and CI gates, or you slide into "anyone can change anything, no one owns anything." Outbrain has written publicly about their pain points at scale — slow clones, slow builds, flaky tests, IDE indexing crawling — and underneath all of those symptoms sits the same thing: organizational scale outgrew what the repo shape could carry. On teams without proper ownership mechanisms, a monorepo amplifies organizational dysfunction.

## Pragmatic tool advice

Back to tooling, the whole thing collapses to one sentence: **don't start from tool selection, work backwards from the answers to the three questions above.**

- All three answers lean monorepo: Turborepo or Nx both work. Pick based on how much configuration complexity your team tolerates (Turborepo is easier to pick up, Nx is more capable but has a steeper learning curve)
- The answers are murky: start with pnpm workspaces, take the basic workspace win, and reach for Turborepo later if real cross-package complexity shows up
- The answers lean polyrepo: don't move. Spend the effort on the polyrepo pain points instead — release tooling, dependency sync, contract testing. All of those have well-trodden solutions
- "Is Lerna still usable?" — Lerna 6/7 under Nx stewardship is solid, but if you're already inside the Nx ecosystem, going with the Nx mainline is more coherent. New projects don't need to start from Lerna anymore.

## Closing

Whenever someone asks me "should we go monorepo," I now flip the question back: are your cross-package change frequency, your CI engineering capacity, and your ownership mechanisms ready? Once those three answers are clear, the tool choice is basically a detail.

Monorepo isn't a tech trend — it's a mirror of organizational capability. Babel, Lerna, and Mercari are all telling the same story from different angles: how much engineering complexity your team can carry decides whether a monorepo is an accelerator or a time bomb.

---

**Further reading**:
- [Mercari Engineering: Turborepo Remote Cache](https://engineering.mercari.com/en/blog/entry/20260216-turborepo-remote-cache-accelerating-ci-to-move-fast/) - February 2026, cross-region CI from the trenches
- [Lerna and Nx](https://lerna.js.org/docs/lerna-and-nx) - Official write-up after the Nrwl team took over Lerna
- [Babel monorepo design doc](https://github.com/babel/babel/blob/main/doc/design/monorepo.md) - Babel's own monorepo design notes
