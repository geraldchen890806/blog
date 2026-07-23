---
author: Gerald Chen
pubDatetime: 2026-08-05T09:00:00+08:00
title: "A Subagent Is Just a Web Worker: If the Brief Was Vague, Don't Blame the Contractor"
slug: blog213_fe2agent-08-subagent
featured: true
draft: true
reviewed: false
approved: false
tags:
  - AI Agent
  - Frontend
  - Productivity
  - Claude Code
description: You think spawning a subagent is starting a thread; really you're hiring a temp — it sees none of the parent agent's history, and every assumption missing from the brief gets filled in by guesswork. A task description is a lossy, schema-free serialization. Part 8 of the fe2agent series, with tiny-agent v0.8 (spawnSubagent + a delegate_task tool + child-loop accounting).
---

## 1. The Pit

The workflow that produces this series is itself a parent-child agent pair: the main loop drafts, then spawns a review agent to poke holes independently. One day last month I got lazy, and the brief I gave the review agent was a single sentence: "Review this post for quote-mark issues."

It ran fast and came back with a dense report, 42 items long: curly quote on line 12, curly quote on line 15, curly quote on line 23... I clicked through, and every single one was a full-width double quote from Chinese-context prose — perfectly legitimate Chinese punctuation in the body text. Our house rule is written plainly: the series body uses straight half-width quotes, and what's banned is English curly quotes; Chinese full-width quotation marks are normal punctuation, not a violation. 42 items, all false positives.

blog04 told the other half of this incident: the eventual fix was adding one more rule to patch the previous rule — that was the cascade angle. But I never told you the root cause back then. The root cause is that the house rule — "Chinese full-width quotes don't count as curly quotes" — lived in my conversation history with the main loop and lived in my head, everywhere except in the one-line brief I sent the review agent. It's a brand-new loop; it cannot see any of my history. **It isn't dumb. It just knows exactly one thing: the sentence I wrote in the brief.**

Whatever postMessage can't carry across, a prompt can't carry across either.

