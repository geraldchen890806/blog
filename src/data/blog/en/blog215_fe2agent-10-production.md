---
author: Gerald Chen
pubDatetime: 2026-08-11T09:00:00+08:00
title: "From Sweating the Bundle to Sweating the Tokens: Shipping the Agent to Production, Then Giving It a Face"
slug: blog215_fe2agent-10-production
featured: true
draft: true
reviewed: false
approved: false
tags:
  - AI Agent
  - Frontend
  - Productivity
  - Claude Code
description: "Frontend ships by sweating bundle size; agents ship by sweating the token bill — same craft either way: put a visible gate on invisible growth. Part 10 (the finale) of the fe2agent series — tracing, three-layer budget breakers, checkpoints, and distribution-drift checkups, with tiny-agent v1.0 (trace.js three-column cost ledger + dollar circuit breaker + checkpoint/--resume), plus a replay of that $4200 night through three gates."
---

## 1. The Pit

Last month I finally put my blog auto-publishing agent on cron for real. The last commit before going live didn't add a feature; it added two lines of config: a per-task budget cap of $8, and a 15-minute timeout.

Not because it runs away often — quite the opposite: twenty-nine days out of the month it behaves impeccably. It's because **one runaway is all it takes** to ruin my week: a while loop, an API key with no cap, and a whole night with nobody watching — what kind of invoice those three can grow into when they line up, the $4200 night in [blog195](/en/posts/blog195_loop-engineering-three-debts-playbook/) already demonstrated, and I had no desire to reproduce the experiment personally.

The moment I typed `const BUDGET_USD = 8`, I froze for a couple of seconds — the muscle memory was too familiar. Years ago, the first time I wrote `performance: { maxAssetSize: 250000 }` into webpack.config.js, it was the exact same motion: not because the bundle blew the limit every day, but because without that line, the day it did, you'd never know.

Same craft, both times: **put a visible gate on invisible growth.**

This is post 10 of the series "From useEffect to Agent Loop" — the finale. The first nine posts raised the agent from a 32-line while loop into something that manages context, uses tools, remembers, self-checks, spawns clones, and can be evaluated; this post walks the last stretch of road: shipping it to production — tracing, cost circuit breakers, checkpoints, and that new species of production incident where nothing errors and the agent just slowly gets dumber.

## 2. The Bridge

One line:

> **Frontend ships and you sweat the bundle; the agent ships and you sweat the tokens — the budget discipline ports over intact. Except a bundle is one compile-time number and tokens are a runtime stream, so the gate has to move from the build script into the main loop.**

```
Shipping React:                   Shipping an agent:

  bundle (compile-time asset)       token (runtime stream)
    │                                 │
    ▼                                 ▼
  maxAssetSize ──► build alarm      BUDGET_USD ──► breaker + checkpoint
    │                                 │
  overage dies in CI                overage dies on the invoice
  (one gate before launch)          (watched every single turn)
```

The gate on the left is a one-time inspection — pass the build once and you've passed forever. The gate on the right is on duty every turn, because the money flows every turn.

## 3. The Real

### 3.1 Tracing: the network tab, agent edition

When a frontend engineer debugs a production issue, the first reflex is opening the network tab: which request is slow, which one 4xx'd, who's blocking whom in the waterfall. Once your agent hits production you need exactly the same thing — except nobody hands you a ready-made panel. You record it yourself.

The smallest unit is the span: one entry per LLM call (duration, input/output tokens, cost), one entry per tool call (duration, success or failure). When a task finishes, spread the spans out by time and you've got that task's waterfall: which turn sat waiting on model prefill, which tool ate 80% of the latency, which turn the model started circling the same pothole — all of it laid out on the time axis.

An agent without tracing has production incidents that cannot be investigated. A user says "it ran for forty minutes last night and produced nothing" — without a trace, you can't even tell whether it was stuck on a slow tool, trapped in a retry loop, or veered off course at turn 12; with a trace, one glance sees through it: starting at turn 9, same tool, similar arguments, called 11 times in a row. In frontend you wouldn't deploy a site with no monitoring wired up; same for agents — only the unit being monitored changes from "requests" to "turns."

What goes in a span — one piece of hard-won experience: besides duration and tokens, weld in the task id and the turn number too, so blog07's audit log (who approved which disk write) and these spans land on the same timeline — incident forensics needs a complete sentence like "on turn 14 the model requested write_file, the confirmation gate approved, and the build broke right after the write." Three logs each telling their own story can never assemble that sentence.

