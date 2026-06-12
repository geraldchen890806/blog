---
author: Gerald Chen
pubDatetime: 2026-06-12T12:38:58+08:00
title: "Loop Engineering: From Writing Prompts to Designing Loops That Run Agents for You"
slug: blog191_loop-engineering-design-loops-prompt-agents
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI Agent
  - Claude Code
  - AI
  - 自动化
description: The "Loop Engineering" term Addy Osmani popularized in June isn't a replacement for prompt engineering — it's about swapping you out as "the person who hits enter" and turning you into "the person who designs the loop". Walks through the five components plus a state, and the three debts Osmani is really worth remembering for (verification debt / comprehension debt / cognitive surrender) — and along the way, why I disagree with him placing loop above the harness.
---

On June 7, Addy Osmani published "Loop Engineering" on his blog, quoting Anthropic Claude Code lead Boris Cherny: "I don't prompt Claude anymore. I have loops running that prompt Claude and figuring out what to do. My job is to write loops." Peter Steinberger had already rephrased the same idea into a more sloganized version: **"You shouldn't be prompting coding agents anymore. You should be designing loops that prompt your agents."** Over the following days, articles on the same topic piled up across X and Substack, and "loop engineering" stabilized as a term.

A couple of days ago I wrote [blog186](/en/posts/blog186_prompt-context-harness-agentic-layers/), where I split LLM applications into four nested layers: prompt → context → harness → agentic. Once Loop Engineering showed up, where does it slot into that picture? **Osmani's own answer in the original article is "sits one floor above the harness" — he places Loop Engineering above harness engineering as a higher layer of abstraction.** But after reading the article I disagree with that placement. The more accurate framing is: **Loop Engineering is the single most important subset of harness engineering** — specifically, it's about "how the loop itself is designed". It doesn't replace prompt engineering, and it isn't the same thing as agentic engineering — it's a sub-discipline of harness engineering that got its own name.

This post wants to settle four things: what Loop Engineering actually means in Osmani's original article, why I disagree with him placing it above the harness, what the loop I have running on my own blog agent actually looks like, and how the loop will hurt you once it's running well.

## 1. Where the term came from: from "the person who hits enter" to "the person who writes loops"

A quick timeline:

- **March**: After Anthropic released Claude Code, Boris Cherny used the term "agent loop" publicly several times, but back then everyone read it as the ReAct-style loop inside Claude Code (model → tool → result fed back → model) — an **implementation detail**.
- **Earlier**: Peter Steinberger posted on X: "You shouldn't be prompting coding agents anymore. You should be designing loops that prompt your agents." (Osmani's article doesn't note the exact date — it links to one of his X statuses.)
- **June 7**: Addy Osmani published the long-form "Loop Engineering" piece, systematizing the concept and listing five components plus a shared state. This piece became the anchor for everything that followed.
- **The next few days**: A wave of same-topic pieces on Substack, Medium, Lushbinary, explainx.ai — most of them are second-order reads of Osmani's article.

Why does the term suddenly resonate? Two changes stacking on top of each other:

**Change one: the leverage of a single prompt is collapsing.** Tools like Claude Code, Cursor Composer, and Cline have stretched "one prompt → one observable chunk of work" from tens of seconds into tens of minutes, even hours. When one conversation can ship a feature, the marginal return on "spending another 30 seconds polishing the prompt" gets diluted — those 30 seconds of polish might save 2 minutes inside an agent's 30-minute run.

**Change two: agents can now run around the clock.** GitHub Actions, cron, Claude Code's `/loop` command, custom harnesses — all of these let an agent keep working when no one is watching. Once an agent can exist outside a session, "who hits enter" becomes the new bottleneck. If a human keeps hitting it, the agent spends most of its time waiting for instructions; only when a loop hits it can you actually max out the hardware.

Osmani's own line is: **"Loop engineering is replacing yourself as the person who prompts the agent."** Literally — replacing you, the person who hits enter. The meaning is very specific: it's not replacing your thinking, it's replacing those hands of yours that hit enter 100 times a day.

