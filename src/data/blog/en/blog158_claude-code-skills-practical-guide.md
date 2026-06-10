---
author: Gerald Chen
pubDatetime: 2026-05-01T10:00:00+08:00
title: "Claude Code Skills in Practice: Building a Reusable Cross-Project Skill from Scratch"
slug: blog158_claude-code-skills-practical-guide
featured: true
draft: false
reviewed: true
approved: true
tags:
  - Claude Code
  - AI Agent
  - 自动化
  - 开发效率
description: "Pull your repetitive playbooks, checklists, and multi-step workflows out of CLAUDE.md and turn them into Skills. Using a \"pre-publish blog check\" as the running example, this post covers the SKILL.md structure, every frontmatter field, context fork isolation, the boundaries with Slash Commands and Sub Agents, plus debugging and sharing."
---

If you've pasted the same "do this first, then do that" instructions into Claude Code more than three times, it's time to write a Skill. In April, Claude Code promoted Skills to its primary extension mechanism: workflows that used to be scattered across CLAUDE.md, `.claude/commands/`, and various agent configs now have a single home.

This post isn't about what Skills are. Instead, it takes a real need — a "pre-publish blog check" — and builds it from scratch into a Skill that works across all my projects, unpacking the full SKILL.md structure, what `context: fork` actually does, and where Skills end and Slash Commands and Sub Agents begin.

## Why a Skill instead of CLAUDE.md

CLAUDE.md has always been doing two jobs at once: **facts** (the project uses Astro / deploys to Vercel) and **procedures** (before publishing, build, push dist, tweet). Facts belong there — every session needs them. Procedures are different: most of the time they're irrelevant, but once they're in CLAUDE.md they live in your context permanently.

That's exactly the problem Skills solve: **a Skill's body loads on demand — if it isn't invoked, it never enters the context**. From the Anthropic docs: "Unlike CLAUDE.md content, a skill's body loads only when it's used, so long reference material costs almost nothing until you need it."

A simple test for whether something belongs in CLAUDE.md or a Skill: **if it's a "just need to know it" fact, CLAUDE.md; if it's a "when doing X, follow these steps" procedure, Skill**.

## Where the three concepts draw their lines

Skills, Slash Commands, and Sub Agents get conflated all the time, but they're positioned very differently:

| Mechanism | Triggered by | Context | Typical use |
|---|---|---|---|
| **Skill** | User + model auto-trigger | Main conversation / optional fork | Reusable multi-step workflows the model can invoke on its own based on the description |
| **Slash Command** | User only | Main conversation | A shortcut for fixed logic (now subsumed by Skills) |
| **Sub Agent** | Model delegation | Isolated | Heavy file reading / focused research / anything that needs isolation |

Two changes since April worth noting:

1. **Custom Slash Commands have been folded into Skills** — both `.claude/commands/deploy.md` and `.claude/skills/deploy/SKILL.md` produce `/deploy`. Old command files still work, but write new ones as Skills, since they support subdirectories and frontmatter-based control.
2. **Skill edits take effect immediately** — save the file and it's live, no restart needed. `~/.claude/skills/`, `.claude/skills/`, and directories added via `--add-dir` are all watched. **However**, if a skills directory didn't exist when the session started, creating it won't be picked up until you restart.

## The four levels where Skills live

Where the file lives determines who can use it:

| Level | Path | Scope |
|---|---|---|
| Enterprise | managed settings config | Every user in the org |
| Personal | `~/.claude/skills/<name>/SKILL.md` | All of your own projects |
| Project | `.claude/skills/<name>/SKILL.md` | The current project |
| Plugin | `<plugin>/skills/<name>/SKILL.md` | Wherever the plugin is enabled |

**Name-collision precedence**: Enterprise > Personal > Project. Plugins use the `plugin-name:skill-name` namespace, so they never collide.

The rule of thumb is straightforward: **used in one project only — project level; reused across projects — personal level**. The "pre-publish blog check" I'm about to write goes in `~/.claude/skills/blog-preflight/`, because my blog, my tools site, and my agent project all share the same frontmatter validation.

## Hands-on: writing the "blog pre-publish check" Skill

Before publishing any post, I manually check:

1. Are all frontmatter fields present (author, pubDatetime, title, slug, featured, draft, reviewed, approved, tags, description)?
2. Does the featured field follow the rules (false for tool guides, true for other technical posts)?
3. Are all tags from the standard set?
4. Does the post leak anything private — real IPs, passwords, API keys?
5. Any placeholder links (`yourusername`, `example.com`)?
6. Does the title contain banned phrases ("marks a milestone", "revolutionary", "the future is here", etc.)?

