---
author: Gerald Chen
pubDatetime: 2026-06-08T16:30:00+08:00
title: "Prompt, Context, Harness, Agentic: The Four Nested Layers of LLM Apps — and Knowing Which One You're Stuck In"
slug: blog186_prompt-context-harness-agentic-layers
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI
  - AI Agent
  - LLM
  - Claude Code
description: Prompt engineer, context engineer, harness engineer, agentic engineer — these aren't four competing job titles. They're nested layers of concern, from a single instruction to an entire autonomous system. Understand how the four layers relate, and you'll know exactly which one you're optimizing every time you get stuck.
---

Over the past few months, four terms have kept showing up in discussions about how LLM applications should be built: **prompt engineering, context engineering, harness engineering, and agentic engineering**. Each term comes with a crowd declaring that one of the others is obsolete — Karpathy publicly backed context engineering, arguing it describes the actual work of industrial-grade LLM applications more accurately than prompt engineering; people building agent frameworks say "context alone gets you nowhere, the harness is the real moat"; and multi-agent researchers say "all of that is low-level detail — the real engineering is agentic system design."

Listen long enough and you'd think these are four different trades fighting over the same job. But after shipping a few LLM projects, my take is this: **they aren't fighting at all. They're four nested layers of the same thing — from the innermost "a single instruction" to the outermost "an entire autonomous system," with the scope of concern widening at each layer**. Each layer wraps one more ring of control around the previous one.

This post uses Claude Code — the harness I work in every day — as the running example to take these four layers apart. The point isn't to decide what kind of engineer to call yourself. It's that when a run goes sideways, results are poor, or an agent deadlocks, you can quickly answer: **which layer am I actually stuck in, and which direction should I turn?**

## One Nesting Diagram Up Front

