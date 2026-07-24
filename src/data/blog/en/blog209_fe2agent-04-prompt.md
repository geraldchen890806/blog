---
author: Gerald Chen
pubDatetime: 2026-07-24T09:00:00+08:00
title: "Prompt Is the New CSS: Declarative, Cascading, No Devtools"
slug: blog209_fe2agent-04-prompt
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI Agent
  - Frontend
  - Productivity
  - Claude Code
description: "Change one line of the system prompt and the agent behaves like a different animal — prompts are like CSS: declarative, cascading, overridable, but with no devtools to show which rule is in effect. Part 4 of the fe2agent series — prompt layers, instruction dilution, and structured prompting, with tiny-agent v0.4 (same tools, two system prompts, run the behavior diff)."
---

## 1. The Pit

At the end of blog03 I left one line hanging: change a description from "Read a file" to "Read a file. USE THIS BEFORE WRITING" and the model's behavior shifts to a completely different shape. Readers immediately followed up: if one sentence can change behavior, what happens when you write a few more?

Last month I answered that question for myself, with an incident.

My blog publishing pipeline has a review agent whose whole job is to nitpick drafts before they ship. One day I added a rule to its system prompt: "check for curly quotes; this blog only uses straight ASCII quotes." That same night I ran the next draft through it, and it reported 40-plus "quote problems." Startled, I opened the draft and went through them one by one — every single hit was a Chinese full-width quotation mark. A perfectly clean Chinese draft, 42 false positives.

The trouble traced back to a piece of trivia: Chinese full-width quotation marks and English curly quotes are the **same pair of Unicode code points**, U+201C and U+201D. The same character is a typographic accident when it sits in the middle of an English word and perfectly legitimate punctuation inside a Chinese sentence. My rule only said "check for curly quotes," said nothing about context, so the agent flagged all of them indiscriminately.

(As an aside: that pair of characters is one I cannot type even once in this post — if I did, my own review agent would report this very paragraph. The law is on the books now, and the lawmaker has to live under it too.)

My first instinct was to delete the rule. But delete it, and any genuine curly quote sneaking into English text would go unpoliced. The eventual fix was to add another rule: "U+201C/U+201D appearing inside a Chinese sentence is normal Chinese punctuation, do not report; only when it's embedded in English text or code does it count as a curly-quote problem." Ran it again: 42 false positives down to zero, English curly quotes still caught.

Savor that fix for a second: **I didn't change a single character of the first rule. I used a more specific rule to override it in a particular context.** Anyone who's written CSS should be sitting up straight right now — that's the cascade.

This is post 4 in the series "From useEffect to Agent Loop." blog01 covered the loop, blog02 covered context, blog03 covered tools. This one covers the thing you've been using since post 1 without ever looking at straight on: the **prompt** — the words you write to the model, and the rules by which they actually take effect.

## 2. The Bridge

One line:

> **Prompt is the new CSS: declarative, cascading, overridable — but there are no devtools to tell you which rule is currently in effect.**

```
CSS:                                Prompt:

  UA stylesheet (browser default)     pretraining + alignment (factory persona)
    │ can be overridden                 │ can be overridden
  author stylesheet                   system prompt
    │ can be overridden                 │ can be overridden
  inline style                        tool description / this turn's user msg
    │                                    │
    ▼                                    ▼
  devtools shows who wins             run the task ten times, count behaviors, guess
```

On the left, which layer beats which is written into the spec as an algorithm, and devtools draws the strike-throughs; on the right, every layer is only a tendency, and who wins depends on this turn's sampling. Same skeleton, completely different adjudication.

## 3. The Real

### 3.1 The layers of a prompt: every word you write lives on some layer

Let's unpack the word "prompt" first. Most people think the prompt is the sentence in the chat box; in fact the declarations the model reads each turn come in at least four layers:

Layer one, **the model's default behavior**. The factory persona installed by pretraining plus alignment: helpful, eager to produce an answer, a faint customer-service tone baked into its voice. This is the UA stylesheet — write zero lines of CSS and h1 still has a default font size; write zero lines of prompt and the model still ships with a full set of behavioral defaults. You can't edit this layer; you can only override it.

