---
author: 陈广亮
pubDatetime: 2026-06-28T14:22:53+08:00
title: "WorkBuddy Hit #1 in China in 90 Days: What messaging-first AI Agents Teach the Claude Code / Codex CLI World"
slug: blog198_workbuddy-messaging-first-vs-terminal-first-agent
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI Agent
  - 工具
  - 开发效率
  - 自动化
description: Tencent WorkBuddy launched 2026-03-09 and hit 8.85M monthly visits (+831% MoM) with a DAU 3-4x the #2 productivity agent in China. It took the opposite path to Claude Code/Codex — messaging-first, not terminal-first. This post breaks down the 4 structural decisions behind the growth and what agent builders can learn.
---

## The phenomenon: two kinds of agent breaking out at the same time

In [blog196](https://chenguangliang.com/en/posts/blog196_cli-second-spring-ai-era-three-structural-reasons/) I covered the collective breakout of AI CLIs in H1 2025-2026 — Claude Code, OpenAI Codex CLI, Charm's Bubble Tea, Ink, all taking off in the same window and writing "AI tools should be CLIs" into the industry's bones.

But during that exact same window, a completely different shape of agent was quietly growing inside China:

- **March 9, 2026**: Tencent Cloud launched WorkBuddy
- **March 2026**: 8.85M monthly visits, **+831% MoM**, more than **2x** the #2 productivity agent in China
- **DAU 3-4x higher** than the #2 player
- **May 29, 2026**: global version launched, integrating with Slack, Discord, Telegram and other Western IM platforms
- The prototype came out of Tencent's CodeBuddy team — about 10 people. **Wang Shengjie (汪晟杰, CodeBuddy's chief product manager) and one ops partner built it over two all-nighters during a weekend in mid-January 2026** (the story is documented in TMTPost and 36Kr reporting).

If you live entirely inside the English Claude Code / Cursor crowd, you've probably never heard of WorkBuddy. If you're inside Tencent's ecosystem or the Chinese market, in 90 days it became something your colleague might already be using.

What's worth dissecting isn't "China shipped a new agent." It's that **WorkBuddy picked a route diametrically opposite to Claude Code / Codex CLI**: **messaging-first** instead of terminal-first. That route choice maps to a set of structural product-philosophy differences that builders shipping agent products in China can directly learn from.

This post is based on public reporting, Tencent's official docs, and my own long-term dogfooding of Claude Code and Codex CLI. I'll pull apart 4 structural decisions behind WorkBuddy's growth.

## Decision 1: messaging-first vs terminal-first — the audience is fundamentally different

This is the biggest fork.

Claude Code's default shape is `claude` running in a terminal. Codex CLI is the same. They assume the user is **an engineer sitting next to an IDE**, and the enter-output-next-command feedback loop runs sub-second to minutes.

WorkBuddy's default shape is the inverse. **The user drops one sentence into Slack / Discord / Telegram / WeChat, WorkBuddy runs the task in the background, and ships the finished artifact (PPT, spreadsheet, research brief) back through the same IM channel.** The user never switches context. They don't even open a web tab.

This isn't a UI preference. **It's audience stratification.**

| | Claude Code / Codex | WorkBuddy |
|---|---|---|
| Primary user | Engineers | PMs, ops, sales, marketing, admin |
| Default scenario | Write code / edit code / run tests | Make a PPT / clean up data / write weekly reports / competitive research |
| Feedback cadence | Seconds to minutes | Minutes to hours |
| User skill assumption | Comfortable with a shell | Comfortable with a chat app |
| Device assumption | Desktop + terminal | Phone or desktop, either works |

Once you say out loud "the agent lives in the IM," the framing snaps into focus: **WorkBuddy isn't competing with Claude Code. It's competing with "let me just DM a coworker on WeChat to make me a PPT."** That's an **order-of-magnitude bigger** market — the office worker population is structurally far larger than the engineer population.

Tencent has a structural advantage on this path. WeChat, WeCom, and QQ are China's IM infrastructure. Anthropic can't easily replicate that position — it doesn't own any IM entry point, and Claude inside Slack is a bot on someone else's turf: distribution, accounts, and payments all live elsewhere.

**I validate this split every day myself**: my blog's agent fleet is messaging-first — topic briefs, review reports, and publish confirmations all flow through Telegram, agents run in the background and push results back, and I often close the whole decision loop from my phone. But for writing code or changing the blog's build, I always go back to a terminal with Claude Code. Same person, two task types, two form factors — **the form factor follows the task's feedback cadence, not tool ideology**. WorkBuddy's bet is exactly that office tasks' feedback cadence naturally belongs to IM.

## Decision 2: Scenario encapsulation, not capability exposure

The second structural difference is subtler, but it cuts deeper.