```text
┌─────────────────────────────────────────────────────────────┐
│ Agentic engineering: a system that autonomously pursues goals│
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Harness engineering: the code scaffolding/runtime    │    │
│  │ around the model                                      │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │ Context engineering: what goes in the window │    │    │
│  │  │ and how it's assembled                        │    │    │
│  │  │  ┌─────────────────────────────────────┐    │    │    │
│  │  │  │ Prompt engineering: the wording of   │    │    │    │
│  │  │  │ a single input                       │    │    │    │
│  │  │  └─────────────────────────────────────┘    │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

The further in you go, the more concrete things get (a paragraph of text); the further out, the more macro (a whole system). **Outer layers contain inner layers, but they solve different problems.**

## Layer 1: Prompt Engineering — Optimizing a Single Instruction

The innermost layer. The unit of work is **one prompt**.

The questions it cares about:

- How do I word this instruction so it's least likely to be misread?
- Should I add few-shot examples? How many?
- Should I make the model think first (chain-of-thought) before answering?
- How do I force a fixed output format (JSON, XML, Markdown)?
- How do I set a role so the response style stays consistent?
- How do I write a system prompt that keeps the model from improvising?

This was *the* core skill of LLM applications in 2022–2023. Models were weaker, context windows were small (4K or 8K counted as big), and tool use wasn't reliable yet — whether the model could do one thing correctly came down almost entirely to how that one prompt was written.

In Claude Code terms, **`CLAUDE.md` and the system-prompt section at the top of each skill's `SKILL.md`** are classic prompt-engineering artifacts: you're using words to bend the model's behavior toward what you want.

### Where Prompt Engineering Tops Out

Its limits show up within this same layer:

- **However carefully crafted, a single input is still just one input** — it has no reach over the next turn, reuse across tasks, or dynamically injected information
- **It can't govern anything else in the window** — RAG retrieval results, conversation history, tool outputs; if the content being stuffed in is low quality, no prompt can rescue it
- **The model's own capability doesn't improve** — prompt engineering squeezes out everything the model already has, but it can't squeeze out what isn't there

When you find that no amount of rewording helps anymore, that's not prompt engineering done badly — that's your cue to move one layer out.

## Layer 2: Context Engineering — What Goes in the Window

One ring outward, the unit of work becomes **everything in the context window, plus the logic that assembles it**.

The prompt is only one block in the window. The rest includes:

- **Document chunks retrieved via RAG** (vector recall, BM25, hybrid retrieval)
- **Conversation history** (keep all of it? compress how? summarize when?)
- **Tool call results** (what do you do when one `ls` returns 500 lines?)
- **Memory / summaries** (where does older information go when the short-term window can't hold it?)
- **Structured background** (user preferences, current project state, date and time)

The core question: **within a finite token budget, how do you dynamically pack in exactly enough information?** Put in what belongs, compress what should shrink, drop what doesn't matter — and manage ordering and relevance while you're at it.

The reason Karpathy ranks context engineering above prompt engineering is exactly this — once a model has to work continuously, across turns, calling tools, **the bottleneck is no longer how a single prompt is worded; it's what's actually loaded into the window the model sees this step**. His point, roughly: "In every industrial-strength LLM app, context engineering is the delicate art and science of filling the context window with just the right information for the next step."

### The Core Moves of Context Engineering

**1. Selective injection**

Don't dump every related document in. Retrieve, then quality-filter and rank by relevance. Three highly relevant chunks beat ten moderately relevant ones — the more noise in the window, the more the model's attention scatters.

**2. Compression and summarization**

By turn 50 of a conversation, you can't keep every detail of the first 40 turns. Common approaches: rolling windows (keep only the last N turns), tiered summaries (heavily compress the distant past, keep recent detail), topic-based archiving (merge multiple turns on the same topic into one passage).

**3. Order matters**

LLMs are position-sensitive within the window — the system prompt at the front and the user message at the end carry the most weight, while everything in between suffers the "lost in the middle" effect everyone has run into. Put important information at the head or the tail, never buried mid-window.

**4. Slimming down tool results**

The model runs `find . -name '*.ts'` and gets 2,000 lines of paths back — feed it all in and the window blows up instantly. Either truncate (first 50 lines + "...N more lines"), convert to a structured summary ("found N files across these 5 directories"), or have the model issue a more precise follow-up query.

In Claude Code terms, **designing `SKILL.md` files, exposing memory through an MCP server, controlling which files and retrieval results get fed into the window** — all of that is context engineering. Claude Code's `/compact` command (user-triggered) and auto-compact (fired automatically when the window nears its limit) are textbook examples: compress the conversation history into a summary and keep going, reclaiming token space.

### Where Context Engineering Tops Out

However well you tune the context, **it's still confined to the window**. Once the model has to run in a loop (the agent loop), call tools, and maintain state across turns — that's "logic outside the window," and context engineering has no jurisdiction there.

## Layer 3: Harness Engineering — The Runtime Around the Model

Another ring outward, and the concern shifts from "inside the window" to "the entire code scaffolding wrapped around the model."

If the model is the engine, the harness is the rest of the machine that encloses the engine and makes it actually do work. **Claude Code itself is a textbook harness.**

Harness engineering cares about:

- **How the agent loop turns** — when does it stop? How do you decide the task is done? Should the user be able to step in mid-run?
- **How tools are defined** — parameter schemas, docstrings, error handling, timeouts
- **How tool results are fed back** — structuring, truncation, error translation
- **Retries and degradation** — what happens when the model emits invalid JSON? If a tool call fails, do you try another? After 5 consecutive errors, do you abort?
- **Guardrails** — should sensitive operations require confirmation? Should destructive commands be sandboxed?
- **Observability** — can you see what each step is doing? Where are tokens going? Which tool is slowest?
- **Caching and cost** — prompt caching, tool-result caching, streaming responses

The unit of work is **the system and control flow that carries the model**.

### What a Well-Built Harness Looks Like

I've run several long-horizon tasks inside Claude Code ([the trading-strategy dogfooding run in blog175](/en/posts/blog175_claude-code-trading-bot-dogfooding/) was one). The reason they ran stably wasn't that my prompts were brilliant — it's that the harness was doing an enormous amount of work behind the scenes:

- Failed tool calls get their error messages translated automatically before the model retries
- Destructive commands (`rm`, `git reset --hard`) pause and wait for user confirmation
- When tokens approach the limit, auto-compact kicks in and compresses the conversation history
- Oversized tool output is truncated automatically and annotated with "...N more bytes not shown"
- An agent stuck past a certain number of steps gets a nudge: "you seem to be looping — want to try a different approach?"

None of this is something the model does on its own — it's the harness layer's code at work. **The model is only responsible for "what should happen next"; the harness is responsible for "how this step actually happens, and how to clean up when it goes wrong."** I've written before about [agents routinely ignoring hard rules](/en/posts/blog075_why-ai-agents-ignore-rules/) — nearly every failure mode in that post comes down to the harness not enforcing high-priority rules with proper hooks. The model failing to remember isn't a model problem; it's the harness failing to pin the rule in the right place on the model's behalf.

### Where Harness Engineering Tops Out

Build a good harness and a single agent completes tasks reliably. But when the task outgrows what one agent can hold — when it needs decomposition, multi-agent collaboration, long-term memory that persists across sessions, or an eval system to judge whether the whole thing is any good — those are problems a harness cannot solve.

## Layer 4: Agentic Engineering — An Entire Autonomous System

The outermost layer, where the concern becomes "**can this system reliably accomplish a goal end to end?**"

It subsumes all three inner layers, but asks different questions from a higher vantage point:

- **Task decomposition and planning** — how does a big goal break into subgoals? Who does the breaking? What happens when the split is wrong?
- **Sub-agents or not** — does the main agent delegate to sub-agents, or does one agent run the whole thing? How do sub-agents collaborate?
- **Multi-agent orchestration** — how does a group of agents avoid stepping on each other? Who coordinates?
- **Tool ecosystem design** — how many tools does the agent get? At what granularity? When should you add a new tool instead of extending an old one?
- **Memory architecture** — how is long-term, cross-session memory stored? Should memory be tiered (short/medium/long term)? When should memory be forgotten? ([blog079 covers this in depth](/en/posts/blog079_build-ai-agent-with-long-term-memory/))
- **Evaluation (evals)** — how do you know whether the agent is getting better or worse overall? What's the end-to-end success rate? How do you design regression tests?
- **Model routing** — cheap models for easy tasks, strong models for hard ones; who decides the routing policy?
- **Failure-mode analysis** — under what conditions does the agent crash most often, and how do you spot it early?

The unit of work is **the entire agent (or fleet of agents)**.

In the Claude Code ecosystem, **multi-agent orchestration (main + subagents), making the whole toolchain run reliably end to end, designing the cross-session memory system, deciding whether to run routines (scheduled cron agents)** — that's agentic engineering.

The agent system I run in my own `ai/` directory lives at this layer — a blog agent, a trade agent, and a memory agent each with their own job, cron scheduling the daily tasks, and failure modes recorded in MEMORY.md so they don't repeat. How good this system is doesn't hinge on any single prompt. It hinges on **the orchestration logic, the memory architecture, the eval loop, and the failure-recovery strategy** — decisions made at the agentic layer.

## In Practice: Diagnosing Which Layer You're Stuck In

The value of the four layers isn't giving yourself an "I'm an X engineer" badge — in real work, the same person operates at all four. **The real payoff is**: when an LLM application underperforms, you can quickly locate which layer the problem lives in, and tune in the right direction.

Here's the diagnostic flow I use:

### Symptom 1: The model gets it wrong, but only on one particular phrasing

```text
Suspect:  the prompt layer
Check:    reword it, add few-shot examples, add chain-of-thought,
          pin down the output format
