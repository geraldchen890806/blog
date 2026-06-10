---
author: Gerald Chen
pubDatetime: 2026-05-16T11:00:00+08:00
title: "7 \"Anti-AI-Tone\" Principles I Distilled After Writing 80+ Blog Posts with Claude Code"
slug: blog167_anti-ai-tone-writing-rules
featured: true
draft: false
reviewed: true
approved: true
tags:
  - Claude Code
  - 开发效率
  - AI
  - 自动化
description: "Roughly 70% of posts blog080-166 on this blog were written with Claude Code's help, yet readers almost never notice. Here are the 7 \"anti-AI-tone\" principles I distilled — the goal isn't to make AI sound less like AI, it's to make AI sound like you. Includes the automated check script from my blog-preflight Skill."
---

Of the 80-plus posts from blog080 to blog166 on this blog, **roughly** 70% were written with Claude Code's help (I haven't counted precisely). Yet readers almost never notice — nobody in the comments has ever accused me of "this was written by AI", Juejin's review rejected me once (not for AI tone), and Google AdSense rejected me three times (also not for AI tone).

This isn't because I use some magic prompt. It's because over two years I gradually distilled 7 "anti-AI-tone" principles. **The core idea: the goal isn't to make AI sound less like AI — it's to make AI sound like you.**

This post systematizes those 7 principles, with **real before/after rewrites** plus the automated check script from the blog-preflight Skill I use today.

## Why "AI tone" is a real problem

First, let's clear up a misconception: "AI tone" is not a moral issue — there's nothing wrong with AI-assisted writing. AI tone is a **signal problem**:

| Signal | Consequence |
|---|---|
| Formulaic structure | Readers lose interest after 3 paragraphs and bounce |
| Generic openers ("In this article we will...") | Reads like default GPT output; trips Juejin's AI detector |
| Overly complete lists | Reads like a paper outline, not actual thinking |
| No first-person war stories | Reads like a survey, not experience; AdSense flags it as "low-value content" |
| Overly balanced conclusions | Reads like a disclaimer, not an opinion |

Stack these signals up and **readers subconsciously know "this isn't a real person sharing experience"** — and that's the core value of a technical blog.

## Principle 1: First-person war stories

The easiest AI tell is the **absence of "I"**. AI defaults to a detached third-person voice: "developers typically...", "teams recommend...".

That voice is fine on Wikipedia. On a technical blog it's a death signal.

**The counter-move**: every section gets at least one sentence of "**I** did X, **I** found Y."

Example (a real paragraph from blog162, my Astro upgrade write-up):

> ❌ Default AI version: During the Astro 6 upgrade you may encounter experimental flag compatibility issues.
>
> ✅ What I actually wrote: The very first build failed: `[config] Invalid or outdated experimental feature`. The reason: experimental flags from the Astro 5 era had graduated to stable APIs in 6.0. My astro.config.ts had two of them: `preserveScriptOrder` and `fonts`. After switching to the Astro 6 stable syntax and rebuilding, **it passed**. The whole fix took under 2 minutes.

Compare the two — the second one was obviously written by someone who actually ran it. That narrative chain of "I saw a specific error → I dug into the cause → I changed it → I checked the time" is something AI won't generate on its own, because it has no experience of actually running code.

## Principle 2: Concrete numbers

AI defaults to "many", "very", "significantly" — adverbs with zero information content. **Real experience comes with numbers.**

**The counter-move**: wherever a concrete number is possible, never use an adjective.

Example ([blog163](/en/posts/claude-code-workflow-plugins-comparison/), my Claude Code workflow plugin comparison):

> ❌ Default AI: Using Skills noticeably improved development efficiency.
>
> ✅ What I actually wrote: Each full SDLC run costs about 50-80k tokens, 2-3x more than writing directly.

Even when the number is an estimate ("about 50-80k"), it's far more credible than "significantly improved".

**Level up**: a **pair of comparison numbers** beats a single number:

> Astro 5 baseline: total build time 45.77 seconds, CPU time 15.37 seconds.
> Astro 6 second build (warm cache): 47.70s, CPU time 14.80s.

One glance and readers know you actually ran it twice.

## Principle 3: Counterintuitive takes

AI defaults to "safe" conclusions — balanced, conservative, offending nobody. No wonder such articles look AI-written — because they are.

**The counter-move**: every post gets at least one **counterintuitive take** or a **pushback against the mainstream view**.

Example (a real paragraph from blog162):

> Where does the official blog's "2x faster" claim come from? ...It was measured on a 1000+ page Docs site, with Astro 6's experimental Rust compiler enabled, compared against Astro 5's default Go compiler. I didn't enable the Rust compiler, and my project has only 48 pages — **so the official speedup simply will not show up at my scale**.