Layer two, **the system prompt**. The standing rules you wrote by hand, present on every turn — the author stylesheet. The block we hung cache_control on in tiny-agent v0.2 is exactly this.

Layer three, **tool descriptions**. blog03 said it: "description is not documentation, it's a prompt" — these are style fragments scattered across the tools array, governing local behavior like "when should this tool be used," the way component-level scoped styles do. Plenty of people polish the system prompt down to the comma, dash off tool descriptions in one careless line each, and then wonder why the model uses tools erratically — write the global stylesheet as beautifully as you like, if the components are littered with sloppy style attributes the page still comes out a mess.

Layer four, **this turn's user message**. Most recent, most specific — inline style.

When layers conflict, who wins? CSS has a deterministic algorithm: origin, specificity, source order, compare all the way down, exactly one answer guaranteed. Prompts have no algorithm, only tendencies: Anthropic's models are trained so that system roughly outranks user; at the same time, nearby content (the most recent messages) naturally draws more attention. Notice these two forces pull in opposite directions — system wins on rank, the latest user message wins on position, and the outcome of the tug-of-war isn't set by a spec, it's set by probability.

While we're here, a correction for something people copy wrong: OpenAI has role: "developer" as a dedicated instruction role; **Anthropic does not** — in the Anthropic API, the two places you can operate are system and messages, period. Don't go hunting for a developer role because an OpenAI article told you to; it isn't there.

Now run my quote incident back through the four-layer frame, and every piece snaps into place: "check for curly quotes" lives on the system layer. What does it conflict with? Layer one — the model knew straight out of the factory that Chinese full-width quotes are normal punctuation, but my rule was more specific and more imperative, so it overrode that common sense. And my fix planted, on the same layer, another rule with higher specificity to override it back. Three declarations stacked in a fight, the most specific one wins — with no error thrown anywhere along the way, and no panel I could open to inspect "the list of rules currently in effect."

### 3.2 Instruction dilution: every rule picks the other rules' pockets

CSS veterans have all fought the specificity wars: you write .btn, a teammate writes .card .btn, you fire back with #main .card .btn, and eventually both sides flip the table and reach for !important together.

The prompt version of this war looks almost identical, except the weapon changed from selectors to volume. You notice the model ignoring some rule, so you set it in caps; the other rules look feeble by comparison, so they go caps too; then comes bold, then NEVER, then exclamation marks. **IMPORTANT in bold caps is the `!important` of the prompt world — you're embarrassed the first time you reach for it, and you swear by it ever after.**

And it genuinely delivers. Models really are more sensitive to markers like IMPORTANT, ALWAYS, NEVER — use them when they're warranted, no shame in it. But the old CSS lesson holds here verbatim: !important's power comes from scarcity. A stylesheet where everything is !important has no !important — when everyone cuts the line, there is no line. Same with prompts: when eight of the ten rules in your system prompt are in caps, the information the model actually receives is "this person talks at this volume all the time," and then it picks what to follow at its own discretion. **Emphasis is relative. Emphasize everything and you've emphasized nothing.**

Sneakier than the volume war is dilution. A model's attention within one turn is roughly a fixed quantity, and to the model your rule list is not a checklist — it doesn't tick items off one by one, it kneads all your rules into a single lump of soft constraints and digests them together. Every rule you add thins the attention every other rule receives. I measured this once on v0.4 (numbers in section 4.3): grow the rules from 7 to 11, and the new rules do get followed — while rule 3, which had been rock solid, starts dropping. **Adding a rule isn't free: you think you're doing addition; attention is doing division.**

So the right posture for prompt changes isn't "write a bit more, just to be safe." It's managing the thing the way you manage a CSS codebase: delete what you can, resolve conflicts, keep a ledger of every !important. blog02 said "give it less and it actually does better" — true for context volume, equally true for rule count.

### 3.3 Structured prompting: draw grid lines for attention

blog02 planted a hook inside the three context moves: "structured context — details deferred to blog04." Time to pay it off.

The same handful of rules, written as a paragraph of prose versus a sectioned list, produce wildly different compliance rates (measured in 4.3). The reason isn't mystical: the model has seen oceans of XML tags, markdown headings, and numbered lists in its training data. These structures are boundary signals it knows — tags carve a slab of text into named blocks, and attention has grid lines to navigate by. Prose has no boundaries; one rule is separated from the next by nothing but a period, and somewhere mid-read it all smears together.

