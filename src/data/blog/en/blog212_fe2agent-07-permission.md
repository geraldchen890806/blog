---
author: Gerald Chen
pubDatetime: 2026-08-02T09:00:00+08:00
title: "Pop a window.confirm at the AI: Permissions, Hooks, and Human-in-the-Loop"
slug: blog212_fe2agent-07-permission
featured: true
draft: true
reviewed: false
approved: false
tags:
  - AI Agent
  - Frontend
  - Productivity
  - Claude Code
description: blog06 covered "how to recover when it goes wrong"; this one covers "even when it's right, it doesn't get to just do it" — an rm -rf that succeeds on all three retries is the real disaster. Permission is a spectrum, not a switch; confirmations must name consequences; and a denial is information you owe back to the model. Part 7 of the fe2agent series, with tiny-agent v0.7 (danger-level table + confirmation gate + JSONL audit log).
---

## 1. The Pit

One night, one of my automation agents was doing the most routine config update imaginable — adding a field to an account configuration file. It read the file, made the change, wrote it back; every log line came out squeaky clean. The problem was the "wrote it back" step: what it wrote back wasn't the full modified content, it was the part it understood as "the part that was needed." A config file that had been maintained for months got wiped out by a half-finished draft containing little more than the new field. Within minutes, every bot that lived off that config went offline at once.

The worst part of the postmortem: every single step it took was "reasonable." It read, it edited, it wrote — nothing errored, even a verifier couldn't have flagged it — the file really did get written successfully. The fault wasn't in any one step. The fault was that this class of operation should never have been its call to make alone.

Since that night, every agent I run lives under one rule: config changes, file deletions, production deploys must pass through two rounds of human confirmation — "if it was only confirmed once, it must be asked again." Sounds bureaucratic; that rule has since blocked more than one incident.

If you read blog03, you'll remember the reader from its opening: he gave his agent a `write_file`, the agent casually overwrote the contributing guide in his README with "better wording," and his message to me was "this wasn't the contract I signed." Back then my point was that he'd handed dispatch over; now I can finish the other half — what he was actually missing was a confirmation gate.

This is part 7 of the "From useEffect to Agent Loop" series. blog06 was about "how to recover when it goes wrong": retries, backoff, verifiers. This post is about a different species of problem: **"even when it's right, it doesn't get to just do it."** If `rm -rf` fails, you can retry; if it succeeds on all three retries, that's the real disaster.

## 2. The Bridge

One line:

> **Bolt a window.confirm in front of dangerous operations — dispatch is still the model's; the right to wave things through comes back to you.**

```
React:                        Agent:

  user clicks "Delete"           model sends tool_use: write_file
    │                              │
    ▼                              ▼
  window.confirm(                gate(
    "Delete this record?")         "about to overwrite config.json")
    │                              │
  OK     → actually delete       yes → runTool actually runs
  Cancel → nothing happens       no  → tool_result:
                                       "user denied" (is_error)
```

On the left you're intercepting a user's slip of the mouse; on the right you're intercepting the model's confidence. There's one more difference hiding in the last line: when the user hits Cancel, the story ends; when the model receives a denial, it goes on thinking about its next move — so **how you talk back after a denial is itself part of the design**. The crash section below is devoted to exactly this.

## 3. The Real

### 3.1 Permission Is Not a Switch, It's a Spectrum

Most people's first instinct is a global switch: free-run mode allows everything, safe mode asks about everything. Both ends are unusable — allow-everything means there is no gate; ask-about-everything turns you into a human click-machine, typing yes even for `read_file`, and by the tenth yes you've stopped reading the content.

The grown-up move is tiering. If you've written route guards, you already have the muscle memory — routes were never a two-state "can enter / can't enter"; they're three states:

- **Public page, walk right in → allow**: read-only operations, `read_file`, `list_dir`. Looking at things doesn't change the world; wave them through without even asking.
- **Login required → confirm**: operations with side effects — `write_file`, deletes, config changes. Allowed, but credentials must be shown — and here the credential is one human nod.
- **Permanent 403 → deny**: things outside this agent's job description — outbound network, `rm -rf`, production deploys. Not "ask first, then do"; not even worth asking.

Before you tier anything, there's a plainer move: **walk through your tools one by one and stamp a danger level on each**. Checklist thinking — label first, workflow later. The table might come out to a dozen lines, but it forces you to turn "which operations are dangerous" from a vague feeling into an explicit list. I didn't seriously ask myself "am I actually willing to let this thing write to disk without asking me?" until I got to the `write_file` row of my own table.

