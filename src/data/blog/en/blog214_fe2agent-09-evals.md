---
author: Gerald Chen
pubDatetime: 2026-08-08T09:00:00+08:00
title: "Flaky Isn't a Bug Anymore, It's the Physics: Migrating Your Frontend Testing Mind to Evals"
slug: blog214_fe2agent-09-evals
featured: true
draft: true
reviewed: false
approved: false
tags:
  - AI Agent
  - Frontend
  - Productivity
  - Claude Code
description: In frontend a flaky test is a bug to fix; in agent-land flaky is the physics — run the same task 10 times and get 7 perfect, 2 verbose, 1 confidently wrong. Exact match is dead on arrival, a single run proves nothing, and your eval set is your scar collection. Part 9 of the fe2agent series, with tiny-agent v0.9 (eval case set + multi-run pass rates + LLM judge).
---

## 1. The Pit

In the frontend era, a flaky test was a bug to fix. A test on CI goes green today, red tomorrow — you rerun it three times, add a waitFor, mock the clock, pin the network requests, and you can always nurse it back to stable green. The word "flaky" itself carries a moral judgment: it means "this test was written sloppy."

Last month I wrote "tests" for tiny-agent: the same task — "extract the first line of README and write it to tmp.txt" — run 10 times. 7 were clean and crisp; 2 were verbose but correct, e.g. calling `list_dir` three times in a row before getting going; and 1 was confidently wrong: it wrote the entire README into the file, then reported back "done — the file contains one line." I stared at that 7/2/1 for a long while, and my instinct was to "fix" it — add a prompt line, reword something, nail the task description down harder. One evening of fiddling later, the ratio was 8/1/1; the next morning I ran it again and it was back to 7/2/1.

Then it clicked: **what I was fixing wasn't the test, it was my attachment to the word "pass."** On top of a probabilistic function, flaky isn't a bug awaiting a fix; it's the physics of the system. Your job isn't to fix that 1 down to 0 — it's to be able to measure it first: know whether it's 10% or 1%, know what it became after your prompt edit. If you can't measure it, you don't even know whether that evening you spent was optimization or a lottery ticket.

This is post 9 in the series "From useEffect to Agent Loop." blog08 closed with: one agent leans on a verifier (blog06), a fleet of agents leans on statistics. And [blog01](/en/posts/blog206_fe2agent-01-agent-loop/) planted the line even earlier — "testing goes from a true/false question to a statistics question." This post cashes that line in.

## 2. The Bridge

One line:

> **jest asserts "input A must produce B"; an eval asserts "input A produces the right thing more than nine times out of ten" — the true/false question becomes a statistics question, and the green light becomes a passing line.**

```
Jest:                         Eval:

  input A                        task A
    │                              │
    ▼                              ▼
  expect(f(A)).toBe(B)          run N times → ✓✓✓✗✓
    │                              │
  red / green (binary)          pass rate 80% (distribution)
  fix until green               draw a passing line on the distribution
```

On the left, one run is enough to conclude; on the right, a single result proves nothing — what you're after is the distribution, plus a line you drew yourself.

## 3. The Real

### 3.1 Why Exact Match Is Dead on Arrival

The bedrock of frontend assertions is `expect(output).toBe(expected)`: output equals expectation, character for character. That bedrock doesn't survive a single day under an agent — the same correct answer has ten thousand phrasings. "tmp.txt created" and "I have written the first line into tmp.txt" are both right; `===` accepts exactly one. Asserting "output strictly equals X" on a probabilistic function is roughly asserting "the coin always lands heads": the standard isn't too high — the standard is the wrong shape.

Frontend has actually paid tuition on a nearby shape once before: snapshot tests. Snapshot the entire render tree and compare character by character — sounds rigorous, until renaming one irrelevant class floods the board red, and eventually everyone runs `--updateSnapshot` with their eyes closed and the assertion is a dead letter. Exact match on LLM output is the same mistake, reinforced — snapshots at least had "unchanged code must compare equal" as a floor; the model doesn't even give you that. The way out points in the same direction too: **don't assert the full text, assert properties.**

The replacements come in three tiers, in priority order:

**One, rule-based checks.** Whatever a machine can judge, let the machine judge: does the JSON parse, does the file exist, did the tests pass, does the output contain the key entities. Deterministic, free, millisecond-fast — this is blog06's discipline of "rule verifiers before LLM verifiers" transplanted straight into the testing domain.