Saying outright "the official marketing doesn't hold up" — AI won't write that by default, because it was trained to be "objective and balanced". **You have to accept the small risk of "annoying the vendor" to earn readers thinking "this person talks straight."**

## Principle 4: Labeled personal bias

Neutral statements sound like AI — because AI had most of its biases trained out. **Real people have biases, and they say so.**

**The counter-move**: explicitly mark "this is my preference", "I personally disagree", "I admit this one is biased".

Example ([blog161](/en/posts/ai-agent-memory-file-vs-vector/), my AI agent persistent-memory architecture comparison):

> On this dimension, file-based wins outright. **The core difference**: MEMORY.md is "code" — you can git diff it, you can hand-edit it; a vector store is "data" — everything has to go through an API.
>
> But there's a counterintuitive point: **if your Subagent mainly serves one project**, file-based "project coupling" is actually an advantage — it forces you to manage memory explicitly and know what's in there. Vector stores easily turn into a "black box" that nobody remembers the contents of a few months later.

"Counterintuitive point" plus subjective judgments ("actually an advantage", "easily turn into a black box") — those phrases make the paragraph unmistakably "a person thinking out loud".

## Principle 5: Non-linear narrative

AI defaults to a linear "problem → solution → conclusion" structure. Real people **take detours** — they'll tell a case first and circle back to the main thread, or wander off into a tangentially related war story.

**The counter-move**: allow 1-2 "seemingly unnecessary digressions" per post.

Example (blog165, my OAuth defense write-up):

> One detail of the Vercel incident is worth rereading:
> > A Vercel employee logged into Context.ai with his Vercel Enterprise Google account, granting Context AI **full read access to his Google Drive**.
> This step looks harmless — "sign into a third-party AI tool with your Google account" is something every developer does weekly. But once the attackers got access to Context AI, **that OAuth token was a key to the enterprise Google Drive**.

Inserting that "harmless-looking detail" before circling back to how the attackers used it — that's the rhythm of human writing. AI would default straight to "overly broad OAuth scopes are a problem" and skip the "looks harmless" beat entirely.

## Principle 6: Imperfect phrasing

AI writes too smoothly. Real people **pause, repeat themselves, and use colloquialisms**.

**The counter-move**: keep some "less than perfect" sentence shapes.

Side-by-side example:

> ❌ Default AI (smooth): In summary, the core value of Claude Code Skills lies in improving the predictability of AI collaboration through predefined workflows.
>
> ✅ What I actually wrote (with pauses): This is exactly the problem Skills solve: **a Skill's body loads on demand — if it's not invoked, it never enters the context**. To decide whether something belongs in CLAUDE.md or a Skill, there's a simple rule of thumb: **if it's a "just need to know it" fact, put it in CLAUDE.md; if it's a "do this action by these steps" procedure, make it a Skill**.

The second version keeps the colloquial "to decide X, there's a simple rule of thumb" — AI would default to "optimizing" that into "the decision criteria can be summarized as the following two points". **The optimization is precisely what makes it sound like AI.**

## Principle 7: Open questions

AI tends toward "closed endings" — every problem solved, every conclusion airtight. The real world isn't like that. **Real writers leave questions open.**

**The counter-move**: leave 1-2 "things I still haven't figured out" at the end or in the middle of the post.

Example (a real paragraph from blog166):

> A counterintuitive take: **4.7 not raising prices is not good news**. GPT-5.5 cut prices sharply, Gemini effectively raised them, and Anthropic held steady — on the surface Anthropic looks stable, but in reality it is passively losing cost competitiveness under GPT-5.5's price-performance offensive. If price is literally all you care about, Anthropic stopped being the best pick as of May.

It leaves an open question — "will Anthropic be forced into a price cut next?" — and the post doesn't answer it; readers think it through themselves. These open questions make the post read like field notes rather than a manual of conclusions.

## A makeover demo on a typical AI output

Now apply all 7 principles at once and look at the effect.

**Original AI output**:

> In 2026, Claude Code has become one of the preferred AI programming tools for developers. It supports multiple extension mechanisms such as Skills, Subagents, and MCP, enabling developers to build complex AI workflows. This article will introduce the core features of Claude Code in detail and share some best practices.
>
> First, Skills are one of the important concepts in Claude Code. Developers can define custom workflows by creating SKILL.md files. Second, Subagents provide isolated execution contexts. Finally, the MCP protocol allows Claude to access external tools.
>
> In summary, Claude Code is a powerful and flexible development tool that every developer should try.

Textbook AI writing — generic opener, list, boilerplate ending.

**After the makeover**:

> Three months into Claude Code, I went from "installed it for fun" to "it's the core of my blog publishing pipeline". I hit 4-5 pitfalls along the way; the worst was writing a Skill and forgetting to restart the session — it took me two hours to realize it wasn't a Claude bug, it was me.
>
> Skills, Subagents, MCP — the official docs cover all three. What I want to talk about is something the docs never say outright: **90% of the real-world payoff comes from Skills, yet 90% of beginners reach for Subagents first** — because Subagents sound more advanced. That's wrong.
>
> If you're just starting out, go in this order: first turn every repeated instruction into Skills (week one), add `context: fork` when a Skill's output explodes (week two), and only write a Subagent when a genuine "specialist worker" keeps recurring (week three). I myself didn't need MCP until week 8.

Mapping the changes back to the principles:
- ✅ Principle 1 (first-person war stories): "it took me two hours to realize..."
- ✅ Principle 2 (concrete numbers): 3 months, 4-5 pitfalls, 90% / 90%, week 8
- ✅ Principle 3 (counterintuitive take): "sound more advanced. That's wrong"
- ✅ Principle 4 (personal bias): "what I want to talk about is something the docs never say outright"
- ✅ Principle 5 (non-linear narrative): war story first, then the core observation, then the ordering
- ✅ Principle 6 (imperfect phrasing): "installed it for fun", "reach for ... first"
- ✅ Principle 7 (open space): no "in summary"

Roughly the same word count, but **the second version unmistakably reads like a real person sharing**.

## Automated detection: the anti-AI-tone check in my blog-preflight Skill

I formalized part of these 7 principles into the blog-preflight Skill covered in [blog158](/en/posts/blog158_claude-code-skills-practical-guide/). The core check script:

```javascript
// ~/.claude/skills/blog-preflight/scripts/check-ai-tone.js
const fs = require("fs");
const path = process.argv[2];
const raw = fs.readFileSync(path, "utf8");

// 第一步：剥离不该被检测的内容
// - frontmatter（---到---之间）
// - 代码块（``` 到 ```）
// - 引号包裹的反面例子（"标志着"、"见证了"这种引用）
const stripped = raw
  .replace(/^---[\s\S]*?\n---\n/, "")               // frontmatter
  .replace(/```[\s\S]*?```/g, "")                    // 代码块
  .replace(/"[^"]{1,20}"/g, "")                      // 短引号片段（去掉举例的禁用词引用）
  .replace(/`[^`]+`/g, "");                          // inline code

const warnings = [];

// 检查 1：禁用词（在剥离后的正文检测）
const bannedWords = ["标志着", "见证了", "划时代", "革命性", "激动人心", "未来已来", "春天来了", "赋能", "助力"];
bannedWords.forEach(w => {
  if (stripped.includes(w)) warnings.push(`🟡 含禁用词：${w}`);
});

// 检查 2：万能开场（剥离后的前 30 行）
const intro = stripped.split("\n").slice(0, 30).join("\n");
const aiOpeners = ["在本文中", "在这篇文章中", "在 2026 年", "近年来", "随着.{0,20}的快速发展"];
aiOpeners.forEach(p => {
  if (new RegExp(p).test(intro)) warnings.push(`🟡 开场疑似公式化：${p}`);
});

// 检查 3：公式化结尾（剥离后最后 30 行）
const ending = stripped.split("\n").slice(-30).join("\n");
const aiClosers = ["综上所述", "总而言之", "让我们一起", "希望本文对你有帮助"];
aiClosers.forEach(p => {
  if (ending.includes(p)) warnings.push(`🟡 结尾疑似公式化：${p}`);
});

// 检查 4：第一人称密度（修正：中文"我"后面允许跟中文）
// 用更准的中文 unicode 范围 + 全角句读边界
const meMatches = stripped.match(/我/g) || [];
const totalChars = stripped.length;
const meDensity = meMatches.length / (totalChars / 1000);
if (meDensity < 3) {
  warnings.push(`🟡 第一人称密度偏低（${meDensity.toFixed(1)}/千字，建议 ≥3）`);
}

// 检查 5：具体数字密度（含百分比和量词）
const numbers = stripped.match(/\d+(\.\d+)?(%|分|秒|分钟|小时|天|周|月|年|KB|MB|GB|TB|k|tokens?|次|篇|条|个)/gi) || [];
const numDensity = numbers.length / (totalChars / 1000);
if (numDensity < 1.5) {
  warnings.push(`🟡 具体数字密度偏低（${numDensity.toFixed(1)}/千字，建议 ≥1.5）`);
}

if (warnings.length === 0) {
  console.log("✅ 反 AI 痕迹检查通过");
} else {
  console.log(`找到 ${warnings.length} 个潜在问题：`);
  warnings.forEach(w => console.log("  " + w));
}
```

**Key fixes that mattered**:
- **Strip frontmatter / code blocks / short quoted fragments** — otherwise the negative examples quoted in the article (like "标志着") would self-trigger
- **The first-person regex is now a plain `/我/g`** — the earlier version required a non-Chinese character after "我", which was wrong: in Chinese, "我做了" and "我发现" are both followed by Chinese characters
- **Expanded the number-unit list** — added classifiers like "篇", "条", "个"

**Actual output of running the script on the Chinese original of this post**:

```
找到 1 个潜在问题：
  🟡 结尾疑似公式化：综上所述