That `[turn · in=… out=… cache_read=…]` stderr line from v0.2 back in blog02 — at the time I said "build observability first, then talk about optimization" — grows into its full form in v1.0: JSONL on disk, with durations, with cost conversion, and a summary table when the task ends. Logs are for a human to skim; traces are evidence you keep for the incident. This is also a growth pattern that recurs across the series: many organs weren't invented out of thin air by any single post — they started as an unremarkable early log line, or a crash deliberately left unfixed, and slowly grew out in the direction production pulls.

### 3.2 Cost engineering: three budget layers, and the last breath

A production budget isn't one number; it's three layers of gates, each catching a different kind of runaway:

- **Token budget (per turn)**: `max_tokens`, catches "a single reply running away" — the gate that's been there since v0.1;
- **Step budget (total turns)**: `max_steps`, the hard gate blog06 installed, catches "the loop never exits" — step debt's production meaning gets cashed out here;
- **Dollar budget (per task)**: `BUDGET_USD`, catches "every step legal, the sum bankrupt." Both earlier layers can stay in bounds, every single turn perfectly polite — and thirty turns of full replay stacked up still burns double digits. blog02's compounding curve is visible only at the money layer.

And one layer that's easy to forget: the **time budget**. My 15-minute timeout doesn't guard money; it guards "one wedged task squatting on the queue while everything behind it backs up." Four gates, four dimensions, and none can stand in for another. And one more easy-to-miss line item: blog08's subagents burn money inside their own loops — if the dollar budget only watches the main loop, the clones' bills run loose outside the gate; have each subagent report its in/out back into the main trace on the way out so it all accumulates in one place, and only then does the breaker have the whole fleet under control.

Where do you set the breaker line? blog01 planted a sentence that gets formally honored here: **stop early before the cliff, and keep one last breath to write the checkpoint**. My breaker sits at 90% of the budget — stop at $7.2. The remaining 10% isn't waste; it's reserved for a dignified exit: serialize the messages array to disk, print the trace summary table, tell the caller "here's what I spent, here's where I stopped, here's how to keep going." A breaker that cuts power only at 100% saves the money and loses the work; stopping early at 90% plus a checkpoint keeps both.

While we're at it, where the $8 comes from — not a hunch. Before launch I took two weeks of traces and spread task costs into a distribution: most tasks around $0.5, the most expensive single run $3.1. Setting the breaker at more than double the record means a trip is by definition an anomaly, and normal tasks never get hurt; set it at $4 to save money and sooner or later a legitimate big task gets chopped in half — and then you'll start doubting the breaker itself. A gate that's cried wolf a few times is a gate nobody trusts.

Last one, where frontend folks most underrate the enemy: **rate limiting and auth**. Your agent endpoint is among the most expensive HTTP endpoints per request on the entire internet — when a script hammers an ordinary API, you lose bandwidth; when it hammers an agent API, someone is mining with your API key. The most unjust invoice I've ever seen wasn't a runaway agent — it was an unauthenticated demo endpoint discovered by a subnet-scanning script, which then dutifully ran tasks for a total stranger all night long. Auth, per-user rate limits, a daily total-spend breaker: before production, not one of them is optional.

### 3.3 Deployment and observation: the scariest incidents throw no errors

Deployment shapes come in two. Long-running process: fast to respond, but the messages array and in-memory state now have lifecycles you manage yourself. Spawn-per-task (cron / serverless): born clean every time, dies when the task ends, all state lives in on-disk checkpoints and memory files. My publishing agent is spawn-per-task — because the discipline from blog06 is easiest to keep in this shape: **either finish, or roll back clean** — if any step fails, revert everything already changed before exiting, and leave no debris. Making a long-running process "leave no debris" is twice as hard. Spawn-per-task also carries a hidden bonus: every task is born with a clean context, so one task's residue can't skew the next — the same logic behind blog08's subagent isolation, replayed at the deployment layer.

But the deadliest thing in production observation isn't errors. Errors are easy: retry, rollback, alert — blog06 covered the whole kit. The deadliest thing is **distribution drift**: no exception, no red text; the agent just slowly gets dumber. The model vendor quietly ships a point release and your prompt's semantics drift a notch on the new version; a tool you depend on quietly slows down and the agent starts retrying at the edge of the timeout; your users' question distribution quietly shifts and your test cases no longer cover the new long tail. None of these counts as an incident on its own; stack them for three weeks and the task pass rate slides from 92% to 71% while the monitoring dashboard stays solid green.

