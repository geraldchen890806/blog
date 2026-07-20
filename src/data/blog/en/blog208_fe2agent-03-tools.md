---
author: Gerald Chen
pubDatetime: 2026-07-21T09:00:00+08:00
title: "Tool Call: Let the AI Dispatch, You Stay the Reducer"
slug: blog208_fe2agent-03-tools
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI Agent
  - Frontend
  - Productivity
  - Claude Code
description: In frontend you dispatch and you write the reducer. In an agent the AI dispatches; the reducer half is still yours. Part 3 of the fe2agent series — the tool schema trio, separation of execution rights, validating the AI like an untrusted client, with tiny-agent v0.3.
---

## 1. The Pit

A reader followed blog01, pulled tiny-agent down, got it running, and came back the next day to complain. He had added a `write_file` tool to the agent and asked it to read the README and tell him what the project did. It read the README, and before he could react, on the next turn it fired `write_file` and overwrote the entire "Contributing" section with a rewording it thought read better, on the grounds that the original "felt a bit messy." Half his screen of file, flattened. His message to me: this wasn't the contract I signed.

The word "contract" tightened something in my chest, because I knew exactly what he had stepped on. He thought he was the one doing dispatch and the model was just his UI; the moment he signed off on that `write_file` tool, he had handed the dispatch half over. **Inside an agent, the one doing dispatch is not you, it's the AI.** What you hand over is not just UI control, it's the choice of what to do next.

This is part 3 of the "From useEffect to Agent Loop" series. blog01 said an agent is a while loop with an impure function inside it; blog02 said context is the input it reads each turn. This piece is about the most dramatic beat in that loop: **tools** — what it can do this turn, and how absurdly wrong things get once "what it can do" is defined slightly off.

## 2. The Bridge

One sentence:

> **A tool schema is Redux's action type + payload contract. The difference is the AI is doing dispatch and you're the reducer.**

```
Redux:                        Agent:

  You dispatch                   AI dispatch
    │                              │  (tool_use)
    ▼                              ▼
  action { type, payload }       tool call { name, input }
    │                              │
    ▼                              ▼
  reducer(state, action)         runTool(name, input)
    │                              │
  yours, pure                    yours, side effects allowed
```

Execution belongs to you, choice belongs to it. These two halves stay split — hold on to that sentence; half of this post is annotation on it.

## 3. The Real Thing

### 3.1 The tool schema triad: name / description / input_schema

Start with the plainest tool definition (Anthropic style):

```javascript
{
  name: "read_file",
  description: "Read a file from disk. USE THIS BEFORE WRITING—always read current content first to avoid clobbering.",
  input_schema: {
    type: "object",
    properties: {
      path: { type: "string", description: "File path, relative or absolute" },
    },
    required: ["path"],
  },
}
```

Three fields, three roles:

- `name`: the model decides **whether to call it** — it picks from a list of tools, and name is the key it sees
- `description`: the model decides **when to call it** — the semantics live in this line, when to use, when not to, all of it
- `input_schema`: the model decides **how to call it** — JSON Schema tells it field names, types, what's required

The insight is the second bullet. **description is not documentation, it's a prompt.** Write `"Read a file"` and the model reads it as "read once"; write `"Read a file. USE THIS BEFORE WRITING—always read current content first"` and it will read before it writes. Same tool, same implementation, same call surface — different description wording flips the behavior to a completely different shape. That sets a hook for blog04's prompt discussion: you think tools are the interface and prompts are the copy — they're not, **the heaviest piece of a tool is also a prompt**.

While we're here, let's strip the mystique off LangChain's layer. You've written the `@tool` decorator with a docstring and it felt magical: decorate a Python function and it becomes a tool. It's not magic — it's **taking the docstring and splicing it in as description before sending it to the model**. That "if the user mentions xxx, call this function" line you wrote inside the docstring gets sent to the model verbatim as a prompt. Once you see this, you stop being fooled by the "the framework gave me a tool" feeling — **what the framework gave you is a prompt-assembler, and the real semantics of the tool are the sentence you wrote inside the docstring**.

### 3.2 dispatch table: the AI is the dispatcher, you're the reducer

