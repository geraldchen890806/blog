---
author: Gerald Chen
pubDatetime: 2026-07-27T09:00:00+08:00
title: "Context Is RAM, Memory Is Disk: Give Your Agent Lazy Loading"
slug: blog210_fe2agent-05-memory
featured: true
draft: true
reviewed: false
approved: false
tags:
  - AI Agent
  - Frontend
  - Productivity
  - Claude Code
description: You think the agent remembered your rule; really that sentence lives in yesterday's session's messages array, and today it wakes up brand new. Context is RAM, memory is disk — "write it down" is the only persistence, and retrieve-and-backfill is agent-land's lazy loading. Part 5 of the fe2agent series, with tiny-agent v0.5 (a markdown memory file + naive keyword retrieval + two new tools, save_memory / search_memory).
---

## 1. The Pit

Two Tuesdays ago, in the evening, I laid down a rule for my blog-automation agent: "Remember, the blog publishes at most 4 posts a week. Quality first, don't chase volume." It answered beautifully — recited the rule back to me, and threw in an execution plan for good measure.

Nine the next morning, it handed me a publishing schedule with 6 posts for the week.

My first reaction was that it was glitching. My second reaction was the correct one: it wasn't glitching, it was **brand new**. Last night's "remember" lives in yesterday's session's messages array — what cron pulled up this morning was a new process and an empty array, and as far as it's concerned that sentence never happened. In blog02 I wrote that two sessions' messages arrays "each run their own life" — this time it was my turn to get schooled by my own sentence.

The fix was embarrassingly low-tech: I wrote the rule into a MEMORY.md and made the agent read it at the start of every session. One line of text, and from that day on it never scheduled more than 4. That crude hack is "long-term memory" in its plainest form — not a vector store, not embeddings, a markdown file.

This is post 5 in the series "From useEffect to Agent Loop." blog04 ended on a question: prompt and context squeeze into the same window — what happens to the stuff that doesn't fit? Earlier still, blog02 §3.3 planted a meta-move: "don't put it in the context — retrieve it when you need it." This post cashes both hooks at once: **what doesn't fit goes to disk; what's needed gets fished back up.**

## 2. The Bridge

One line:

> **Context is RAM, memory is disk. Don't force what doesn't fit — write it to disk, build an index, and lazy-load it back when it's needed.**

```
React:                          Agent:

  state (RAM)                      context (messages[])
    | pricey, small,                 | pricey, small,
    | gone on refresh                | gone when the session ends
    v                                v
  localStorage / IndexedDB        memory/notes.md
    | cheap, big,                    | cheap, big,
    | needs serialization            | needs retrieval
    v                                v
  import() loads on demand       recall() backfills on demand
```

The left column you could run with your eyes closed: hot data in memory, cold data on disk, dynamically load when the route hits. The right column is the same playbook — only the "load" step changed from module resolution to text retrieval. Isomorphic skeleton, non-isomorphic precision — that "non-isomorphic" part gets its full airing in §5.

## 3. The Real

### 3.1 Short-term vs. Long-term: RAM and Disk

First, nail the two words down.

**Context is RAM.** Expensive — blog02 ran the numbers: Claude Opus bills input at $5/1M, and full replay makes you re-pay every previous turn's bill each turn. Small — however big the window, it's finite, and stuff it too long and "lost in the middle" is waiting for you. Volatile — the process exits, the messages array is gone; session over means power off.

**Memory is disk.** Cheap — a markdown file on disk isn't billed by the token. Big — write as much as you like. But it takes IO — reads and writes are explicit operations, and the "read it in" step (backfilling into context) is where the spending starts.

Map it onto frontend: state lives in memory and zeroes out on refresh; so anything that needs to stay alive across sessions goes into localStorage or IndexedDB — serialize on write, deserialize on read, nothing gets saved "automatically." Agent-land runs on the same iron law; blog02 stated it as rule number one: **context has no default persistence**. The model won't remember for you; the SDK won't store for you. "Write it down" isn't a note-taking habit — it's the only persistence there is. My "at most 4 posts a week" evaporated not because the model is forgetful, but because I never wrote it to disk while believing I had.

