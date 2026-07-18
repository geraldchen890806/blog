---
author: Gerald Chen
pubDatetime: 2026-07-18T09:00:00+08:00
title: "The Model Has No Memory: Context Is State, and Every Turn Is a Full Re-render"
slug: blog207_fe2agent-02-context
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI Agent
  - Frontend
  - Productivity
  - Claude Code
description: You think the agent remembers you; really it re-sends the full messages array every turn. LLM calls are stateless — "conversation" is a client illusion.
---

## 1. The Pit

Wednesday, 2:30 in the morning last week. I was working with an agent on a build script inside a monorepo. There was one path — `apps/service-a/scripts/dev.mjs` — an entry point: change the config, don't touch the file itself. I said it once, it nodded. I said it twice, it repeated the rule back to me more neatly than I'd phrased it. On the third pass it swore it would "absolutely never touch this file" — and the next turn it rewrote the file end to end.

I assumed the model was just dumb. Cursed a couple times, opened the network trace — and when I looked at the messages array I'd just sent, I froze. The array had all nine previous turns of chat history sitting in it, and nowhere in it was the sentence "don't edit dev.mjs." Because I'd delivered that sentence in a separate side-thread after a tool error, and I never pushed it back into the main loop's messages. Every turn the agent received a context that literally did not contain the ban.

It's not that it couldn't remember. It's that every turn it reads the entire conversation from scratch — **and what's in "the entire conversation" is what I put there, not what it retains**.

This is post 2 in the series "From useEffect to Agent Loop." Post 1 argued that an agent is basically a while loop whose inner function is probabilistic, impure, and decides for itself when to stop. This post cracks open the thickest artery running through that loop: **context**. You'll see that LLM calls are stateless, that "conversation" is an illusion the client fabricates, and that once you internalize this, context management stops looking like "performance tuning" and starts looking like the one steering wheel you still have your hands on.

## 2. The Bridge

One line:

> **Context is state, and every turn the agent does a "full re-render" — except React has diff to trim it and the agent does not; full means full.**

```
React:                        Agent:

  state                          context (messages[])
    |                              |
    v                              v
  render() --> UI              LLM() --> action
    |                              |
  diff/memo/Fiber              (no diff)
  commits minimal changes       every turn re-sends everything
```

On the left, Reconciler trims down to the minimum change set. On the right, every turn you shove every byte of the messages array back over the wire. Same skeleton — very different invoice.

## 3. The Real

### 3.1 "Conversation" Is an Illusion: What Really Happens in One LLM Call

Start by accepting this: one `client.messages.create` is one stateless HTTP request. The server has no memory of what you said last turn; what it recognizes is the token in the Authorization header — that's your wallet, not your identity card.

The "multi-turn conversation" you think you're having is really **the client-side messages array** getting pushed into, turn after turn. In tiny-agent v0.1 from the last post, I wrote these two lines:

```javascript
messages.push({ role: "assistant", content: res.content });
// ...
messages.push({ role: "user", content: toolResults });
```

Those two push calls are the entire implementation of "memory." Delete them and your agent goes amnesiac on the spot — every turn it only sees the latest user input, with zero knowledge of prior chat, tool_use calls, or results. **"Memory" is the client's job**, not the model's.

At this point the first question every frontend engineer wants to ask: what about Anthropic's Files API or OpenAI's Assistants API — those things with a `session_id`? Isn't the server storing it for me?

Yes, and no. The server does store the messages for you, but every turn it still **injects them into the model in full**. You think passing `session_id` saves bandwidth; really you just moved the messages array from "your process memory" to "their database in the cloud." **The step where it gets stuffed into the model's context window is not skipped — you just relocated the array**. This isn't nitpicking; understand this and the token bill in the next section won't shock you.

One more layer: in [blog194 project passport](/en/posts/blog194_project-passport-agents-md-claude-md-memory/) I walked through how Claude Code's `--resume` works (a Claude Code CLI subcommand that reads the messages array of a previous conversation back off disk to keep running; details in blog194). It serializes the messages to a session file on disk; when you `--resume <session-id>`, it reads that array back, drops it into the while loop, and continues. That's the plainest form of "memory persistence": **you store, the model does not remember you**. Every fancy agent-memory scheme, stripped to the metal, is this pattern.

