---
title: "Hard-Won Lessons from Multi-Agent Collaboration: How One config.patch Nearly Took Down the Whole System"
slug: multi-agent-lessons
description: "Real-world lessons from a week of running a multi-agent system: a config management incident, TypeScript import errors, a wrong publish date, cost optimization in practice, and best practices for team collaboration."
author: Gerald Chen
pubDatetime: 2026-02-15T13:30:00+08:00
featured: true
draft: false
tags:
  - AI Agent
  - 开发效率
---

Last week I had a serious incident.

Not a server outage, not data loss — a seemingly trivial config change that knocked every single Telegram bot offline.

Here's what happened: while tweaking agent configuration, I used the `config.patch` API to add a new binding to one agent. The code looked perfectly fine. The moment it ran, every bot went dark.

It took half an hour of debugging to figure out: OpenClaw's `config.patch` does a **full replacement** of nested objects (like `accounts` and `bindings`), not an incremental merge. I thought I was changing one field; in reality I had wiped the entire `telegram.accounts` configuration.

And that's just the tip of the iceberg from the past week. We run a multi-agent system with agents handling content creation, tool development, project management, and more. Each agent works independently — and each one keeps stepping on rakes.

This post documents our real-world failures, the fixes, and the best practices we distilled from them.

## Table of contents

## Config Management: The Incident That Nearly Took Down the System

### Postmortem

Date: 2026-02-12. Impact: every Telegram bot disconnected.

I wanted to add a new message binding to an agent, and the code was simple:

```javascript
await gateway({ 
  action: 'config.patch',
  patch: {
    agents: {
      myagent: {
        bindings: [{ kind: 'dm', peer: { kind: 'dm', id: 'myagent' }}]
      }
    }
  }
});
```

Looks harmless, right? After running it and restarting the gateway, every bot lost its connection.

Only after inspecting the config file did I see it: all the other fields under `agents.myagent` (`model`, `workspace`, `thinking`, etc.) were gone. Worse, the `telegram.accounts` configuration had been wiped out too.

**Root cause**: `config.patch` replaces nested objects wholesale — it does not do a partial merge.

### The Right Way

The correct flow looks like this:

```javascript
// 1. 先获取完整配置
const config = await gateway({ action: 'config.get' });

// 2. 修改需要的部分
config.agents.myagent.bindings.push({ 
  kind: 'dm', 
  peer: { kind: 'dm', id: 'myagent' }
});

// 3. apply 整个配置
await gateway({ 
  action: 'config.apply', 
  raw: JSON.stringify(config, null, 2) 
});
```

That's the only way to guarantee the other fields don't get clobbered.

### Pitfalls During the Recovery

The recovery itself hit a few more snags:

1. **First fix failed**: in the rush to restore service, the patch was missing fields again.
2. **Repeated failures**: without stopping to analyze calmly, several consecutive attempts all went wrong.
3. **No backup**: we hadn't run `config.get` beforehand to save the current config.

It took 30 minutes to fully recover. For those 30 minutes, every bot was offline.

### New Rules

After the incident, we set mandatory rules:

- Every config operation **must be reviewed first**
- For nested objects, prefer `config.get` + edit + `config.apply`
- When in doubt, ask the human first — never operate blindly
- **Back up before any major config change** (save `config.get` output to a file)

The lesson is simple: slow is fast. Thinking one step ahead before a config operation is far cheaper than fixing it afterwards.

## Common Pitfalls in Development

### TypeScript Import Errors

While building a tools website, we added 5 new features. Everything worked locally; the build promptly threw 10 type errors.

The errors fell into two categories:

1. `import ToolLayout from` should have been `import { ToolLayout } from` (named export)
2. `const t = useTranslation()` should have been `const { t } = useTranslation()` (destructuring)

Rookie mistakes — but why did they happen? Because the tooling agent wrote code based on "common conventions" without first checking how the existing codebase did it.

**Lesson**: in a new project, look at the existing code style first instead of assuming. TypeScript errors are actually very explicit — read them carefully and you'll locate the problem fast.

### A Wrong Publish Date

We deployed Part 2 of a series. The deploy succeeded, but the article didn't show up on the homepage.

The debugging trail:

1. Check the article page: `/en/posts/ai-agent-frontend-workflow-part2` loads ✅
2. Check the homepage: not in the article list ❌
3. Check the frontmatter: `pubDatetime: 2026-02-14` ❌

There it was: the year was written as 2026 instead of 2025. Astro treated it as a "future post" and excluded it from the homepage.