One layer deeper: a lot of people's mental image of "agent memory" is that some neuron inside the model got rewritten by this conversation — no. At inference time the model's weights are read-only; every call you make faces the same factory-fresh model. So-called memory is engineering from end to end: you store, you retrieve, you stuff it back into context. It's the same thing as "the server doesn't remember you; the cookie keeps the session alive." Get this level straight and every memory product on the market demystifies into three questions: where is it stored, how is it indexed, when does it get stuffed back in.

Flip it around and this also explains why "cram it all into context" is a dead end. Someone objects: "the window's big enough — if I carry all my history along, I've got memory, no?" blog02's bill curve already answered: under full replay, every inch of context growth gets re-billed every turn — the "token debt" in [blog195 "Loop Engineering Three Debts"](/en/posts/blog195_loop-engineering-three-debts-playbook/) snowballed exactly this way. Using RAM as disk isn't impossible — it's the kind of impossible that settles its invoice by the hour.

### 3.2 Retrieve-and-Backfill: RAG Is import() on Demand

The minimal closed loop of long-term memory, four steps: **store → index → retrieve → backfill**.

- **Store**: write what's worth keeping into a file (`remember`)
- **Index**: make "finding it" not require a full scan — even if the index is as naive as "date + paragraph"
- **Retrieve**: fish out relevant passages by query (`recall`)
- **Backfill**: stuff what you fished up into this turn's context — only then does the model "see" it

The fourth step is the easiest one to overlook, and it's the one that completes the picture: whatever you retrieve, if it doesn't enter context, you might as well not have retrieved it — blog02 covered this: each turn the model sees only what's in the messages array. However elaborate a memory system gets, its entire output is those few extra paragraphs of text in context.

The frontend analogy lands in one step: **RAG is import() on demand**. The first-screen bundle can't hold every route, so you do code splitting and `import()` the chunk when the route hits; context can't hold all your knowledge, so you write it to disk and load those passages back when the query hits. Intimidating name (Retrieval-Augmented Generation), humble move: look things up first, then answer.

So what about embeddings? The one-line principle: turn a passage of text into a high-dimensional vector so that texts with similar meanings sit close together in vector space — that's how "how many posts next week" can hit "at most 4 posts per week" even when the two sentences share not a single word. It's retrieval's semantic upgrade. But let me pour the cold water first: **on a small corpus, naive keyword retrieval is completely sufficient**. An agent's memory typically runs tens to hundreds of entries; keyword-scored recall is nothing to be ashamed of, and it hands you three things for free: zero dependencies, grep-ability, and when recall goes wrong you can see why at a glance. Vector stores are for when the corpus crosses ten thousand entries — don't bolt a turbo onto a bicycle on day one.

### 3.3 What Stays Resident, What Gets Retrieved, What Never Gets Stored

Not everything should go through retrieval, and not everything deserves storing. A three-way decision:

| Trait | Destination | Example |
|---|---|---|
| High frequency, small size | Resident in system | "at most 4 posts per week", code style conventions |
| Low frequency, large size | Disk + retrieval | past incident postmortems, conclusions from some research |
| One-off | Use and discard | intermediate drafts, this turn's tool output |

The rule of thumb: whatever might be needed every turn stays resident in system — it's small, residency costs tens to a couple hundred tokens per turn, and "always present" is a bargain at that price. Whatever's used rarely but matters when used goes to disk and retrieval — residency's too pricey, but losing it would hurt. Whatever's useless after this turn: don't store it — **every entry you store dilutes retrieval quality**; hoard enough junk and everything you fish up is junk.

What to store also comes with a write discipline: **record conclusions, not process; record the "why", not just the "what"**. "Tried plan A, failed, switched to plan B, worked" is process; "use plan B, because A blows up the cache in a monorepo" is conclusion plus reason. Three weeks later the former reads as noise and the latter can still save your life. It's the same muscle as writing git commit messages: the future reader — maybe the model, maybe you — has only these few lines in hand, and none of the context you had at the time.

## 4. The Work: tiny-agent v0.5

### 4.1 What v0.5 Grows

`git checkout v0.5` gets you this cut: [github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent). Compared to v0.4, three new things:

- New file `src/memory.js`: three exported functions `remember` / `recall` / `recentNotes`, one markdown file as storage
- `src/tools.js` registers two new tools `save_memory` / `search_memory` — blog03 said "the toolbox will keep growing"; this is the first installment
- `Context.toRequest` splices the latest 5 memories into a second system block: the stable BASE_SYSTEM up front, cached; the volatile memory behind, uncached (agent.js calls toRequest as before — not a line changes there)