**Two, rubric scoring.** Some kinds of "good" can't be settled by one regex, so you break "good" apart: into individually **judgeable** dimensions — "was the target file created," "is the content exactly one line," "were no other files touched." Each item gets its own PASS/FAIL, an order of magnitude more reliable than one blanket "output quality is high." A rubric you can't decompose into judgeable items is a rubric you didn't write (the crash section in 4.3 below is the tuition paid on this exact line).

**Three, LLM-as-judge.** Every rubric ends up with a few items only a language model can judge ("is the summary faithful to the source"). So let another model grade against the rubric — but remember two things: the judge is probabilistic too, so you have to spot-check and calibrate it on a schedule (manually re-grade 20 of its verdicts, compute your agreement rate with it); and don't let it be player and referee at once — the judge call must be independent, carrying none of the working history. The lesson from blog06's verifier-empathy crash has to harden into architecture inside your evals.

blog04's prompt post left one line behind: the referee for prompt priority isn't the spec, it's the eval. blog05's memory post left another: recall quality itself needs an eval. Two IOUs — this post settles both.

### 3.2 From Assertions to Distributions: temperature=0 Won't Save You Either

Some of you will say: crank temperature down to 0 and the model is deterministic, right? The true/false question comes back, right?

In blog01's boundary section I wrote: "even temperature 0 isn't fully stable — batch scheduling and floating-point drift will make it jitter; post 09's eval piece will unpack this." Unpacking now.

temperature=0 means greedy decoding: at every step, pick the highest-probability token; in theory, same input must mean same output. But inference servers run in batches — which requests get packed into the same batch as yours, and what shapes the matrix operations get sliced into, is something the scheduler decides fresh every time. And floating-point addition isn't associative: `(a+b)+c` and `a+(b+c)` genuinely differ a dozen decimal places in. Change the summation order and the computed logits wobble a hair. Most of the time the wobble is harmless — the front-runner is miles ahead, and wobble or not, it still wins. But the moment some step's top two are already neck and neck, that hair of a wobble is enough to flip the argmax and select the other token. And generation is autoregressive, token biting token — flip once at a knife-edge and the entire passage downstream walks a different road. Not mysticism; the plain arithmetic of parallel computing.

So the conclusion is blunt: **a single run proves nothing.** The engineering move is to swap "run once, check right/wrong" for "run N times, check the ratio":

- **Pass rate**: run one case N times, it passes M times, M/N is that case's score. Good for answering "is it stable."
- **pass@k**: passing at least once in k runs counts as passing. Good for answering "can it do this at all" — common for exploratory tasks.
- **Thresholds**: pass rate ≥90% is green, 80–90% is yellow, below that is red. Where the line sits is your product judgment, but it must be drawn — a benchmark without a passing line is just a pile of numbers.

How big N should be is also a matter of statistical common sense: pass 5 out of 5 and the true pass rate can still easily be 70% — the smaller the sample, the more the number resembles a rumor. My own usage: 5 runs for daily regression (cheap, enough to see trends), 10 when I've touched the prompt or switched models, 20 on the key cases before a release. Every run is real API money, so N is a slider between precision and the bill — an expense that comes out of the same wallet as blog02's token ledger.

On the frontend you debug with F12; with an agent you debug by polling. blog01 already said it — "one is a criminal investigation, the other is a poll." Back then it was a metaphor; now it's a `--runs=5` flag in your CI script.

### 3.3 How the Regression Set Accrues: Your Eval Set Is Your Scar Collection

The most common way to die is the reverse one: you enthusiastically set out to "build an eval system," sit down, and design 100 cases out of thin air covering all the "typical scenarios" — two weeks later, 90 of the 100 are eternally green (they were written along the grain of what the model can already do), and for the remaining 10 you can't even articulate the passing criteria yourself. Big and fake loses to small and true.

Real cases have exactly one source: **crashes you've lived through.** Let me tell you about the most senior case in my eval set. In the first draft of blog02 I wrote an assertion: "cache_control can only go on system; putting it on tools does nothing." Sounded expert; I read the draft through three times without a flicker of doubt — it was the second review agent in the pipeline that caught it: its brief includes the line "API behavior assertions must come with a source," it couldn't find a source for this one, so it flagged it. The fact: cache_control can go on the last tool definition in the tools array; the published version is corrected. Since that day, my eval set carries one fixed case: hand the review agent a draft with an incorrect API assertion smuggled in; the check is "did it call out that assertion by name." That case has since caught two more errors of the same family.