Three moves of structured prompting:

**One, section and name.** Use XML tags (`<rules>`, `<output_format>`) or markdown headings to separate content with different jobs. Not because Claude parses XML syntax — the tags make "this block is rules, that block is format requirements" addressable.

**Two, positive and negative examples.** Rather than piling up three abstract adjectives ("be careful, be thorough"), give one good/bad pair. In CSS you don't write "the heading should look nice" either; you write font-size: 24px — a concrete value always beats an abstract intent. The model is a pattern-matching creature; examples are its concrete values.

**Three, write defensive rules explicitly.** The model's factory default (remember the UA-stylesheet layer?) leans toward producing an answer, even when it doesn't know one. So a line like "if you can't find it, say so — never make it up" is a line that, left unwritten, gets backfilled by default behavior. You've written defensive CSS — `img { max-width: 100% }` guards against an unconstrained image blowing up the layout; a defensive prompt guards against a model with no exit fabricating content. Giving it an explicit "admit you don't know" exit is far cheaper than catching fabrications after the fact.

What the three moves share: they turn "how I hope it behaves" from a default assumption in your head into a structurally addressable declaration. CSS people internalized this ages ago: the browser does not read your mind. Neither does the model — the only difference is that the browser gets it wrong deterministically, and the model gets it wrong stochastically.

## 4. The Work: tiny-agent v0.4

### 4.1 What v0.4 Grows

`git checkout v0.4` gets you this cut: [github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent). Compared to v0.3, three new things:

- New file `src/prompts.js`: two system prompt constants — `PROMPT_V1` (the one-liner) and `PROMPT_V2` (the structured version)
- `src/agent.js` gains a `--prompt=v1|v2` flag, and `task` now reads "the first positional argument that isn't a flag"; nothing else moves
- The game changes: same tools, same task, swap only the prompt, run it a few times and count the behavioral differences

This is the smallest code delta in the entire series — because what this post needs to prove is exactly this: **not one line of executing code changes; change only the declarations, and the behavior comes out a different animal.**

### 4.2 The Two Prompts

```javascript
// src/prompts.js
export const PROMPT_V1 = `You are tiny-agent, a helpful assistant
with file tools. Be careful and accurate.`;

export const PROMPT_V2 = `You are tiny-agent, a cautious file editor.

<rules>
1. ALWAYS call read_file on an existing file before write_file.
2. If a file or directory does not exist, say so. NEVER invent content.
3. Prefer the smallest change that completes the task.
4. After writing, state which files changed and by how many bytes.
</rules>

<output_format>
Reply in the user's language.
End with one line: DONE: <files touched, comma separated>.
</output_format>

<examples>
<good>
Task: update the title in README.md
-> read_file README.md -> write_file with ONLY the title line changed
</good>
<bad>
Task: update the title in README.md
-> write_file README.md from memory, guessing the rest of the content
</bad>
</examples>`;
```

(In the repo these two blocks are actually named `RULES_V1` / `RULES_V2` — each gets the v0.2 project brief appended before export: `PROMPT_V1 = RULES_V1 + BRIEF`. Without that, the moment you swap prompts to experiment, the system drops back under the 4096-token cache minimum. Only the varying part is shown here.)

The change to `agent.js` is just these few lines:

```javascript
import { PROMPT_V1, PROMPT_V2 } from "./prompts.js";

const promptArg = process.argv.find(a => a.startsWith("--prompt="));
const version = promptArg?.split("=")[1] ?? "v2";
const task = process.argv.slice(2).find(a => !a.startsWith("--"));
const ctx = new Context(version === "v1" ? PROMPT_V1 : PROMPT_V2, client, MODEL);
```

Four points, driven all the way home:

**One, strict variable control.** Between v1 and v2, tools, model, task, temperature are all identical; the only difference is the system string. This is treating a prompt change with A/B-test discipline — to learn one declaration's effect, change exactly that one thing. Sounds like a truism, but I've watched too many people change eight things at once and then ask "why did the behavior change" — the same self-inflicted puzzle as changing eight CSS properties at once and asking which one took effect.