The fix is blog09's eval set playing a different role in production: **not an entrance exam before launch, but a periodic checkup after it**. Run the fixed eval set weekly, and watch not "pass or fail" but the trend of the pass rate — a checkup report means nothing on its own; the comparison against last month is the signal.

## 4. The Work: tiny-agent v1.0

### 4.1 What v1.0 Grows

`git checkout v1.0` gets you the final cut: [github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent). The diff from v0.9:

- New file `src/trace.js`: a `Trace` class that wraps every LLM call / tool call in a span, writes JSONL to disk, and converts cost in three separate columns — input / output / cache
- `src/agent.js` gains the `BUDGET_USD` breaker: at 90% spend it stops early, serializes messages into a checkpoint, and `--resume` picks it back up — the thread blog02 planted when covering Claude Code's `--resume` gets tied off here
- README gains a 10-item "production checklist": budget, timeout, rate limiting, auth, trace persistence, checkpoint, rollback discipline, eval checkups, alert thresholds, key management

### 4.2 The Core Code

```javascript
// src/trace.js
import { appendFileSync, mkdirSync } from "node:fs";

const PRICE_PER_M = { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 };

export class Trace {
  constructor(taskId) {
    mkdirSync("traces", { recursive: true });
    this.file = `traces/${taskId}.jsonl`;
    this.cost = { input: 0, output: 0, cache: 0 };
    this.steps = 0;
  }

  async span(type, meta, fn) {
    const t0 = Date.now();
    const result = await fn();
    const span = { ts: t0, type, duration: Date.now() - t0, ...meta };
    if (type === "llm") {
      const u = result.usage;
      span.in = u.input_tokens; span.out = u.output_tokens;
      span.cacheRead = u.cache_read_input_tokens ?? 0;
      span.cacheWrite = u.cache_creation_input_tokens ?? 0;
      this.cost.input += span.in * PRICE_PER_M.input / 1e6;
      this.cost.output += span.out * PRICE_PER_M.output / 1e6;
      this.cost.cache += span.cacheRead * PRICE_PER_M.cacheRead / 1e6
                       + span.cacheWrite * PRICE_PER_M.cacheWrite / 1e6;
    }
    this.steps += 1;
    appendFileSync(this.file, JSON.stringify(span) + "\n");
    return result;
  }

  get totalUSD() { return this.cost.input + this.cost.output + this.cost.cache; }

  summary() {
    const f = n => `$${n.toFixed(2)}`;
    console.error(`[trace · steps=${this.steps} · input=${f(this.cost.input)}` +
      ` output=${f(this.cost.output)} cache=${f(this.cost.cache)}` +
      ` · total=${f(this.totalUSD)}]`);
  }
}
```

In the agent.js main loop, the breaker is just this small block:

```javascript
const BUDGET_USD = 8;

// after each turn's messages.create, before the next turn starts:
if (trace.totalUSD >= BUDGET_USD * 0.9) {
  const file = ctx.checkpoint();   // serialize the messages array to disk
  trace.summary();
  throw new BudgetExceeded(
    `spent $${trace.totalUSD.toFixed(2)}, checkpoint at ${file}, rerun with --resume`
  );
}
```

Three points, driven all the way home:

**One, splitting cost into three columns is the most important design in this cut.** The PRICE table has four rates: input $5 / output $25 (Opus list price, the same convention as blog02), cache hits billed at 0.1x and cache writes at 1.25x — hence cacheRead at 0.5 and cacheWrite at 6.25. With the three columns split out, one look at the summary table tells you who's burning the money. This design isn't something I thought up — it was beaten into me by an invoice; the crash section in 4.3 tells that story. Two easy-to-miss line items to nail down while we're here: the mini-call that compresses history back in blog02 is also a real, billed `create` — it has to go inside a span too, or in a long task the breaker line reads artificially low exactly when you most need it accurate; and the span wraps *outside* withRetry, recording only the successful attempt's usage — a request that failed its retry has no usage to record.

**Two, the breaker check sits after create and before the next turn — the position matters.** usage lives in the response — you only learn what you spent after the money is gone, so you can never block "this turn went over"; you can only block "the next turn doesn't start." That's also why the line sits at 90% and not 100%: before the true ceiling you must leave at least one turn of headroom, otherwise "stopping early" degrades into "rubber-stamping after the fact."