Once you see it this way, a lot of previously mysterious behavior explains itself. Why can't two agents from different sessions "share" experience? Because their messages arrays live in two processes, two files, each running its own life. Why does a "multi-turn" model suddenly quote a detail from long ago, making you suspect long-term memory? It doesn't have any — that detail is still sitting in the messages array uncompressed, and this turn's scan happened to hit it. Frontend engineers are used to a shared store and a context provider that automatically propagates down; in agent-land, none of those defaults exist, and every wire is one you have to solder yourself.

### 3.2 Three Hidden Costs of Full Replay

Every setState in React triggers a render, but thanks to diff / memo / Fiber, only the changed sliver actually lands in the DOM. Agents have no such layer — every API call re-sends the entire messages array, byte for byte. This isn't a config toggle, it isn't an optimization you can disable; it is the semantics of the protocol.

Three costs, stacking linearly:

**Token (money).** Say the context grows by 5k per turn: turn 1 sends 5k, turn 2 sends 10k… turn 10 alone sends 50k, and 10 turns emit 275k in total. Claude Opus bills input at $5 per 1M tokens, so input alone runs about $1.40 — and it climbs quadratically. A long task spanning twenty or thirty turns is routine; at 30 turns you've cumulatively sent 2.3M tokens — you can cross $10 in a hurry. The one-night $4200 LeanOps disaster in [blog195 "Loop Engineering Three Debts"](/en/posts/blog195_loop-engineering-three-debts-playbook/) — the "token debt" piled up exactly this way: not that the model is expensive, but that every turn you pay for every previous turn all over again.

**Latency (experience).** The prefill phase — where the model "ingests" your messages array — takes real time. 100k tokens of prefill on today's major models typically runs 5 to 10 seconds. When you're staring at a blinking cursor and the screen sits idle, odds are it's prefilling that ever-growing history of yours. Users don't care; users just know "this AI is slow."

