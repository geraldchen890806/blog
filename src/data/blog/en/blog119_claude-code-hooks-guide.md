---
author: Gerald Chen
pubDatetime: 2026-04-13T18:00:00+08:00
title: "A Deep Dive into Claude Code Hooks: Making the AI Coding Tool Truly Fit Your Workflow"
slug: blog119_claude-code-hooks-guide
featured: true
draft: false
reviewed: true
approved: true
tags:
  - Claude Code
  - 自动化
  - 开发效率
description: "Claude Code Hooks might be the most underrated AI coding feature out there. This post starts with how the three hook types fire, then walks through 10+ real configurations from my blog agent, tooling site, and daily work to show how Hooks can make Claude Code truly part of your workflow."
---

I've been using Claude Code for about four months, and for the first three I never touched Hooks. Not because I didn't know about them — I just figured they weren't necessary. It writes code; why bother with extra configuration?

Then one day Claude finished a piece of code, committed it, and ESLint flagged seven errors, so I had to call it back to fix them. This went back and forth three times, each round the same loop: write → spot formatting issues → ask for fixes. That's when it hit me: if lint ran automatically after every file write, this loop wouldn't need to exist at all.

That's exactly what Hooks are for.

## What Hooks Are

Claude Code Hooks are a mechanism for triggering custom shell commands before or after tool calls. Put simply: whenever Claude invokes a tool (writing a file, running a command), you can automatically run a script right before or right after that action.

The config file is `~/.claude/settings.json` (global) or `.claude/settings.json` in your project root (project-level).

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "cd $CLAUDE_PROJECT_DIR && npx eslint --fix $CLAUDE_TOOL_INPUT_FILE_PATH"
          }
        ]
      }
    ]
  }
}
```

There are three event types:

| Event | When it fires |
|------|---------|
| `PreToolUse` | Claude is about to invoke a tool, **before execution** |
| `PostToolUse` | Claude has invoked a tool, **after execution** |
| `Stop` | Claude has finished its entire response and is about to stop |

`matcher` is the tool name, supporting exact matches (`"Write"`) and regex (`"Bash|Edit"`). Tool names map to Claude Code's built-in tools; the common ones are `Write` (write files), `Edit` (edit files), `Bash` (run commands), `Read` (read files), `Glob` (file search), and `Grep` (content search).

## Environment Variables

Several built-in variables come in handy inside hook scripts:

| Variable | Meaning |
|------|------|
| `CLAUDE_PROJECT_DIR` | Current project root |
| `CLAUDE_TOOL_INPUT_FILE_PATH` | File path the Write/Edit tool is operating on |
| `CLAUDE_TOOL_INPUT_COMMAND` | Command the Bash tool is about to run |
| `CLAUDE_TOOL_NAME` | Name of the tool that triggered the hook |
| `CLAUDE_SESSION_ID` | Current session ID |

With these variables, your script knows exactly which file Claude is touching or which command it's running, instead of applying blanket rules to everything.

## What Exit Codes Mean

This is buried deep in the docs, but it matters a lot:

- **PreToolUse hooks**: a non-zero exit code **blocks** the tool call. Claude receives whatever you printed to stdout as the error message and handles it on its own (usually by adjusting and retrying).
- **PostToolUse / Stop hooks**: the exit code is ignored; only stdout matters — Claude reads it as additional context.

In other words: PreToolUse is an "interceptor," PostToolUse is a "notifier."

## 10 Practical Configurations

Below are the configurations I actually use across my blog agent, tooling site, and day-to-day development, grouped by use case.

### Use Case 1: Automatic Code Quality Guarantees

#### 1. Auto-run ESLint + Prettier after every file write

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'f=\"$CLAUDE_TOOL_INPUT_FILE_PATH\"; if [[ \"$f\" =~ \\.(ts|tsx|js|jsx)$ ]]; then cd \"$CLAUDE_PROJECT_DIR\" && npx eslint --fix \"$f\" 2>&1 | head -20; fi'"
          }
        ]
      }
    ]
  }
}
```

This only fires for JS/TS files, so you don't waste lint runs on markdown, JSON, and the like. `head -20` caps the output so Claude doesn't drown in a wall of lint reports.

#### 2. Auto-format Python projects with Black

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'f=\"$CLAUDE_TOOL_INPUT_FILE_PATH\"; if [[ \"$f\" =~ \\.py$ ]]; then black \"$f\" --quiet 2>&1; fi'"
          }
        ]
      }
    ]
  }
}
```

Runs silently (`--quiet`); only produces output when something goes wrong.

#### 3. Auto-run tests after writing a test file

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'f=\"$CLAUDE_TOOL_INPUT_FILE_PATH\"; if [[ \"$f\" =~ \\.(test|spec)\\.(ts|js)$ ]]; then cd \"$CLAUDE_PROJECT_DIR\" && npx vitest run \"$f\" --reporter=verbose 2>&1 | tail -30; fi'"
          }
        ]
      }
    ]
  }
}
```