**Three, checkpoints have no magic in them.** It's the messages array JSON-serialized to disk; `--resume` reads it back and the while loop keeps going — blog02 covered this: Claude Code's `--resume` is exactly this plain. What matters is the semantics: `BudgetExceeded` is not failure, it's a pause. A human glances at the trace; if it wasn't off the rails, raise the budget and continue; if it was, the checkpoint still saved every earlier turn's work — fix things and resume.

### 4.3 Give It a Spin

```
$ node src/agent.js "read the three most recent JSONL files in traces/ and write a step/cost summary into report.md"
[turn · in=5120 out=204 cache_read=0]
[tool · list_dir · 0.1s · ok]
[turn · in=5610 out=185 cache_read=4600]
[tool · read_file · 0.1s · ok]
...
[tool · write_file · 0.1s · ok]
[trace · steps=23 · input=$0.71 output=$0.13 cache=$0.05 · total=$0.89]
done. report.md generated
```

One summary table at the end of the task: three cost columns plus the total. $0.89, nowhere near the $8 breaker line — most days it's exactly this boring, which is precisely what you want.

Pick up one habit while you're here: skim the traces/ directory daily for total cost and the step-count distribution. When it's boring, it's your cost model; when it's not, it's your first alarm — any task whose step count suddenly doubles or whose cache column suddenly zeroes out, open its JSONL and look for two minutes; nine times out of ten you'll catch a bad habit mid-formation: someone changed the prompt, the cache prefix got dirtied, some tool started slowing down.

**Crash section (mandatory)**: the first version of trace.js's cost formula only counted output tokens. The intuition felt airtight: "generation is what costs money — how much can reading in possibly cost?" — and output's unit price being 5x input's only cemented it. After a week of running, mental math off the summary tables put the week at about $11; the invoice arrived: 74.

The extra $63 was all input — 85% of total cost. The reason was written in blog02 long ago; I just had never connected that curve to a bill: **full replay is compound interest**. Output is produced once per turn, a few hundred tokens and done; input re-pays the entire history of all previous turns, every single turn — in a 20-turn task, by turn 20 a single turn replays more history than the whole task's output combined. That week output totaled 440k tokens; input was 12.6M: a 5x unit-price disadvantage, flattened by a nearly 30x volume advantage.

The fix is the version you just read: count both input and output, book cache_read's discount honestly, three columns in the summary table. Ever since, one glance at the table tells me what to fix: input column fat — go check the compression threshold and the cache hit rate; output column fat — go check whether I've let it write long replies it had no business writing. **The point of cost observability isn't knowing how much you spent — it's knowing where it went.**

### 4.4 One Mapping: That $4200 Night, Replayed Through Three Gates

The LeanOps $4200-in-one-night incident from [blog195 "Loop Engineering: Three Debts"](/en/posts/blog195_loop-engineering-three-debts-playbook/) — a case this series has been citing since blog01 — gets its formal closing replay today through v1.0's three gates:

- **Budget breaker**: an $8-per-task breaker line would have pinned it down within the incident's first few dozen turns — what separates $4200 from $8 isn't model capability, it's whether that line exists;
- **Tracing**: the span sequence would point at exactly which turn it fell into the "retry — fail — try again from a different angle" loop — no guessing at the postmortem; the evidence lies timestamped in the JSONL;
- **Checkpoint**: the moment the breaker trips, twenty-plus turns of valid work get serialized and saved; fix the bug the next day, `--resume`, and none of the work gets redone.

Not one of the three gates is high tech; together their effect is: this class of incident can no longer reach production. The live-ticking cost number in Claude Code's status bar is the productized form of the same machinery — behind that little number you glance at every day sits a Trace class. The only difference: they drew the table into a status bar; you printed yours to stderr.

### 4.5 Moonshot Footnote

> Running v1.0 on a domestic model, trace.js changes in exactly two places: swap the PRICE table for that model's list prices; swap the usage field names from Anthropic's `input_tokens` / `output_tokens` to the OpenAI-style `prompt_tokens` / `completion_tokens`. Watch the cache column: Moonshot / DeepSeek's context caching hits automatically on the server side (covered in blog02's footnote), and the hit volume has its own usage field (e.g. `cached_tokens`) — book that discount just as honestly, or you'll overestimate your cost and underestimate what the cache is worth. The breaker, the checkpoint, the checkup: not a single line changes. Those three have nothing to do with the model and everything to do with production.