**Two, each of v2's four rules overrides one factory default.** Rule 1 overrides "start writing immediately" (half the root cause of that reader's README casualty at the top of blog03); rule 2 overrides "lean toward giving an answer" (anti-fabrication); rule 3 overrides "polish things while you're in there" (models love to prettify passages you never asked them to touch); rule 4 demands a self-report of changes — an acceptance interface reserved in advance for blog06's verifier. Not one of them is decoration.

**Three, inside `<examples>`, bad matters as much as good.** Give only the positive example and the model learns "this is the right way"; add the negative one and it learns where the boundary sits. This pair is lifted straight from blog03's real-life incident — eval cases come from crashes, and so do examples.

**Four, editing system busts the cache.** blog02 covered that the cache is prefix-matched, and system sits inside the prefix — every new prompt revision means the next turn re-writes the cache at roughly 1.25x the base input price. So don't interleave prompt iteration with everyday tasks: batch the changes, test until stable, then ship — otherwise behavior and bill wobble together and you can't tell which wobble came from what.

### 4.3 Give It a Spin

Same task, each prompt version run five times:

```text
$ node src/agent.js --prompt=v1 "change the README.md title to tiny-agent v0.4"
[turn · tool_use=write_file]
Done! I rewrote README.md and smoothed out the install instructions a bit while I was at it.

$ node src/agent.js --prompt=v2 "change the README.md title to tiny-agent v0.4"
[turn · tool_use=read_file]
[turn · tool_use=write_file]
README.md updated: title line changed from "# tiny-agent" to "# tiny-agent v0.4",
everything else untouched (+5 bytes).
DONE: README.md
```

My five runs each: v1 skipped the read and wrote directly twice, and on one of those runs it also "helpfully" reworded three passages beyond the title; v2 read-then-wrote five out of five, and touched only the title line five out of five. Same tools, same runTool — the entire behavioral difference came from that block of declarations. If the reader from blog03 had had the v2 prompt back then, his README would at least have survived a while longer — note I said "a while longer," not "forever." A prompt is a tendency, not a gate; the real gate has to wait for blog07's confirmation gate.

**Crash section (mandatory)**: v2 was not written in one pass. My first draft had no `<rules>` tags — I wrote 7 rules as one 190-word paragraph of English prose and felt pretty thorough about it. Same task, five runs: only the first two rules were reliably followed; the "report byte counts after writing" rule sat mid-paragraph and never showed up once in five runs — lost in the middle, the exact phenomenon from blog02's context post, striking just as happily inside a 300-token system prompt. Split into numbered `<rules>`: five out of five.

With structure solved, I promptly itched my way into dilution: I kept adding to `<rules>` until it hit 11 — output language, path conventions, assorted small fussinesses. The new rules did get followed, but in three runs out of five, rule 3, "smallest change," started dropping — the model went back to polishing paragraphs I hadn't asked it to touch. I cut back down to 4 rules, the version you saw above, and rule 3 came back solid. **Between rule count and per-rule compliance there is a budget line you cannot see.** My discipline now: every time I want to add a rule, I first ask whether I'm willing to delete an old one for it.

### 4.4 One Mapping: Why CLAUDE.md Looks the Way It Does

[blog194 project passport](/en/posts/blog194_project-passport-agents-md-claude-md-memory/) covered Claude Code's CLAUDE.md / AGENTS.md — the project brief spliced into the system layer every turn. Reread it in this post's vocabulary: it is the **user-land author stylesheet**. That markdown file in your repo is the stylesheet you write to the model, and Claude Code's job is splicing it into the cascade.

Now look at the officially recommended style: short sentences, sections, bullets, no fluff — and you now know that isn't an aesthetic preference, it's cascade engineering. CLAUDE.md's content gets digested in the same cascade as the built-in system prompt, the tool descriptions, and your current instruction; written as prose it gets diluted, written as structure it stays addressable. The docs telling you to "keep it short" and section 3.2's attention budget line are the same line.

### 4.5 Moonshot Footnote