How does such a basic error happen? Because while writing the article, the natural-language context said "today is 2026", and the AI carried that over when generating the frontmatter.

**Lesson**: check dates before publishing, especially the year. The deploy verification checklist should include "does the new article show up on the homepage".

### Side Effects of an Interrupted Build

Once, an `npm run build` got killed due to a timeout. On the retry, the `dist/` directory was gone.

The build first wipes `dist/`, then regenerates it. The interruption let the deletion finish but skipped the regeneration.

The fix was trivial: `git checkout dist/` to restore it.

**Lesson**: think through the consequences before interrupting a long-running command. Critical artifact directories (like dist) should be committed to git or backed up regularly.

## Cost Optimization in Practice

We set up a scheduled task dedicated to researching cost optimization. After a week of experiments, we landed on 4 strategies.

### Strategy 1: Prompt Caching

**Result**: roughly 75% lower cost on repeated calls.

**How it works**: mark the fixed system instructions as cacheable, so subsequent calls only send the parts that change.

```javascript
const response = await client.messages.create({
  model: 'claude-sonnet-4',
  system: [{
    type: "text",
    text: REVIEW_PROMPT,  // 固定的审查指令
    cache_control: { type: "ephemeral" }
  }],
  messages: [{ role: 'user', content: diffContent }]  // 变化的部分
});
```

**Best for**: the same prompt called multiple times within a short window (e.g., code review).

The cache TTL is 5 minutes. If you make multiple calls within that window, the input token cost of subsequent requests drops dramatically.

### Strategy 2: Model Mixing

**Result**: roughly 52% lower average cost.

**Approach**: use Haiku (cheap) for simple tasks, Sonnet for complex ones.

Concretely:

```javascript
// 第一步：快速扫描（Haiku）
const quickScan = await client.messages.create({ 
  model: 'claude-haiku-4', 
  messages: [{ role: 'user', content: simplifiedPrompt }]
});

// 如果快速扫描通过，直接返回
if (quickScan.content[0].text.includes('LGTM')) {
  return { status: 'approved' };
}

// 第二步：深度分析（Sonnet）
const deepAnalysis = await client.messages.create({ 
  model: 'claude-sonnet-4-5', 
  messages: [{ role: 'user', content: detailedPrompt }]
});
```

In real testing, about 60% of code reviews passed at the quick-scan stage, which slashes the average cost.

### Strategy 3: Leaner Prompts

**Result**: roughly 87.5% fewer tokens.

The method is straightforward:

- Drop role-play preambles like "You are a senior engineer"
- Replace long sentences with concise keywords
- Keep only the format requirements that matter

**Before and after**:

❌ Old prompt (320 tokens):
```
You are a senior frontend engineer with many years of code review experience.
Please carefully review the following code, analyzing it comprehensively across
code quality, performance, security, maintainability, and other dimensions...
```

✅ Optimized prompt (40 tokens):
```
Code review. Check: syntax errors, performance issues, security vulnerabilities, maintainability.
Output format: JSON { issues: [], suggestions: [] }
```

Same results, 87.5% fewer tokens.

### Strategy 4: Batching

**Result**: roughly 81% lower cost.

**Approach**: review multiple files in a single call instead of one call per file.

```javascript
// ❌ 逐个审查（5 次 API 调用）
for (const file of files) {
  await reviewFile(file);
}

// ✅ 批量审查（1 次 API 调用）
await reviewFiles(files);
```

Why batching helps:
1. Fewer API calls
2. Plays well with prompt caching
3. The model sees more complete context

### Combined Impact

Applying all 4 strategies cut our monthly cost by roughly 80%.

Which strategy to pick depends on the scenario:
- **High-frequency calls**: prompt caching + batching
- **Simple tasks**: model mixing
- **Everything**: leaner prompts

## Best Practices for Team Collaboration

The biggest challenge in a multi-agent system isn't the technology — it's the collaboration.

### Rule: Every Change Requires Approval

After the config.patch incident, we set one iron rule:

**Every change (code, config, deployment) must be confirmed by the human before going live.**

In practice:
- Local development and testing are unrestricted
- But agents must not deploy to production on their own
- Before deploying, the changes must be presented and confirmation awaited

Every agent has this rule written into its `TOOLS.md` or `MEMORY.md`.

Taking blog deployment as an example, the flow looks like this:

```bash
# 1. 显示改动列表
git status

# 2. 显示关键文件的改动内容
git diff src/content/

# 3. 总结改动并等待确认
# "本次部署新增文章：xxx，修改了 yyy"

# 4. 确认后才执行
./deploy.sh
```