Let me unfold the bridge from the top. (If you've written Redux at any point in the last decade — Redux Toolkit counts, Zustand's `set` counts as spiritual heir — this will feel familiar.)

Redux mental model: **you** decide which action to dispatch, the reducer decides how state changes. The dispatch step is in your hands — you pressed a button, clicked a link, got a network response back.

Agent mental model: **the AI** decides tool_use (dispatch), your `runTool` decides how it runs (reducer). The dispatch step is no longer in your hands — after it reads context it picks a tool on its own, fills in the input on its own, and your runTool takes that action and executes it.

This isn't wordplay. It cashes out into concrete engineering consequences:

**One, the reducer must be behaviorally predictable.** Redux reducers emphasize purity: same state + same action = same new state. Your runTool doesn't have to be pure — a tool's whole purpose is producing side effects, reading files, writing files, sending requests, all side effects. But **behavior must be predictable**: same input yields the same output or the same error. Otherwise the model can't learn to use your tool; it tried it this turn, and next turn faced with a similar situation it won't dare try again because it doesn't know whether you'll suddenly behave differently.

**Two, the action contract cannot change.** In Redux you don't suddenly rename `ADD_TODO` to `ADD_ITEM` — that blows up every reducer. Once a tool schema is published it's the same — renaming a field, changing what's required, changing the semantics, that's equivalent to bumping an API version in a frontend app, you need a gradual rollout. You think renaming a field is a refactor; what the model sees is "you moved the button I knew and quietly changed its behavior."

**Three, unknown actions must error, not get swallowed.** In Redux the default case usually just returns state and moves on, because the action space is a compile-time enum — a little fuzziness is fine. In an agent it's not — the action space is **open**, and the model will make up tool names that don't exist (§5 explains why). If you swallow an unknown tool, the model sees the call "succeed" and keeps reasoning on top of that assumption, drifting further wrong. In v0.3 I deliberately kept the unknown tool branch; it's mandatory.

Going one layer deeper: why does **splitting execution off** matter? The answer: let the AI err on **choice**, not on **side effects**. Wrong tool picked, wrong arguments filled — those errors you can intercept, retry, backstop. Once a side effect happens — `rm -rf` actually ran, the DB actually got deleted — that's a one-shot wound with no rollback. Handing dispatch to the AI and keeping the reducer in your own hands means keeping the controllable half on your side.

This is also blog03's place in the series spine. blog01 was about **handing the wheel over to a probabilistic function** (choice), blog02 was about **context being what it reads each turn** (input), blog03 is about **execution staying in your hands** (side effects) — the three together form the minimal triad of agent engineering. Choice, input, execution — one you hand out, one you feed, one you hold tight. That's the spine I've most wanted to convey after two years of this work.

### 3.3 Validation: treat the AI as an untrusted client

Frontend has a piece of muscle memory: **always validate user input**. required on the form, type checks, length limits — you don't expect users to fill things in obediently. You do this not out of distrust but because you know they'll fumble, misclick, paste the wrong thing.

Swap the noun and it's obvious: **the AI fumbles too**. It will drop required fields, get types wrong, put explanation text inside a `path` (it really does), and occasionally confidently invent a field name that doesn't exist. If you don't validate and just stuff its input into `readFileSync`, you're stuffing an unvalidated form directly into the DB.

tiny-agent v0.3's `validateInput` is a dozen-odd lines, hand-written on purpose, no library:

```javascript
function validateInput(schema, input) {
  const errors = [];
  for (const key of schema.required ?? []) {
    if (!(key in input)) errors.push(`missing required field: ${key}`);
  }
  for (const [key, spec] of Object.entries(schema.properties ?? {})) {
    if (!(key in input)) continue;
    const actual = typeof input[key];
    if (actual !== spec.type) errors.push(`field '${key}' should be ${spec.type}, got ${actual}`);
  }
  return errors;
}
```

required + type check, those two alone stop 80% of the nonsense. In production, swap in **ajv** or **zod** — they're more complete, faster, with nicer error messages. But at this stage I hand-write it deliberately: **so you can see that "schema validation" translated into code is just these few for-loops**, instead of getting swallowed by ajv's setup and losing the concept.

