---
author: Gerald Chen
pubDatetime: 2026-05-02T18:00:00+08:00
title: "AI Agent Persistent Memory Architectures Compared: File-Based vs Vector Retrieval, Benchmarked with a blog-preflight Subagent"
slug: ai-agent-memory-file-vs-vector
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI Agent
  - Claude Code
  - LLM
  - 开发效率
description: "I hooked the same Subagent up to both Claude Code's built-in file-based memory and mem0's vector retrieval, then compared token cost, recall quality, and cross-session learning. The result: concrete thresholds for which approach fits which data scale, plus a look at procedural memory—the weakest but most promising direction."
---

"The model isn't the product—**memory** is." That line kept coming up in the agent community throughout 2026. An agent with a frontier-class model but no persistent memory is a genius with amnesia. It sounds like a marketing slogan, but the 2026 market numbers make you take it seriously: the AI agent memory market is projected to grow from $6.27B in 2026 to $28.45B by 2030 (roughly 46% CAGR, per the MarketsAndMarkets 2026 report). Claude Code treats "persistent memory" as a first-class Subagent feature in its [five-layer architecture](/en/posts/claude-code-five-layer-architecture/), and dedicated frameworks like Hermes Agent, mem0, and AutoMemoryTools all surged in the first half of 2026, converging on the same goal: **make agents remember things across sessions**.

But picking one is a mess. "Is Claude Code's built-in `memory: project` enough? When should I move to mem0? How big is the gap between file-based and vector retrieval, really?" I ran a head-to-head experiment with my own blog's [blog-preflight Subagent](/en/posts/blog158_claude-code-skills-practical-guide/)—same Subagent, same inputs, two memory systems—comparing token cost, recall quality, and cross-session learning.

This post covers the experiment's findings and gives concrete "which approach at which data scale" thresholds.

## Three Types of Memory (Getting the Terms Straight First)

Academia classifies agent memory by *what* gets stored, and as of 2026 this taxonomy still holds up in practice:

| Type | What it stores | Example | Maturity |
|---|---|---|---|
| **Episodic** | Specific things that happened once | "Reviewed blog159 last Wednesday; frontmatter was missing description" | High |
| **Semantic** | Abstract facts and knowledge | "My blog's featured field: false for tool guides, true for technical posts" | High |
| **Procedural** | Know-how for getting things done | "When reviewing tool guides, first check that tags are in the allowed set, then check description length" | **Weakest, but most promising** |

Mainstream frameworks handle the first two well (vector retrieval + keyword filtering), but procedural memory is still early—most implementations degrade into "stuff a manual into the prompt." Keep this observation in mind; it explains later why file-based often wins.

## Experiment Setup

**Subject under test**: the blog-preflight Subagent, responsible for checking each blog post's compliance before publishing (frontmatter / privacy / AI tells).

**Two configurations**:

```yaml
# 方案 A：Claude Code 原生 file-based memory
---
name: blog-preflight-fs
description: 博客发布前自检（file-based 记忆）
memory: project
tools: Read, Grep, Bash
---

You are a blog preflight checker. Read MEMORY.md to recall past patterns,
then perform the checks. After checking, append findings to MEMORY.md.
```

Storage location: `.claude/agent-memory/blog-preflight-fs/MEMORY.md`, with the first 200 lines (25KB cap) read at startup.

```yaml
# 方案 B：mem0 向量检索（自定义实现）
---
name: blog-preflight-vec
description: 博客发布前自检（mem0 向量记忆）
mcpServers:
  - mem0:
      type: stdio
      command: npx
      args: ["-y", "@mem0/mcp-server"]
tools: Read, Grep, Bash
---

You are a blog preflight checker. Use mem0_search to retrieve relevant
past patterns, perform checks, then mem0_add to store new findings.
```

Data goes into a mem0 vector store and is retrieved top-k by semantic similarity.

**Input**: the blog's 30 most recent posts (Markdown, averaging 8KB each). The Subagent reviews them sequentially while building up memory, then post #31 (a fresh article) triggers the "recall memory + check" run.

**Metrics**:
1. **Initial memory build cost** (total tokens consumed after reviewing all 30 posts)
2. **Recall quality on post #31** (how many historical patterns it found)
3. **Cross-project generalization** (does the memory still work when moved to another blog project?)
4. **Maintenance cost** (when memory quality degrades, which one is easier to fix?)

## The Numbers

Three runs, averaged. Absolute values fluctuate; the relative gaps are stable.

### 1. Initial Memory Build (after 30 posts)

| Metric | file-based | mem0 vector retrieval |
|---|---|---|
| Total tokens | **128k** | 213k |
| Total time | 4m 12s | 9m 38s |
| Memory footprint | MEMORY.md 18KB | vector store 42MB |