One more layer to think through: **the level belongs to the scenario, not to the tool itself**. The same `write_file` should be deny in a read-only code-analysis agent, confirm in a writing agent, and can even be allow in an agent whose whole job is generating throwaway reports. This table is really the job description you're writing for this agent — inside its duties, wave through; at the edge of its duties, ask a human; outside its duties, not up for discussion.

### 3.2 PreToolUse: Middleware Before the Action

Where does the gate go? The position is extremely precise: **between "the model says it wants to call" and "you actually execute."**

Look back at blog01's 32 lines — this position has been there all along: inside the `if (stop_reason === "tool_use")` branch, in the gap right before `runTool`. Claude Code gave this position a name: the `PreToolUse` hook; after execution there's a symmetric `PostToolUse` ([blog194 project passport](/en/posts/blog194_project-passport-agents-md-claude-md-memory/) covered the hook machinery). If you've written Express, this is middleware: the request (the model's tool_use) comes in, passes through layer by layer, and any layer can wave it through, rewrite it, or 403 it on the spot.

blog03 §4.4 planted this exact seed, in these words: `validateInput` handles **whether the arguments are correct** (data layer), `PreToolUse` handles **whether this should happen at all** (policy layer), and "blog07 expands on the danger-confirmation gate; you'll see how the two layers stack there." Time to cash that in — the four-layer stack:

```
tool_use comes in
  → validateInput      data layer: are the arguments valid (built in blog03)
  → gate / PreToolUse  policy layer: should this happen at all, plus an audit entry (this post)
  → runTool            execution layer: actually run (built in blog03)
  → PostToolUse        cleanup layer: redact results, post-process (not in v0.7; placeholder)
```

The order cannot flip: a call whose arguments aren't even valid has no standing to enter the "should this happen" discussion — data before policy, the same causality as frontend validating the form before discussing whether you're allowed to submit it.

While we're here, let's use the word "middleware" at full weight: the policy layer can do more than ask a human. It can rewrite (normalize a relative path to absolute before waving it through), downgrade (swap "delete" for "move to trash"), rehearse (dry-run first, lay out the diff, then ask). Asking a human is merely the most conservative trick in the policy layer's book — this post nails that one trick down properly, and the other tricks all plug into the same slot inside `gate()`.

### 3.3 Three Engineering Details of Human-in-the-Loop

Installing a gate is easy; installing a useful gate means sweating three details.

**One: the confirmation must name the consequence.** "Execute write_file?" is a useless sentence — you have no idea how the world changes if you say yes. The useful version is: "Overwrite README.md? The existing 214 bytes will be lost." The former restates the action; the latter states the consequence. All the craft of confirm copywriting lives in this step: translating the input arguments into "here is how the world will change." Frontend already has the reference implementation — why does GitHub make you retype the repository name before deleting a repo? To force you to face the consequence instead of facing a button.

**Two: log one line for every allow and every deny.** The audit log. After an incident, the first question you'll have to answer is "who allowed it to write this file, and when?" — without a log, the only answer is your memory, and your memory after twenty consecutive yeses is not to be trusted. JSONL, one entry per line: which tool, what consequence, allowed or denied, at what time. The log has a longer-horizon use too: it's the data source for tuning your danger-level table — a class of confirmation you've never once denied means that gate is a candidate for downgrading to allow; a tool that keeps getting denied means its description or your prompt is missing a clause. The audit log isn't just for forensics; it's the gate's regular health checkup.

**Three: allowlist to admit, not blocklist to block.** blog03's boundary section, rule one: the model makes up tool names that don't exist. An agent's action space is open, and a blocklist can never be complete — you block `rm -rf`, it reaches for `find -delete`. So the table's semantics must be "anything not in the table is deny": default distrust; wave through only who you recognize.

One last layer people overlook: **the confirmation gate protects the model, too, not just you** — it doesn't "want" to wreck things; it just doesn't know which step counts as wrecking. In its world, overwriting a production config and creating a fresh draft are the same `write_file`. Writing your red lines as machine-enforceable rules is you making the concept of "wrecking things" concrete on its behalf.

## 4. The Work: tiny-agent v0.7

### 4.1 What v0.7 Grows

The diff from v0.6 to v0.7:

- New file `src/gate.js`: tool danger-level table + `gate()` confirmation gate + JSONL audit log
- In `agent.js`'s tool_use branch, one `await gate(...)` slotted in before `runTool`
- Denials are no longer silent: return `{ error: "user denied: ..." }`, routed back to the model through blog03's `is_error` channel

### 4.2 The Core Code

```javascript
// src/gate.js
import { createInterface } from "node:readline/promises";
import { appendFileSync, existsSync, statSync } from "node:fs";

const LEVELS = {
  read_file: "allow",
  list_dir: "allow",
  search_memory: "allow",   // v0.5 retrieval, read-only, pass
  write_file: "confirm",
  save_memory: "confirm",   // v0.5 memory write, hits disk, through the gate
};
// Tools not in the table (including ones the model makes up) are all treated as deny

function audit(entry) {
  appendFileSync("gate-audit.jsonl",
    JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n");
}

function consequence(name, input) {
  if (name === "write_file") {
    return existsSync(input.path)
      ? `overwrite ${input.path} (existing ${statSync(input.path).size} bytes will be lost)`
      : `create ${input.path} (writing ${input.content.length} bytes)`;
  }
  return `run ${name}(${JSON.stringify(input)})`;
}

export async function gate(name, input) {
  const level = LEVELS[name] ?? "deny";
  if (level === "allow") {
    audit({ tool: name, level, decision: "auto-allow" });
    return { ok: true };
  }
  if (level === "deny") {
    audit({ tool: name, level, decision: "auto-deny" });
    return { ok: false, reason: `tool '${name}' is not permitted by policy` };
  }
  const what = consequence(name, input);
  // Unattended runs (eval batches, CI) lift the gate with an explicit env var — the
  // audit line records auto-allow(env), so who approved is written down. Not a backdoor:
  // it turns "automatic approval" into a queryable decision.
  if (process.env.TINY_AGENT_AUTO_APPROVE === "1") {
    audit({ tool: name, level, what, decision: "auto-allow(env)" });
    return { ok: true };
  }
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  const answer = (await rl.question(`⚠ About to ${what}. Type yes to continue: `)).trim();
  rl.close();
  const ok = answer === "yes";
  audit({ tool: name, level, what, decision: ok ? "allowed" : "denied" });
  return ok ? { ok: true } : { ok: false, reason: `user denied: ${what}` };
}
```

On the `agent.js` side, exactly one spot changes (inside the tool_use branch, before `runTool`):

```javascript
import { runTool, validateInput, toolByName } from "./tools.js";

const spec = toolByName[b.name];
const errors = spec ? validateInput(spec.input_schema, b.input) : [];
const verdict = errors.length
  ? { ok: false, reason: `input validation failed: ${errors.join("; ")}` }  // data layer blocks first
  : await gate(b.name, b.input);                                            // data passes, then the policy layer
const result = verdict.ok ? runTool(b.name, b.input) : { error: verdict.reason };
// tool_result assembly stays the same afterwards; errors go through is_error: true
// a made-up tool has an empty spec and an empty errors array — gate's ?? "deny" handles it
```

Note that validation moved in front of gate — §3.2's "data before policy" wasn't lip service: a call whose arguments aren't valid has no standing to have `consequence()` read values off its input. The validation layer inside runTool still runs too; double insurance costs nothing.

Four points, driven home:

**One, `?? "deny"` is the heaviest line in the file.** The level table is an allowlist: five tools have explicit levels, and everything else — including whatever `search_file` or `git_commit` the model invents someday — falls into `?? "deny"` and gets an automatic 403. You don't need to predict what it will make up; you only need to declare what you recognize. §3.3's third rule, cashed out in code, is this one nullish coalescing operator. There's a second cost to the allowlist you have to own too: every time the toolbox grows a tool, this table has to grow an entry alongside it — forget to register v0.5's two memory tools and nothing errors, they just go silently 403 from that point on.

**Two, `consequence()` translates arguments into consequences.** Notice it does an `existsSync` for `write_file` — same tool call, but whether the target file exists puts the consequence in two entirely different weight classes: creating is addition, overwriting is replacement. This function produces copy, but it's the only copy in this file worth polishing over and over.

**Three, denials go through the error channel, not through silence.** `user denied: overwrite README.md...` goes back to the model as a tool_result with `is_error: true` — it knows the call didn't happen, and it knows why: not because the tool broke, but because the human said no. How much that distinction matters, the crash section will show you shortly.