**Confusion (intelligence).** There's a well-replicated result in the literature called "lost in the middle" (the term comes from Stanford's 2023 paper [Lost in the Middle](https://arxiv.org/abs/2307.03172)) — the model's recall on the head and tail of context is markedly better than on the middle. The more you cram in, the lower the hit rate in the middle. In other words, dumping more history at it doesn't make it understand you better; it makes it more confused. It may miss a hard constraint you laid out on turn 4 and instead re-litigate a fuzzy question from turn 1.

Three sentences in one: **the longer an agent's context, the more expensive, the slower, and the dumber — not the stronger.**

This is the exact opposite of your frontend instinct that "one more prop won't hurt, React will diff it away." In frontend-land, growing state rarely carries a direct money-or-latency penalty — at worst a re-render runs a hair slower and DOM diffing costs a couple of frames. In agent-land, every byte of context is being metered, is adding latency, is diluting attention. The habit you picked up in frontend of "stuffing extra context in, just to be safe" backfires the moment you cross over: the more you insure, the more it wanders, the faster you go broke. The day you first notice "I should give it less information — it actually does better" is a genuine inflection point in this craft.

### 3.3 Three Treatments: Compression / Caching / Structure

To fight full replay, three main moves:

**Move 1: compression.** At some threshold (say 12000 tokens), summarize the earliest turns into one paragraph and keep only the most recent N. The summary is generated by a mini-call to the same model. tiny-agent v0.2's `maybeCompress()` does exactly this; code is in the next section.

**Move 2: prompt caching.** Anthropic exposes a `cache_control: { type: "ephemeral" }` marker. Tag stable content — system prompt, AGENTS.md, tool definitions — with it, and hits within 5 minutes bill input tokens at roughly 1/10 the rate (the default 5-minute tier; the Anthropic API also supports `ttl: "1h"` for a 1 hour tier, but this post sticks to the default for simplicity). The frontend analogue is **HTTP ETag** — request the same resource twice, validate that nothing changed, and the cache serves it. There's a nasty pit here I'll walk through in blood next section: **the cache is prefix-matched**, so if any block in the middle changes, everything after it is invalidated. Stable content must sit at the front; volatile stuff goes to the back.

**Move 3: structured context.** Don't cram everything into one blob of free text — segment with XML tags or JSON so the model can grab the important bits more easily. This one deserves the Prompt Engineering post to itself (blog04); today, just a hook.

There's a meta-move too: **don't put it in the context**. When your history, docs, or knowledge base grow so large that no amount of compression fits, the answer isn't more compression — it's moving that content out of context and retrieving it on demand (RAG). That's a topic for blog05 on memory.

## 4. The Work: tiny-agent v0.2

### 4.1 What v0.2 Grows

`git checkout v0.2` gets you the next cut: [github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent). Compared to v0.1, three new things:

- New file `src/context.js`: extracts a `Context` class wrapping the messages array + token accounting + `maybeCompress()`
- `src/agent.js` main loop now goes through `ctx.toRequest(tools)` — with `cache_control` on the system prompt layer
- Every turn writes one line to stderr — `[turn · in=… out=… cache_read=…]` — so where money is spent and saved is visible to the naked eye

Frontend engineers will ask: why extract a class? Isn't an array enough? — Not enough. Starting in v0.2, besides messages itself, there are fields like "cumulative token count," "whether we've compressed," and "cache-hit record" that need an owner. It's not over-design; these fields genuinely need a home. **The moment you start ledgering the messages array — accounting, compression, cache hits — it stops being an array and turns into a state.** Wrapping it in a class is the natural move — same motivation you have in React when you graduate from `useState` to a reducer.

### 4.2 Context Class Core

```javascript
export class Context {
  // constructor / addUser / addAssistant / addToolResults / recordUsage omitted

  async maybeCompress() {
    if (this.totalTokens < COMPRESS_THRESHOLD_TOKENS) return false;
    if (this.messages.length <= KEEP_RECENT_TURNS * 2) return false;

    // The cut must not land on a user message carrying tool_results: once its tool_use
    // is compressed away the tool_result is an orphan and the API 400s. Walk earlier to
    // a safe boundary (an assistant message, or a plain user message).
    let cut = this.messages.length - KEEP_RECENT_TURNS * 2;
    const isToolResultUser = m => m.role === "user" && Array.isArray(m.content)
      && m.content.some(b => b?.type === "tool_result");
    while (cut > 0 && isToolResultUser(this.messages[cut])) cut--;
    if (cut <= 0) return false;

    const toCompress = this.messages.slice(0, cut);
    const recent = this.messages.slice(cut);

    const summaryRes = await this.client.messages.create({
      model: this.model,
      max_tokens: 512,
      system: "Summarize this conversation history into one paragraph. Keep tool calls, file paths, and any facts the next turn might need. No preamble.",
      messages: [{ role: "user", content: JSON.stringify(toCompress) }],
    });
    const summary = summaryRes.content.find(b => b.type === "text")?.text ?? "";

    this.messages = [
      { role: "user", content: `[Summary of earlier conversation]\n${summary}` },
      // Only pad the synthetic assistant when recent opens with a user message —
      // strict user/assistant alternation is an API-level 400 in both directions.
      ...(recent[0].role === "user"
        ? [{ role: "assistant", content: "Understood, continuing from here." }]
        : []),
      ...recent,
    ];
    return true;
  }

  toRequest(tools) {
    return {
      model: this.model,
      max_tokens: 1024,
      system: [{ type: "text", text: this.system, cache_control: { type: "ephemeral" } }],
      tools,
      messages: this.messages,
    };
  }
}
```

A production pit worth flagging: `JSON.stringify(toCompress)` here is the lazy path, but tool_use / tool_result nested blocks, once serialized, drag along a pile of escape characters — token count balloons 30%+ vs. human-readable text, and the model pays less attention to JSON literals. Production code usually writes a `messagesToText()` that flattens into semi-structured text; v0.2 omits it for brevity — PRs welcome.

Four points, driven all the way home:

**One, the 12000 threshold / keeping the last 4 turns are experience-based numbers.** Not optimal, not a general solution — a gut call, but a somewhat informed one: 12000 tokens is roughly "a 4600-token system prompt as the base, plus five or six turns with tool calls," and once compression fires, you have a big runway to keep going without compressing again. Production should compute it dynamically (e.g. "fire when we cross 80% of the context window"); hardcoded reads more clearly for a first pass.

**Two, compression can't leave only the latest turn.** My first version tried keeping only the last turn and the model instantly lost the plot — it had no idea "what we were just doing" because the summary was too abstract and one lone recent turn was too isolated. Keeping the most recent 4 turns is an experiential sweet spot: the summary holds up the long tail and recent turns hold up short-term context.

**Three, the rebuilt sequence has to be legal as a whole — the fabricated assistant is conditional, and the cut has to dodge orphans.** The Anthropic API has two 400-grade hard constraints (unlike your frontend chat UI where you can push anything you want): messages must strictly alternate user/assistant, and a tool_result must immediately follow its tool_use. So the rebuild waits on both ends: the summary is a user message, so if recent opens with a user you pad in one `Understood, continuing from here.` assistant — and if it opens with an assistant you connect it straight through; the padding is conditional, padding blindly manufactures two assistants in a row. On the cutting side you walk earlier to dodge any "user carrying tool_results." My first version was a hard `slice(-KEEP_RECENT_TURNS * 2)` plus an unconditional pad — looked elegant, 400'd the first time compression fired: in a tool loop the messages alternate strictly, an even-offset cut lands on an assistant every time, and the pad glued a second assistant right onto it. **Respecting the protocol isn't about splicing in one message; it's about making the entire rebuilt sequence legal.**

**Four, `cache_control` only goes on system.** (Anthropic's API `system` accepts either a string or an array of blocks; adding `cache_control` requires the block-array form — took me a second the first time.) The system prompt is the most stable slab across turns and the best fit for caching. Tool definitions are usually stable too — `cache_control` can also go on the last tool in the tools array — but if you assemble tools dynamically like I do, don't cache them. The user message changes every turn; the summary gets rewritten after compression — don't cache either of those. **Only cache the stable stuff; that's where the return is**.

### 4.3 Give It a Spin

Happy path — watch the cache go from cold to warm:

```
$ node src/agent.js "read README.md then tell me what v0.2 adds"
[turn · in=4980 out=87 cache_read=0]
[turn · in=5520 out=142 cache_read=0]
...

# run again within 5 minutes
$ node src/agent.js "read package.json and tell me the deps"
[turn · in=4980 out=64 cache_read=4600]    <- cache hit
```

On the second run, `cache_read=4600` means those 4600 tokens of system prompt came back from cache, billed at roughly 1/10 the rate. Not hitting on the first run is normal — that run is "writing" the cache.

Worth explaining why v0.2's system prompt is as big as 4600 tokens — I pasted the entire project brief into it. That's not showing off; the threshold forced my hand: Anthropic's cache has a **minimum cacheable length** — 4096 tokens on Opus-tier models — and a prefix shorter than that **silently doesn't cache**: no error, no warning, the bill just stays at rack rate (the cutoff varies by model, anywhere from 1024 to 4096; the official docs have the table). Another line item only the invoice will ever tell you about — same family as the crash section below.

Triggering compression looks like this — build a long conversation until the total piles past 12000 tokens, and stderr shows:

```
[compressed history · 10 messages left]
[turn · in=6400 out=210 cache_read=4600]
```

The first time compression fired, I sat and stared at stderr for a moment — 20 messages had been squeezed into 10 (summary + fabricated assistant + the most recent 4 turns), per-turn input dropped from 12800 to 6400 — of which 4600 was discounted cache reads, leaving only about 1800 billed at full rate — and the agent kept going with essentially no loss in task completion. **In that moment, "context can be pruned" stopped being a concept and became a number popping up on my screen.**

**Crash section (mandatory)**: my first system prompt read like this:

```javascript
const SYSTEM = `You are tiny-agent. Current time: ${new Date().toISOString()}`;
```

Just wanted it to know the time — reasonable, right? Ran for half an afternoon and `cache_read_input_tokens` in stderr came back zero, zero, zero, zero, zero. I thought maybe the 5-minute window had elapsed, or the system prompt was too short to hit the threshold, or the SDK version was buggy. It took thirty minutes of digging to realize: **Anthropic's cache is prefix-hash matched, and I had jammed a second-by-second timestamp into that line — the prefix was different every request, so the hit rate could only be 0**.

Two lessons:

- If you stuff `Date.now()` into a React `key`, code review will bounce you; if you stuff `new Date()` into a system prompt, nobody stops you — only the invoice does
- **Bugs with no visible error are the most expensive to debug** — a cache miss doesn't throw, no red text, just no discount on the bill. Skip that `cache_read` log line and you can go weeks paying rack rate without realizing. That stderr line in v0.2 isn't a ceremony — it's what makes "saved" vs. "not saved" go from invisible to visible.

Extending this a layer outward: many optimizations in agent-land don't give you the direct feedback you're used to from the frontend. Write bad CSS and the UI goes visibly crooked; write a bad React `key` and the list jumps around instantly — you have a whole array of naked-eye signals. Agents don't work that way — a crooked prompt, a cache miss, a fuzzy tool description; the model doesn't crash, the UI doesn't glitch — it just "performs a bit worse," and "a bit worse" is something you basically can't feel in dev; only invoices and eval sets will honestly tell you. That's why I front-load logging even in v0.2: **build observability first, then talk about optimization**. The cozy "just open F12 and see" era of the frontend does not follow you here.

### 4.4 One Mapping: blog205's Double Buffering vs. Compression Here

Series-internal reference: in [blog205 Fiber's three principles teach agent state design](/en/posts/blog205_fiber-teaches-ai-agent-state-design-three-principles/) I walked through Fiber's double buffering — separating the "proposed" state from the "committed" state and allowing the proposal to be thrown away mid-flight. Ported into context management, this is a different face of the same discipline: **long-lived things need to be layered**. Double buffering layers "proposed vs. committed"; compression layers "live state (the recent 4 turns) vs. archived state (the summary)." Same discipline, different problem — one governs state commit, the other governs state aging. If you've read blog205, you should get an "oh, that's the flip side of that thing" moment here.

### 4.5 Moonshot Footnote

> Moonshot / DeepSeek's caching semantics **differ from Anthropic's**: they use context caching — the server auto-detects whether the request prefix matches, without requiring you to place an explicit `cache_control` marker. Keep the prefix stable and the second request bills at cache rates.
>
> But the Context class abstraction is **fully isomorphic**: compression, token accounting, and "stable content up front" all carry over unchanged. Switching to a domestic model, delete the two `cache_control` sites, keep the system prompt prefix stable, and the rest of the code runs as-is. The difference is the discount rule, not the architecture.

## 5. The Edge: Limits of the Analogy

Where the analogy holds up, I'll grant it: state totality, the re-render mental model, cache-as-memo / ETag — all fair, use them freely. But three places where it doesn't hold, I owe you the full story.

**One: React state is an in-memory object; agent context is the messages array.** React state naturally lives in process memory — crashes wipe it, GC handles it, whatever — restart is redo, and the user just clicks again. Agent context doesn't work that way: crash once, and if that messages array wasn't serialized to disk, it's gone; the agent "forgot" where you two were, and 20 turns of cost went up in smoke. **You have to persist it yourself** — that's why in blog194 I walked through `--resume` in such detail: it isn't a convenience feature, it's plugging the gap that the messages array has no default persistence.

**Two: React's diff is automatic; the agent's "diff" is manual.** Reconciler computes the minimum change set for you; Fiber schedules the slices; you write React without thinking about any of it. There's no counterpart component in agent-land — `maybeCompress()` is something you wrote by hand, and when it triggers, how many turns to keep, how to write the summary, are all your judgment calls. **No Reconciler is thinking on your behalf** — every trimming strategy is a burden you carry yourself.

**Three: React's memo is an idempotent function; the agent's cache is a probabilistic hit.** memo you can trust: same props means same result, React uses reference equality, and you can reason it through in your head. cache you cannot trust the same way — prefix matching, 5-minute window, block boundaries have to line up, tool definition order can't change; any one of those slips and you miss the hit, and **it does not error**. memo is a contract; cache is a lucky break — you can't trust cache the way you trust memo; you have to log and monitor it every turn.

Three points collapsed into one: **frontend state management is "make re-render cheap"; agent context management is "make replay cheap." Same discipline, different tools.**

Echoing blog01's spine — you've already handed the wheel over to a probabilistic function. Since you handed it over, context is the only input it reads each turn — **context management isn't a nice-to-have performance tweak; it's the steering wheel you still have your hands on**. You can't decide what it thinks this turn, whether it calls a tool, when it stops — but you can decide what it gets to see this turn. This is already the thickest lever you can grip in this craft.

## 6. The Hook: Next Post

Next up: "Tool Call: Let the AI Dispatch, You Stay the Reducer."

Framing hook: blog02 was about what the model **sees** each turn (context); blog03 is about what the model **can do** each turn (tools). A tool schema is the dispatch table you hand the model — it dispatches, you reduce, and when the reduction is done you push the result back into context and enter the next turn. Once you see this mapping, every action / reducer instinct you built up in frontend transfers over.

tiny-agent v0.3 will grow two more organs on this engine: **the toolbox expands to 3 tools** (`read_file` + `write_file` + `list_dir`), plus **schema validation on inputs** — because the model really will make up a `path`, and you have to catch it. `git checkout v0.3` gets you the next cut: [github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent).

In the meantime, one exercise you can hand v0.2: pipe the `cache_read` log line into a file, run it against a day of your normal conversations, and look at the hit rate later — you'll see which parts of your prompt are stable and which parts are shifting all the time. That data is more useful than any "cache best practices" article out there, because it's your own.
