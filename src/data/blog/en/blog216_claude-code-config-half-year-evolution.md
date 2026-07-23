---
author: 陈广亮
pubDatetime: 2026-07-22T14:28:44+08:00
title: "From OpenClaw to Claude Code: A Half-Year Config Evolution Ledger"
slug: blog216_claude-code-config-half-year-evolution
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI Agent
  - Claude Code
  - Automation
  - Retrospective
description: "Two TODOs and one regret from three months ago are all settled, plus four things I never imagined: memory as the rule hub, Skills in the pipeline, bilingual i18n as a second publishing line, and AdSense reshaping the writing discipline. Seven evolutions, one section each — a ledger."
---

## A ledger, not a manifesto

Three-plus months ago I wrote [blog115](/en/posts/blog115_openclaw-to-claude-code-migration/) — the migration diary of the day OpenClaw shut down, when I revived seven agents in two days with `claude -p` plus a Node.js bridge.

Back then I left two TODOs and one clear regret: `launchd` was abandoned over Keychain permission problems, real cron wasn't running yet, and I had to `./start.sh` manually after every boot.

Three-plus months later, both TODOs are delivered and the regret is solved. What actually surprised me is this — four things I never even considered back then have shown up on the ledger: memory went from zero to a cross-session rule hub, the Skills ecosystem emerged and entered the daily pipeline, bilingual i18n opened a fully independent second publishing line, and the AdSense rejection incident reshaped the entire writing discipline.

This post isn't about "should you migrate to Claude Code" — that conversation happened three months ago. This one is for people already on it: **what it grows into a few months after you migrate.**