Only fires for test files. The moment a test is written it gets run, so Claude immediately sees failures and fixes them.

### Use Case 2: Blocking Dangerous Operations

This is PreToolUse's most valuable role: intercepting dangerous commands before they run — forcing manual confirmation or blocking them outright.

#### 4. Intercept rm -rf

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'cmd=\"$CLAUDE_TOOL_INPUT_COMMAND\"; if echo \"$cmd\" | grep -qE \"rm -rf|rm -r \"; then echo \"[HOOK BLOCKED] 检测到 rm -rf 命令，已拦截。如需删除请手动执行。\"; exit 1; fi'"
          }
        ]
      }
    ]
  }
}
```

Returning exit 1 makes Claude receive the error message, and it typically finds another approach (like deleting files one at a time, or asking you to confirm).

#### 5. Block pushes to production

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'cmd=\"$CLAUDE_TOOL_INPUT_COMMAND\"; if echo \"$cmd\" | grep -qE \"git push.*main|git push.*master|git push --force\"; then echo \"[HOOK BLOCKED] 不允许直接推送到 main/master 或强制推送。请创建 PR。\"; exit 1; fi'"
          }
        ]
      }
    ]
  }
}
```

This rule is non-negotiable for me. Claude will sometimes run `git push origin main` directly; this hook forces it to go through the PR workflow.

#### 6. Protect sensitive files

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'f=\"$CLAUDE_TOOL_INPUT_FILE_PATH\"; if [[ \"$f\" =~ (\\.env|\\.env\\.local|credentials\\.json|secrets\\.yaml)$ ]]; then echo \"[HOOK BLOCKED] 拒绝写入敏感文件: $f\"; exit 1; fi'"
          }
        ]
      }
    ]
  }
}
```

Stops Claude from accidentally modifying `.env` or credential files. I added this to my blog agent because Claude would occasionally "helpfully" edit config files.

### Use Case 3: Automating Project Maintenance

#### 7. Auto-generate the summary after writing an Astro post

This hook is specific to my blog project. Every time Claude finishes writing a blog markdown file, it automatically runs Claude Code itself again to extract the description field.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'f=\"$CLAUDE_TOOL_INPUT_FILE_PATH\"; if [[ \"$f\" =~ src/data/blog/.*\\.md$ ]]; then python3 ~/ai/scripts/check_frontmatter.py \"$f\" 2>&1; fi'"
          }
        ]
      }
    ]
  }
}
```

`check_frontmatter.py` checks whether the frontmatter is complete (description, tags, pubDatetime). Missing fields are printed as warnings for Claude, and Claude fills them in.

#### 8. Auto-install dependencies after package.json changes

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'f=\"$CLAUDE_TOOL_INPUT_FILE_PATH\"; if [[ \"$f\" =~ package\\.json$ ]]; then cd \"$(dirname $f)\" && echo \"[HOOK] package.json 已更新，正在安装依赖...\" && npm install --silent 2>&1 | tail -5; fi'"
          }
        ]
      }
    ]
  }
}
```

After Claude adds a new dependency, there's no need to run `npm install` manually — the hook takes care of it.

### Use Case 4: Logging and State Tracking

#### 9. Log token usage at the end of every conversation

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'echo \"{\\\"time\\\": \\\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\\\", \\\"session\\\": \\\"$CLAUDE_SESSION_ID\\\"}\" >> ~/.claude/session-log.jsonl 2>/dev/null; true'"
          }
        ]
      }
    ]
  }
}
```

The Stop hook fires whenever Claude finishes a response, making it a good fit for session-level bookkeeping.

#### 10. Write an audit log before each Bash command

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'echo \"[$(date +%H:%M:%S)] CMD: $CLAUDE_TOOL_INPUT_COMMAND\" >> /tmp/claude-audit.log; true'"
          }
        ]
      }
    ]
  }
}
```

Records every command Claude runs, which makes post-hoc review easy. The file goes to `/tmp` to keep the project directory clean.

## Advanced: Chaining Multiple Hooks

One matcher can carry multiple hooks, executed in order:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'f=\"$CLAUDE_TOOL_INPUT_FILE_PATH\"; [[ \"$f\" =~ \\.(ts|tsx)$ ]] && cd \"$CLAUDE_PROJECT_DIR\" && npx eslint --fix \"$f\" --quiet 2>&1 | head -10'"
          },
          {
            "type": "command",
            "command": "bash -c 'f=\"$CLAUDE_TOOL_INPUT_FILE_PATH\"; [[ \"$f\" =~ \\.(ts|tsx)$ ]] && cd \"$CLAUDE_PROJECT_DIR\" && npx tsc --noEmit 2>&1 | head -20 || true'"
          }
        ]
      }
    ]
  }
}
```