Verdict:  rewording fixes it      → prompt problem
          still wrong after that  → move outward and check context
```

### Symptom 2: The answer is wildly off — the model is plainly making things up

```text
Suspect:  the context layer
Check:    is the relevant information in the window at all? Is it drowned
          out by old conversation? How good are the RAG-retrieved docs?
Verdict:  supplying the right info fixes it          → context problem
          info is all there and it's still wrong     → move outward and
                                                       check the harness
                                                       (tools or loop logic)
```

### Symptom 3: The agent deadlocks in a loop, or stops mid-run for no clear reason

```text
Suspect:  the harness layer
Check:    what's the agent loop's termination condition? How are tool
          failures handled? Is there a retry cap?
Verdict:  fixing loop logic or tool definitions does it  → harness problem
          loop logic is fine but the task still fails    → move outward
                                                           and check agentic
```

### Symptom 4: Every individual step is correct, but end-to-end success is low — or behavior is inconsistent across sessions

```text
Suspect:  the agentic layer
Check:    is the task decomposition sound? Are there information gaps
          between sub-agents? Is long-term memory decaying?
Verdict:  restructure the orchestration, strengthen the memory
          architecture, add evals
```

**The cost of misdiagnosis:**

- It's actually a context problem and you're tuning the prompt — futile, because the correct answer isn't in the window at all
- It's actually a harness problem (the agent is in a death loop) and you're rewriting the prompt — futile, because the model is getting every step right; it's the outer loop that's badly designed
- It's actually an agentic problem (the task was decomposed wrong) and you're patching the harness — futile, because locally-correct and globally-correct are two different things

After internalizing the four layers, the biggest change isn't that your skills suddenly level up — it's that **when something "doesn't work," you can rule out dead-end directions much faster**.

## Order and Priority

When starting a new LLM application, building from the inside out is usually the steadier path:

1. **Get a minimal case working with a prompt plus simple context** — prove the model can do this thing in principle
2. **Add RAG / history / summarization and do the context engineering** — prove it works reliably when the information is complete
3. **Wrap a harness around it: loop, tools, error handling** — prove it can do the work repeatedly
4. **Design the agentic architecture: multi-agent, long-term memory, evals** — prove it can do the work end to end

**Starting from the outermost layer is the easiest way to crash** — plenty of multi-agent framework demos look dazzling, but try to put them in production and you find the three inner layers were never solid; the agentic-layer orchestration just amplifies the chaos.

## Closing

prompt ⊂ context ⊂ harness ⊂ agentic — these four layers aren't mutually exclusive job descriptions. They're the same thing at different zoom levels.

Next time someone tells you "prompt engineering is dead, this is the era of context engineering," flip it around: **none of them is dead; only their relative priority shifts**. As models get stronger, the optimization headroom of a single prompt does shrink — but the design space of the context, harness, and agentic layers keeps growing.

What's genuinely scarce isn't skill at any single layer. It's **the person who can move freely between all four — and who knows which layer to inspect when things get stuck**.

---

**Further reading**:

- [Andrej Karpathy on context engineering](https://x.com/karpathy/status/1937902205765607626) — the original post: "the key to agents is context engineering"
- [Anthropic: Building effective agents](https://www.anthropic.com/research/building-effective-agents) — an engineering-eye breakdown of agents