## 2. Why I'm pulling Osmani's "sits above harness" back inside the harness

In [blog186](/en/posts/blog186_prompt-context-harness-agentic-layers/) I drew the nesting like this:

```text
agentic ⊃ harness ⊃ context ⊃ prompt
```

Where does Loop Engineering hang? Osmani gives a very clear answer in his article — **"Loop engineering sits one floor above the harness."** He puts it **above** harness engineering as a higher abstraction, on the grounds that a harness is "the environment one single agent runs inside", while loops care about "letting the agent drive itself" — which is more macroscopic.

I disagree after reading it. I ran through three possible placements and ended up choosing one different from Osmani's:

**Option one: Loop is a new layer slotted in between, like prompt → context → loop → harness → agentic.**
Doesn't hold up. Every one of the five components Osmani lists (automation, worktree, skills, plugins, sub-agent + state) is a harness-domain concern — schedule is the harness's runtime control flow, worktree is the harness's isolation mechanism, skill is the harness's reusable unit for assembling context. None of them defines a new layer.

**Option two: Loop Engineering = a synonym for agentic engineering, or Osmani's "sits above harness".**
Both of these feel pitched too high to me. Agentic engineering is about "can this system reliably get a goal done end to end" — it covers evaluation systems, multi-agent collaboration, memory architecture, model routing, more macro-level things. Loop Engineering only talks about the loop itself — how a single agent drives itself, runs, stops, remembers. The reason Osmani puts Loop above harness is that he defines harness as "the environment one single agent runs inside" — that definition trims harness down very narrow (just the runtime shell of a single agent), so naturally loop gets pushed above it. But in blog186 I defined the harness as "the machine outside the model" — including the agent loop, tool feed-back, error retries, observability. Under my definition, the loop is part of the harness by construction.

**Option three: Loop Engineering is a subset pulled out from inside harness engineering (my position).**
Harness used to be a big bucket: tool definitions, IPC, error retries, observability, agent loop, guardrail — everything got dumped in. The value of Osmani's term is pulling "the loop itself" out as a research object — because that part is **the most easily overlooked and the hardest to get right**. Error retries have retry libraries, tool definitions have MCP, observability has Langfuse — but "when does the loop fire, what does the agent see inside it, when does it stop", that area of engineering practice has stayed fragmented. I fully endorse Osmani naming it; the disagreement is only about "hung above the harness or inside the harness" — and that depends on how wide you draw the harness boundary.

So a more accurate picture is:

```text
agentic engineering
└── harness engineering
    ├── tool calls and feed-back
    ├── error handling and retries
    ├── observability
    └── Loop Engineering  ← the loop itself
        ├── automation (when does it fire)
        ├── worktree (parallel isolation)
        ├── skill (reusable context assembly)
        ├── plugin (wiring up existing tools)
        ├── sub-agent (verification and division of labor)
        └── state (cross-loop memory)
    context assembly ⊂ harness
    prompt design ⊂ context
```

In this picture, Loop Engineering is not a new layer — it's a sub-discipline of harness engineering that got its own name. It maps directly onto the most visceral experience of "you wake up in the morning and the agent has finished a pile of work by itself", which is why it deserves its own name. The relationship is similar to "SRE" vs "operations" in DevOps — SRE isn't something separate from ops, it's the "use engineering to defend an SLA" branch of ops that got named separately.

Whether you agree with my relocation or stick with Osmani's "above the harness" depends on how you draw the harness boundary — it's a taxonomy-level disagreement, with almost no effect on engineering practice itself. Let's move on to the more hands-on part: how each of the five components is actually used.

## 3. Five components + one state: Osmani's list and my annotations

Osmani breaks a working loop into five components plus a shared state. I'm ordering them by importance, highest first (different from Osmani's original order — his is alphabetical), and I annotate each one with "what happens if you skip it":

### 1. State (shared memory) — easiest to skip, most painful to skip