A human has to run through this every time, and Claude forgets too. As a Skill, `/blog-preflight` does it in one command.

### Step 1: create the directory

```bash
mkdir -p ~/.claude/skills/blog-preflight/scripts
```

### Step 2: SKILL.md

```yaml
---
name: blog-preflight
description: 博客发布前的自检清单。在我说"准备发布"、"发布前检查"或者要部署博客文章前主动调用。会扫描 frontmatter、隐私关键词、占位符链接、AI 味词汇。
disable-model-invocation: false
allowed-tools: Read Grep Bash(grep:*) Bash(node:*)
context: fork
agent: Explore
argument-hint: [文章路径]
---

# 博客发布前自检

对 $ARGUMENTS 这篇文章执行完整的发布前检查。如果没有传文章路径，扫描 `src/data/blog/` 中所有 `draft: true` 但 `reviewed: true` 的文章。

## 检查清单

### 1. frontmatter 完整性

必须包含以下字段：
- author（应为"陈广亮"）
- pubDatetime（ISO 8601 格式 + 时区）
- title（不带外层引号）
- slug（应与文件名前缀一致）
- featured（boolean）
- draft / reviewed / approved（三个状态位）
- tags（数组，1-4 个元素）
- description（50-150 字中文）

### 2. featured 字段规则

- 标题以"工具指南"开头 → featured: false
- 其他技术文章 → featured: true
- 不符合就报告"❌ featured 字段错误"

### 3. tags 合规性

只能从标准集合中选：
工具指南 / 工具 / AI / AI Agent / 前端 / 安全 / 自动化 / 开发效率 / 开源 / CSS / JavaScript / TypeScript / LLM / MCP / Claude Code / Claude

超出范围的 tag 报错并提示替代选项。

### 4. 隐私扫描

执行以下 grep（用 `bash` 工具）：

```!
grep -nE "(45\.63\.22\.102|datayes@123|sk-[A-Za-z0-9]{20,}|geraldchen890806@|13[0-9]{9})" $ARGUMENTS || echo "✅ 无隐私泄露"
```

任何匹配都报告 🔴 严重错误，列出具体行号。

### 5. 占位符链接

```!
grep -nE "(github\.com/yourusername|example\.com/api|your-api-key|TODO|FIXME)" $ARGUMENTS || echo "✅ 无占位符"
```

### 6. AI 味词汇

扫描以下禁用词：标志着、见证了、划时代、革命性、激动人心、未来已来、春天来了、赋能、助力。每出现一次报告 🟡 警告。

### 7. 引号检查

中文弯引号会让 AI 检测器报警，扫描：

```!
node ${CLAUDE_SKILL_DIR}/scripts/check-quotes.js $ARGUMENTS
```

## 输出格式

总结报告分三段：

- **🔴 必须修改**（隐私、占位符、frontmatter 缺失）
- **🟡 建议修改**（AI 味词、tags 接近上限、description 过短/过长）
- **✅ 通过的检查**（简短列出）

最后给出一句结论：可以发布 / 需要修改 N 处 / 不能发布。
```

### Step 3: helper script

`~/.claude/skills/blog-preflight/scripts/check-quotes.js`:

```javascript
#!/usr/bin/env node
const fs = require("fs");
const path = process.argv[2];
if (!path) {
  console.error("用法：check-quotes.js <文件路径>");
  process.exit(1);
}
const content = fs.readFileSync(path, "utf8");
const curly = content.match(/[“”‘’]/g);
if (!curly) {
  console.log("✅ 引号检查通过（仅含直引号）");
  process.exit(0);
}
const lines = content.split("\n");
const found = [];
lines.forEach((line, i) => {
  if (/[“”‘’]/.test(line)) {
    found.push(`${i + 1}: ${line.trim().slice(0, 80)}`);
  }
});
console.log(`🟡 发现 ${curly.length} 个弯引号：`);
found.forEach(l => console.log("  " + l));
process.exit(1);
```

Make the script executable:

```bash
chmod +x ~/.claude/skills/blog-preflight/scripts/check-quotes.js
```

### Step 4: invoke it

```text
/blog-preflight src/data/blog/blog158_claude-code-skills-practical-guide.md
```

Or let Claude trigger it on its own — next time you say "let's get this ready to publish", it'll invoke the Skill based on the description.

## Every frontmatter field, explained