The real design isn't in the validation itself, it's in **how you tell the model after validation fails**. Look at this piece:

```javascript
{
  type: "tool_result",
  tool_use_id: b.id,
  content: result.error ?? result.content,
  is_error: !!result.error,
}
```

Anthropic's tool_result supports an `is_error: true` field — **an explicit signal to the model that this call failed**. On receiving it, the model will fix the arguments and retry on its next turn. Validation errors become learning opportunities, not a crash-out. This closes the loop blog01 §4.3 left open — I intentionally left out try/catch in v0.1 and let the tool throw and crash, so that when v0.3 fills this layer in you can compare the two generations side by side.

Quoting from blog195:

> [blog195's loop debt three-debts playbook](/en/posts/blog195_loop-engineering-three-debts-playbook/) puts tool call validation under verification debt — not an optional polish, a debt you must pay down. Because **an unvalidated tool is like tossing the steering wheel into the passenger seat** — the model can grab it or not, and if it doesn't, nobody's steering, and you don't even know when you're about to hit the wall.

I'll say this once more in its own line: an unvalidated tool = steering wheel in the passenger seat. That's the single sentence I most want you to walk away from blog03 remembering.

## 4. Doing It: tiny-agent v0.3

### 4.1 What v0.3 grew

The diff from v0.2 to v0.3:

- new file `src/tools.js`: 3 tools (`read_file` / `write_file` / `list_dir`) + `validateInput` + `runTool`
- `agent.js` shrinks: tool definitions, schemas, execution branches all move into tools.js
- tool_result gains an `is_error` field

Why extract `tools.js` in this cut? blog02 extracted a `Context` class because the fields multiplied and needed a home; here we extract tools because **tools are going to keep growing**: blog05 adds "memory retrieval", blog08 adds "subagent dispatch" — both land in this file as tools; blog07's "danger-op confirmation gate" will stand next to it as its own layer (a gate isn't a tool, it's the barrier in front of the tools). Centralizing now is making room for the coming chapters, not compulsion.

### 4.2 The code + walkthrough

The `runTool` main function:

```javascript
export function runTool(name, input) {
  const spec = toolByName[name];
  if (!spec) return { error: `unknown tool: ${name}` };

  const errors = validateInput(spec.input_schema, input);
  if (errors.length) return { error: `input validation failed: ${errors.join("; ")}` };

  try {
    if (name === "read_file") {
      return { content: readFileSync(input.path, "utf-8") };
    }
    if (name === "write_file") {
      writeFileSync(input.path, input.content, "utf-8");
      return { content: `wrote ${input.content.length} bytes to ${resolve(input.path)}` };
    }
    if (name === "list_dir") {
      const entries = readdirSync(input.path).map(name => {
        const full = resolve(input.path, name);
        const s = statSync(full);
        return { name, type: s.isDirectory() ? "dir" : "file", size: s.size };
      });
      return { content: JSON.stringify(entries, null, 2) };
    }
    return { error: `tool '${name}' has no handler` };
  } catch (err) {
    return { error: `${err.code ?? err.name}: ${err.message}` };
  }
}
```

Four things worth spelling out:

**One, three layers of defense, order matters.** First `unknown name` → then `validateInput` → finally `try/catch`. What happens if you flip them? Can't validate against a schema you haven't found. Running code without validating is asking it to blow up. The three layers have strict causality; don't flatten them out for the sake of "cleaner-looking" code.

**Two, uniform return shape `{ content } | { error }`.** In TypeScript this is called a discriminated union, and it works just as well in JavaScript — one `if (result.error) ... else ...` at the call site handles both. Don't have one function that sometimes returns a string and sometimes throws; the call sites turn into a maze.

**Three, `try/catch` catches runtime errors.** `ENOENT` (file not found), `EACCES` (permission denied), `EINVAL` (invalid argument) — these are real errors fs will throw. This line is the answer to blog01 §4.3's v0.1 crash incident: **last version I let it crash on purpose, this version one line of catch scoops all of them up**. Written here, side by side with that one, so "filling it in" becomes something you can actually see.

**Four, I deliberately wrote a "will not mkdir" line into `write_file`'s description (the tool definition isn't pasted in this post — you'll find it in the repo's `src/tools.js`).** Whether to auto-mkdir before writing is a **policy decision**, and it shouldn't be hidden inside tool behavior for the AI to guess at. State plainly in the description that it won't mkdir, and the AI will know to ask the user or `list_dir` first when it hits a missing directory. Say nothing and it will assume some "reasonable default" — and its "reasonable" is often not yours. Policy goes in the semantics, not hidden in the implementation.