**What it does**: a place that can be read and written across loops. Could be a markdown file, a Linear board, SQLite, a TODO.md — the medium doesn't matter, what matters is **a single source of truth**.

**What happens if you skip it**: loops don't know about each other, the agent starts from zero every time deciding "what's been done", and most of the time it either redoes things or misses things. Early versions of my own blog agent had exactly this disease — the daily "blog proposal" cron didn't look at what was proposed yesterday, and ended up proposing the same "AI agent security" piece three days in a row. I added a `memory/topic-ideas.md` and made the proposal cron `grep` it for dedup before running — problem gone instantly.

**The anti-pattern Osmani emphasizes**: stuffing state into the conversation history. A loop that depends on "where were we last time" — the kind that lives in session context — doesn't survive a single context window fill. State has to live outside the loop.

### 2. Sub-agent (verification / division of labor) — preventing self-grading

**What it does**: use a second agent to verify the output of the first one. Maker-checker pattern.

**What happens if you skip it**: an agent grading itself is approximately the same as no grading. My blog writing flow walked into this pit — the early version was one agent writing then reviewing itself, and every single review came back "passed". After I forced it to spawn an independent sub-agent using Opus for review (even when the main session was Sonnet), the first review round caught 5-10 issues. That's a qualitative difference.

**The key detail**: the review agent has to live in **an independent context**. If it's "let me think once more whether there's an issue" inside the same session, the model leans toward confirming itself. Physically separating into two processes / two conversations is what actually works.

### 3. Automation (schedule + trigger) — replacing "the hand that hits enter" with "events"

**What it does**: deciding when the loop fires. Could be cron, could be a webhook, could be a git push, could be the previous loop finishing.

**What happens if you skip it**: you go back to being the person who hits enter. Automation is what upgrades a loop from "I manually kick it off" to "it kicks off on its own".

**Two typical flavors**:
- **schedule-driven**: runs at fixed times (check hot topics at 8 AM, review the last 7 days every Monday)
- **event-driven**: fires on some event (PR submitted, issue created, previous agent finished)

Mixing them is more common. My blog agent's cron folder (`crons/*.md`) is schedule-driven, but inside each cron there are event-driven sub-flows (e.g., "if the proposal pool > 5 items, trigger the cleanup cron").

**There's a third flavor Osmani calls out specifically: goal-driven self-convergence.** In Claude Code this is the `/goal` command — you give a **verifiable target condition** ("tests all green", "lint clean", "PR merged") and the loop runs itself, decides whether it's there yet, and stops when it is. This is the most underrated form of automation — schedule and event drive the loop from outside, while goal has the loop **drive itself** to convergence. Without goal, the loop either grinds to its max-iteration cap (waste) or relies on a human to hit stop (which drops you right back into being the person who hits enter). The translation convergence in my blog agent below (section 4) is exactly goal-driven — I'll come back to it there.

### 4. Skill (reusable context assembly) — so the loop doesn't have to re-explain the project every time

**What it does**: package "how to do X kind of task inside this project" as a reusable unit. In Claude Code it's `SKILL.md`, in Cursor it's `.cursorrules`, in a custom harness it can be anything.

**What happens if you skip it**: every loop has to restate the project conventions in the prompt — token waste plus inconsistency.

**The difference vs prompt engineering**: prompt engineering cares about how to write one passage well; skill cares about "how this passage gets crystallized into a reusable asset". Skill is the engineered form of prompt — going from "a single well-written prompt" to "a versioned, project-wide prompt referenced by multiple loops".

### 5. Worktree (parallel isolation) — keep multiple loops from fighting

**What it does**: each agent running in parallel gets its own git worktree, no cross-contamination.

**What happens if you skip it**: two agents edit the same file at the same time, and you end up resolving the conflict by hand.

**Real scenario**: I once had an agent translating blog186 in parallel with another agent fixing an i18n routing bug. Both touched `src/pages/posts/[slug].astro`, and when the second agent finished the first one's changes were gone — it re-read the file from git HEAD. Switching to worktrees fixed it: the two ran on different branches, and the merge was up to me.