**Four, readline hangs off stderr.** And that `TINY_AGENT_AUTO_APPROVE` escape hatch — blog09's evals need to run a task dozens of times unattended, and can't wait for a human yes on every write; an explicit env var that leaves an auto-allow(env) audit line is far more honest than "quietly bypassing the gate when testing." stdout is the agent's output; stderr is the human-facing operator console (v0.2's token log line lives there too). If the confirmation dialogue leaked into stdout, any downstream pipe would be ruined. Small detail; saves your life in production.

### 4.3 Give It a Spin

Happy path:

```
$ node src/agent.js "change the first line of README.md to '# tiny-agent v0.7'"
[turn · tool_use=read_file]                        <- allow, waved through silently
[turn · tool_use=write_file]
⚠ About to overwrite README.md (existing 214 bytes will be lost). Type yes to continue: yes
[turn · in=6120 out=95]
done. First line of README.md updated
```

`read_file` sails through unnoticed; `write_file` stops and waits for you. The moment you type yes, one timestamped line lands in `gate-audit.jsonl`.

Now try denying once:

```
⚠ About to overwrite README.md (existing 214 bytes will be lost). Type yes to continue: no
tool_result: is_error=true, "user denied: overwrite README.md (existing 214 bytes will be lost)"
[turn · in=6350 out=130]
Okay, I'll leave the file alone for now. Here's the new first line I intended to write — I'll proceed once you confirm: # tiny-agent v0.7
```

It didn't crash, didn't launch into a triple apology — it changed strategy: show you the content first, then request permission to act.

And there's one more interception you'll almost certainly hit within the first few days — the model inventing a tool:

```
[turn · tool_use=delete_file input={"path":"tmp.txt"}]
tool_result: is_error=true, "tool 'delete_file' is not permitted by policy"
```