## 5. The Boundary: Where the Analogy Breaks

The bundle analogy carried most of this post: performance budgets, launch checklists, observability before optimization — frontend's production discipline ports over almost verbatim. But three places it can't carry the weight, and I owe you those in full.

**One: Sentry catches exception events; what kills agents in production is distribution drift.** Frontend monitoring's worldview is "trouble always signals": JS error, white screen, 5xx — there's always a red line to alert on. Agent production incidents are quiet by default — no exception, no stack trace, just a pass rate sliding from 92% to 71% over three weeks. The alerting system has to upgrade from "catching events" to "catching trends," and trends can only be measured by running the eval set on a schedule.

**Two: a bundle is a compile-time asset; tokens are runtime traffic.** maxAssetSize is one number, verified once at build time, passed forever; token spend fluctuates with task difficulty and the long tail of user input — the same agent costing $0.4 today and $6 tomorrow is perfectly normal. So the budget can't be one number; it has to be **a distribution plus a breaker line** — p50 to build your cost model, p99 to set the breaker. You need both, and neither substitutes for the other.

**Three: frontend code doesn't change after launch; the agent's "code" does.** The bundle you deploy, once its hash is fixed, behaves the same way three years from now. Not the agent — one silent model-vendor upgrade is someone swapping out your runtime in the middle of the night: syntax fully compatible, semantics drifting. You changed nothing; the behavior changed. This is why blog09's evals aren't a one-time pre-launch acceptance test but a post-launch routine physical — you think you're maintaining a static artifact; you're actually maintaining **a relationship with a living model**.

One line to close it: **frontend production is set the moment you ship; agent production starts changing the moment you ship.**

The steering-wheel thread has run for ten posts; time to tie it off. blog01 handed the wheel over to a probabilistic function, blog02 gripped context — the one steering wheel you still have your hands on, blog03 counted the spoke on that wheel labeled tools... And today, nearly two years after handing the wheel over, what I've learned isn't how to grab it back — it's how to pave the road, hang the lights, paint the lines: tracing is the streetlights, budgets are the guardrails, checkpoints are the emergency lane. The car is still its to drive. But this road, by now, is a road engineered for a probabilistic driver.

## 6. The Hook: The Finale

Ten posts walked; one last gathering of the skeleton:

```
loop(01)     ← render loop        fault tolerance(06) ← Error Boundary
context(02)  ← state              permissions(07)     ← route guards
tools(03)    ← action/reducer     subagent(08)        ← Web Worker
prompt(04)   ← CSS                eval(09)            ← testing
memory(05)   ← localStorage       production(10)      ← shipping
```

From the 32-line while loop of the first post ([blog206 "An Agent Is Just a While Loop?"](/en/posts/blog206_fe2agent-01-agent-loop/)) to today's v1.0 — traceable, breaker-protected, able to climb back up out of a checkpoint — **the craft didn't change; the client did.** State management, component isolation, error boundaries, testing, monitoring: every muscle you built in frontend is still in use; only the thing you defend against changed, from "users clicking wherever" to "the model saying whatever." Not one of the ten posts taught you a new framework — because a framework was never what you lacked; what you lacked was the one calibration that points old craft at a new target. The spine, recited one final time: **agent engineering = building engineering certainty on top of an uncertain function.**

tiny-agent wears its v1.0 tag now: [github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent). Grown from 32 lines into a dozen-odd files, every organ mapping to one post in the series — `git log --oneline` is this series' table of contents.

The main line ends here; two side stories are on the way. One on MCP — the npm of agent-land, where tools go from "you hand-write them" to "you install packages," and all the old package problems (versions, trust, supply chain) come back along for the ride. The other on the agent's UI — because an agent needs a face eventually: a chat window, streaming output, loading states for tool calls, and blog07's confirmation gate needs a button somebody can actually click. After all the wandering, it ends back in frontend — and that's when your home-field advantage finally gets to shine.

The last paragraph is for you. You can now hand-build an agent that does real work, checks itself, and survives production. Go read the Claude Agent SDK or LangChain source — you'll find that every design that once scared you off is one you can now name by what it defends against: that executor is blog01's loop, that memory is blog05's retrieval, that callback plants blog10's span. The terminology wall still stands — but you're standing on this side of it now. That's the promise this series opened with, and it's ready for inspection.
