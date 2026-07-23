---
author: Gerald Chen
pubDatetime: 2026-07-15T23:04:47+08:00
title: "An Agent Is Just a While Loop? From UI = f(state) to action = LLM(context)"
slug: blog206_fe2agent-01-agent-loop
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI Agent
  - Frontend
  - Productivity
  - Claude Code
description: An agent is a while loop whose function isn't pure. Series opener from UI=f(state) to action=LLM(context), with a 32-line runnable tiny-agent.
---

## 1. The Pit

Last Wednesday afternoon my boss walked up, tapped my shoulder, and said, "Next quarter we're shipping an agent."

I nodded, walked back to my desk, and opened the LangChain docs. An hour later I had seven tabs fanned across my screen: AgentExecutor, Tool, Toolkit, Runnable, LangGraph, Plan-and-Execute, ReAct. Every noun was explaining another noun; every example was wrapping another example. I hadn't even worked out whether "an agent" was a class, a function, or a process.

Page two was livelier: Callback, Memory, Retriever, output_parser, structured_chat_agent — an entire wall of terminology, right in the face. Like any good frontend engineer, my instinct was to `cd` into a new project and `npm i` eight packages; then I stared at `node_modules` and wondered which class I was actually supposed to `import` first. I opened the quickstart — the first paragraph used OpenAI functions, the second switched to LangChain tools, and the two styles contradicted each other on the same page. The example comment read "deprecated in 0.2." I closed the laptop and went for a walk — and what I kept turning over wasn't the agent, it was whether I'd missed a class somewhere along the way.

A week later it clicked: at its core, an agent is just a while loop.

But the function inside that loop isn't the pure function I'm used to. It lies, it detours, it returns something different every call — and it even decides for itself when to stop.

This is the first post in the *From useEffect to Agent Loop* series. We're not going to talk frameworks yet — we're going to strip this loop down to bare metal first. By the end you'll notice most of your frontend mental models still apply; there's just a small cluster of things you have to learn fresh — and that small cluster is exactly what separates "calling an API" from "building an agent."

A note on where this series stands: **I'm not going to teach you how many classes LangChain has**. Instead I'll carry one tiny-agent from scratch through every post — it grows another organ each installment. Every post solves one concrete problem, adds a small chunk of code, and leaves a hook for the next. This is the tutorial I wanted after a year of stepping on landmines in production; if you're coming from frontend, buckle up.

## 2. The Bridge

One sentence:

> **An agent swaps `UI = render(state)` for `action = LLM(context)`, drops it in a while loop, and runs until it decides to stop.**

On the frontend you've written this a thousand times:

```
React:                        Agent:
                              
   state                         context
     │                              │
     ▼                              ▼
  render()  ──►  UI              LLM()   ──►  action
     ▲                              │
     │                              ▼
  setState  ◄── event           run tool
                              (result flows back into context, next turn)
```

The left side is synchronous, a pure function, and you control when to setState. The right side is asynchronous, a probabilistic function, and the model decides whether to take another turn. Identical skeletons, entirely different temperaments.

## 3. The Real Thing

### 3.1 The minimum agent loop skeleton

No framework — a piece of pseudocode says it all:

```
context = [user's question]
while (not done) {
  response = call LLM(context)
  if (response is plain text) → print it, done
  if (response says to call a tool) → run the tool, push the result back into context, next turn
}
```

That's it. LangChain, AutoGen, CrewAI — strip any of them to the core and you find this loop. What the frameworks add is peripheral: tool registration, context trimming, multi-agent coordination. Not the loop itself.

The reason to hold this skeleton up on its own is that once you're on a framework, "where's the loop?" becomes hard to answer — you're writing "register a chain" or "start an executor," and the loop is buried in the SDK's internals. For veterans that's an accelerator; for newcomers it's a disaster. The moment something breaks, your first instinct is to open docs and chase issues, not to step back and ask "what did the LLM receive this turn, and what did it return?" Once you've hand-written the while loop yourself, your debugging instincts stay right no matter what framework you adopt later — **first assume the context inside the loop went sideways, then check whether the framework is making things worse.**

### 3.2 agent vs chatbot vs workflow: the three-way split

I've seen too many people use these three words interchangeably. Get them straight and you've cleared up 90% of your scenarios.

| Property | Chatbot | Workflow | Agent |
|---|---|---|---|
| Loop | None (single turn) | Yes | Yes |
| Tool calls | None | Yes (fixed order you write) | Yes (model picks) |
| Who decides next step | User | Your code | Model |
| Stop condition | User goes quiet | Steps run out | Model says end_turn |
| Typical example | Web chat support | An n8n pipeline | Claude Code, Cursor Agent |
| Where you debug | prompt | Branches in your code | context + tool design |

A real counter-example I've seen quoted in several engineering groups:

> "I wrote a script with GPT-4 that auto-generates weekly reports — pulls from Jira, pulls from GitHub, assembles a prompt, posts to Lark. That counts as an agent, right?"

No. That's a workflow. You've hardcoded every step: pull Jira, then GitHub, then assemble, then post. GPT gets called exactly once — during "assemble" — and it has no authority to say "there wasn't much on Jira this week, maybe check Slack first." **If the next step isn't decided by the model, it isn't an agent.**

This split isn't academic pedantry — the engineering implications are completely different. Workflow bugs live in your code: a SQL query is wrong, an API changed its endpoint, a timezone is off by eight hours. Agent bugs live in the context and the tool descriptions: a tool's `description` misleads the model, the system prompt is missing a line like "if you can't find it, just say so," a garbled `tool_result` from the previous turn threw the model off. Two completely separate debugging crafts.

Another analogy: a workflow is a score you wrote by hand, conducting each note; an agent is a theme you hand to a jazz band and let them improvise — what you get to do is pick the band, write the theme, and know when to raise your hand as they start to drift. The most common mistake frontend engineers make on day one is bringing conductor-mind to an improv session — every time it goes wrong, they think "let me add another paragraph to the prompt to plug this case," until the prompt is five thousand words long and the model is more confused than before. This detour comes up repeatedly in the series.

### 3.3 The model decides when to stop — the most unfamiliar part

If you only remember one line from this section, remember this:

**In React, you decide when not to render. In an agent, the model decides when not to loop again.**