Claude Code and Codex CLI expose **capabilities** — `bash`, `edit`, `grep`, MCP tools — and let the user **compose** them with natural language to hit a goal. This is the classic engineer-product philosophy: "here's a set of atomic primitives, you compose." High ceiling, flexible, powerful. But it requires the user to **figure out how to compose**.

WorkBuddy exposes **scenarios**. Its Skills Gallery ships **100+ built-in Expert Skills** (the official copy also calls them "built-in Experts"), covering high-frequency office scenarios: invoice processing, document filing, competitive research, content creation, sentiment analysis, sales insights, data processing. Each one is a complete workflow. The user **picks a scenario, drops in the input, waits for the output** — no need to puzzle out "what should the AI do, in what order, with which tools."

This is **a fundamental fork in product philosophy**:

- **Claude Code / Codex philosophy**: "Engineers know what they want. Give them atomic capability plus docs, done."
- **WorkBuddy philosophy**: "Non-engineer users don't know what they want. Give them packaged scenario templates, they pick one and run."

Underneath this is a different read on the **user's baseline skill**. The former assumes the user can prompt-engineer, debug, read logs, and learn from errors. The latter assumes the user doesn't even want to think about "which steps do I need" — they want **a packaged thing that runs end to end**.

**Neither philosophy is right or wrong. Each maps to a different market.** But here's the key: **the actual user composition in China's to-C / to-SMB market is materially different from Silicon Valley's engineering community** — the non-engineer share is much higher. So WorkBuddy's scenario encapsulation is the right call in China. Ship the same product into the Claude Code user base and it would get dismissed as "too dumbed down, not flexible enough."

## Decision 3: Expert Teams isn't marketing — it's productized sub-agent engineering

A feature WorkBuddy keeps highlighting is **Expert Teams** — multiple sub-agents running different subtasks in parallel, with one lead agent coordinating the final output.