### 6. Plugin / Connector (wiring up external tools) — letting the loop affect the real world

**What it does**: MCP servers, API connectors, CLI wrappers — so the agent isn't just outputting text but actually changing databases, pushing commits, opening PRs, posting tweets.

**What happens if you skip it**: the loop can only run "thinking" tasks (writing reports, doing analysis), not "execution" tasks (deploys, inventory clearance, sending messages).

This is the most visible component, and ironically the most overrated. **Without state and sub-agent, wiring up a pile of plugins is just laying mines for yourself** — an agent that can post tweets but has no state will re-post the same tweet, and an agent with no sub-agent will only catch its own content errors after the tweet is out the door. Stabilize the internal loop first, then wire up external interfaces.

### Tooling cheat sheet: Codex and Claude Code both have it all

Osmani's article covers both OpenAI Codex and Anthropic Claude Code in parallel, and his bottom line is "five components plus state — both sides have them, just under different names". Here's the side-by-side, useful when you flip from one to the other:

| Component | OpenAI Codex | Anthropic Claude Code |
|------|------|------|
| Automation | Automations tab (pick project / prompt / cadence / local vs background worktree) | `/loop` command + `/goal` self-convergence + scheduled cron + GitHub Actions |
| Worktree | Built-in background worktree | System `git worktree` + hooks |
| Skill | `SKILL.md` | `SKILL.md` (same name, same format) |
| Plugin | MCP connectors | MCP connectors |
| Sub-agent | TOML sub-agent config | sub-agent commands + per-call model choice |
| State | DIY markdown / Linear | DIY markdown / Linear |

Both ship all five primitives; the difference is more about engineering taste — Codex turns automation into a GUI tab (better for "set it once and walk away"), while Claude Code goes the CLI-plus-hooks route (better for "the loop itself is also code"). Pick by team habit; the loop engineering thinking itself is unchanged.

## 4. The real loop on my blog agent: it runs, it stops, it lets me sleep

That's the abstract part done. Now the concrete version. Below is the loop architecture that's already been running on my blog agent for a while — I stood this up before Osmani named "loop engineering", but looking back, it lines up neatly with his five components, which makes it a fitting example. Each component is annotated with what it's implemented as:

```text
00:01 cron daily fires the "blog proposal" loop (automation: cron)
   ↓
read memory/topic-ideas.md (state: markdown file)
   ↓
read the src/data/blog/zh/ list, dedupe against existing titles
   ↓
run WebSearch to find 3 candidate topics
   ↓
spawn a sub-agent using Opus to review "any duplication / any value" (sub-agent)
   ↓
pass → append to topic-ideas.md
fail → regenerate (up to 2 rounds)
   ↓
notify the user (plugin: Telegram bot)
```

Once the user confirms a topic, the writing loop:

```text
"write blog191" fires the writing loop (automation: human-triggered, event-driven)
   ↓
read SKILL.md (skill: WRITE_RULES.md / REVIEW_RULES.md / PUBLISH_RULES.md)
   ↓
run the date command to get current time (this one is a forced rule that crystallized from feedback)
   ↓
write the Chinese-language markdown
   ↓
spawn a review sub-agent (sub-agent + Opus + independent context)
   ↓
issues found → edit directly → second review round (up to 3 rounds)
   ↓
pass → spawn a translation sub-agent (sub-agent) → translation review sub-agent (sub-agent) — these two steps internally form a mini goal loop, target condition "both zh and en versions reviewed: true", looping review-fix-translate until it holds
   ↓
update .last-deploy-commit (state)
   ↓
wait for user approval → deploy to production (plugin: ssh + git)
```

All five components show up cleanly in this loop:

- **automation**: cron files + human-triggered
- **state**: `memory/topic-ideas.md` + `.last-deploy-commit` + `MEMORY.md` index
- **sub-agent**: review after writing, review after translation, forced independent context + forced Opus
- **skill**: the three RULES.md files for WRITE/REVIEW/PUBLISH
- **plugin**: Telegram bot notifications, X posting, ssh deploy
- **worktree**: not actually used on the blog project because it isn't parallelized; the trade project does use it

The two deepest lessons from running this loop:

**Lesson one: sub-agent is 10x more important than prompt tuning.** I once spent two hours tuning the writing agent's system prompt to make the output "less AI-flavored", and the effect was worse than spending ten minutes adding a review sub-agent. The reason is that a generation model has inertia when it writes, while a review model has a "critic bias" that actually helps it spot issues. That's the fundamental reason maker-checker beats a solo maker.

**Lesson two: state has to live outside the loop, not inside the prompt.** Once I hard-coded "list of existing posts" into the writing agent's system prompt — the next day the post count changed, the prompt didn't update, and the agent wrote a duplicate topic. After I switched it so the agent actively `ls src/data/blog/zh/` and reads it on the spot, the problem never returned. This is exactly Osmani's line **"state must live outside the loop"**.

But these two lessons are just small bumps that show up once the loop is humming. The truly brutal part of Osmani's article is the point that the smoother your loop runs, the more likely you are to be collapsing while it does — he lists three debts the loop racks up.

## 5. What's really worth remembering from Osmani's article: the three debts the loop racks up

The first four sections are all about "how to build the loop". But after reading Osmani's article I have to say this: the part he writes most heavily, and the part readers are most likely to skip, is "**will building it hurt you**". He lists three debts the loop accumulates, and each one maps to a state of "the loop is running great, but you're already collapsing":

### 1. Verification debt — the loop saying "done" doesn't mean it's actually done

The loop spits out "task complete", but those four words are only the agent's **claim**, not a **proof**. CI being green doesn't mean the logic is right; a PR being open doesn't mean the code is maintainable; a commit being pushed doesn't mean the semantics weren't broken. Every loop run quietly racks up debt of "no one actually re-checked this", and the day interest comes due is the day there's a production incident.

Osmani's own line is brutal: **"Your job is to ship code you confirmed works."** — your job isn't to receive the loop's "done", it's to confirm it's actually done. The only way to pay down this debt is to physically write the human verification step into the loop — not into the prompt as "model, please double-check yourself", but as a stop point where the loop literally waits on a human or on a runnable test. My blog agent's deploy loop is exactly this — reviews all pass, but it doesn't auto-deploy; it waits for the user to confirm on Telegram. That "wait for a human" looks like a slowdown, but it's actually paying down verification debt principal.

### 2. Comprehension debt — code is produced faster than you can understand it

The loop lets you merge 10 PRs in a single night, but did you actually understand what those 10 PRs changed? Six months later production throws a bug and you're standing in your own repo staring at unfamiliar code — because it was always unfamiliar; you were the reviewer of the reviewer, never the actual reader. That's comprehension debt.

Comprehension debt doesn't explode immediately. It **accumulates, waiting for the next refactor, the next bug, the next new hire's onboarding**. The day you want to touch that module and find you don't know why it was written that way, don't dare to delete a single line, the loop has graduated from productivity tool to creditor. The way to pay it down is **slow reading** — for important modules, don't merge straight after the loop finishes; read through it yourself and note "why is it written this way" in a sentence or two. On my own low-risk blog setup, I let the loop rip. On the trade project, I read every PR myself before merging — slow, but no debt left behind.

### 3. Cognitive surrender — comfort is the real danger

This one is the most insidious. The smoother the loop runs, the more you want to use it — because "press the button and get a result" is just too pleasant. Then one day you notice you're no longer thinking about "should this thing be done at all" — you're only thinking about "which loop should I send it to". **The entry point for thinking gets swallowed by the loop.**

