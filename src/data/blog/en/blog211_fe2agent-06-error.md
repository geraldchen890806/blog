---
author: Gerald Chen
pubDatetime: 2026-07-30T09:00:00+08:00
title: "In Agent Land, Errors Are Scheduled Work: From Error Boundary to Verifier"
slug: blog211_fe2agent-06-error
featured: true
draft: true
reviewed: false
approved: false
tags:
  - AI Agent
  - Frontend
  - Productivity
  - Claude Code
description: The model confidently declares "done" while the work isn't — an error that doesn't error, and no layer of try/catch will catch it. Mechanical failures get retry with exponential backoff plus a hard max_steps brake; semantic failures get an independent verifier — and verification must run in an isolated context. Part 6 of the fe2agent series, with tiny-agent v0.6 (withRetry + MAX_STEPS + verifier).
---

## 1. The Pit

A confession first: no post in this series had its first draft typed out by me word for word — my pipeline includes a drafting agent; I write the brief, it delivers, I revise. Two weeks ago it handed in a draft where the brief clearly said "body must be 4000 characters or more." At the end of its delivery it appended one line: "Total length: 3847 characters, meets the requirement."

I almost believed it. Out of habit I ran the word-count script in my pipeline — 3341.

Off by more than 500. And when it self-reported that number there wasn't a flicker of hesitation — precise down to the last digit, not even an "approximately" in sight. It wasn't lying — lying requires knowing the truth first. It simply never counted: 3847 was a number it "felt," the same kind of feeling as its feeling that the task was done.

From that day on my pipeline gained an iron rule: **all word counts are verified by the main pipeline running the script independently; never trust the agent's self-report**. Later I realized this homegrown rule has a proper name: verifier — the one doing the work says "we're there," and someone else, with no hand in the work, checks whether you actually are.

This is post 6 in the series "From useEffect to Agent Loop." [blog01](/en/posts/blog206_fe2agent-01-agent-loop/) §3.3 planted three hooks; today I cash in the first two: **what if it never stops** (step debt), and **what if it stops wrong** (verifier). blog01 also left a thread hanging: v0.1 didn't even have try/catch, v0.3 patched it in at the tool layer, and this post fills the last layer — the loop layer. The closing line of blog05 connects here too: failure isn't an exception branch, it's the main path.

## 2. The Bridge

One line:

> **An Error Boundary catches throws; the most expensive errors in agent land don't throw — the model confidently declares "done" while the work isn't. Mechanical failures go to retry and max_steps; semantic failures go to the verifier.**

```
React:                        Agent:

  render() throws                429 / 529 / ENOENT
    │                              │
    ▼                              ▼
  ErrorBoundary catches         retry + max_steps catch it
    │                              │
    ▼                              ▼
  fallback UI                   stuff it back into context, let it retry
                                   │
  (no throw, no trigger)        verifier (after end_turn)
                                dedicated to "errors that don't throw"
```

The left side's defenses are triggered by exceptions — no throw, no response. The right side grows a whole extra layer: after the model says it's done, someone still has to inspect the work.

## 3. The Real

### 3.1 Lay Out the Full Failure Inventory First

When frontend talks fault tolerance, the checklist in your head is roughly: request failed, component threw, user input invalid. An agent's failure inventory is much longer, and it takes three layers to lay out.

**API layer.** 429 (rate limited — you're calling too fast), 529 (overloaded — the server can't keep up), network timeouts. These are standard HTTP failures every frontend engineer has seen — fetch against a flaky endpoint and that's the experience. Signature: **explicit error codes, machine-recognizable, and usually waiting a beat and retrying gets you through**.