I have no `delete_file` tool at all; it made it up (blog03's boundary section, rule one, called this shot). `?? "deny"` blocks it without drama, logs one line, and after receiving the explicit denial the model turned around and told me "the current toolset doesn't support deletion, you'll need to handle it manually" — ten thousand times better than pretending the delete succeeded.

**Crash section (mandatory)**: my first version of gate implemented "user denied" as a silent skip. To be precise: Anthropic's protocol requires every tool_use to get a matching tool_result (skip it and the next turn 400s on you), so I returned an empty string, figuring "nothing executed means nothing to report." I ran it and stared in disbelief: the model received the empty result, concluded the tool was glitching, and retried the same `write_file` in every variation it could think of — first a relative path, then an absolute path, then chopping the content shorter, and on the fourth attempt it went full scout mode, running `list_dir` first before trying to write again. Four rounds, each more determined than the last. Because in the world it could see, this was a tool that "should work but keeps returning empty" — and retrying that is, by its lights, a virtue.

The fix is that one phrase: `user denied`. Once it was told outright, it changed course on the very first turn: "Could I show you the diff first, then?" Same model, night-and-day behavior — the difference wasn't intelligence, it was information.

blog03 taught "error text without is_error gets treated as a result and reasoned on top of"; this is the same family's other half: **a denial is information too, and swallowing a denial hurts the model exactly like swallowing an error.** If you don't tell it "the human said no," it can only assume "the universe said no" — and its instinct against an uncooperative universe is to try again.

### 4.4 One Mapping: Claude Code's Permission Modes, and My Publish Protection List

That "Allow this command?" you type at every day in Claude Code is the full-grown version of this exact machinery: in the default mode, disk writes need confirmation, dangerous commands need confirmation; the several permission modes are really just several preset level tables; and the `PreToolUse` hook lets you slot your own policy script into that same gap (the position the hook section of [blog194](/en/posts/blog194_project-passport-agents-md-claude-md-memory/) walked through). The gate.js you wrote today is its scale model.

Here's one more example of my own. My automated publish pipeline has a protection list: "never change a published post's pubDatetime; never touch a published post's body." Those two rules originally lived in the prompt, and the effect was "obeyed most of the time" — and for a publish pipeline, "most of the time" equals never. Now both rules are hard checks in a script: if the diff touches a published post, refuse and exit. **What's written into the prompt is a wish; the level table written into code is the toll gate** — blog04 covered this: a prompt is a rule of the road that holds probabilistically; a toll gate doesn't do probability. You want both: the prompt keeps it from driving at the gate most of the time; the gate actually stops it the one time it does.

### 4.5 Moonshot Footnote

> This layer is the most portable in the entire series: gate.js lives entirely inside your process and never touches any model API — the level table, the readline, the audit log survive a model switch without changing a single line.
>
> The only difference is "how you phrase the denial": Anthropic has the `is_error` field; OpenAI-style (Moonshot / DeepSeek) `role: "tool"` messages have no equivalent field, so you write "user denied: ..." straight into content, and the model works out from language alone that "a human said no, the tool isn't broken." Different structure, equivalent semantics — the law from blog03's footnote applies here verbatim.
>
> At bottom, the permission layer was never supposed to depend on any model feature — the gate belongs to your house, whatever language the guest speaks.

## 5. The Boundary: Where the Analogy Breaks

Where the window.confirm analogy holds up, I'll grant it: mounted before the side effect, binary decision, no nod means no progress — all correct, take it and use it. But three places it can't carry, and I owe you those in full.

**First: a route table is enumerable at compile time; an agent's action space is open.** A frontend guard just has to cover `/admin`, `/billing`, the handful of routes that matter — the route table is only so long, and when product adds a route, you add a guard. An agent has no such table: tool combinations, argument values, tool names the model invents on the spot — you cannot enumerate them. So guard thinking needs a new foundation: not "block the few dangerous roads," but "distrust everything by default, then admit by checklist." A blocklist is patching holes in a colander; an allowlist is swapping in a bowl that has no holes. This is also why v0.7's `?? "deny"` deserved its own paragraph — it isn't defensive-programming fussiness; it's the foundation of the entire permission model.

**Second: window.confirm pops at the person concerned; an agent's confirmation pops at the guardian.** A user clicking OK answers for themselves — if they delete the wrong thing, they're the one who hurts. You clicking OK for an agent means answering on its behalf — you're the one who can actually read the consequences. Which brings a failure mode frontend never had: **confirmation fatigue**. Install too many gates and you'll type yes on pure muscle memory; the 21st yes feels exactly like the previous 20 in your fingers — and the incident is always the 21st. So gates should be few and heavy: mount them only at the genuinely dangerous intersections and wave everything else through. One gate that gets taken seriously every time beats ten gates that get blind-tapped. My "confirm twice" rule is, at bottom, a weapon against exactly this: the second ask exists to break the momentum of the first.

**Third: frontend permissions are a security problem; agent permissions are half a product problem.** In frontend you defend against malice — privilege escalation, injection, CSRF; the adversary is an attacker. The agent is not an attacker; it's an overeager intern: it didn't wipe that config file out of sabotage, it sincerely believed it was finishing the job. Malice you fight with auth and encryption; well-intentioned wreckage you fight by defining "wreckage" precisely and writing it as a hard boundary the agent can physically bump into. The mechanisms look alike; the starting points are completely different — when you design this gate, the figure in your head shouldn't be a hacker, it should be the intern who wants to help a little too much.

One line to close: **the gate's real opponent isn't the model, it's your own muscle memory — keep the gates few and heavy, heavy enough that every yes still has to pass through your brain.**

Echoing the series spine: hand the wheel over to a probabilistic function ([blog01](/en/posts/blog206_fe2agent-01-agent-loop/)), context is what it reads each turn (blog02), execution stays in your hands (blog03) — this post is the one that puts an actual lock on "execution": **install toll gates at a few key intersections — the car is still its to drive, but at certain checkpoints it has to stop and wait for you to wave it through.**

## 6. The Hook: Next Up

Next up: "A Subagent Is Just a Web Worker: If the Brief Was Vague, Don't Blame the Contractor."

The analogy hook: the confirmation gate reined in one agent's hands. But once the workload grows, new problems surface: context fills up (blog02's billing curve), and duties blur — the drafter, the reviewer, and the publisher all crammed into one messages array, contaminating each other. What does frontend do when the main thread can't finish the work? Spawn a Worker. Same for agents: spawn a clone. But whatever postMessage can't carry, a brief can't carry either — the fate of any outsourced job is sealed the moment the requirements doc is written.

tiny-agent v0.8 will grow `spawnSubagent`: its own messages, its own loop, handing only the final result back to the main loop. `git checkout v0.8` gets you the next cut: [github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent).

Until then, homework: add one more tier to v0.7's level table — say, "writes under /tmp skip confirmation, everything else stays confirm" — run it for a few days, then open gate-audit.jsonl and count: how many times did you type yes, and how many of those did you actually read the consequence first? That ratio will tell you, honestly, whether you installed too many gates or too few.