Anyone familiar with the loop engineering writeup in [blog195](https://chenguangliang.com/en/posts/blog195_loop-engineering-three-debts-playbook/) will recognize this immediately: it's **maker/verifier split + parallel sub-agents**, productized. Claude Code supports sub-agents too, but it **leaves the wiring to the user**. WorkBuddy **bakes it in as default behavior** — drop in a complex task and it automatically decides whether to split, how many to spawn, who verifies whom.

The difference here is engineering mindset vs product mindset:

- **Engineer mindset**: "You want parallel sub-agents? Spawn them. Here's the SDK."
- **Product mindset**: "You don't need to know sub-agents exist. You just need to see a PPT in three minutes."

**Hiding the engineering primitives is one of the reasons WorkBuddy hit +831%.** Non-engineer users don't need to be taught "loop engineering," "verification debt," or "maker/verifier decoupling." They just need to see **a task running in the background and a usable file at the end**.

But the flip side — the cost of this encapsulation is **low transparency**. When something breaks, the user can't debug, can't inspect intermediate state, can't intervene. Claude Code users can watch every tool call in their terminal, Ctrl+C to interrupt, edit the prompt, rerun. WorkBuddy users in most cases can only "wait" and "send it again." That's the natural tax of encapsulation. It's not fatal for the target audience, but it would drive engineers up the wall.

## Decision 4: MCP breadth before depth

WorkBuddy wires up GitHub, Jira, Notion, Gmail, Google Drive, and Slack through MCP, covering most of the SaaS a typical office worker touches in a day.

The approach is **integration count before per-integration depth** — each connector first ships "can read, can write, can trigger," and **doesn't chase feature-complete coverage**. Another product trade-off:

| Philosophy | Claude Code route | WorkBuddy route |
|---|---|---|
| Integration strategy | User installs their own MCP, extends on demand | Platform pre-ships a batch of mainstream connectors |
| Per-integration depth | User writes their own prompts / skills | Platform pre-packages common actions |
| User cost | High (must know how to configure) | Low (out of the box) |
| Long-tail coverage | Strong (any MCP installs) | Weak (only the official list) |

The substance of WorkBuddy's strategy: **for 80% of users, they will never in their lifetime write their own MCP. What they want is "mainstream SaaS already plugged in, click and it runs."** Claude Code's "MCP plug-and-play + you compose it" model **isn't a feature for this user group, it's a tax**.

MCP as a protocol has no winner here, but **the two ways of packaging map to two user groups** — one favors power-user composability, one favors preset scenarios for normal users. WorkBuddy picked the latter, and that's one of the reasons it pulled 8.85M MAU in three months.

## What builders in China can take from this

Pull the 4 decisions together. WorkBuddy's growth isn't because the model is good (it's a routing layer, model-agnostic). It isn't because Tencent has deep pockets (the early team was 10 people plus a weekend). It's because **the product decisions cleanly aligned with the goal of "a non-engineer user can use this directly."**

| WorkBuddy decision | What it maps to |
|---|---|
| messaging-first | User is already in IM — don't make them switch context |
| scenario encapsulation | User doesn't know the steps — give them a packaged workflow |
| Expert Teams as default | Hide the complex engineering primitives behind the product |
| MCP breadth before depth | Mainstream SaaS coverage > long-tail connector flexibility |

For builders shipping agent products in China, the takeaway isn't **copy WorkBuddy**. It's **stop building Chinese clones of Claude Code**. The real demand in China's to-C / to-SMB market isn't "give me a beastly agent SDK so I can wire it up" — it's "I'm already in WeChat / DingTalk, can you turn this Excel into a PPT for me?"

Concrete things to borrow:

1. **Pick a messaging entry point first**: WeChat mini program, WeCom, DingTalk, Lark — all an order of magnitude lower friction than a standalone web app.
2. **Encapsulate scenarios before exposing capabilities**: pick 3-5 **high-frequency office scenarios** and go deep, rather than dumping 200 MCP tools on users to assemble. Retention is easier to build the first way.
3. **Hide the complex engineering primitives behind UI**: sub-agent, verifier, loop — users don't need to understand them, but your engineering team must.
4. **MCP: pick the mainstream heavies first**: wire up Notion / Lark / GitHub / Google Drive before chasing open-source long-tail connectors.

## WorkBuddy is not without problems

To avoid this turning into a Tencent puff piece, I need to draw the negative boundary. The costs of WorkBuddy's route — at least these four:

**1. Low transparency, painful to debug**
Non-engineer users don't need intermediate state, but **when things actually break, they can't debug either**. Which sub-agent in Expert Teams failed, why, can they skip it — the user basically has no lever. That's the natural cost of the messaging-first form factor.

**2. Bad at long-tail tasks**
100+ Expert Skills cover 80% of high-frequency scenarios. But the moment your task **isn't on the scenario list**, the result can be worse than just using ChatGPT directly — the whole WorkBuddy system is designed around "packaging workflows." Free-form conversation isn't its strength.

**3. Heavy dependency on MCP-provider API policy**
The whole WorkBuddy experience depends on GitHub / Jira / Notion / Gmail and others keeping MCP access open. The moment one tightens up (say Notion adds rate limits), the corresponding WorkBuddy connector experience degrades.

**4. Messaging's privacy boundary**
Dispatching tasks through Slack / Discord / Telegram remotely means **task descriptions and output files all transit through IM**. Anyone routing enterprise-sensitive data through WorkBuddy needs to be explicitly aware of this.

These issues are bounded for its core audience (non-engineers, high-frequency office scenarios), but anyone planning to copy this playbook needs to evaluate up front whether the costs are acceptable.

## Wrap

WorkBuddy's +831% in three months isn't a miracle. It's **the result of product decisions cleanly aligned with the target user**. It and Claude Code / Codex CLI aren't substitutes — they're parallel universes serving two different markets: "engineer users" and "office workers."

The easiest mistake for agent builders in China is **lifting the Silicon Valley engineer-tool shape and selling it to Chinese office workers**. WorkBuddy did the opposite — took the world's most advanced agent engineering capabilities (sub-agent / MCP / multi-model routing) and **packaged them into the IM form factor office workers already know**. That packaging capability is itself scarce, and reflects years of Tencent + CodeBuddy team accumulation in AI agent engineering.

If you're shipping an agent product in China, start from this question: **what IM or collaboration tool are your users already in, and can you push the output they want to them there, instead of asking them to open their 11th web app?**

Answer that one question, and you may have already decided what your retention curve looks like six months from now.

---

**Further reading**:

- [Tencent WorkBuddy official page](https://www.tencentcloud.com/act/pro/workbuddy) - Official product overview
- [TechNode: Tencent launches WorkBuddy globally](https://technode.com/2026/05/29/tencent-launches-workbuddy-productivity-ai-agent-for-global-users/) - Global launch coverage
- [PANews: WorkBuddy DAU 3-4x #2 breakdown](https://www.panewslab.com/en/articles/019ed38e-887d-76c8-a0eb-2726bcc3b9cd) - Chinese-language product post-mortem on WorkBuddy's growth
- [TMTPost: How a 10-person team built China's #1 DAU agent](https://www.tmtpost.com/7992670.html) - firsthand reporting on Wang Shengjie's team and the weekend prototype story
- [PR Newswire: WorkBuddy overseas launch](https://www.prnewswire.com/apac/news-releases/tencent-cloud-unveils-new-ai-agents-workbuddy-and-miora-driving-innovation-and-real-business-outcomes-across-southeast-asia-302797910.html) - Official overseas launch release
- [This blog, blog196 - The CLI's second spring in the AI era](https://chenguangliang.com/en/posts/blog196_cli-second-spring-ai-era-three-structural-reasons/) - The other side: terminal-first
- [This blog, blog195 - Loop Engineering three-debts playbook](https://chenguangliang.com/en/posts/blog195_loop-engineering-three-debts-playbook/) - The engineering basis for sub-agent / verifier