> The OpenAI side has role: "developer" as an instruction role beyond system — in newer models it's effectively system's new name, same priority semantics, not an extra super-layer. Moonshot / DeepSeek follow the OpenAI shape; when you switch over, PROMPT_V1/V2 work verbatim, dropped into the corresponding system or developer message.
>
> Structured prompting pays off on both sides, with a slight difference in taste: Claude models are especially at home with XML tags (plenty of them in the training data), while OpenAI docs more often demonstrate markdown sectioning. The gap is small and the principle is one and the same: section, name, give boundaries. Don't memorize "which house uses which" — run the same task five times and count; data from your own model beats any tutorial.

## 5. The Boundary: Where the Analogy Breaks

Where the CSS analogy holds, I grant it in full: declarative, layered, overridable, specificity wars, the rise and fall of !important — it all lines up, goosebump-level lines up. But three places it cannot carry, and I owe you those in full.

**One: the CSS cascade has a deterministic algorithm; prompts have only probabilistic tendencies.** Two CSS rules collide and the winner is computable: origin, specificity, source order — the spec nails it down; you could work it out on paper. Two prompt rules collide and no document on earth tells you the winner — system roughly beats user, specific roughly beats abstract, near roughly beats far, and it's "roughly" all the way down. The referee isn't a spec; it's the eval you run yourself: same task set, N runs before and after the change, count the pass rate. Post 09 will grow this into a proper methodology; for now, one signpost planted: **in the prompt world, eval is your W3C.**

**Two: break CSS and you see it instantly; break a prompt and nothing happens.** Botch a style and the page grows crooked on the spot — F12, three minutes, found. Botch a prompt? No error, nothing turns red, no crash — the model just "behaves a little differently," and odds are you're not in the room when it does. In my quote incident, a full day passed between that rule going live and me seeing the 42 false positives; had they not been glaring, it could have lurked for another month. Same family of disease as blog02's silent cache misses: it doesn't throw, it just quietly gets worse — and "worse" is the one thing no panel ever highlights in red for you. CSS without devtools would merely be miserable; a prompt without devtools is dangerous — because even the fact that "it's broken" has to be discovered by a human.

**Three: CSS's reader is standardized; a prompt's reader is probabilistic — and gets swapped out.** The browser wars ended long ago; the same slab of CSS means essentially the same thing in Chrome and Safari, and compatibility is a caniuse lookup away. Prompts have no caniuse — the same prompt is one behavior on a different model, another behavior after the same model's version bump, and even a rerun with zero edits carries variance. You are not writing rules for a deterministic machine; **you are writing rules for a probabilistic reader** — and the fact that he took them in today is no guarantee he still will next week.

One line to close: **CSS taught you declarations and cascades — and it also spoiled you: it let you believe that whatever you declare necessarily takes effect. Prompt will bend that habit back.**

Echoing the spine: [blog01](/en/posts/blog206_fe2agent-01-agent-loop/) said you hand the wheel over to a probabilistic function (choice), blog02 said context is the input it reads each turn, blog03 said execution stays in your hands. The prompt is glued onto the "input" bone — it is the resident layer of the input, the one you write by hand. In steering-wheel terms: **the prompt is the driving rulebook taped to the dashboard — it gets read before every departure, but whether it sinks in is probabilistic.** What you can do is keep the rulebook short, clear, and well-sectioned — then watch it with evals to see whether it's actually being followed.

## 6. The Hook: Next Up

Next up: "Context Is RAM, Memory Is Disk: Give Your Agent Lazy Loading."

The analogy hook: by the end of this post you've probably squeezed out a question of your own — prompt or context, all of it lives inside the context window, and the window is finite and billed by the token (you remember blog02's bill curve). Project conventions, past conclusions, the pit you stepped in last week — where do the things that can't ride along every turn go? Frontend answered this question long ago: what doesn't fit in RAM goes to disk, and what the first paint doesn't need gets lazy loaded. Agent-land runs the same play: context is RAM, memory files are disk, and retrieval is on-demand import().

tiny-agent v0.5 will grow: **markdown memory files + naive retrieval** — two new tools, save_memory / search_memory, land in tools.js (blog03 warned this file would keep getting more crowded; the promise starts coming due next post). `git checkout v0.5` gets you the next cut: [github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent).

Until then, homework: deliberately grow v0.4's `<rules>` to 12, run the same task ten times, and count each rule's compliance rate; cut back to 5, run ten more. You will watch with your own eyes where that attention budget line is drawn — and that feel is worth more than any prompt engineering course, because it was measured on your own model.