The Skill above uses essentially all the frontmatter fields, so let's go through them one by one.

### Controlling who can invoke

| Field | Default | Meaning |
|---|---|---|
| `disable-model-invocation` | `false` | Set to `true` and only the user can run it via `/name`; the model can't auto-trigger it — right for commands with side effects (deploy, delete, send a message) |
| `user-invocable` | `true` | Set to `false` to hide it from the `/` menu so only the model can use it — right for background knowledge (e.g. "legacy system notes") |

### Controlling tool permissions

```yaml
allowed-tools: Read Grep Bash(grep:*) Bash(node:*)
```

`allowed-tools` is a **pre-approval** — these tools don't prompt while the Skill is active. But it does **not restrict** the tool set: other tools still work, they just go through the normal permission flow. Syntactically, tools are space-separated, and each Bash sub-pattern gets its own entry.

The `Bash(grep:*)` syntax is fine-grained permissioning: the command name before the colon, an argument glob after it — so this entry pre-approves only bash commands starting with `grep` and nothing else.

### Context isolation

```yaml
context: fork
agent: Explore
```

`context: fork` is the most useful new feature in this release. With it on, the Skill runs in an isolated sub-agent context — the accumulated history of your main conversation is invisible to it. The sub-agent starts from a clean slate of "SKILL.md content as the prompt, plus CLAUDE.md as standing reference" — not a completely blank session. Three concrete wins:

1. **No pollution of the main conversation** — run checks, read 50 files, generate a report; the main conversation only sees the final verdict
2. **Independent token budget** — when the main conversation is already long, the Skill doesn't eat into it
3. **You can pin a specialized agent** — `agent: Explore` uses the read-optimized agent; `agent: Plan` suits planning-style tasks

One **gotcha**: `context: fork` only makes sense for Skills with **a concrete task**. If the Skill body is reference material like "use the following API spec", the forked Sub Agent gets a pile of constraints and nothing to do — it returns immediately.

### Model and effort

```yaml
model: claude-opus-4-7
effort: high
```

`model` temporarily switches models for the duration of the Skill (e.g. Haiku for cheap simple Skills, Opus for heavy analysis). It is **not saved** to settings — the next prompt switches back automatically.

`effort` controls how deeply the model thinks; combined with the `${CLAUDE_EFFORT}` string substitution, your SKILL.md can adjust its instructions dynamically.

### String substitutions

| Variable | Meaning |
|---|---|
| `$ARGUMENTS` | All arguments passed at invocation |
| `$0`, `$1`... | The Nth argument (shell-style tokenization — quote multi-word args) |
| `${CLAUDE_SESSION_ID}` | The current session ID |
| `${CLAUDE_EFFORT}` | The current effort level |
| `${CLAUDE_SKILL_DIR}` | The Skill's own directory (essential when running scripts) |

`${CLAUDE_SKILL_DIR}` solves the script-path problem — cwd changes constantly, and hardcoding `~/.claude/skills/...` breaks once the Skill ships as a plugin.

### Path filtering

```yaml
paths: src/data/blog/*.md, src/pages/*.md
```

`paths` makes a Skill load into context only when you're editing matching files. That saves descriptor budget, which matters once you have a lot of Skills.

## What context: fork buys you in practice

Before using `context: fork`, I ran the check logic in the main conversation. The result: every `/blog-preflight` dumped 200 lines of scan output into the main conversation, and by the second post the context was stuffed with check reports.

After adding these two frontmatter fields:

```yaml
context: fork
agent: Explore
```

the behavior becomes:

```
Main conversation: you → /blog-preflight blog158.md
        ↓ dispatch a Sub Agent
        ↓ Sub Agent: runs all 7 checks (200 lines of output, kept in the sub-context)
        ↓ summary report (30 lines)
Main conversation: gets the 30-line report, original length unchanged
```

**This is the sweet spot for Skills + Sub Agent collaboration**: lots of execution detail, but the user only cares about the conclusion.

## Debugging tips

### The Skill doesn't auto-trigger

The most common cause is a `description` that isn't specific enough. The model decides "should I use this Skill right now" purely from the description. Three principles when rewriting:

- **Include trigger phrases**: how would the user say it? "pre-publish check", "ready to deploy" — put those exact phrases in
- **State when, not just what**: not only "what it does" but "when to use it"
- **Front-load keywords**: in the listing, descriptions truncate at 1536 characters — put the important parts first

A weak vs. strong comparison:

```yaml
# 弱
description: 检查博客文章

# 强
description: 博客发布前的自检清单。在我说"准备发布"、"发布前检查"或者要部署博客文章前主动调用。会扫描 frontmatter、隐私关键词、占位符链接、AI 味词汇。
```

### The Skill triggers too often

Add `disable-model-invocation: true` so it can only be run manually.

### Descriptions get truncated

All Skill descriptions in a session share one character budget (default 8000 characters or 1% of context). With many Skills installed, descriptions get clipped, which makes triggering inaccurate.

Two fixes:
- Raise the budget with the env var `SLASH_COMMAND_TOOL_CHAR_BUDGET=20000`
- Rewrite each Skill's description: the first sentence states exactly what it does; everything after is nice-to-have

### A new Skill doesn't take effect

If `~/.claude/skills/` did **not exist** when the session started, creating it mid-session won't be watched. Restart Claude Code once. Adding or removing SKILL.md files inside an already-existing directory takes effect instantly.

## Sharing a Skill across projects

Three ways to distribute a Skill:

1. **Project Skill**: commit `.claude/skills/` to git and the whole team gets it
2. **Plugin**: bundle multiple Skills into a plugin and publish it to a plugin repo
3. **Personal**: put it in `~/.claude/skills/` — available in all your projects, but only for you

My `blog-preflight` is currently Personal — I'm the only one maintaining the blog. For a team blog, it should move to the project's `.claude/skills/blog-preflight/` and be committed, so a new hire can clone and use it immediately.

## Advanced: dynamic context injection

Inside SKILL.md, the `` !`<command>` `` syntax runs a shell command **before** the Skill content is sent to the model, splicing the output into that spot. This is preprocessing, not model execution.

A real example, a "PR summary" Skill:

```yaml
---
name: pr-summary
description: Summarize changes in a pull request
context: fork
agent: Explore
allowed-tools: Bash(gh:*)
---

## Pull request context
- PR diff: !`gh pr diff`
- PR comments: !`gh pr view --comments`
- Changed files: !`gh pr diff --name-only`

## Your task
Summarize this pull request, focusing on...
```

When `/pr-summary` is invoked:

1. `gh pr diff` and friends run locally, immediately
2. Their output **replaces** the backtick placeholders in SKILL.md
3. The prompt the model receives is already the full text with real PR data baked in

The model has no idea any of this was dynamically generated — that's how you get the "looks like it's hitting the GitHub API live, but it's actually preprocessing" effect.

For multi-line commands, the official syntax is a code block tagged with `!` (the `!` immediately after the three backticks):

````markdown
## Environment
```!
node --version
npm --version
git status --short
```
````

This is different from a regular ```bash``` block — `!` is a preprocessing-execution marker that runs the three commands locally first and substitutes their output into that spot. Note there must be no space between the three backticks and the `!`.

Caveat: `disableSkillShellExecution: true` in settings turns this feature off, and managed settings often do exactly that (to stop user Skills from sneaking in command execution).

## Lessons from the trenches

After writing a few Skills, here's what I've learned:

1. **Task-style Skills are worth more than reference-style ones** — reference content can live in CLAUDE.md just fine; a task like "5-step deployment" is the Skills sweet spot
2. **Keep `description` under 200 characters** — longer ones get truncated, and the model triggers off the truncated version
3. **Always set `disable-model-invocation: true` on side-effect Skills** — `/deploy`, `/commit`, `/send-email` are not the model's call to time
4. **Default to `context: fork`** — unless you explicitly need the main conversation history, always fork. The shorter the main conversation, the smarter it stays
5. **Reference scripts via `${CLAUDE_SKILL_DIR}` everywhere** — hardcoded `~/.claude/skills/...` paths break the moment you pluginize
6. **Test with `/skill-name --help` right after writing** — Claude Code reads SKILL.md and shows you the rendered content

## What shouldn't be a Skill

Write enough Skills and you'll feel the urge to turn everything into one. A few categories don't fit:

- **One-off exploratory work** → just have the conversation; a Skill is a detour
- **Anything heavily tied to project-specific context** → use CLAUDE.md and keep the facts resident
- **Tasks that are different every time** → a Skill's value is in repetition; if you edit the prompt every run, typing it out is faster
- **Workflows that need human decisions midway** → Skills fit "run the steps"; anything that branches on judgment is better left to the model's discretion

---

**Further reading**:
- [Claude Code Skills official docs](https://code.claude.com/docs/en/skills) - full field reference and the latest features
- [Agent Skills open standard](https://agentskills.io/) - the cross-tool Skill spec