（第一人称密度 5.6/千字 ✅、数字密度 1.5/千字 ✅、无禁用词 ✅）
```

That is: 1 potential issue found — "formulaic ending suspected: 综上所述 (in summary)" — while first-person density (5.6 per 1k chars), number density (1.5 per 1k), and the banned-word check all passed.

Number density landed exactly on the 1.5 threshold — that's the real result. But the script still raised one warning: "formulaic ending suspected: 综上所述".

**That's a flaw in the script itself**: in the "ultimate test" section near the end, I quote a negative example — `"综上所述，Claude Code 是一款功能强大的工具"` ("In summary, Claude Code is a powerful tool"). The script's short-quote stripping caps at 20 characters; this sentence exceeds 20 characters, didn't get stripped, and the banned phrase matched.

The fix is trivial (raise the cap to 60), but **I deliberately left it unfixed**. Why: it perfectly illustrates Principle 7 (open questions) — **every automated check script has edge cases it misses, and human review is the backstop**. When I review drafts, I treat the script output as a **warning**, not a **blocker**. The script catches 80% of the obvious AI-tone problems; the remaining 20% still requires a human to sign off.

## A few common misconceptions

### "AI tone = written by AI"

Wrong. **AI tone means "looks like AI output nobody read or edited."** The same AI model, prompted with "write a piece of technical analysis", produces output heavy with AI tone; prompted with "you're an engineer with 10 years in the trenches, griping to a colleague about a tool's pitfalls", it produces output with far less.

### "Short sentences sound more like AI than long ones"

The exact opposite. AI defaults to sentences that are **structurally balanced and medium-length**. Human writing is **uneven** — a suddenly very short sentence here, a suddenly meandering long one there. **Varied sentence length is a covert anti-AI-tone signal.**

### "Using emotional words makes it sound less like AI"

Partly true. But **overusing emotional words actually sounds like AI** — "stunning", "exciting", "breathtaking" are all high-frequency AI vocabulary. **Using emotional words sparingly** is harder than refusing to use them, and more human.

### "The more detailed the prompt, the better"

Wrong. In my experience, **an overly detailed prompt actually makes the output more templated** — the model follows your outline rigidly, and every section's length, structure, and transitions become mechanical. **A rough prompt that carries a personal observation** (e.g., "I just noticed an unexpected behavior in X — help me expand this observation into a 2000-word technical piece, and keep the skepticism in my voice") works better.

## Things I still haven't figured out

Convention says I should wrap up with a summary. But there are a few things I admit I have no answers for:

- **The more widely these 7 principles get used, will they become the next template for AI to imitate?** I've already seen a few AI-generated "fake personal blogs" deliberately sprinkling in "pitfalls I hit" and "counterintuitively...". Faking personal traces is harder than faking an objective voice, but not impossible. Over the next 6-12 months, "anti-AI-tone" may well evolve into another cat-and-mouse game.
- **Can GPTZero / originality detectors see through these 7 principles?** I haven't tested at scale. A rough trial of 10 principle-compliant posts through GPTZero: 6 judged "human", 4 judged "mixed" — but the sample is too small to draw conclusions.
- **Do they work equally well in English?** All 7 principles were validated in my Chinese writing. English has different sentence rhythms, person conventions, and rhetorical preferences — the principles need recalibration, but I haven't written long-form English yet, so I can't say how.

If you've run similar experiments, write in and tell me your results — this is what I want to dig into next.

## The ultimate test

There's a simple test for whether a passage has AI tone: **take the last sentence of the paragraph and check whether it could be dropped into any other article on the same topic**.

If it can ("In summary, Claude Code is a powerful tool" — that sentence fits in a Cursor article just as well as a Copilot article), it's AI tone.

If it can't ("I myself didn't need MCP until week 8" — that sentence only fits in my own post about my Claude Code experience), it's a human paragraph.

**The essence of anti-AI-tone writing is producing sentences that only you could have written.**

---

**Further reading**:
- [Claude Code Skills in Practice](/en/posts/blog158_claude-code-skills-practical-guide/) - the full implementation of the blog-preflight Skill; the check script in this post lives in its directory
- [AI Agent Persistent Memory: File-based vs Vector](/en/posts/ai-agent-memory-file-vs-vector/) - the source of the Principle 4 "personal bias" example
- [Claude Code Workflow Plugins Compared](/en/posts/claude-code-workflow-plugins-comparison/) - the source of the Principle 2 "concrete numbers" example