**Tool layer.** ENOENT (file doesn't exist), EACCES (insufficient permissions), command timeouts. blog03's runTool three-layer defense catches exactly this layer — catch it, stuff it back as a tool_result, tag it with is_error, and let the model see the failure and route around it. Signature: also explicit errors, but **the handling rights are in your hands** — you decide how much to tell the model and how to phrase it.

**Model layer.** This layer is a new species; frontend has no counterpart. Ask it for JSON and it hands you one missing a closing brace; back when the toolbox held all of three tools, it confidently called a search_file (blog03's boundary section said it — it really will invent one); and the deadliest is the third kind — the **confident half-finished job**: wrote half a file, ran lint but skipped the tests, missed the word count by 500 yet reported compliance — then end_turn, tone triumphant.

Errors in the first two layers make noise — status codes, exception stacks, is_error. Errors in the third layer are **silent**: no signal whatsoever tells you something went wrong, everything looks like it's proceeding normally, stop_reason is a squeaky-clean end_turn, exit code 0. I call these **errors that don't error**. This layer is the real main battlefield of agent fault tolerance.

Once the inventory is laid out, the sentence in the title makes sense. In frontend, an error is an anomaly — one uncaught exception in production is enough to spin up a war room for the night. In agent land, these three layers of failure come every day and can come every turn; they aren't anomalies, they're routine, scheduled work. So fault-tolerance code in an agent project isn't the throwaway console.error in a catch block — it's a headline act designed as part of the main flow: whether to retry after a failure, who judges whether it succeeded, what happens when the judgment fails — every one of these has to be decided the day you write the loop.

### 3.2 Mechanical Failures, Mechanical Means

Start with the errors that make noise; every tool here is an old frontend friend.

**Retry with exponential backoff.** For 429/529/5xx-class errors, retry is the standard answer; backoff is the retry's manners — fail once, wait 1 second; fail again, wait 2, then 4. Don't punch the server point-blank while it's already overloaded. You've seen this pattern in networking libraries for a decade. A side note: Anthropic's official SDK ships partial automatic retries for these errors, so you have a safety net even if you write nothing; but in v0.6 I still hand-wrote a withRetry layer — one, for teaching, so you can see that a "retry policy" translated into code is a dozen-odd lines; two, for observability — every retry prints a line to stderr, while the SDK's internal retries are invisible to you. the motive is the same one behind that line of cache logging back in blog02 — whether you saved or didn't, erred or didn't, you have to be able to see it before there's anything to fix.

**The max_steps hard brake.** blog01's original words: the model can trap itself in a self-persuasion loop of "let me try this tool once more, maybe this time is different" — a while(true) with no lid, running until your credit card alerts fire — in [blog195](/en/posts/blog195_loop-engineering-three-debts-playbook/) I named it "step debt." The answer is not remotely clever: **don't trust the model's self-control; you count the steps for it**. Step count exceeded — break, no negotiation. This isn't an insult to the model; it's basic respect for a probabilistic function — you wouldn't expect `while (Math.random() < 0.99)` to stop on its own.

**Structured output validation.** When you ask the model for JSON and JSON.parse blows up, don't reach for regex duct tape — stuff the parse error back verbatim and have it regenerate. Same mental move as blog03's is_error: **an error is input for the model, not a log line for you**. Hand it "Unexpected end of JSON input" and next turn it can usually supply the missing brace itself.

While we're here, let's cash in another small hook from blog01: stop_reason has a third value, max_tokens — the output got cut off mid-sentence. continue or break? My criterion is **what got truncated**: free text truncated — continue generating and stitch it together; structured output (JSON, code) truncated — stitching tends to sew in syntax errors, better to raise max_tokens and regenerate the whole thing; truncated three times in a row — the output itself is out of control, break, hand it to a human.

### 3.3 Semantic Failures, Semantic Means

Now to the errors that don't error. retry can't save them — nothing failed; it just didn't do it right. What you need isn't try/catch, it's **acceptance testing**.

The verifier's core design is one line: **separate the one who does the work from the one who checks it**. Asking the working model to "review the work you just did" performs terribly — it sits in the same context, sees all of its own reasoning from a moment ago, and will most likely nod along its own train of thought one more time. This isn't a moral defect in the model; when you review code you just finished writing, doesn't it look more correct the longer you stare?

Once separated, the verifier comes in two tiers, **cheap one first**:

**Rule verifier.** Anything a script can judge, never spend a model on: word count met? — run the word-count script; file written? — fs.existsSync; tests passing? — run them and read the exit code. Deterministic, free, immune to sweet talk. My "never trust the agent's self-reported word count" rule is exactly one rule verifier — one line of shell.

**LLM verifier.** Judgments no rule can express — "is the work actually done?" — go to a second model: give it the task description and the final output, have it rule PASS/FAIL against a rubric with a one-line reason. Note that it is itself a probabilistic function and its verdicts will also be wrong — so it's a second net, not holy writ; whatever the rules can catch, don't bother it with.

What's the frontend counterpart of all this? In blog01 I called the verifier the agent's code review; now I can say it more precisely: it's the agent's **CI**. You never merge just because a developer says "I tested it locally" — you make the pipeline run lint, tests, and build, all of it. However senior the developer, the pipeline still runs; however smart the model, the verifier still runs. **A self-check checklist is no match for external acceptance** — human engineering settled this long ago; it's just that the model's tone is so assured, assured enough that we almost forgot it.

## 4. The Work: tiny-agent v0.6

### 4.1 What v0.6 Grows

`git checkout v0.6` gets you this cut: [github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent). Compared to v0.5, three new things:

- `src/agent.js` gains a MAX_STEPS hard brake and withRetry (exponential backoff); every messages.create is wrapped in it
- New file `src/verifier.js`: after end_turn, run the rule checks first, then fire an independent, **history-free** call to rule PASS/FAIL
- FAIL reasons get stuffed back into the main loop for another pass, at most 2 rounds — the verifier needs its own step brake too

### 4.2 The Core Code

```javascript
// src/agent.js additions
const MAX_STEPS = 20;
const MAX_VERIFY_ROUNDS = 2;

async function withRetry(fn, { retries = 3, baseMs = 1000 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const retryable = err.status === 429 || err.status === 529 || err.status >= 500;
      if (!retryable || attempt >= retries) throw err;
      const wait = baseMs * 2 ** attempt;
      console.error(`[retry · status=${err.status} attempt=${attempt + 1} wait=${wait}ms]`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}
```

```javascript
// src/verifier.js
const RULES = [
  { name: "output_not_empty", check: (task, output) => output.trim().length > 0 },
];

export async function verify(client, model, task, output) {
  for (const rule of RULES) {
    if (!rule.check(task, output)) return { pass: false, reason: `rule failed: ${rule.name}` };
  }
  const res = await client.messages.create({
    model,
    max_tokens: 256,
    system: "You are a strict verifier. Judge ONLY whether the output fulfills the task. First line: PASS or FAIL. Second line: one-sentence reason.",
    messages: [{
      role: "user",
      content: `<task>\n${task}\n</task>\n\n<output>\n${output}\n</output>`,
    }],
  });
  const text = res.content.find(b => b.type === "text")?.text ?? "";
  const pass = text.trim().toUpperCase().startsWith("PASS");
  return { pass, reason: text.split("\n").slice(1).join(" ").trim() };
}
```

The main loop's end_turn branch becomes this (steps and verifyRounds are initialized to 0 outside the loop); while I was in there, `main`'s incoming argument `userInput` got renamed to `task` this cut — the word everything downstream, subagent and eval alike, ends up using:

```javascript
if (res.stop_reason === "end_turn") {
  const output = res.content.find(b => b.type === "text")?.text ?? "";
  if (verifyRounds >= MAX_VERIFY_ROUNDS) {
    console.error(`[verify · rounds exhausted, unverified output — hand to human]`);
    return output;
  }
  const verdict = await verify(client, MODEL, task, output);
  console.error(`[verify · ${verdict.pass ? "PASS" : "FAIL: " + verdict.reason}]`);
  if (verdict.pass) return output;
  verifyRounds++;
  ctx.addUser(`[verifier] FAIL: ${verdict.reason}\nThe task is NOT done. Fix it and finish properly.`);
  continue;
}
```

Four points, driven all the way home:

**One, withRetry only retries errors where "retrying might change the outcome."** 429/529/5xx are transient server-side conditions — wait a beat, try a different moment, and you're through; a 400 (the request itself is invalid) resent ten thousand times is still a 400, and retrying it is purely a donation to your invoice. The whole criterion is one question: **is this error "wrong timing" or "wrong content"?** Wrong timing — back off and retry; wrong content — go back and fix the content.

**Two, MAX_STEPS = 20 wasn't tuned, it was measured.** I went through a stretch of my own run logs; the vast majority of normal tasks finish within 10 turns, and 20 is a hard ceiling with a 2x margin. Its point isn't precision — it's **existing at all**. blog01 said it: while(true) needs a lid overhead. Trip it, break — no negotiation, no "give it one more round." Opportunism is the interest payment on step debt.

**Three, verify is a brand-new messages.create carrying zero history.** Only two variables go in — task and output; the main loop's messages array doesn't contribute a single byte. Why so ruthless? The crash section in 4.3 has the scar tissue.

**Four, FAIL goes back in, but 2 rounds max.** The verifier's verdict becomes the next turn's user message; the model sees the concrete reason and can usually fix it. But the verifier is probabilistic too — if it and the working model disagree and start playing ping-pong, that's a fresh installment of step debt. Hence MAX_VERIFY_ROUNDS = 2: two rounds without a PASS — stop and hand it to a human. Don't let two probabilistic functions try to talk each other around until dawn.

### 4.3 Give It a Spin

Happy path, with a task deliberately prone to half-finished delivery:

```
$ node src/agent.js "extract the install steps from the README into docs/install.md — must include all 5 steps"
[turn · tool_use=read_file]
[turn · tool_use=write_file]
[verify · FAIL: output only contains 3 of the 5 installation steps]
[turn · tool_use=read_file]
[turn · tool_use=write_file]
[verify · PASS]
done. docs/install.md written, all 5 steps present.
```

First round it wrote 3 steps and declared victory; the verifier bounced it; second round it filled in the rest on its own. The whole exchange needed no me in the room — this is that "I casually run the word-count script" gesture, grown into the loop itself.

Of course, the verify step costs money too — one extra independent call, input is task plus output, output tops out at 256 tokens. Worth it? Do the math: one intercepted half-finished job saves you the full cost of discovering it manually, describing the problem manually, and running another rework round; one half-finished job leaked to production costs far more than that. **Acceptance testing is a cost — but the only thing cheaper is the luck you were running on before the incident.**

Now watch a 429 get caught (I squeezed this out with a concurrency script):

```
[retry · status=429 attempt=1 wait=1000ms]
[retry · status=429 attempt=2 wait=2000ms]
[turn · tool_use=list_dir]
```

Waited 3 seconds, got through, task continued without noticing. Without this layer, the process dies flat on turn 7, and the context built up over 6 turns plus every token burned goes down the drain.

**Crash section (mandatory)**: in the first version of v0.6's verify, I passed the **entire conversation history** to the verifier — more information, more accurate verdicts, perfectly reasonable, right? Result: it ruled PASS on nearly everything. I pulled one case that was obviously unfinished and read its stated reason. The gist: the model made multiple attempts to read the file and handled the encoding issues properly; judging by the process, the task was completed to the best of its ability.

I stared at "best of its ability" for a long time. It had **empathized**. It had watched the working model struggle all the way down the road — three attempts, two detours, every step wrapped in an explanation — and then, like a colleague who'd witnessed the whole ordeal, it went soft. I changed the input to just the task description and the final output — not one word of process — and re-ran the same batch of cases. The PASS rate dropped instantly; the verdicts turned cold enough to be a different person.

Nobody actually changed. The context did. **Show it the process and it grades the process; show it only the result and it can only grade the result.** That's why acceptance must run in an isolated context. And this principle grows up one more time later — in blog08 on subagents, you'll see that context isolation isn't just acceptance-testing discipline; it's the foundation of multi-agent collaboration.

### 4.4 One Mapping: blog195's Verification Debt, and My Publish Cron

The second debt in [blog195 "Loop Engineering Three Debts"](/en/posts/blog195_loop-engineering-three-debts-playbook/) — verification debt — gets its repayment installment in this post: tool validation (blog03) covers single steps, the verifier covers the endgame.

One more example from my own production. This blog's publish pipeline is a scheduled cron: flip the publish flag, build, push, curl the live site to verify. Its entire fault-tolerance design is a single spine: **if any step fails, roll back everything already changed first, then exit** — build fails, roll back the flag; push is rejected, roll back the commit; curl can't get a 200, same rollback. Either the whole run completes, or nothing changed. No wreckage left behind.

That is the Error Boundary mindset ported whole into agent land: an Error Boundary's value was never "intercepting the exception" — it's **giving the user a usable fallback UI** instead of a half-blank screen. An agent's fallback UI is a rollback to a known-good state — far better than "stalled halfway." The halfway state is the most expensive state there is: you don't know which parts happened and which didn't, and cleaning it up by hand costs more than rerunning from scratch.

### 4.5 Moonshot Footnote

> The OpenAI-style stack carries over almost verbatim: 429/5xx semantics are generic HTTP, the openai SDK also has built-in retries (the max_retries parameter), and withRetry's decision logic barely changes — with one exception: 529 is Anthropic's own overload code, absent on the OpenAI side; delete that branch when porting. end_turn maps to finish_reason: "stop", truncation maps to "length". The verifier is pure client-side logic anyway — it doesn't care whose model it is.
>
> One operational difference: domestic models' budget tiers tend to have tighter concurrency quotas, so 429s arrive more often — set your backoff more conservatively (baseMs of 2000 or higher). Otherwise all three retries land inside the same overload window, which is the same as not backing off at all.

## 5. The Boundary: Where the Analogy Breaks

The parts of the Error Boundary analogy that hold, I'll grant: layered fallbacks, the fallback mindset, "an error shouldn't blow through the whole app" — all correct, migrate them freely. But three parts don't hold, and I owe you the full story.

**First: an Error Boundary catches throws; it cannot catch errors that don't error.** React's error boundary is triggered by exceptions — if the component doesn't throw, it stays silent forever. And the agent's most expensive errors are precisely the ones that don't throw: the model confidently finishes doing the wrong thing, stop_reason clean, logs free of red, exit code 0. Against this class of error, every layer of try/catch you write provides exactly zero coverage — **what you need isn't capture, it's acceptance testing**. This is the single instinct most in need of a rewrite on the way from frontend to agents: the center of gravity of fault tolerance moves from "catching exceptions" to "auditing outcomes."

**Second: frontend retries are mostly idempotent; agent steps often carry side effects.** Resend a GET ten times and the world doesn't change; but an agent's step might be write_file, sending a message, placing an order. Retrying a 429 is safe, of course — the request never got in the door; but if "the tool executed successfully and the next step blew up," do you dare rerun the whole step? The file gets written twice, the message goes out twice. So agent retries must land at **step granularity**, and the first question is always: **is this step safe to rerun?** Reads — retry freely; writes — either design them idempotent (check before writing) or don't auto-retry them. This is also one of the reasons blog07 puts a dedicated gate in front of dangerous operations.

**Third: an error boundary is a static position in the component tree; an agent's failure points are dynamic.** In React you place the ErrorBoundary at a fixed spot in the tree; which subtree might blow up is fenced off at build time. Agents don't work that way — you don't know on which step, with which tool, in what posture it'll crash this time; the failure points drift with the model's choices. So the fallback can't be designed at "tree" granularity; it has to be designed at "step" granularity: every API call gets a retry, every step counts toward max_steps, every tool result carries is_error, and the endgame gets a verifier. **The defense isn't a wall — it's a net under every single step.**

One line to close: **Error Boundary teaches you not to let one component take down the whole page; agents teach you the harder case — nothing blew up at all, and you still have to know the work isn't done.**

Echoing the series spine: blog01 said you handed the wheel over to a probabilistic function — the choices are its; blog02 and blog03 said context is what you feed and execution is what you hold. This post adds the fourth block: **when it says "we're there," believing it is your call**. Put a driving examiner in the passenger seat — he never touches the wheel; he only checks, when the driver says "we're there," whether you actually are. The whole frontend-engineering instinct set — error boundaries, retries, CI — holds up here in full; only the threat model changed, from users clicking blindly to the model talking confidently. And the model's confident talk doesn't even give you the courtesy of an error.

## 6. The Hook: Next Up

Next up: "Pop a window.confirm at the AI: Permissions, Hooks, and Human-in-the-Loop."

The analogy hook: retry and verifier both handle "how to recover when it's wrong" — but there's a class of things that **even when right, it must not be allowed to just do**. rm -rf retried three times and finally succeeded — that's not fault tolerance, that's disaster delivered on schedule. Some operations' problem isn't whether they might fail, it's whether they **should happen at all**: deleting files, changing configs, deploying to production. What these need isn't a better safety net — it's a gate before execution. The agent's window.confirm, popped at you, not at it.

tiny-agent v0.7 will grow `src/gate.js`: a tool danger-tier table plus a confirmation gate — write-class tools pause before executing and wait for you to type yes; a refusal goes back to the model as an explicit signal (blog03's is_error takes the stage again). `git checkout v0.7` gets you the next cut: [github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent).

Until then, homework: add one rule from your own task domain to v0.6's RULES array — a word-count floor for writing tasks, "test exit code is 0" for coding tasks. Run it for a few days and you'll notice the rule verifier intercepts far more half-finished jobs than the LLM verifier does — **the most valuable acceptance testing is usually the least intelligent kind**.