Concretely, with the Anthropic API, every `messages.create` returns a `stop_reason`:
- `end_turn`: the model figures it's said its piece — your loop should break.
- `tool_use`: the model wants to call a tool — you execute it, push the result back, run another turn.
- `max_tokens`: the model got cut off mid-sentence — do you continue? (Won't unpack here; in practice you usually continue and concatenate. Post 06 covers when to break instead.)

The first case is the big one. **The model is the one deciding whether it's had enough** — you've handed the wheel over to a probabilistic function. There's almost no analog for this on the frontend. In React you never ask "does this component think it should render?" because the component is inert.

This one point drags in three downstream engineering problems, each handled in a later post; hooks for now:

1. **What if it never stops?** — You need a loop cap. The model can spiral into "let me try this tool one more time, maybe this run is different," and an uncapped `while(true)` will happily run until your credit card alert fires. See [blog195, "Loop Engineering: Three Debts"](/en/posts/blog195_loop-engineering-three-debts-playbook/) — I call this "step debt." The answer is a hard `max_steps` gate: don't trust the model's self-control; count for it. Post 06 covers this.
2. **What if it stops at the wrong point?** — You need a verifier. Sometimes the model triumphantly returns `end_turn`, but the job isn't done: half a file written, lint passed but tests never run, mock data delivered as if it were real. You can't take "done" at face value; another model or a rule set has to judge it again. This is the agent equivalent of code review. Covered alongside step debt in post 06.
3. **Costs spiraling?** — You need a cost circuit breaker. Every step is real API money; a long task can burn through thousands of dollars overnight (the $4200 LeanOps incident in [blog195](/en/posts/blog195_loop-engineering-three-debts-playbook/) is the template). You need two gates running at once: a token budget (per-turn cap) and a step budget (total-turn cap) — and you need to stop early before either fires, saving a last breath to write a checkpoint. Post 10 is dedicated to this.

For now, just carve this line into your brain:

> Handing the wheel over to a probabilistic function — that's where this craft actually begins.

Every technique the next ten-odd posts cover — context compression, tool design, multi-round verifiers, cost circuit breakers, multi-agent orchestration — is essentially a patch around that one sentence. Each layer of patching is chipping at a different face of the same problem: **you've handed the steering wheel over, and the car still can't hit the wall.** You never faced this tension in the frontend era, because your car had no steering wheel — you were pushing it along by hand. The deepest adjustment I've made in the last year of building agents is accepting this: **most of the time, you're no longer the one calling every shot; you're the one designing the rules, drawing the red lines, and setting up the safety nets.** That identity shift is harder than learning any API.

## 4. Doing It: tiny-agent v0.1

Talking about concepts only gets you so far. Let's look at a 32-line agent that runs, calls tools, and returns a result. Repo here: [github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent).

### 4.1 32 lines of code

```javascript
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";

const client = new Anthropic();
const MODEL = "claude-opus-4-7";
const tools = [{
  name: "read_file",
  description: "Read a file from the local filesystem and return its content as a string.",
  input_schema: {
    type: "object",
    properties: { path: { type: "string", description: "absolute or relative path" } },
    required: ["path"],
  },
}];

function runTool(name, input) {
  if (name === "read_file") return readFileSync(input.path, "utf-8");
  return `unknown tool: ${name}`;
}

async function main(userInput) {
  const messages = [{ role: "user", content: userInput }];
  while (true) {
    const res = await client.messages.create({ model: MODEL, max_tokens: 1024, tools, messages });
    messages.push({ role: "assistant", content: res.content });
    if (res.stop_reason === "end_turn") { console.log(res.content.find(b => b.type === "text")?.text ?? ""); return; }
    if (res.stop_reason === "tool_use") {
      const toolResults = res.content.filter(b => b.type === "tool_use").map(b => ({
        type: "tool_result", tool_use_id: b.id, content: runTool(b.name, b.input),
      }));
      messages.push({ role: "user", content: toolResults });
    }
  }
}

main(process.argv[2] ?? "hi, who are you?");
```

That's the whole thing. No framework, no state machine, no Runnable, no Executor. One `while (true)`, one `messages.create`, and an if-else where a switch would do.

### 4.2 Line by line

**Step one: create the client, define one tool.** Anthropic's tool definition is a three-piece set: `name` (the model reads this to decide whether to call), `description` (the model reads this to decide when to call), and `input_schema` (JSON Schema — the model uses it to assemble arguments). `description` is the field frontend engineers most consistently undervalue — it isn't documentation, it's a prompt for the model. I put one sentence here, which is fine for a simple case; for a complex tool, you have to write the `description` with the same care you'd give an API doc. Post 04 goes deeper.

**Step two: `while (true)`.** An explicit loop, no magic. Anyone who's been through LangChain's implicit executor will smile knowingly here — the "where is the loop, really?" question has an answer, and the answer is "right here, you wrote it."

**Step three: `messages.create`.** Every call sends the entire messages array in full. Yes, the whole thing. The model doesn't have the kind of memory you imagine; it only has the context you hand it this turn. Post 02 hammers this — for now, a placeholder.

**Step four: branching.** On `end_turn`, print the text and return out of the loop. On `tool_use`, hand each tool's `input` to `runTool`, collect the results, push them back onto messages, and take another turn.

**Step five: an Anthropic-specific shape.** First, an easy landmine — Anthropic's `content` is **an array of blocks**, and a single response can contain both a `text` block and a `tool_use` block (say, the model narrates "let me read this file" while it fires off `read_file`), which is why the code above uses `find` / `filter` by `type` instead of treating it as a string. Now the shape itself: notice that `toolResults` is pushed as `{ role: "user", content: ... }`, not `role: "tool"`. This differs from OpenAI — OpenAI puts tool results in a dedicated `role: "tool"` message. Anthropic's mental model is that "the tool result is the user's next-turn input," so it goes under user role. You'll trip on this the first time; you'll get used to it. But you need to know the two shapes differ. This kind of divergence isn't about who did it right — it reflects different conversation templates the models were trained on. Get the structure wrong and the model won't crash; it'll start *performing* — pretending it saw something, pretending it knows a result, pretending the task is done. This class of bug is the worst to chase, because everything looks like it's running; it just slowly drifts off course.

### 4.3 Run it — then watch it crash

Happy path first:

```
$ node src/agent.js "read README.md and tell me what it says"
```

Three to eight seconds later, the model returns a summary. You can watch it in the terminal — first it says "let me read this," then triggers `read_file`, then narrates the gist. **That 32-line program in your terminal is the innermost core of Cursor Agent and Claude Code** — I mean it.

Then I did something dumb:

```
$ node src/agent.js "read /tmp/does-not-exist.md"
```

Process died on the spot; a fistful of ENOENT lines in the stack. First time through I thought I'd typed something wrong; it took a while to click — **v0.1 has no try/catch anywhere**. `readFileSync` blows up, the exception bubbles out of the loop, the Node process is gone. The agent isn't dumb; the v0.1 is deliberately naked.

Two branches diverge here:
- **Crash immediately** (what v0.1 does today) — minimum implementation, loudest error, clearest view of what's happening.
- **catch and stuff the error into a tool_result** — let the model see "the path you called doesn't exist" and decide for itself: try another path, ask the user, apologize.

The second is what you'd do in production. But I deliberately left the first path in v0.1 — you have to see what "no exception handling" looks like before you can appreciate what blog06 is solving with verifier / retry.

Homework: add a try/catch to `runTool` yourself and see what the model does when handed an error. You'll find it more capable than you expected — and less capable than you'd hoped.

### 4.4 This 32-line engine *is* Claude Code

This skeleton isn't a toy. It's **isomorphic** to the Claude Code I use daily in [blog194's project passport](/en/posts/blog194_project-passport-agents-md-claude-md-memory/) — Claude Code is essentially this loop wrapped in UI, memory (AGENTS.md / CLAUDE.md), a hook system, permission gates, and a cost tracker. Peel off the wrapping and the innermost core is still `while (true) { create → branch → push result }`.

Concretely, almost every outer layer maps onto something in your 32 lines:

- **`CLAUDE.md` / `AGENTS.md`** (the project passport pattern) → each loop iteration, prepend project context to the system prompt layer of `messages[0]` — not sorcery, just concatenation.
- **Claude Code's `PreToolUse` / `PostToolUse` hooks** → inside the `if (res.stop_reason === "tool_use")` branch, insert a middleware before and after execution (e.g. "does this tool need manual confirmation?" or "should the result be redacted?"). This becomes the spine of post 07.
- **Claude Code's `--resume`** → serialize the messages array to disk; next process boot, read it back and keep looping — plain as that. It's the first thing context management runs into in post 02.

One-liner: **Claude Code = these 32 lines of loop + hooks + memory + UI + permission gates.** The wrapping can be ten times more complex; the core engine is the same one you wrote today. What you wrote today is a miniature Claude Code engine. The rest of this series is layering organs onto that engine, one at a time — until it grows into something you'd trust in production.

---

**Domestic alternatives: Moonshot / DeepSeek also work — two small changes**

> The mainline of this series uses Anthropic because Claude's tool use is a native first-class citizen and its prompt caching is the most mature. But if you need a domestic model, the tiny-agent skeleton is entirely isomorphic; two changes and it runs:
>
> - **Swap the client layer**: Moonshot / DeepSeek's tool-use APIs are OpenAI-compatible — use the `openai` SDK and point `baseURL` at their endpoint.
> - **Two field-name mappings**: `stop_reason: "end_turn"` ≈ OpenAI's `finish_reason: "stop"`; Anthropic's `tool_use` block ≈ OpenAI's `tool_calls`; when pushing tool results back, Anthropic uses `role: "user"` + `type: "tool_result"`, OpenAI uses `role: "tool"`.
>
> Different structure, corresponding roles. Understand the Anthropic version in this post first, then switch to a domestic model, and you'll see at a glance which delta is a shape difference and which is a capability difference — don't conflate them. A moonshot branch is coming to tiny-agent as a demo — [github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent) — open an issue if you want to bump it up the queue.

## 5. The Boundary of the Analogy

I need to stop here and speak plainly: the `UI = f(state)` → `action = LLM(context)` analogy is a scaffold for getting in the door, not a resting place. Three counter-reflections, so neither you (nor I) gets fooled by our own analogy.

**One: render is a pure function; the agent loop is not.** The same state renders to the same UI, always. The same context can produce a different action every call (any temperature above 0 is stochastic; even temperature 0 isn't fully stable — batch scheduling and floating-point drift will make it jitter; post 09's eval piece will unpack this). React lets you write `useMemo` because it trusts function purity — you cannot bring that mental model to an LLM.

**Two: React has a Reconciler and diff; the agent loop doesn't.** React re-renders, diffs, and commits only the minimum change to the DOM. Every agent turn is a brand-new API call sending the entire messages array in full. **No diff.** Cost, latency, and context length all grow linearly — post 02 exists to fix this. Related note: [blog205 on how Fiber's three principles teach agent state design](/en/posts/blog205_fiber-teaches-ai-agent-state-design-three-principles/) covered the double-buffer / stage-commit layer — that's an analogy from a different direction (state commit), while this post is about control flow. Two lanes; don't blur them.

**Three: render is idempotent; the agent is not.** Same state, same UI — that's the air React breathes. Same context, possibly different action — that's the air an agent breathes. On the frontend you debug by "opening devtools and finding the state"; with an agent you debug by "rerunning it ten times and looking at the distribution" — one is a criminal investigation, the other is a poll. This difference shows up directly in your test strategy: on the frontend you write a unit test that asserts "input A produces B"; with an agent you write an eval set that asserts "input A produces B more than 90% of the time." **Testing goes from a true/false question to a statistics question** — which is exactly why post 09 dedicates itself to eval; it isn't extra ceremony, it's the new bedrock you can't unlearn once you've built an agent.

Three lines, one takeaway: **the analogy gets you in; the boundary keeps you from crashing.**

And please remember the deepest layer of that boundary —

> Handing the wheel over to a probabilistic function is where this craft actually begins.

## 6. The Hook: Next Post

Next up: "The Model Has No Memory: Context Is State, and Every Turn Is a Full Re-render."

Analogy hook to sit on: React fully re-renders on every state change, but React has diff, memo, and Fiber to hold the cost down; agents also go full-context every turn — but with no diff. That's why context management, prompt caching, and history compression become agent engineering's first real chore. tiny-agent will grow two organs in v0.2 — **history management + context compression** — `git checkout v0.2` to see the next version: [github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent).

Until then, go play with v0.1 yourself — add a `write_file` tool, then a `list_dir`, and see whether the model strings together multi-step operations on its own. You'll start to feel it: **it thinks more than you'd guess, and it needs more guardrails than you'd guess.**