This is post 8 in the series "From useEffect to Agent Loop." blog07 got one agent's hands under control; this post is about what happens when the workload outgrows one agent: context fills up (blog02's invoice curve is still climbing), responsibilities blur together (blog06's crash section already proved acceptance needs an isolated context) — it's time to spawn clones. And spawning clones has a frontend counterpart so precise it's almost funny: the Web Worker.

## 2. The Bridge

One line:

> **A subagent is a Web Worker: separate thread, separate memory, can't touch your DOM; whatever you postMessage over is all it will ever know — if the brief was vague, don't blame the contractor for the shoddy work.**

```
React:                             Agent:

  main thread                        parent agent (messages_A)
    │ postMessage(data)                │ delegate_task(brief)
    ▼                                  ▼
  Worker (separate thread)           subagent (fresh messages_B)
    │ can't touch the DOM              │ can't see messages_A
    │ posts result back when done      │ returns only its final text
    ▼                                  ▼
  main thread merges in onmessage    parent reviews and merges
```

The isolation on the left is granted by the browser: a Worker is born with no window and no document. The isolation on the right is granted by structure: a subagent is one brand-new API loop, and it cannot see a single byte of the parent's messages array. Isolation is a good thing — but the price of isolation, serialization, is the same on both sides too.

## 3. The Real

### 3.1 Why split: three motives

When do you reach for a Worker in frontend? The main thread is jammed (heavy compute freezing the UI), logic needs isolating (a chunk of pure computation that shouldn't touch the DOM), or you want to eat more cores (run several copies in parallel). The three motives for splitting off a subagent map one for one:

**One, context is full.** Remember blog02's invoice curve — full replay, every turn re-paying the bill for every previous turn. Run a long task for 30 turns with all the exploration, trial and error, and tool output piled into one messages array, and it gets expensive, slow, and "lost in the middle" all at once. After the split, the subagent runs its dozen-plus tool-calling turns inside its own loop; all the intermediate work stays in there, and the parent receives exactly one final conclusion — **intermediate state is use-and-discard; it never enters the parent's ledger**. This and compression (blog02) are two exits from the same problem: compression shrinks the history; splitting keeps the history from ever happening to you in the first place.

**Two, responsibilities need isolating.** blog06's crash section planted the line "acceptance needs an isolated context": in my first verifier I passed it the entire conversation history, it watched the working model struggle all the way through, empathized, and ruled PASS. The reviewer must not see the drafter's self-defense — the moment it does, it stops being a reviewer and becomes a teammate. Isolation isn't just cost savings; it's what makes the role possible at all.

**Three, parallelism.** Three files to change, three agents running at once; you can't push down the latency of a single LLM call, but you can make three latencies overlap in the same stretch of wall-clock time. This is the most multicore-like motive, and the one that needs the least explaining.

### 3.2 The semantics of isolation: a brief is a lossy serialization

Why can't a Worker touch the DOM? Because it's not on the main thread, memory isn't shared, and postMessage is the only way to move data. And postMessage has a famous boundary: structured clone — what can be cloned crosses over (objects, arrays, TypedArrays), and what can't throws a DataCloneError on the spot (functions, DOM nodes, references trapped in closures).

The subagent's isolation semantics are nearly identical — the shape of "what can't cross" is just sneakier. A subagent is one brand-new messages.create loop, and its messages array begins at the line of your brief. It has none of your conversation history, none of the rapport you and the main loop ground out over time, none of the "does this even need saying" default assumptions in your head. **A brief is a lossy serialization: structured clone can't carry functions across; a brief can't carry across anything you didn't write down.**

And it's worse than postMessage — when postMessage hits something it can't transfer, it throws DataCloneError immediately and you know on the spot; when a brief drops information, there is no error at all, and the subagent takes the mutilated requirements and works away at full cheerful throttle. That's exactly where the 40-plus false positives at the top came from: the house rule "Chinese full-width quotes don't count as curly quotes" was the "closure reference" that couldn't cross — it lived in my history, got dropped when serialized into the brief, and the drop made no sound whatsoever.

So writing a brief for a subagent is the same craft as writing a requirements doc for a contractor: **the other side's entire world is the few lines in your document**. When outsourced work comes back bad, nine times out of ten it isn't because the contractor is dumb — it's because the requirements doc silently assumed too many "surely you already know this." A folk remedy for self-checking: after writing the brief, don't rush to spawn — first ask yourself one question: could a new hire who started today and has attended zero meetings do the job right with only these lines? If the answer is no, the missing part is exactly the implicit assumption you haven't serialized yet.

### 3.3 Collecting results: agree on a structure, the parent adjudicates

When the Worker finishes computing, it postMessages a data object back, and the main thread consumes it in onmessage. When a subagent finishes, what comes back to the parent is its final block of text. Two lines of engineering discipline here:

**One, the return needs an agreed structure.** Don't let the subagent report in prose — "I had a look, overall it reads well, a few small issues..." — the parent can't consume that programmatically. Hard-code the expected output format into the brief: return JSON, return a list with fixed fields, every item with a line number and the original text. My format requirement for the review agent is now one sentence: "One issue per line, format `line number | original text | issue type`; if there are no issues, reply NONE and nothing else." This is giving the data that comes back over postMessage a schema — in frontend you would never let a Worker return a paragraph of natural language for the main thread to guess at.

**Two, the parent owns merging and adjudication.** Results from multiple subagents may overlap or flatly contradict each other; merging, deduplicating, and making the final call is the parent's job, and it cannot be delegated onward — delegating it out is just another layer of the exact same problem. You've gone from driver to dispatcher, but a dispatcher can't stare at a pile of radio messages and say "sort it out among yourselves."

And one discipline in reverse: **when not to split**. When the task itself needs continuous context — to change one function, the previous twenty turns of exploration are necessary background, and splitting it off means sending a new hire in naked. When subtasks are tightly coupled — A's output is B's input, and "parallelizing" them just makes both sides wait on each other. Split for splitting's sake and what you get isn't parallelism — it's two briefs' worth of tax.

## 4. The Work: tiny-agent v0.8

### 4.1 What v0.8 grows

The diff from v0.7 to v0.8:

- New file `src/subagent.js`: `spawnSubagent(brief, tools, { maxSteps })` — spins up an independent messages array + an independent loop, and returns only the final text to the parent
- `src/tools.js` registers a new tool `delegate_task`: the model itself decides when to outsource (blog01's trichotomy lands once more: who decides the next step — the model)
- Every time a subagent clocks out, stderr gets one line — `[subagent · steps=… in=… out=…]` — a subagent's tokens are money too; the ledger doesn't get waived just because it's a temp

### 4.2 Core code

```javascript
// src/subagent.js
import Anthropic from "@anthropic-ai/sdk";
import { runTool } from "./tools.js";

const client = new Anthropic();
const MODEL = "claude-opus-4-7";

export async function spawnSubagent(brief, tools, { maxSteps = 10 } = {}) {
  const childTools = tools.filter(t => !["delegate_task", "write_file", "save_memory"].includes(t.name)); // no spawning grandchildren, no write tools either
  const messages = [{ role: "user", content: brief }];
  let steps = 0, inTok = 0, outTok = 0;

  while (steps < maxSteps) {
    steps++;
    const res = await client.messages.create({ model: MODEL, max_tokens: 1024, tools: childTools, messages });
    inTok += res.usage.input_tokens;
    outTok += res.usage.output_tokens;
    messages.push({ role: "assistant", content: res.content });

    if (res.stop_reason === "end_turn") {
      process.stderr.write(`[subagent · steps=${steps} in=${inTok} out=${outTok}]\n`);
      return res.content.find(b => b.type === "text")?.text ?? "";
    }
    if (res.stop_reason === "tool_use") {
      const toolResults = [];
      for (const b of res.content.filter(b => b.type === "tool_use")) {
        const result = await runTool(b.name, b.input);
        toolResults.push({
          type: "tool_result", tool_use_id: b.id,
          content: result.error ?? result.content, is_error: !!result.error,
        });
      }
      messages.push({ role: "user", content: toolResults });
    }
  }
  return `[subagent aborted: hit maxSteps=${maxSteps}]`;
}
```

The delegation tool registered into `tools.js`:

```javascript
{
  name: "delegate_task",
  description: "Delegate a self-contained subtask to a fresh subagent. It sees ONLY your brief—no conversation history. Write the brief in three parts: task, constraints, expected output format.",
  input_schema: {
    type: "object",
    properties: {
      brief: { type: "string", description: "Complete instructions. The subagent knows nothing you don't write here." },
    },
    required: ["brief"],
  },
}
```

Four points, driven all the way home:

**One, isolation isn't a switch — it's "the arrays were never the same array."** spawnSubagent's first real line: `const messages = [{ role: "user", content: brief }]` — the subagent's world begins on this line. There's no "disable sharing" configuration anywhere, because there was never any sharing to disable: two arrays, two loops, two invoices. blog02 said "two sessions' messages arrays each live out their own lives" — this time you're making them live apart **on purpose**.

**Two, delegate_task being a tool means "when to outsource" is also handed to the model.** You could perfectly well call spawnSubagent by hand in your own code — that's workflow-style splitting, where what gets split is hardcoded by you. Wrap it as a tool and register it, and the model reads the description and judges for itself that "this subtask is self-contained enough to be worth a clone" — that's agent-style splitting. The "who decides the next step" row in blog01's trichotomy table gets drawn one more time, right here.

**Three, subagents need maxSteps too.** The hard brake blog06 installed on the main loop — the child loop doesn't get to skip a single one; temps fall into the "let me just try once more" self-persuasion spiral too. And a runaway subagent is stealthier than a runaway main loop: it spins idle inside its own loop while all the parent sees is one delegate_task that never returns, like a Promise stuck at pending — you don't even get a progress bar.

**Four, that stderr line is a ledger and a physical exam.** How many steps, how much in/out — one glance tells you whether the outsourcing was worth it: a 3-step, 3k-token subtask is pure profit to delegate; one that comes back after 2 steps? Maybe the job never needed splitting at all — you paid the full "new-hire onboarding cost" (the background exposition in the brief) for five minutes of work.

Three implementation details in passing. One, runTool went from sync to async in this version (executing delegate_task requires an await) — and not just in subagent.js: the result-stuffing section in agent.js's main loop switched from `.map` to `for...of` too, and the runTool call right after the gate waves a tool through got an `await` bolted in front of it. Two, the `childTools` filter strips out two kinds of thing: delegate_task — **clones don't get to spawn clones**, otherwise what you harvest isn't parallelism, it's a runaway process tree and a runaway invoice; and the write-class tools — the child loop has none of blog07's confirmation gate, so rather than let a clone charge unattended into the disk-writing intersection, you hand it a read-only toolbox on the way out the door. Three, tools.js and subagent.js import each other and form a cycle, and ESM holds up under it — on the one condition that neither calls the other at module top level; keep it all inside function bodies and you're safe.

### 4.3 Give it a spin

```
$ node src/agent.js "write a 100-word summary for each of the three md files under docs/, and collect them into SUMMARY.md"
[turn · tool_use=list_dir]
[turn · tool_use=delegate_task]
[subagent · steps=3 in=3400 out=290]
[turn · tool_use=delegate_task]
[subagent · steps=3 in=3100 out=270]
[turn · tool_use=delegate_task]
[subagent · steps=4 in=4200 out=310]
[turn · tool_use=write_file]
done. SUMMARY.md created with the three summaries
```

The parent agent itself ran only five turns: one list_dir, three delegate_tasks, one write_file. The full text of the three documents and the subagents' intermediate file-reading steps never entered the parent's messages — **the parent's context holds nothing but three summaries**. This is §3.1's "intermediate state is use-and-discard" growing legs and walking onto your screen.

Quick math on the side: the three child loops total a bit over 10k input tokens, each destroyed the moment it finishes; without the split, three documents' raw text plus all the file-reading round trips would enter the main messages — and the main messages gets replayed in full by every subsequent turn (blog02's compounding), dragging heavier the further you go. Same task, split versus not split, and the difference isn't a one-time amount — it's **the base rate of every turn that follows**.

**Crash section (mandatory)**: my first version of spawnSubagent had a "thoughtful" feature: it serialized the parent's entire messages array and prepended it to the brief, in the noble name of "giving the subagent complete background." You can probably already smell it coming — this is the same root cause as the time blog06's verifier got handed the full history, and I fell for it once on each of two separate organs. Two days of running, and both bills arrived together.

One: money. The parent was already on turn 14 with 20k-plus tokens in messages, so every delegate started the subagent's very first turn at 20k-plus input — one outsourcing invoice cost more than three main-loop turns combined; and every additional turn the subagent ran replayed that 20k in full all over again — blog02's curve climbed a second time inside the child loop. I had effectively spawned a clone of my invoice.

Two: drift. The history contained a discussion between me and the main loop about "whether to refactor tools.js," which ended with a decision not to touch it. The subagent read the discussion, failed to register the "decided not to touch it" part, finished its summaries, and refactored tools.js on the way out. **It didn't disobey. It obeyed too much.**

The fix was cutting the brief down to three parts: task (what to do), constraints (red lines and house rules), expected output format (what structure to return). Around 300 tokens total. The subagent came back faster and more accurate — **giving more is not the same as saying it clearly**. blog02's "give it less, and it actually does better" holds verbatim in multi-agent land, and holds double: every extra token you hand over is both a line on the bill and a distraction.

### 4.4 One mapping: blog205's worktrees, and the clones here

In Claude Code this mechanism is called Task (subagent): the main agent outsources a full-repo search or an independent review, the child agent runs it inside its own context and brings back only the conclusion. When you casually ask Claude Code to "search the codebase for where X is defined," it turns around and spawns a search agent — this exact move — and the dozens of files it flipped through never enter the main conversation's context.

One more detail worth noticing: Claude Code's subagents also read the CLAUDE.md covered in [blog194 project passport](/en/posts/blog194_project-passport-agents-md-claude-md-memory/). That is the real fix for the 40-plus false positives at the top — a house rule shouldn't live in some stretch of conversation history, hoping every brief hand-copies it over; it should live in a file every clone reads on startup. **Promote implicit assumptions from "history" to "configuration"**, and serialization stops depending on how good your memory is in the moment.

One layer deeper: what happens when several subagents edit files at the same time? [blog205 Fiber's three principles](/en/posts/blog205_fiber-teaches-ai-agent-state-design-three-principles/) covered git worktree isolation — each subagent edits inside its own worktree, which is its workInProgress tree: botch it and you throw the whole tree away without polluting current; do it well and the parent reviews, and only an approved review gets merged. The stage/commit mindset, reborn in the multi-agent world. Context isolation keeps thoughts from cross-contaminating; worktree isolation keeps files from stepping on each other — stack the two layers, and only then does the fleet dare drive out together.

### 4.5 Moonshot Footnote

> Let's puncture one thing first: subagents are not an API feature — they're an application-layer pattern. Anthropic's API has no spawn_subagent endpoint, and neither does OpenAI / Moonshot / DeepSeek. "Spawning a clone" is you starting one more conversation loop in your own code; there is no magic anywhere in it.
>
> So v0.8's migration cost is nearly zero: swap the messages.create inside spawnSubagent for chat.completions.create, wrap delegate_task in a `function` the way the blog03 footnote describes, and the three-part brief doesn't change by a single word. Isolation, lossy serialization, result collection — these semantics are vendor-independent; they're properties of "splitting" itself.

## 5. The Boundary: Where the Analogy Breaks

The load-bearing parts of the Worker analogy are solid: independent execution environment, message passing, a serialization boundary, main thread as coordinator — a mid-level frontend engineer gets it in one pass. But three places it can't carry, and I owe you those in full.

**First: a Worker is cheap enough to spawn on a whim; a subagent is a temp worker hired by the token.** `new Worker()` costs a few milliseconds and a sliver of memory — you spawn it and forget it. spawnSubagent burns real money at every step: the brief is the onboarding fee, every loop turn is an hourly wage, and every background document you attach is billed by the word. You never think twice about a Worker; before spawning a subagent, you have to first think about something deeply untechnical: **is this job worth a salary?** If one tool call can do it, don't spawn a clone.

**Second: postMessage's serialization is lossless within its protocol; a brief's serialization is lossy and schema-free.** structured clone is faithful across its supported types — a number goes in, a number comes out, no more, no less; anything unsupported gets an on-the-spot DataCloneError. A brief has neither end of that: no schema to tell you which fields are required, no TypeError to tell you which assumption got dropped in transit. Worse, the subagent will fill the dropped part in with a "reasonable default" of its own invention — and blog03 already warned you that its "reasonable" is frequently not yours. **An error thrown is mercy. A blank filled in silently is the disaster.**

**Third: a Worker and the main thread share one source of truth; two agents don't.** However isolated a Worker is, it and the main thread live on the same machine — the time, the files, the network they see are one shared reality. Two agents are not like that: the repo the parent sees and the repo the child sees may be one git pull apart; the parent remembers "this file is 200 lines," and the child reads 350. Multi-agent "data races" are harder to debug than multithreaded ones, because they don't present as race conditions — **they present as two agents who are both perfectly confident**: each clutching its own stale copy of the facts, neither feeling the slightest need to double-check.

One line to close: **a Worker buys its isolation with serialization, but at least there's a protocol to catch you; a subagent buys its isolation the same way, except this time there's no protocol — every assumption you drop from the brief comes back from the other side as a very confident guess.**

Echoing the spine: [blog01](/en/posts/blog206_fe2agent-01-agent-loop/) handed the wheel over to a probabilistic function, blog02 kept a grip on context, blog03 kept a grip on execution, blog07 installed gates at the critical junctions — and by this post, one car has become a fleet, and **you've gone from driver to dispatcher**: you're no longer holding any single steering wheel; what you write now are each car's job ticket, its acceptance checklist, and its radio channel. The thing being defended against hasn't changed — it's still the model's confident nonsense — only now the nonsense can spread from car to car, and the dispatcher's whole job is making sure that everything traveling on every channel is written down and checkable.

## 6. The Hook: Next Up

Next up: "Flaky Isn't a Bug Anymore, It's the Physics: Migrating Your Frontend Testing Mind to Evals."

The analogy hook: whether one agent did the job right, blog06's verifier can backstop; but a whole fleet? Every car is probabilistic, and you can't quality-control a fleet by watching it — only by statistics. And blog01 planted a line that's been owed for eight posts and is finally due: **temperature=0 still isn't fully stable** — why a supposedly deterministic sampling still jitters, and how batch scheduling and floating point figure into the bill, post 09 lays it all out. Frontend testing is a true/false question (is this code correct); evals are a statistics question (how correct was this system this week) — blog01's "testing goes from a true/false question to a statistics question" is due for payment.

tiny-agent v0.9 grows an `evals/` directory: a case set + `node src/eval.js --runs=5` — run the same task five times and look at the pass rate, turning "does it work" from a feeling into a number. `git checkout v0.9` gets you the next cut: [github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent).

Before that lands, one homework assignment: take v0.8's delegate_task and write two briefs for the same subtask — one a single sentence, one the three-part task + constraints + expected output format — run each five times, and count the subagent's steps and tokens. You will watch "requirements-doc quality" turn into numbers in stderr with your own eyes. That hands-on feel beats any multi-agent framework's documentation — because it's data on a brief you wrote yourself.