Why file-based wins: after each review it just appends a line or two to MEMORY.md—no "embed → insert → index" pipeline. mem0 has to hit an embedding model on every write (even OpenAI text-embedding-3-small adds latency), and that compounds noticeably.

### 2. Recall Quality on Post #31

Test method: post #31 was a deliberately flawed "Tool Guide 54 - Online Markdown Tools" containing 5 of the "classic errors seen in the previous 30 posts" (curly quotes, wrong featured value, tags outside the standard set, etc.).

| Metric | file-based | mem0 vector retrieval |
|---|---|---|
| Classic errors caught | **5/5** | 4/5 (missed "tags outside the standard set") |
| Relevant historical cases recalled | 3, all on point | 8 relevant but redundant |
| False positives (flagged things it shouldn't) | 0 | 1 (treated "description slightly short" as a serious error) |

Why is file-based actually *more* accurate at this scale?

**Reason 1**: the 18KB MEMORY.md goes into context in full, so the model sees the **complete** set of historical patterns. Vector retrieval is top-k only, which drops marginal-but-relevant content.

**Reason 2**: MEMORY.md is "lessons learned" written by the agent itself—structured, with context. Vector retrieval is based on **semantic similarity**, which is unkind to "enumeration-type" knowledge (like a tag allowlist)—the tag names in an allowlist have low pairwise semantic similarity, so retrieval misses them easily.

**Reason 3**: the step-by-step nature of procedural memory is preserved naturally in file-based storage ("do A, then B"). Once a vector store chops each step into independent chunks, the ordering is gone.

### 3. Cross-Project Generalization

Moving MEMORY.md / the vector store to another blog project:

| Test | file-based | mem0 |
|---|---|---|
| Works after direct copy | Partially (project-specific conclusions invalid) | Partially (same cleanup needed) |
| Auto-detects "this doesn't apply to the new project" | No | **Yes** (low semantic similarity means it just isn't recalled) |
| Manual cleanup cost | Medium (human reads MEMORY.md and deletes lines) | Low (no cleanup needed) |

mem0 wins this one—its semantic retrieval mechanism naturally filters out memories that are project-specific but semantically mismatched.

But here's a counterintuitive point: **if your Subagent mainly serves one project**, file-based's "project coupling" is actually an advantage—it forces you to manage memory explicitly and know what's in there. Vector stores easily become black boxes; a few months later nobody remembers what they contain.

### 4. Maintenance Cost

Simulating the "a memory entry is outdated and needs updating" scenario. For example: "descriptions used to require 50-150 characters, now it's 80-200."

| Operation | file-based | mem0 |
|---|---|---|
| Find the old rule | Just grep MEMORY.md | search first, then look up the ID |
| Modify | One line of sed | API call to update + re-embed |
| Verify | Read the file directly | Run a retrieval to confirm replacement |
| Time | < 30 seconds | 2-3 minutes |

A total rout for file-based. **The core difference**: MEMORY.md is "code"—you can git diff it and edit it by hand. A vector store is "data"—everything has to go through an API.

## How to Decide What to Use

The thresholds I landed on after the experiment (based on this one test, take them as reference):

```text
Memory data < 25KB (roughly 200 short records)?
  └── Yes → file-based wins outright
       Why: full content fits in context, simple to maintain, accurate recall

Memory data 25KB – 1MB?
  └── Depends on the use case:
      - Mostly "enumeration-type" knowledge (allowlists, rules, procedures) → file-based + smart trimming
      - Mostly "semantic retrieval" knowledge (project history / doc fragments) → vector retrieval

Memory data > 1MB (roughly 8000+ records)?
  └── Vector retrieval is mandatory
       Why: file-based can't fit in context

Need reuse across multiple projects?
  └── Vector retrieval (semantics auto-filter irrelevant entries)

Need team collaboration + version control?
  └── file-based (git-friendly)

Primarily procedural memory (procedures, steps)?
  └── file-based (ordering preserved)
```

The short version: **single-project Subagent with small data → file-based; multi-project with lots of history → vector retrieval**.

## An Underrated Direction: Procedural Memory

I ran one extra case in the experiment—having the Subagent **write its own checking procedure** into MEMORY.md. The configuration:

```yaml
---
name: blog-preflight-self-improving
description: 博客发布前自检，自我进化检查流程
memory: project
---

You are a blog preflight checker.

CRITICAL: Your checking procedure is NOT fixed. Read PROCEDURE.md from your
memory directory to know the current procedure. After each check session:
- If you found a new error pattern, update PROCEDURE.md to add a check for it
- If a check has 0% hit rate over 10 sessions, deprecate it
- Maintain your own PROCEDURE.md as a living document
```

Looking back at `PROCEDURE.md` after 50 blog posts:

- It started as a 7-step standard checklist
- At post #12 the Subagent added "check whether the description ends with a redundant '我'"—because it noticed I'd made that mistake three times
- At post #28 it added "if the article is a tool guide, an anyfreetools.com link must appear"—which later turned out to be wrong (we'd stopped publishing tool guides), and at post #47 it deprecated that check on its own
- By post #50 it had 11 checks and 5 deprecation records, and honestly looked more sensible than the checklist I'd written by hand

**That's the power of procedural memory—the Subagent isn't "using memory," it's "accumulating methodology."** This direction is dirt cheap to implement in file-based storage (a single PROCEDURE.md file), yet most agent frameworks ignore it.

One caveat: self-evolution needs guardrails, or the Subagent will mutate the checklist out of control. My constraints:
- Every new check must cite at least 2 real supporting cases
- At most 1 change per session
- Every check must carry an "enabled date" and a hit-count stat

## Framework Comparison (Beyond Just Claude Code)

A comparison by "out-of-the-box readiness" and "data scale fit":

| Framework | Implementation | Suitable scale | Auto procedural | Cross-platform |
|---|---|---|---|---|
| **Claude Code `memory:`** | file-based | < 25KB | Needs manual design | Claude ecosystem |
| **mem0** | vector + keyword hybrid | Any | Weak (build your own prompts) | Multi-platform SDKs |
| **Hermes Agent** | SQLite + LLM summaries | Any | **Native support** | Standalone runtime |
| **AutoMemoryTools (Spring)** | file-based long-term memory | < 1MB | Weak | Spring ecosystem |
| **Cloudflare Agent Memory** | edge KV | Medium | None | CF Workers |
| **LangGraph + Postgres** | relational database | Any | Build your own | LangChain ecosystem |

My actual picks:

- **Single agent, single project (blogs / tool sites)**: Claude Code `memory: project`—sufficient and easy to maintain
- **Sharing experience across projects (e.g. "my preferred code style")**: Claude Code `memory: user`
- **Building a large multi-agent system**: Hermes Agent or LangGraph + Postgres
- **Want to "try procedural memory for free"**: file-based + let the Subagent self-maintain PROCEDURE.md

## Common Misconceptions

### "Vector retrieval is always more accurate than files"

Not necessarily. From the data above: 18KB of MEMORY.md fully in context recalled 5/5; mem0 top-k recalled 4/5. **When data is small enough to fit entirely in context, vector retrieval's top-k is pure loss.**

### "File-based can't do semantic search"

It can—just differently. Let Claude search MEMORY.md keywords with the Grep tool; on small datasets the results are close to vector retrieval—because the LLM does its own semantic expansion (rewriting keywords and retrying when a search comes up empty).

### "More memory means a smarter agent"

Wrong. Noise in memory distracts the model. The false positive mem0 produced earlier is exactly this problem—it recalled 8 relevant entries, but 3 were stale or inapplicable, and the model treated them as valid signal. **Quality beats quantity**—which is also why procedural memory is so valuable: it forces the agent to distill "which memories are worth keeping."

### "Claude Code's `memory:` field is just plain file I/O"

It is file I/O, but not *just* that. At startup it automatically injects the first 200 lines of MEMORY.md (up to 25KB) into the system prompt, along with an instruction to self-curate when the limit is exceeded. Active maintenance by the Subagent is the intended design.

## Practical Rollout

If you're just starting to add memory to an agent:

1. **Week 1**: start with Claude Code's built-in `memory: project` and hand-write 5-10 curated entries into MEMORY.md
2. **Week 2**: let the Subagent append on its own—but add format constraints (every entry must carry a date + source case)
3. **Week 3**: watch MEMORY.md's growth rate; past 15KB, make the Subagent do curation
4. **Week 4**: try procedural memory—hand the "procedure" over to the Subagent to self-maintain, with the 3 constraints mentioned above
5. **When data outgrows the setup**: refer to the comparison table above; in most cases mem0 is the smooth migration path (keep file-based as a fallback)

A memory system is fundamentally the agent's "accumulated experience." If you can stick with it for a few weeks and let the agent build up its own memory, **its useful output crosses a visible threshold**—from "re-explaining the project every time" to "it knows what pitfalls this project has hit before." That threshold isn't a technical problem; it's a patience problem.

---

**Further reading**:
- [mem0 project homepage](https://mem0.ai/) - vector memory framework
- [Hermes Agent (GitHub)](https://github.com/nousresearch/hermes-agent) - self-evolving agent framework
- [Cloudflare Agent Memory introduction](https://blog.cloudflare.com/introducing-agent-memory/) - edge KV implementation