After a TypeScript file is written: ESLint first, then a tsc type check. Claude reads the output of both checks, surfacing every problem in one pass.

## Project-Level vs. Global Configuration

There are two places `settings.json` can live:

- `~/.claude/settings.json`: global, applies to all projects
- `<project root>/.claude/settings.json`: project-level, applies only to that project, and **takes higher priority**

My approach: general-purpose rules go in the global config (rm -rf interception, sensitive file protection, audit logging), and project-specific rules go in the project config (the blog's frontmatter check, the tooling site's build check).

Project-level config overrides global rules with the same name, but it isn't a full replacement — Claude Code merges the hooks from both files, so you don't need to worry about project config wiping out your global rules.

## Debugging Hooks

How do you confirm a hook is actually running once it's configured? Two ways:

**Method 1: add an echo to the hook command**

```bash
echo "[HOOK TRIGGERED] $CLAUDE_TOOL_NAME -> $CLAUDE_TOOL_INPUT_FILE_PATH" >&2
```

Anything written to stderr shows up in Claude Code's debug logs and won't be fed back to Claude as context.

**Method 2: write to a temp log file**

```bash
echo "$(date): $CLAUDE_TOOL_NAME $CLAUDE_TOOL_INPUT_FILE_PATH" >> /tmp/hooks-debug.log
```

Then watch it live with `tail -f /tmp/hooks-debug.log`.

## Limitations

A few things to keep in mind:

**Hooks are blocking.** Claude won't move on until a PostToolUse hook finishes. If your hook command is slow (say, a full test suite), it noticeably drags down the pace. Add a timeout for expensive operations:

```bash
timeout 10 npx eslint --fix "$f" || true
```

**A PreToolUse block isn't an absolute ban.** After receiving the interception message, Claude usually retries or finds another way rather than giving up entirely. If you want to truly forbid a category of operations, you also need explicit instructions in CLAUDE.md or the system prompt.

**Hooks can't access Claude's internal state.** All you get is the tool name, file path, and command string — not the conversation contents or Claude's reasoning.

## My Current Setup

For reference, here's the full configuration I'm actually running right now:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'cmd=\"$CLAUDE_TOOL_INPUT_COMMAND\"; if echo \"$cmd\" | grep -qE \"rm -rf|rm -r \"; then echo \"[BLOCKED] rm -rf 已拦截，请手动执行\"; exit 1; fi; if echo \"$cmd\" | grep -qE \"git push.*(main|master)|git push --force\"; then echo \"[BLOCKED] 不允许直接推送 main 或强制推送\"; exit 1; fi'"
          }
        ]
      },
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'f=\"$CLAUDE_TOOL_INPUT_FILE_PATH\"; if [[ \"$f\" =~ (\\.env|\\.env\\.local)$ ]]; then echo \"[BLOCKED] 拒绝写入 .env 文件\"; exit 1; fi'"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'f=\"$CLAUDE_TOOL_INPUT_FILE_PATH\"; if [[ \"$f\" =~ \\.(ts|tsx|js|jsx)$ ]]; then cd \"$CLAUDE_PROJECT_DIR\" && timeout 8 npx eslint --fix \"$f\" --quiet 2>&1 | head -15; fi'"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'echo \"[$(date +%T)] session=$CLAUDE_SESSION_ID\" >> ~/.claude/activity.log 2>/dev/null; true'"
          }
        ]
      }
    ]
  }
}
```

---

After a few months of using them, here's my takeaway: Hooks aren't some magic feature — they just automate what you used to do by hand. But the benefit is concrete and real: when Claude finishes writing code, I no longer have to ask "any lint errors?" It sees them and fixes them on its own. Automating these small feedback loops is what actually moves the needle on day-to-day productivity.

**Further reading**:
- [Hermes Agent in Practice: Embedding an AI Assistant into Your Development Workflow](/en/posts/blog122_hermes-agent-dev-workflow/) - Another angle: using Hermes Agent to handle work around the development process
- [Hermes Agent Review: OpenClaw's Successor, a Multi-Platform AI Assistant with a Built-In Learning Loop](/en/posts/blog117_hermes-agent-guide/) - Hermes vs OpenClaw vs building your own
- [After OpenClaw Shut Down: Rebuilding a Multi-Agent Automation Setup with the Claude Code CLI](/en/posts/blog115_openclaw-to-claude-code-migration/) - Claude Code applied deeply to automation scenarios