(The title says "half a year", but it's really only been three-plus months. I only noticed while writing — the density of change made it feel like half a year. That illusion itself is a data point.)

Seven evolutions, one section each.

## 1. launchd came back to life

In blog115 I wrote a line: "launchd was abandoned over Keychain permission problems." That was the biggest regret of the earlier post.

It's behind us now. `~/Library/LaunchAgents/com.agents.bots.plist` stays loaded and runs the exact `start.sh watch` from the previous post:

```xml
<key>ProgramArguments</key>
<array>
  <string>/bin/bash</string>
  <string>~/ai/agents/start.sh</string>
  <string>watch</string>
</array>
<key>RunAtLoad</key><true/>
<key>KeepAlive</key><true/>
```

The breakthrough wasn't launchd changing — I changed the approach. In the earlier post I wanted launchd to run `node bot.js` directly, which meant launchd had to read the Telegram token from Keychain and I hit permission walls all the way down. Now launchd only runs the `start.sh watch` shell layer, and token reading is still done the old way with `source ~/ai/.bot-tokens` inside the shell. launchd never touches credentials — it does one thing only: process supervision.

The cost: the 30-second liveness loop inside `start.sh watch` has to stay (launchd's KeepAlive only restarts on full process exit and can't detect "stuck but not exited"). The gain: after a Mac wake-up, power failure reboot, or system update, all seven bots come back on their own, and I no longer need to run `./start.sh` every morning.

## 2. The OpenClaw legacy is fully uprooted

In blog115 what I did was "reuse the OpenClaw directory structure" — the whole naming and framing of SOUL.md, TOOLS.md, MEMORY.md was borrowed wholesale, and credentials still lived at `~/.openclaw/ai/credentials.json`.

That legacy was fully cleaned out on 2026-07-17.

Three things happened that day: I `mv`'d the entire `~/.openclaw/` to `~/.openclaw.uninstalled-2026-07-17/` (planning to delete it for good in mid-August), moved credentials to the XDG-style `~/.config/agents-creds/credentials.json`, and updated every bot workspace to read credentials from the new location.

The naming stayed. SOUL.md, TOOLS.md, MEMORY.md are still in use today — there's no point renaming something that works just to feel "independent".

## 3. bot.js grew from 500 lines to 1145

The bridge layer in the earlier post was about 500 lines. Open `bot.js` today and it's 1145 lines.

It's not runaway bloat. It's what got added while evolving from "it runs" to "it runs quietly for months without incident":

| Capability | blog115 era | Now |
|---|---|---|
| stream-json parsing | yes | yes |
| `--resume` session continuation | yes | yes |
| per-chatId Promise queue | yes | yes |
| watchdog 30s liveness | yes | yes |
| MCP integration | no | chrome-devtools + playwright, cron can hook in |
| Telegram `/cron`, `/status` commands | no | yes |
| HTTP `/health` endpoint | yes (basic) | yes (aggregates each bot's status) |
| pid file + port liveness | pid yes, port no | both, `lsof -tiTCP:$PORT` for liveness |
| log rotation | no | yes |

"Port liveness" is worth a separate note because I stepped on a landmine there. Originally I used `sed -n '2p' logs/xxx.log` to check the second line of the log to decide if a process had started successfully — sounds crude but worked surprisingly well for a while. Then one day the log format changed, the second line became empty, liveness always failed, watchdog restarted infinitely, and the CPU maxed out. Switching to `lsof -tiTCP:$PORT` to check port occupancy — no incident since.

One lesson: **don't use log content for liveness. Log formats change; ports don't.**

## 4. cron went from setInterval to a real scheduling matrix

In the blog115 era, cron looked like this: a `setInterval` inside bot.js ticking every minute, plus two Anthropic cloud Remote Triggers holding down blog topic proposals and tech trend collection.

Now cron looks like this (markdown files under `~/ai/agents/*/crons/`, read and executed by bot.js):

| workspace | task | schedule | purpose |
|---|---|---|---|
| main | daily-tips | `0 9 * * *` | Daily tips + Skills recommendations |
| main | git-sync | `0 22 * * *` | Config sync |
| main | memory-cleanup | `0 21 * * *` | Nightly memory tidy-up |
| main | system-check | `0 7,10,13,16,19 * * *` | System check every 3 hours |
| main | ssl-reminder | `0 1 10 4 *` | Annual SSL certificate reminder |
| blog | blog-proposal | `0 8 * * 1,3,5` | Blog topic proposals |
| blog | tech-trends | `0 8 * * 2,4,6` | Tech trends |
| blog | hot-topics | `30 8 * * *` | Hot topic scraping (via chrome MCP) |
| blog | cn-tech-trends | `30 9 * * *` | Chinese community monitoring (via playwright MCP) |
| blog | fe2agent-auto-publish | `0 9 * * *` | fe2agent series auto-publish |
| tools | tools-scan | `30 9 * * 1` | Competitor scan |

Eleven enabled, one disabled (`daily-article.md` was stopped after the AdSense incident, see section 8). cron definitions are now markdown files, with frontmatter carrying fine-grained constraints like `model`, `budget`, `timeout`, `tools`:

```markdown
---
schedule: "0 9 * * *"
timezone: Asia/Shanghai
model: claude-opus-4-7
budget: 100000
timeout: 3600
tools: ["Read", "Write", "Edit", "Bash"]
---
```

MCP is the capability at this scheduling layer that I didn't foresee at all back then. In the earlier post, "scrape hot lists at 8:30 every day" was a fantasy — `fetch` couldn't pull SPA pages, `puppeteer` was too heavy to install, and even after installing it, writing a script that survived long-term was hard. Once chrome-devtools and playwright arrived as MCPs, a single natural-language line in cron — "open site X, sort by popularity, grab the top 20 titles and links, write them into `hot-topics/$(date +%Y-%m-%d).md`" — just worked.

## 5. Bilingual i18n opened a second pipeline

blog115 was a product of the single-language blog era. In the earlier post, publishing one article meant: write → build → deploy.

Since 2026-06-10 I've been on bilingual i18n. Now `src/data/blog/` splits into `zh/` and `en/`, one article means two files, and `enhanced-publish.js` is the mandatory entry point for bilingual sync — **missing the English version aborts publishing outright**. This constraint is architectural, not procedural — you can't route around it.

The publishing flow grew from 3 steps to 7 hard rules (the 164 lines in `~/.claude/projects/-/memory/project_blog-publish-workflow.md` are the source of truth):

1. Draft in Chinese with `draft: false`
2. Sub-agent runs a 6-dimension review on the Chinese
3. Paste the finished Chinese to me for review, wait for A/B/C
4. Translate to English
5. Sub-agent reviews the English translation
6. build + push + SSH deploy
7. X tweet (English URL) + Juejin (Chinese URL) + update `.last-deploy-commit`

There's a trade-off in step 7 that wasn't obvious at the time but is worth explaining. **X tweets always use the English URL; Juejin keeps the Chinese URL.** The reason is practical: the tech audience on X reads more English, and the English version can capture global traffic. Juejin is a Chinese community — Chinese URLs land readers directly on the Chinese page instead of showing them `/en/posts/...` and forcing a manual language switch.

Bulk-translating 186 legacy posts also hit a small snag: `detect-new-posts.sh` originally counted both `zh/` and `en/`, so the same post triggered two notifications. It was fixed to "only count `zh/`, treat English as a translation artifact of zh" and the numbers lined up.

## 6. memory evolved from notebook to rule hub

In the blog115 era there was no memory system at all — Claude Code's auto-memory hadn't rolled out yet, and my "cross-session memory" was writing important things into CLAUDE.md or re-explaining them every time.

Now, just for the `~/ai/agents` project context, memory has 25 files in three main types:

- **feedback (12 entries)** — collaboration feedback. Examples: "if it's worth remembering, just save it, don't ask", "private projects must be replaced with a neutral placeholder in blog posts", "always run `date` before writing pubDatetime".
- **project (3 entries)** — long-running projects in flight. Example: the 126-line master plan of the fe2agent series (10 main + 3 side + a per-post publish status table).
- **reference (8 entries)** — invariant fact pointers. Examples: how to use `post-to-x.sh`, the location of the dedicated Telegram channel for blog notifications, which directory the cron files live in.

There's also 1 `rule-weekly-cap` (weekly article cap rule) and the MEMORY.md index, adding up to exactly 25 files.

Each memory is now written in a three-part format:

```markdown
---
name: blog-anthropic-api-claims-verify
description: Any Anthropic API claim must be cross-checked with the claude-api skill first
metadata:
  type: feedback
---

**Rule**: For the fe2agent series or any claim involving Anthropic API
parameters, pricing, or features, run the `claude-api` skill for
cross-verification before drafting.

**Why**: The first release of blog02 put `cache_control` on the tools
array, but the API only honors it inside messages. The hard bug passed
review and went live. Root cause: I wrote from memory without checking
the docs.

**How to apply**: Before drafting any API-related section → call the
`claude-api` skill → write using the fields and defaults it returns.
When the sub-agent reviews afterwards, score "API claims cross-checked?"
as its own dimension.

**Related**: [[project_fe2agent_series_plan]] · [[feedback_deliver_zh_md_before_translate]]
```

This rule grew out of a hard-learned lesson. The first release of blog02 (fe2agent series, post 2) was exactly this: written from memory without checking the docs, `cache_control` in the wrong place, and it wasn't caught until after review and launch. After fixing it, what I did wasn't "remember to check next time" — I hardened the flow into a feedback memory and turned "API claim verification" into its own dimension in the sub-agent review.

**That's the value of memory — turning one incident into one continuously enforced rule.**

## 7. Skills went from zero to "three self-built + a full system set"

blog115 didn't mention Skills at all. The Claude Code skill ecosystem hadn't taken shape yet, and I hadn't built one.

I've built three so far:

- `audit-website` (user-level) — wraps the 230+ rules of the squirrelscan CLI to scan websites, covering SEO, performance, and security together. I've run it five times on my own blog.
- `humanizer-zh` (blog agent project-level) — strips AI-generation fingerprints from Chinese text, based on Wikipedia's consolidated guide to "AI writing characteristics".
- `writer` (blog agent project-level) — fixes AI writing patterns like repetitive paragraph openers, monotonous rhythm, and the `this/the/it` trap.

Among system Skills, the three that entered the daily pipeline are `claude-api`, `verify`, and `code-review`. `claude-api` is explicitly required by memory as a prerequisite step (see the rule in the previous section) — **any Anthropic-API-related claim must be cross-verified with the `claude-api` skill before drafting**.

One lesson: a Skill becomes truly useful when it enters a mandatory memory checklist — not when I just remember "oh right, I know that exists". How many Skills you have doesn't matter; how many Skills have become non-negotiable process steps does.

## 8. Three meta-rules behind the ledger

With seven sections done, looking back on the changes of these months, three meta-rules stand out:

**Meta-rule one: every incident gets hardened into one of memory / cron / skill.** `cache_control` in the wrong place → one memory. Log format change causing watchdog infinite restart → switch to `lsof` in bot.js. X tweeting was broken for nearly four months before anyone noticed → add logging to `post-to-x.sh`. Not "remember next time" — "it can't happen again after this time".

**Meta-rule two: the boundary of automation is always "whether it can fail silently".** The watchdog + retry logic I was proud of in the earlier post only solved one class of failure: "the process crashes". The failure I actually stepped on most in these months is "the process is still running but no output came out" — cron silently skipping, API silently returning empty, Telegram messages silently dropped. **A failure that can be surfaced by an alert is the only acceptable kind of failure.** What got added most to bot.js these months isn't new features — it's various corner `console.log`s and Telegram notifications. X tweets stopped for nearly four months before I noticed (because the pipeline failed silently, no alert) — that lesson directly drove the rule that `post-to-x.sh` logs every run.

**Meta-rule three: tool upgrades never catch up with workflow upgrades.** Claude Code shipped a pile of new things these months — Skills, Auto-memory, MCP — but what actually stepped up efficiency wasn't the tools themselves, it was the hardening of workflows like the "memory three-part template", "paste the finished draft to the author for review before translating", and "split reviews into independent dimensions with per-dimension scores". Tools are bricks; workflows are the shape of the wall.

## The next ledger

Two TODOs for the next one:

- `hot-topics` scraping has been accumulating for over 4 months — it's time to integrate the "from scrape to finished draft" automation pipeline
- memory is already 25 entries — it needs a "consolidate into a booklet" review pass (which rules have been internalized and can be deleted, which are still in force but stated in outdated ways)

See you in the next ledger.

## Related reading

- [After OpenClaw Shut Down: Rebuilding a Multi-Agent Automation Setup with the Claude Code CLI](/en/posts/blog115_openclaw-to-claude-code-migration/) — the prequel to this post, covering the full two-day migration