### 4.3 A quick run

Multi-tool coordination (the biggest tangible difference from v0.2):

```
$ node src/agent.js "look at what's in the current directory, then extract the first line of the README and write it to tmp.txt"
[turn · tool_use=list_dir]
[turn · tool_use=read_file]
[turn · tool_use=write_file]
done. tmp.txt created, contents "# tiny-agent"
```

Three tools chained to complete one small task, the model sequences the steps itself: list to see what's there, read to grab the content, write to persist. This is the line blog01 §3.2's trichotomy drew between workflow and agent — a workflow is you hard-coding list→read→write, an agent is **the model ordering the steps itself**. Same three steps, one is you writing the if/else, the other is you handing over three tools and letting it pick.

Now watch a validation trigger:

```
$ node src/agent.js "read a file"
[turn · tool_use=read_file input={} ]
tool_result: is_error=true, "missing required field: path"
[turn · tool_use=read_file input={"path": "README.md"} ]
finished reading README.md...
```

First turn it drops the path, validation catches it, `is_error: true` goes back; second turn it fills in path and retries. The first time I watched this play out I stared at the screen for a few seconds — it didn't crash, didn't apologize, it just **swapped the argument and tried again**. That was the moment I first felt that schema validation isn't defense, it's teaching.

**Crash section (mandatory)**: my first pass on tool_result forgot to pass `is_error` and just stuffed the error string into content. Looks fine on the surface — the model still received "missing required field: path". Ran it and found the bad thing: the model **read that error string as the result of the tool call itself**, and reasoned confidently on top of that "result" on the next turn. So after calling `read_file`, with the error stuffed into content, the next turn's thinking would contain something like "based on the file contents I just read, missing required field..." — nonsense. It read the error as content.

Looks like a model bug — it's actually me not giving it a signal. Lesson in one line: **"failed or not" and "failure reason" are two fields, don't stuff them into one.** The frontend analogy lands even harder: `fetch` returns body but no status code — how do you know 200 vs 500? You don't — you treat it as 200 and render the HTML of an error page as business data. A tool_result missing `is_error` is that scenario.

### 4.4 One mapping: blog194's PreToolUse and this validation

An in-series callback:

> [blog194's project passport](/en/posts/blog194_project-passport-agents-md-claude-md-memory/) covered Claude Code's `PreToolUse` hook — a script that runs before each tool call and decides whether to let it through. That's an **extension** of this post's validation layer, not a replacement: `validateInput` handles **whether the arguments are correct** (data layer), `PreToolUse` handles **whether this action should happen** (policy layer). After validation passes and before it actually runs, add one more gate for "does a human need to confirm?" — for example, "delete-class tools require typing yes to proceed." The two layers split the work clearly: one on data, one on policy. blog07 expands on the danger-confirmation gate; you'll see how the two layers stack there.

### 4.5 Moonshot Footnote

> OpenAI-style tool schemas have a different shape: wrap each in `{ type: "function", function: { name, description, parameters } }`, and `parameters` is a JSON Schema, equivalent to Anthropic's `input_schema`. Moonshot / DeepSeek both follow the OpenAI shape.
>
> Anthropic's `is_error` has no explicit counterpart on the OpenAI side — you write the error message plus context into the tool message's content, and the model relies on language understanding to recognize "this one failed." **Different structure, equivalent semantics**: your requirement is that the model knows it failed and why, and both sides satisfy it, one via a field, one via text.
>
> One line: when switching to a domestic model, wrap each tool item in a `function`; you don't touch a line of `validateInput` logic.

## 5. Edges: where the analogy breaks

The Redux analogy holds up the longest of any this series: dispatch/reducer split, schema as contract, errors returned to "the user" — all correct, mid-level frontend engineers get it instantly. But three places it can't carry, and I owe you those in full.

**First: Redux's action space is a compile-time enum, an agent's action space is open.** In Redux action type is `AddTodo | RemoveTodo | ToggleTodo`, a union, and TypeScript exhausts it for you. In an agent there's no such guarantee — **the model will make up tool names that don't exist**. You exposed only 3 tools; sometimes it will call `delete_file`, `git_commit`, `send_email` — it's seen too many other projects, its head has a "in this kind of scenario people usually use this tool" pattern match, and it invents one on the spot. So your `unknown tool` branch **isn't defensive tidiness, it's on the main path**. The day I first ran v0.3 I saw it call `search_file` once — I had no such tool.

**Second: Redux reducer semantics are explicit, most of a tool's semantics hide in the description shown to the model.** In a reducer `case 'ADD_TODO': return [...state, action.payload]` — the semantics are these lines of code, you nailed them down. Tools are not — **half of a tool's semantics is for your own implementation (branches inside runTool), and half is for the model to understand (description)**. And you don't directly control that second half: you thought it read clearly, the model may read it sideways; the model reads it correctly this version, and the next model release may read something else. **You are maintaining a spec written for a model, and this spec has a probabilistic reader.** The feel of this is completely different from frontend's "write the docs and you're done."

**Third: in Redux dispatch is inevitably followed by reduce; in an agent tool_use may not lead to the model using your result.** Redux is idempotent and inevitable — dispatch runs, reducer runs, state updates, and you can predict it. Agents don't: the model called `read_file`, you gave it the accurate file contents, and next turn it **can choose not to believe you**. It may go "based on my judgment, this content looks incomplete, let me call it again," or "based on this content, I think the original intent was..." — it decides how to use tool_result; you're only responsible for producing an accurate result. **It can choose not to believe you** — I startled myself the first time I said that out loud, but that's the reality.

The third one is the wildest. In frontend you don't expect the user to second-guess the reducer's return value; in an agent it will. This is blog01's spine cashing out concretely — **you handed the wheel over, and one of the spokes is labeled "tools", but whether pulling on it actually turns your direction is still up to it**.

Closing line: **Redux teaches you to treat the action contract as a signed contract; agents teach you that even after both sides sign, whether the other side read it, understood it, and honored it is still your problem to handle.**

Echoing the blog01/02 spine: hand the wheel over to a probabilistic function ([blog01](/en/posts/blog206_fe2agent-01-agent-loop/)) + context is its input each turn (blog02) + tools are the choices it can make this turn (blog03) — **the three assembled**, and the agent skeleton is there. The remaining 7 pieces are muscle added to this skeleton: memory adds sedimentation to "input," subagents add orchestration to "choice," hooks add insurance to "execution." The skeleton doesn't change.

## 6. The Hook: next up

Next up: "Prompt Is the New CSS: Declarative, Cascading, No Devtools."

The analogy hook: blog03 covered how tools are defined, but **why description wording alone can decide model behavior** wasn't dug into — that's the core of prompt engineering. Same tool, description changed from `"Read a file"` to `"Read a file. USE THIS BEFORE WRITING"`, and the model's behavior shifts to a completely different shape; system prompt changed from `"You are a helpful assistant"` to `"You are a cautious file editor who always reads before writing"`, and the calling strategy shifts again. These behavior deltas look a lot like CSS's cascade — declarative, overridable, but you have no devtools to see which rule is currently in effect.

tiny-agent v0.4 will grow: **rewrite the system prompt to compare behaviors** — same tool set, two prompt versions, run the same task and diff the outputs. This turns "prompts influence behavior" from a claim into numbers on your screen. `git checkout v0.4` gets you the next version: [github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent).

Before that lands, give v0.3 a homework assignment: rewrite `read_file`'s description in three different versions (a minimal one, one with USE THIS BEFORE, one with EXAMPLES), run the same task five times against each, and watch when the model calls it and how often. That hands-on feel beats any "prompt best practices" article — because it's data on **your own tool**.