### 4.2 memory.js, All 35 Lines

```javascript
import { readFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";

const NOTES_PATH = "memory/notes.md";
const RECENT_N = 5;
const TOP_K = 3;

export function remember(text) {
  mkdirSync("memory", { recursive: true });
  const entry = `\n## ${new Date().toISOString().slice(0, 10)}\n${text.trim()}\n`;
  appendFileSync(NOTES_PATH, entry, "utf-8");
  return `remembered (${text.trim().length} chars)`;
}

function loadEntries() {
  if (!existsSync(NOTES_PATH)) return [];
  return readFileSync(NOTES_PATH, "utf-8").split(/\n(?=## )/).map(s => s.trim()).filter(Boolean);
}

export function recall(query) {
  const terms = query.toLowerCase().split(/[\s,，。、/]+/).filter(t => t.length > 1);
  if (!terms.length) return [];
  return loadEntries()
    .map(entry => ({
      entry,
      score: terms.reduce((n, t) => n + (entry.toLowerCase().includes(t) ? 1 : 0), 0),
    }))
    .filter(e => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K)
    .map(e => e.entry);
}

export function recentNotes(n = RECENT_N) {
  return loadEntries().slice(-n).join("\n\n");
}
```

The tools registered into `tools.js` (excerpt; inside `runTool` just add one branch each forwarding to `remember` / `recall`):

```javascript
{
  name: "save_memory",
  description: "Persist a durable fact or rule for future sessions. Save conclusions and constraints, not process. One fact per call.",
  input_schema: { type: "object", properties: { text: { type: "string", description: "the fact to remember" } }, required: ["text"] },
},
{
  name: "search_memory",
  description: "Search long-term memory with space-separated keywords. Use when the task may depend on rules or facts from earlier sessions. Returns top 3 matching notes.",
  input_schema: { type: "object", properties: { query: { type: "string", description: "keywords, separated by spaces" } }, required: ["query"] },
},
```

The system `Context.toRequest` emits becomes two blocks:

```javascript
system: [
  { type: "text", text: BASE_SYSTEM, cache_control: { type: "ephemeral" } },
  { type: "text", text: `## Recent memory\n${recentNotes()}` },
],
```

Four points, driven all the way home:

**One, the paragraph is memory's smallest unit.** Every memory gets appended to the end of the file starting with `## date`; `loadEntries` splits on `## `, `recall` recalls by paragraph. Choosing markdown over JSON is deliberate too: a human can open it and review it, the agent can grep it, git can diff it — the memory file rides the same version control as the code, and when something goes wrong, `git log memory/` can tell you "which day did this entry get written."

**Two, recall is shabby to the point of embarrassing — but confidently shabby.** The scoring logic is one line: for each term the query splits into, an `includes` hit in a paragraph scores 1; sort by score, take top 3. I didn't even write a tokenizer — notice that "space-separated keywords" phrase in `search_memory`'s description: I outsourced tokenization to the model, making it split the query into keywords itself at call time. Description is a prompt (blog03's exact words), and here it picks up one more use: **a tool's instruction manual can save you real code**.

**Three, the line between resident and on-demand sits exactly between those two system blocks.** This lands in `Context.toRequest`: system goes from one block to two — BASE_SYSTEM arrives via the constructor, and the memory block is assembled fresh every turn, so a note saved mid-session shows up on the very next turn. The latest 5 entries ride `recentNotes` and stay resident (fresh memories are the ones most likely relevant to the task at hand); anything older goes through `search_memory` on demand — §3.3's three-way decision landed as two lines of code. The order matters too: blog02 covered that the cache is prefix-matched — the stable BASE_SYSTEM sits up front with `cache_control`, the daily-changing memory block sits behind without — so the volatile part can't smash the cache on the block before it.

**Four, `save_memory`'s description has the discipline written into it.** "Save conclusions and constraints, not process. One fact per call." — §3.3's write discipline isn't something for the reader to nod at and forget; it's written straight into the tool's semantics so the model reads it before every call. Leave it out and the model will store play-by-plays like "I first read the file and then analyzed the contents," and within two weeks your memory file is a landfill.

### 4.3 Give It a Spin

Day one, store the rule:

```
$ node src/agent.js "remember: the blog publishes at most 4 posts per week, this is a hard rule"
[turn · tool_use=save_memory]
Saved to long-term memory: the blog publishes at most 4 posts per week (hard rule).
```

Day two, new process, new session — the entry is still within the "latest 5," so `recentNotes` carried it straight into system:

```
$ node src/agent.js "plan next week's publishing schedule, I have 6 drafts on hand"
Scheduling 4: Monday / Wednesday / Friday / Sunday; the other 2 roll over to the week after —
you have a hard rule: at most 4 posts per week.
```

A month later, this entry has been pushed out of the "latest 5" by newer memories, and retrieval takes the stage:

```
$ node src/agent.js "how many posts can go out next week?"
[turn · tool_use=search_memory input={"query":"weekly publish post count rule"}]
[turn · ...]
At most 4 — retrieved a memory from 2026-07-14: the blog publishes at most 4 posts per week (hard rule).
```

It decided on its own to check memory before answering — because `search_memory`'s description says "use when the task may depend on rules or facts from earlier sessions." Note the bill here: the resident latest-5 runs two or three hundred tokens, the three retrieved passages another two or three hundred — small sums, paid on demand; and notes.md itself, however long it grows, costs zero tokens — **that's the entire payoff of lazy loading: the window holds only what this turn will actually use**.

While we're at it, compare the shapes of the three sessions: day one it wrote to disk via a tool; day two it read straight from the resident block, no retrieval needed; a month later it fished the old entry up via retrieval — the same rule, three ways of showing up, matching the first two rows of §3.3's table. Every route leads to the same terminus: that sentence made it into this turn's context.

**Crash section (mandatory)**: v0.5's first cut had no `recentNotes` — to save effort I spliced **the entire notes.md into BASE_SYSTEM**, and slapped `cache_control` on it for good measure. Two weeks later, two bills blew up at once. The first was money: I had it store two or three entries a day, notes.md compounded its way up to 6k tokens; and since the file changed daily, the cache prefix changed daily, `cache_read` sat permanently at 0 — 6k tokens paying full rack rate every single turn, a rerun of blog02's "timestamp smashes the cache" crash, just with a bigger hammer. The second was intelligence: one day I asked it to expand a draft to 4,500 words, and it cited a three-week-old memory to argue with me, dead serious — "you previously set a standard: keep each post in the series around 3,000 words." That memory really was mine, and it really was stale (the standard had long since moved to 4,000+), but there it lay in system, fighting the new instruction every turn. I call this phenomenon **memory drift**: what you wrote down was "true at the time"; if you never clean it up, it keeps showing up in context posing as "true right now." The fix is the current version: auto-carry only the latest 5, route everything else through `search_memory` on demand, and stale entries get deleted or amended.

### 4.4 One Mapping: CLAUDE.md's Layering

Series-internal reference: [blog194 project passport](/en/posts/blog194_project-passport-agents-md-claude-md-memory/) covered Claude Code's CLAUDE.md system — project-level `./CLAUDE.md`, user-level `~/.claude/CLAUDE.md`, auto-spliced into the system prompt at every session start. Translated into this post's vocabulary: that's the productization of the "high frequency, small size → resident in system" decision — same slot, same motive as v0.5's `recentNotes`. And Claude Code's auto-memory (MEMORY.md + index files) is the industrial edition of `notes.md`: also markdown, also split into two layers — a "resident index" and an "on-demand body."

One more field discipline while we're here: **a memory is a point-in-time observation, not live state**. My MEMORY.md once recorded "some project still has 58 old short posts pending deletion" — two months later, is that number still 58? No idea; only a fresh grep counts. So the rule I set for my own agent: verify "facts" from memory before using them — run an `ls` / `grep` against the scene before acting. Memory tells you where to look; the scene tells you what's actually there — don't mistake the notebook for the dashboard.

### 4.5 Moonshot Footnote

> Good news: the memory layer lives 100% client-side and couldn't care less who the model vendor is — switch to Moonshot / DeepSeek and `memory.js` doesn't change by a line. Only two old friends need touching: wrap the tool definitions in `{ type: "function", function: {...} }` (covered in blog03's footnote); and OpenAI-style system is a single string message, so splice `recentNotes()` onto the **tail** of the system string — stable prefix, volatile tail, and the server-side automatic prefix caching still hits (covered in blog02's footnote). Also, the OpenAI camp offers managed retrieval like file_search / retrieval — outsourcing "index + retrieve" to the platform. Convenient, but you can't see what got recalled or why, and debugging goes pitch black. Starting out, I'd say master your own 35 lines first.

## 5. The Boundary: Where the Analogy Breaks

localStorage, import(), caching — this post's analogies all come easily to hand. Where they hold, I'll grant them: only disk persists, on-demand is what saves money, residency needs layering. But three places they can't carry, and I owe you those in full.

**One: localStorage fetches by exact key; retrieval is fuzzy matching.** `localStorage.getItem("rule")` either gets you the entry or null — the boundary is crisp. `recall("publishing rules")` isn't lookup, it's **ranking** — what it returns is "the three most similar," and "most similar" is not "relevant." Keyword retrieval will score "font rules for the publishing-event slide deck" and "weekly publishing count rule" identically; embeddings merely upgrade wildly wrong into respectably wrong. So recall quality is itself something to be tested — precision, recall, those old information-retrieval words will come back for you; blog09 on evals will put them into the eval set.

**Two: a failed import() throws; a "failed" retrieval doesn't error.** Dynamically import a chunk that doesn't exist and you get a loud, shiny exception. Retrieve three irrelevant memories and there's no error whatsoever — they lie down quietly in context, the model takes them **at face value**, and reasons on top of them. That "3,000-word standard" from the crash section worked exactly this way: it wasn't a bug, it was a stale fact delivered normally by a normally functioning retrieval mechanism. **Fishing up the wrong thing is worse than fishing up nothing** — come up empty and the model says "I don't know"; come up wrong and the model confidently knows something false. Same family of incident as blog03's "read the error as content": the model has no skepticism mechanism toward what's in context — whatever you stuff in, it believes.

**Three: HTTP caching has an invalidation protocol; memory has no TTL.** In frontend cache-land there's Cache-Control, there's ETag, there's max-age — expiry is part of the protocol, and the browser enforces it for you. The memory file has none of that: an entry written three weeks ago won't grey itself out, won't expire on its own; unless you act, it keeps speaking in day-one's voice forever. So **forgetting has to be designed**: date every entry (v0.5's `## date` isn't decoration), review notes.md periodically, and at minimum re-verify the scene whenever an old memory gets used (§4.4's discipline). The human brain's forgetting is a free feature; an agent's forgetting is a line item on your schedule.

One line to close: **the frontend storage stack only asks you to layer; the agent memory stack forces you to manage one more thing — the act of believing itself.**

Echoing the series spine: control was handed over to a probabilistic function ([blog01](/en/posts/blog206_fe2agent-01-agent-loop/)), context is its input each turn (blog02), tools are its hands (blog03), prompt is the rules of the road (blog04) — memory attaches to the "input" bone, the layer of sediment added onto the input: it can't decide what the model thinks this turn, but it decides whether the lesson from three weeks ago is in the room this turn. The wheel's been handed over, but **you still run the trunk — it only fits one small bag per trip, and what to pack, and when to hand it forward, is your job**.

## 6. The Hook: Next Up

Next up: "In Agent Land, Errors Are Scheduled Work: From Error Boundary to Verifier."

The analogy hook: this post already showed you failure's new shape — retrieval will fish up the wrong thing with a perfectly straight face, and throw no error. Pull the camera back: tools will die (ENOENT, 429), the model will dream up functions that don't exist, and it will confidently announce "done" with the job half-finished. In frontend, an error is the exception branch; wrap it in try/catch and move on. In agent-land, **failure isn't the exception branch, it's the main path** — what you want isn't "no errors," it's "when it errs, the system still moves in the right direction."

tiny-agent v0.6 will grow three organs: a **max_steps hard brake** (cashing the hook blog01 planted five posts ago), **retry + exponential backoff** (for mechanical failures like 429/5xx), and a **verifier** (for semantic failures like "the confident half-job" — the model doing the work and the model signing off kept separate). `git checkout v0.6` gets you the next cut: [github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent).

Before that lands, homework: hand-stuff 20 memories into `memory/notes.md` (real or made up, either works), then ask v0.5 ten questions, log the three entries each `search_memory` fishes up, and count how many are relevant and how many aren't. That table is your first recall-quality dataset — when blog09 gets to evals, you'll find you already built the feel ahead of time.