Osmani's line is **"the comfortable posture is the dangerous one"** — the position that feels comfortable is the most dangerous one. There's no tool that pays down this debt; only self-awareness. Ask yourself periodically: "if every loop were off today and every agent shut down, would I still know what to write next?" If the answer is fuzzy, your judgment has been outsourced and you need to take it back.

### One line: the loop changes your work, it doesn't replace you

There's one more line from Osmani's article that I keep coming back to: **"Two people can build the exact same loop and get completely opposite results."** The exact same loop — same automation, same sub-agent, same skill — in different hands, one person uses it to become a deeper engineer (because they spend the saved time understanding harder things) and the other becomes "the person who presses go" (because they spend the saved time avoiding understanding).

All three debts add up to one sentence: **the loop changes what you do, it doesn't delete you** ("The loop changes the work, it does not delete you from it."). Verification debt demands you confirm; comprehension debt demands you read; cognitive surrender demands you think. Pay all three down and loop engineering becomes leverage; skip any one and it becomes slow poison.

The first four sections were technique — how to build a loop that runs. This section is craft — how not to be hurt by it once it's running. The reason this article caught on isn't that Osmani made a checklist; it's that he put a mirror behind the checklist.

## 6. Prompt engineering isn't dying — but the leverage point really has shifted

There's a voice in the community saying "Loop Engineering is here, prompt engineering is over". Osmani's article does **not** say that — he only says the leverage point has shifted. My view matches his:

- Writing a good prompt is still useful, **but the ROI of a single prompt is dropping**. Same 30 minutes — tuning a prompt might buy you 5% more accuracy, designing a new loop might give you 3 more blog posts shipped while you sleep.
- Writing good context is still useful, **but context assembly is increasingly about "this moment inside the loop" rather than "given once at the start of a conversation"**. Skill and RAG are essentially techniques for assembling context dynamically.
- Harness isn't new, **but loop pulls the most painful sub-problem out for separate treatment**.

Going back to the nesting diagram in blog186, here's the updated version under my framing (Osmani's framing would lift Loop above the harness, at the same level as agentic — that disagreement is the section 2 stuff above):

```text
agentic engineering: can the system reliably finish a goal
└── harness engineering: the machine outside the engine
    ├── Loop Engineering: how the loop itself is designed ★ Osmani's naming
    ├── other harness sub-areas: tool calls, observability, guardrail
    └── context engineering: what to stuff into the window
        └── prompt engineering: how to write that passage well
```

The four-layer framework hasn't changed. In my version, Loop Engineering isn't a fifth layer — it's a sub-discipline of the harness layer that got its own name.

If you're writing an LLM application today, **ask yourself which layer you're stuck on first**:

- Prompt is tuned to death, accuracy still won't go up → it's most likely not a prompt problem, go look at context (is the window packed wrong)
- Context is assembled right, but the agent goes off the rails after two steps → look at the loop inside the harness (when to stop, when to verify, where's the state)
- Loop runs steady, but the system as a whole won't cooperate → that's when you go up to the agentic layer (split sub-agents, design evals)

Knowing which layer you're stuck on matters far more than fussing over terms. The value of "Loop Engineering" as a term is that it makes "the loop itself" worth thinking about as a separate engineering object — previously it was buried in the big "harness" bucket and no one studied it on its own. Now that it's been pulled out and given a checklist of five components + one state, you can at least take that checklist and audit your own system: is the state outside? is the sub-agent independent? is automation event-driven or am I still hitting it by hand? has the skill been crystallized? is worktree isolating things? are the plugins wired correctly?

Walk through the checklist and the loop runs. All that's left — go to sleep.

---

**Further reading**:
- [Addy Osmani - Loop Engineering](https://addyosmani.com/blog/loop-engineering/) - the original source of the term, the anchor article for the five-component checklist
- [Cobus Greyling - Loop Engineering Playbook](https://cobusgreyling.substack.com/p/loop-engineering-playbook) - companion GitHub repo [cobusgreyling/loop-engineering](https://github.com/cobusgreyling/loop-engineering) collects directly reusable loop templates
