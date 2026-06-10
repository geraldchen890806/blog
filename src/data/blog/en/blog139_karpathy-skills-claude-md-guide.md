---
author: Gerald Chen
pubDatetime: 2026-04-21T09:00:00+08:00
title: "One CLAUDE.md File, 44K Stars in a Week: Karpathy's Four Principles for AI Coding"
slug: blog139_karpathy-skills-claude-md-guide
featured: true
draft: false
reviewed: true
approved: true
tags:
  - Claude Code
  - AI
  - 开发效率
  - AI Agent
description: "A breakdown of how the forrestchang/andrej-karpathy-skills repo gained 44K stars in a single week: Karpathy's four principles for AI coding (think before coding, simplicity first, surgical changes, goal-driven execution), and how to use them directly in Claude Code."
---

On January 27, 2026, a GitHub repository containing nothing but a single Markdown file quietly went live. By April, it suddenly took off across the community—gaining thousands of stars per day, 44K in a single week, and reaching 67K+ stars in total.

The repo is [forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills), and its core content is a `CLAUDE.md` file that distills Andrej Karpathy's observations about LLM coding failure modes into four principles that AI assistants should follow.

## Why Karpathy's Views Are Worth Paying Attention To

Karpathy is the former Director of AI at Tesla, an early research scientist (and founding member) at OpenAI, and one of the most influential engineers when it comes to observing how LLMs behave while coding. In February 2025 he coined the term "Vibe Coding" (relying entirely on LLM-generated code without caring about the details), which sparked widespread discussion. In 2026 he added a caveat: for code you actually care about, you need more structure and discipline—not a complete hands-off approach.

His core criticism of LLM coding tools, in his own words:

> "Models make wrong assumptions on your behalf and just run with them without checking. They don't manage confusion, don't seek clarification, don't surface inconsistencies, don't present tradeoffs, don't push back when they should."

This diagnosis hits exactly what many developers experience day to day—AI assistants are too eager to start writing. They'd rather crank out a pile of code than stop and ask a single question.

## The Four Principles

### 1. Think Before Coding

**Core requirement**: Surface assumptions instead of making decisions silently.

In practice:
- State your assumptions explicitly rather than quietly picking one interpretation
- If a task can be understood in multiple ways, list them all
- When uncertain, **stop and ask** instead of guessing and pushing forward
- If there's a simpler approach, say so
- Push back when pushing back is warranted

This principle targets the AI's "implicit decision" problem. You ask it to "fix this bug," and maybe it does—but in a way completely different from what you expected, without asking you a single question along the way.

### 2. Simplicity First

**Core requirement**: Solve the problem with the least amount of code, nothing extra.

The rules:
- Don't build beyond what's needed (no speculative features)
- Don't create abstractions for single-use logic
- Don't add "flexibility" or "configurability" nobody asked for
- **If 200 lines of code could be 50, rewrite it**

AI models have a natural tendency to reach for the more "complete," more "general" solution instead of the simplest one. This principle is a direct countermeasure.

### 3. Surgical Changes

**Core requirement**: Change only what needs to change, and touch nothing else.

The rules:
- Don't refactor code you weren't asked to refactor
- Don't touch unrelated formatting
- Don't delete pre-existing dead code (unless explicitly asked)
- Match the existing code style
- **Every changed line should trace directly back to the user's request**

This principle targets the "collateral changes" problem. You ask the AI to add one function, and it helpfully reformats the indentation of the entire file, turning your git diff into a mess.

### 4. Goal-Driven Execution

**Core requirement**: Turn vague tasks into verifiable success criteria.

How to do it:
- Not "fix this bug," but "write a test that reproduces this bug, then make it pass"
- Not "implement this feature," but "when you're done, X, Y, and Z should hold"
- Define clear verification steps so the AI can enter a self-correcting loop

Karpathy's key observation, in his own words:

> "LLMs are very good at looping until a specific goal is met... Don't tell it what to do, give it success criteria and watch it go."

This is the most technically substantial of the four principles. It's essentially a shift from "imperative" to "declarative"—instead of describing steps, you describe outcomes.

## How to Use It in Claude Code

### Option 1: Claude Code Plugin (Recommended)

```bash
# 先添加仓库到插件市场
/plugin marketplace add forrestchang/andrej-karpathy-skills

# 再安装
/plugin install andrej-karpathy-skills@karpathy-skills
```

It takes effect automatically after installation—no extra configuration needed.

### Option 2: Copy into Your Project's CLAUDE.md

Copy the contents of the repo's `CLAUDE.md` into the `CLAUDE.md` file at your project root. This only applies to the current project, which works well when you need customization.

### Option 3: Add to Your Global CLAUDE.md

```bash
# 先克隆仓库
git clone https://github.com/forrestchang/andrej-karpathy-skills.git /tmp/karpathy-skills

# 追加到全局配置
cat /tmp/karpathy-skills/CLAUDE.md >> ~/.claude/CLAUDE.md
```

This applies globally—every project gets the constraints.

### Cursor Users

The repo ships with a Cursor adapter file you can use directly:

```bash
# 复制到项目的 Cursor 规则目录
cp /tmp/karpathy-skills/.cursor/rules/karpathy-guidelines.mdc .cursor/rules/
```

Or see the `CURSOR.md` doc in the repo root.

## Real-World Results

According to informal feedback from community users who adopted these rules, the impact is most noticeable on high-complexity, vaguely-specified tasks—the AI starts asking questions first instead of jumping straight into the code.

The visible changes:
- The AI asks questions before starting work, rather than writing code immediately
- PRs no longer contain unrelated formatting changes
- When multiple implementation approaches exist, it lists them and lets you choose instead of silently picking one

## Why a Single Markdown File Made Such a Big Impact

The phenomenon itself says something: the biggest bottleneck in today's AI coding tools isn't model capability—it's **behavioral constraints**.

The models are already smart enough to understand complex requirements and generate high-quality code. But without constraints, they take the most "obvious" path rather than the one best suited to your situation.

The essence of mechanisms like `CLAUDE.md` is encoding an engineer's working habits (clarify first, change as little as possible, let tests be the judge) into rules an AI can follow. Karpathy's version happens to express these rules clearly, concisely, and actionably—which is exactly why it blew up.

---

Repository: [forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills)

If you're using Claude Code, this is one of the highest-value configurations available right now: one file, zero dependencies, immediate results.