That's how a regression set accrues: **every production crash, every error a review catches, hardens into a case** — the same muscle as frontend's "every bug fix ships with a regression test." An eval set isn't a syllabus; it's a scar collection. It doesn't prove how strong your agent is; it guarantees the crashes you've had don't happen again. And scar cases come bundled with two things designed-from-thin-air cases can never give you: a real input distribution (they came straight out of production) and unambiguous judging criteria (you know exactly what went wrong at the time). Ten cases like that are worth more than a hundred "typical scenarios."

Once accrued, evals need to enter CI mentality: touch the prompt, switch the model, reword a tool description — run before and after, diff the pass rates. blog04 said prompts have no devtools; you change a line and get zero feedback — well, here's the answer: **the eval is the devtools you build yourself.** Without it, every prompt edit is turning the steering wheel with your eyes shut.

## 4. The Work: tiny-agent v0.9

### 4.1 What v0.9 Grows

`git checkout v0.9` gets you there: [github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent). Compared to v0.8, three new things:

- New directory `evals/`: the `cases.json` case set, each case = id + task + a checks array; checks come in three types: `file_exists` / `contains` / `llm_judge`
- New file `src/eval.js`: `node src/eval.js --runs=5` runs every case 5 times, prints a "case × pass rate" table, and any case below threshold makes the process exit nonzero — that exit code is all CI cares about (to make the agent callable at all, this cut refactors `main` into an exportable `runAgent(task, { cwd })`, and the CLI shrinks to a thin shell over it)
- `llm_judge` goes through one standalone `messages.create`: no conversation history at all, only the rubric and the final artifact (blog06's verifier isolation lesson, hardened into code)

### 4.2 The Core Code

First, one entry in `cases.json` (it's the task from the opening of this post):

```javascript
{
  "id": "write-one-line",
  "task": "Extract the first line of README and write it to tmp.txt",
  "checks": [
    { "type": "file_exists", "path": "workspace/tmp.txt" },
    { "type": "contains", "path": "workspace/tmp.txt", "text": "# tiny-agent" },
    { "type": "llm_judge", "rubric": ["Does tmp.txt contain exactly one line", "Were no files other than tmp.txt created or modified"] }
  ]
}
```

Then the skeleton of `src/eval.js`:

```javascript
// Unattended: auto-approve the confirmation gate (blog07's explicit escape hatch),
// or the first write parks the whole run on a readline prompt
process.env.TINY_AGENT_AUTO_APPROVE = "1";

import { existsSync, readFileSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { runAgent } from "./agent.js";

const client = new Anthropic();
const MODEL = "claude-opus-4-7";
const THRESHOLD = 0.8;

async function runCheck(check, output) {
  if (check.type === "file_exists") return existsSync(check.path);
  if (check.type === "contains") {
    return existsSync(check.path) && readFileSync(check.path, "utf-8").includes(check.text);
  }
  if (check.type === "llm_judge") {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 256,
      system: "You are a strict grader. For each rubric item answer PASS or FAIL with a one-line reason. Last line: VERDICT: PASS (only if every item passed) or VERDICT: FAIL.",
      messages: [{
        role: "user",
        content: `<rubric>\n${check.rubric.map((r, i) => `${i + 1}. ${r}`).join("\n")}\n</rubric>\n\n<output>\n${output}\n</output>`,
      }],
    });
    return /VERDICT:\s*PASS/.test(res.content.find(b => b.type === "text")?.text ?? "");
  }
  return false;
}

async function runCase(c, runs) {
  let passed = 0;
  for (let i = 0; i < runs; i++) {
    rmSync("workspace", { recursive: true, force: true });
    mkdirSync("workspace");
    // Cases assume a README exists in the workspace — no seed, guaranteed fail;
    // fixed content keeps the verdict reproducible
    writeFileSync("workspace/README.md", "# tiny-agent\n\nA minimal AI agent.\n", "utf-8");
    const output = await runAgent(c.task, { cwd: "workspace" });
    let ok = true;
    for (const check of c.checks) ok = ok && await runCheck(check, output);
    if (ok) passed++;
  }
  return passed / runs;
}

const runs = Number(process.argv.find(a => a.startsWith("--runs="))?.split("=")[1] ?? 5);
const cases = JSON.parse(readFileSync("evals/cases.json", "utf-8"));
let below = 0;
for (const c of cases) {
  const rate = await runCase(c, runs);
  console.log(`${c.id.padEnd(24)} runs=${runs}  rate=${(rate * 100).toFixed(0)}%`);
  if (rate < THRESHOLD) below++;
}
process.exit(below ? 1 : 0);
```

Four points, driven all the way home:

**One, the order of checks is cost order.** `file_exists` and `contains` are synchronous, free, black-or-white; `llm_judge` costs an API call and carries its own probability. So cheap-and-deterministic goes first, and the short-circuit in `ok && await runCheck(...)` guarantees: an artifact that can't even pass the machine checks never spends money on a judge. Rule checks before LLM checks — the ordering blog06 established holds verbatim inside evals.

**Two, the judge carries no history.** That `llm_judge` call contains only the rubric and the final artifact — not one word of the working process. blog06's crash: the verifier watched how hard the working model had been trying and "empathized" its way into leniency; withhold the process, hand over only the result, and the verdict turns cold immediately. Verification isolates context — back then a lesson, now a line of architecture.

**Three, reset the workspace before every run.** This is jest's `beforeEach`. But dirty state is more insidious in agent-land: a tmp.txt left over from the previous run doesn't just false-positive your `file_exists` — the agent itself will "discover" the leftover file and reason along it ("there's already a tmp.txt; looks like the task's been done"), dragging the whole case into the ditch. Cases must start clean. While we're here, nail down the semantics of `cwd`: `runAgent` passes it straight through to the tool layer, and every path resolves as `resolve(cwd, path)` — not `process.chdir`, or the relative path in the next round's `rmSync("workspace")` drifts right along with it.

**Four, exit code by threshold.** This is the key that lets evals into CI: you edit a prompt and open a PR, the pipeline runs `node src/eval.js --runs=5`, and if the pass rate craters through 80% the light goes red. From then on, "I feel like this prompt version is better" loses its speaking rights in your repo — the numbers talk.

### 4.3 Give It a Spin

```
$ node src/eval.js --runs=5
write-one-line           runs=5  rate=80%
memory-recall-top3       runs=5  rate=100%
fact-assertion-check     runs=5  rate=60%
1 case below threshold 80% → exit 1
```

Three cases: the first is the file-writing task from the opening (80% — the old "stuff the whole README in" disease struck 1 time out of 5); the second is the debt owed from blog05 — feed `search_memory` three queries and check whether the note that should hit is in the top 3; the third is the cache_control scar, at 60% — the review agent failed to call out the bad assertion in 2 runs out of 5. Red light, exit code 1. And that 60% has a story behind it.

**Crash section (mandatory)**: the first version of the `fact-assertion-check` case had a rubric I wrote like this: "Evaluate whether this review output is good." 5 runs, the judge handed out PASS every time, pass rate 100%, and I felt pretty pleased. Until one day I manually leafed through the artifacts it had graded — one review output never mentioned the bad assertion at all, praised only the formatting, and the judge PASSed it anyway, reasoning "the output is well-structured and professional in tone." **Because "good" had no definition, the judge went and found itself a dimension it could praise** — it's even more lenient than the working model. I rewrote the rubric into three judgeable items: "did it call out the incorrect API assertion," "did it supply the correct statement," "did it avoid flagging healthy content" — and the pass rate fell from 100% straight to 60%. The 40 points that fell away weren't the judge getting stricter; the truth had been there all along — my rubric had been fogging the glass. The lesson in one sentence: **a vague rubric can't measure a vague model.** Ask a probabilistic function "is it good," and all it hands back is probabilistic politeness.

### 4.4 One Mapping: The Last Piece of blog195's Verification Debt

[blog195 "Loop Engineering Three Debts"](/en/posts/blog195_loop-engineering-three-debts-playbook/) named a verification debt, and blog06 paid the first installment: the single-task verifier. The eval is the final piece — the verifier governs "did this one run finish right," the eval governs "is this system reliable over the long haul."

My own writing pipeline is, by now, one eval set that runs every day: the drafting agent submits, the second-pass review agent nitpicks against a fixed rubric (two judges), and the main flow independently runs a word-count script to verify (one rule check — blog06's "never trust the agent's self-report" is exactly it); every time an error leaks through to publication, a new case gets hardened in. There is no day "dedicated to doing evals"; the eval grows inside the pipeline. One aside: judging from the eval docs the model vendors publish, rubric + multi-run sampling is the mainstream industry approach too — you're not using a folk remedy.

### 4.5 Moonshot Footnote

> The eval layer is model-agnostic: `cases.json` and the three check types don't change by a single line; switching to Moonshot / DeepSeek only swaps the client inside `runAgent` (the two changes covered in blog01's footnote). Two points worth making: one, the judge model can come from a different vendor than the working model — arguably it should, to reduce the taste bias of "same lineage grading same lineage"; two, the OpenAI side offers a `seed` parameter and `system_fingerprint` to make sampling reproducible, but the official line there is best effort too, with no promise of full determinism — **multi-run sampling and reading the distribution is a cost no vendor lets you skip.** Your eval set is, in fact, the only trustworthy basis for switching models: skip the vendor benchmarks, run your own scar collection.

## 5. The Boundary: Where the Analogy Breaks

Most of the frontend testing mind ports over cleanly: regression sets, beforeEach, CI red/green lights, "fix a bug, add a case first" — all hold, use them freely. But three places give way, and I owe you the full story on each.

**First: frontend assertions are black-or-white; an eval draws a passing line on a distribution.** jest concludes after one run because the function is pure; an eval's single result is nothing at all. The everyday corollary: seeing someone brag "our agent nailed it in one shot" is bragging; cursing "this model is garbage" after your own agent crashes once is just cursing — a sample-size-of-1 conclusion is worthless in either direction. In a statistics-question world, all true/false-question speech is void.

**Second: jest's green means "this code is correct"; an eval's green means "this system was correct this week."** A frontend test, once green, stays green as long as the code doesn't move — green is a property. Eval green has a shelf life: one silent upgrade by the model vendor, one line of prompt you touch, one reworded tool description, and last week's green may be void. So an eval isn't a one-time pre-launch acceptance pass; it's continuous measurement — which is also why it belongs in CI rather than in a checklist. How it becomes a daily physical exam after launch is blog10's story.

**Third: the coverage mind fails.** Frontend 100% coverage has a clear definition: every line executed, a finite denominator. An agent's input space is natural language — infinite-dimensional, unbounded; "fully covered" does not exist, and any claim of "our evals cover all scenarios" is rhetoric. What you're after was never full coverage; it's **crashes you've had don't happen again**: the scar collection's denominator isn't "everything possible," it's "the part I've paid tuition on." That denominator will keep growing forever. That's not embarrassing; that's the shape of this craft.

One line to close: **frontend tests prove "it's correct"; an eval only promises "I've seen every way it goes wrong."**

Echoing the spine: after you hand the wheel over to a probabilistic function (blog01), you've governed what it sees (blog02), what it can do (blog03), how it's supposed to talk (blog04), what it remembers (blog05), how to recover when it's wrong (blog06), which things must come to you first (blog07), how the work splits when there's too much of it (blog08) — and with this post you finally have a gauge that shows how well it actually drives: **you no longer watch every single turn of the wheel; you count how many times in a thousand turns it clips the line.** The enemy is still the model's confabulation; the muscle is still your frontend testing muscle; only the assertion got swapped for a distribution. Agent engineering is building engineering certainty on top of an uncertain function — and the eval is that certainty's unit of measure. Not extra ceremony; the new bedrock you can't unlearn once you've built an agent.

## 6. The Hook: Next Up

Next up: "From Sweating the Bundle to Sweating the Tokens: Shipping the Agent to Production, Then Giving It a Face" — the finale of the series mainline.

The analogy hook: evals passed, you finally dare ship the agent to production — and up there you discover a whole new continent: tracing (the network panel, agent edition; without it production incidents can't be investigated), cost circuit breakers (blog01's third buried hook, "costs spiraling," owed for nine posts and settled in post 10), rate limiting and auth. Plus the ending a frontend engineer knows best of all: an agent eventually needs a face — a chat window, streaming output, confirm buttons; after all the wandering, you end up writing frontend again.

tiny-agent v1.0 will grow: **trace ledgering (one span per step) + a dollar-budget circuit breaker + checkpoint resume**. `git checkout v1.0` gets you the finale: [github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent).

Until then, one homework assignment: dig out the record of your own agent's most recent crash, write it up as one entry in `cases.json`, and run `node src/eval.js --runs=10`. You'll find out whether it's a 10% disease or a 60% disease — the two take completely different treatments, and until you've run that number, every prescription you write is a guess.
