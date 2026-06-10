---
author: Gerald Chen
pubDatetime: 2026-04-14T20:00:00+08:00
title: "Hermes Agent in Practice: Embedding an AI Assistant into Your Development Workflow"
slug: blog122_hermes-agent-dev-workflow
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI Agent
  - 开发效率
description: "Not another feature rundown of Hermes — this is what it's actually like after wiring it into a real development workflow: code review, requirement breakdown, doc generation, scheduled monitoring. Which scenarios genuinely help, and which ones will bite you."
---

In my earlier [introduction to Hermes Agent](https://chenguangliang.com/posts/blog117_hermes-agent-guide/), I mostly covered what it can do and how it compares to OpenClaw. After a few weeks of daily use, I have a much more concrete picture — Hermes genuinely saves effort in certain development scenarios, but there are also a few spots where it's easy to get burned. This post is a record of that hands-on experience.

## Basic Setup: One Dedicated Agent per Project

Hermes supports running multiple agent instances in parallel, each with its own persona and memory. My approach is to create one agent per major project instead of using a single general-purpose agent for everything.

```bash
# 新建一个项目专属 Agent
hermes agent create --name "blog-dev" --workspace ~/ai/blog
```

Then drop a short SOUL.md into the workspace to tell the agent what the project is:

```markdown
# Blog Dev Agent

你是这个 Astro 博客项目的开发助手。

## 项目概况
- 框架：Astro 5 + Tailwind CSS
- 部署：Cloudflare Pages
- 内容目录：src/data/blog/
- 组件目录：src/components/

## 工作原则
- 修改组件前先读取现有文件，了解命名风格
- 涉及样式修改时，优先复用已有的 Tailwind class
- 提交代码前确认 npm run build 通过
```

The persona doesn't need to be long. What matters is that the agent knows the project's directory layout and basic constraints. Hermes's self-learning loop will fill in more context on its own as you keep talking to it.

## Scenario 1: Code Review

This is the scenario I use most. After finishing a feature, I hand it straight to Hermes for review — it's more effective than staring at the screen myself.

With the agent hooked up to a Telegram Bot, the workflow feels natural:

```
Me:     Just finished the article sorting feature, review it for me
        [paste code or give the file path]

Hermes: Reading files... analyzing...
        Found 3 issues:
        1. sortByDate doesn't handle the case where pubDatetime is empty
        2. Uses new Date() instead of Date.parse(), which differs in edge cases
        3. No slice after sorting — hurts first-paint performance with large datasets

        Suggested fixes: ...
```

A few tips that make this work better:

**Add constraints to the review.** Just saying "review my code" is too broad — you'll get a pile of trivial formatting suggestions. It's far more useful to specify what to focus on:

```
Review src/utils/sort.ts for me — focus on edge cases and performance, ignore naming style issues
```

**Cross-file reviews.** Hermes's file tools can read an entire directory, which makes it good at reviewing changes that span multiple files:

```
Review my changes under src/components/ from today — mainly check whether anything affects other components
```

**Have it diff before and after a PR.** Combined with the Git tools:

```
Run git diff main..feature/sort-fix and check whether these changes introduce any new problems
```

## Scenario 2: Requirement Breakdown and Technical Design

When you're handed a vague requirement, asking Hermes to break it down into an actionable task list is faster than working it out yourself.

```
Requirement: add a "related posts" recommendation feature to the blog,
             based on tag similarity, shown at the bottom of each post, max 3 posts

Break down an implementation plan for me, taking the existing Astro project structure into account
```

It reads your project structure and proposes a plan grounded in your actual tech stack — closer to reality than asking ChatGPT cold.

The output typically includes:
- The implementation approach (weighing trade-offs between different options)
- A file change list (which files to create or modify)
- Step-by-step instructions (you can follow them directly)
- Potential risks (the spots most likely to trip you up)

If you're not happy with the plan, keep drilling into the details — the context is preserved across turns.

## Scenario 3: Documentation Generation

Writing docs is the easiest thing to put off in development. Hermes saves real effort here.

**Generating a README:**

```
Read src/config/tools.ts and the src/components/ directory,
then generate a README for me covering the project structure and main config options
```

**Generating function comments:**

```
Add JSDoc comments to all exported functions in src/utils/rss.ts,
matching the style of the existing comments in src/utils/sort.ts
```

**Generating a CHANGELOG:**

```
Read the last 10 git commits and organize them into CHANGELOG format,
grouped by feat/fix/refactor
```

The defining trait of these tasks: the result doesn't need to be perfect. Getting 70% of the content generated is already enough — you polish the rest by hand. The value Hermes adds here is turning "write docs from scratch" into "edit a draft."

## Scenario 4: Scheduled Monitoring and Automation

Hermes's built-in Cron scheduler shines here. I've set up a few recurring tasks:

**Check the build status every morning:**

Scheduled tasks are set up through conversation (no config files to edit):

```
Every day at 9 AM, run npm run build in the project directory.
If it fails, send the error log to my Telegram
```

**Weekly Git commit summary:**

```
Every Monday at 10 AM, read last week's git log,
summarize what was completed and what's still outstanding, and send it to Telegram
```

**Monitor dependency updates:**

```
Every Friday afternoon, check package.json for dependencies that need updating,
and list any packages with breaking changes
```

These used to require standalone shell or Node scripts; now you just describe them in natural language. Results get pushed to Telegram, so you never have to go check manually.

## Scenario 5: Debugging Assistance

When you hit a bug, Hermes makes a decent second pair of eyes.

Send it the error output:

```
Running npm run build throws this error:
[paste error output]

Help me find the cause — read the relevant files if needed
```

It will read the files involved in the error on its own and track down the problem. It's usually less precise than asking Claude.ai directly, but the advantage is that it can read your project files itself — no manual copy-pasting of context.

For bugs like frontend hydration errors or CSS cascade issues — the kind you can only diagnose by seeing the actual code — this capability is especially valuable.

## Pitfalls I've Hit

**Self-learned skills interfering with normal conversations.** Hermes's self-learning loop sometimes solidifies a one-off action into a "skill," which leads to strange behavior later — for example, you ask it once to write a doc in a particular format, it memorizes that format, and then applies it to every doc afterward even when you didn't ask.

The fix: periodically review the skill list and delete what you don't need:

```bash
hermes skills list
hermes skills delete <skill-id>
```

**Be explicit with file paths.** Hermes will sometimes guess at file paths, and a wrong guess means it reads the wrong file. Make it a habit: when file operations are involved, spell out the full path instead of saying "that config file."

**Context drift after long conversations.** Cram too many unrelated tasks into one conversation and Hermes's context gets muddled. The best practice is to start a new session per task type: `/new` resets the context so each new task starts clean.

**Be careful with concurrent tasks.** Kicking off multiple tasks that write files at the same time can cause conflicts. Hermes's concurrency control isn't mature yet — serialize any tasks that modify files.

## Where Hermes Is the Wrong Tool

**Tasks that demand precise control over every step.** Hermes's autonomy means it decides how to implement things on its own. If you need full control over the logic of every line of code, working directly with Claude Code is a better fit.

**Debugging the agent's own behavior.** When Hermes does something unexpected, tracing the cause is hard — its logs are less clear than Claude Code's, and behavior produced by self-learning is even harder to reproduce and diagnose.

**Team projects.** Hermes's memory and skills are currently single-user with no team-sharing mechanism, so its value in multi-person collaborative projects is limited.

---

To sum up: in personal project development, Hermes is most valuable for tasks that are highly repetitive, don't require precise control, but do need some project context — code review, doc generation, scheduled monitoring, requirement breakdown. A general-purpose AI assistant can do these reasonably well too, but Hermes can read your project files directly and remember your preferences, eliminating most of the "here's the background" overhead.

If you're already doing deep development with Claude Code, Hermes works best as a "peripheral assistant" — handling the surrounding chores you don't want to spend time on but can't avoid.

**Further reading**:
- [Hermes Agent Review: The Successor to OpenClaw](https://chenguangliang.com/posts/blog117_hermes-agent-guide/) - An overview of Hermes's core features, use cases, and how it compares to OpenClaw
- [A Deep Guide to Claude Code Hooks](https://chenguangliang.com/posts/blog119_claude-code-hooks-guide/) - Using Hooks to automate code quality checks and block dangerous operations in Claude Code
- [Building a Multi-Agent Automation System with the Claude Code CLI](https://chenguangliang.com/posts/blog115_openclaw-to-claude-code-migration/) - A complete self-hosted implementation, as a counterpoint to the Hermes approach