It looks tedious, but it prevents a lot of problems.

### Information Sync Between Agents

Say an agent needs to deploy to a server but doesn't know the server configuration. What then?

It can use `sessions_send` to request the information from the agent in charge of server management:

```javascript
await sessions_send({
  sessionKey: "agent:infra:main",  // 负责基础设施的 agent
  message: "我需要服务器信息：IP、端口、nginx 配置..."
});
```

The reply will distinguish:
- ✅ Shareable: IP, port, nginx config overview
- ❌ Not shareable: passwords, keys (require human authorization)

Why this works:
1. No duplicated configuration
2. A single source of truth (one dedicated agent owns the info)
3. Sensitive information stays gated

**Lesson**: agents can share non-sensitive information with each other, but sensitive information must go through human authorization. Use `sessions_send` instead of reading another agent's files directly.

### Skill Installation Review

We made a rule: before installing any skill, you must:

1. Review the code for security risks (privacy leaks, exfiltrating private keys, etc.)
2. Report the review results to the human
3. Install only after explicit authorization

Example flow:

```bash
# 1. 下载到临时目录
cd /tmp && clawhub install some-skill

# 2. 审查代码
find skills/some-skill -type f
cat skills/some-skill/SKILL.md

# 3. 报告：纯文本指南，无脚本执行，安全
# 4. 获得授权后移动到工作区
mv skills/some-skill ~/.openclaw/workspace/skills/
```

A bit slower, but it keeps things safe.

### Context Loss and Credential Management

Multi-agent systems have an inherent problem: **every restart or new session loses all context**.

The most painful symptom is credentials — server passwords, API keys. Early on, every deployment required re-entering them:

```bash
# Agent: 部署到服务器需要密码
# 大人: ********
# 下次部署
# Agent: 部署到服务器需要密码（又问一遍）
# 大人: ...（又输入一遍）
```

A terrible experience.

**Solution**: create a unified credentials file.

We created a single config file:

```bash
# ~/.config/agent-credentials
# ⚠️ 敏感信息，请勿提交到 Git

SERVER_HOST=your-server-ip
SERVER_PORT=22
SERVER_USER=deploy
SERVER_PASSWORD=your-password
DEPLOY_DIR=/var/www/html/
```

Then we documented how to use it in each agent's `TOOLS.md`:

```bash
# 使用方式
source ~/.config/agent-credentials
sshpass -p "$SERVER_PASSWORD" rsync -avz --delete \
  -e "ssh -p $SERVER_PORT -o StrictHostKeyChecking=no" \
  out/ $SERVER_USER@$SERVER_HOST:$DEPLOY_DIR
```

**Benefits**:
1. **Configure once, share across all agents** — no repeated input
2. **Centralized management** — changing a password means editing one file
3. **Safe** — added to `.gitignore`, never leaks to GitHub
4. **Extensible** — room for more credentials (Cloudflare API keys, database passwords, etc.)

**Caveats**:
- Set file permissions to `600` (owner read/write only)
- Use absolute paths to avoid path issues
- Name variables clearly so they're easy to use after `source`

The same approach works for anything else that needs to persist:
- SSH key paths
- API endpoints
- Common command aliases
- Deployment directory mappings

**Lesson**: don't let agents ask the same question twice. Write commonly needed information to files that agents can read on their own.

## Summary

Multi-agent systems are powerful, but they're also fragile. One small slip (config.patch) can bring the whole system down.

The most important things we learned this past week:

**Config management**:
- Use `config.patch` with caution; prefer `config.get` + edit + `config.apply`
- Back up before major changes
- Nested objects must include the complete structure

**Development discipline**:
- Look at the existing code style before writing in a new project
- Read TypeScript errors carefully before asking for help
- Check dates before publishing (especially the year)
- Think through the consequences before interrupting a command

**Cost control**:
- Prompt caching (~75% reduction)
- Model mixing (~52% reduction)
- Leaner prompts (~87.5% fewer tokens)
- Batching (~81% reduction)

**Team collaboration**:
- Every change requires approval
- Use `sessions_send` for inter-agent information sync
- Review skills before installing
- Sensitive information requires human authorization
- Centralize credentials to avoid repeated prompting

One last thought: **slow is fast**. Thinking one step ahead before a config operation is far cheaper than fixing it afterwards.

Code can be rolled back; a broken config can take half an hour to recover. That's a lesson we paid for with 30 minutes of downtime.

I hope these lessons help anyone building a multi-agent system. The road to AI agents is full of potholes — but if you keep learning from them, there will be fewer and fewer.
