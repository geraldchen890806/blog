---
author: 陈广亮
pubDatetime: 2026-04-13T18:00:00+08:00
title: Claude Code Hooks 深度指南：让 AI 编程工具真正融入你的工作流
slug: blog119_claude-code-hooks-guide
featured: true
draft: false
reviewed: true
approved: true
tags:
  - Claude Code
  - AI
  - 自动化
  - 工具指南
  - 开发效率
description: Claude Code Hooks 是迄今为止最被低估的 AI 编程特性。本文从三类 Hook 的触发机制讲起，结合博客 Agent、工具站等真实项目中的 10+ 个配置案例，讲清楚怎么用 Hooks 让 Claude Code 真正融入你的工作流。
---

我用 Claude Code 大概四个多月了，前三个月基本上没碰 Hooks。不是不知道，是觉得没必要——能写代码就够了，何必搞这些额外的配置。

直到某天 Claude 帮我写完一段代码提交之后，我发现 ESLint 报了七个错，得再叫它来修。这件事情来回了三次，每次都是"写完 → 发现格式问题 → 重新调"的循环。我意识到：如果在每次写完文件之后自动跑 lint，这个循环根本不需要存在。

Hooks 就是干这个的。

## Hooks 是什么

Claude Code Hooks 是在工具调用前后触发自定义 shell 命令的机制。简单说：Claude 调用某个工具（比如写文件、执行命令），你可以在这个动作发生前或发生后，自动跑一段脚本。

配置文件是 `~/.claude/settings.json`（全局）或项目根目录的 `.claude/settings.json`（项目级）。

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

三类事件：

| 事件 | 触发时机 |
|------|---------|
| `PreToolUse` | Claude 即将调用某工具，**执行前** |
| `PostToolUse` | Claude 已调用某工具，**执行后** |
| `Stop` | Claude 完成整个回复，准备停止 |

`matcher` 是工具名称，支持精确匹配（`"Write"`）和正则（`"Bash|Edit"`）。工具名对应 Claude Code 内置工具，常用的有：`Write`（写文件）、`Edit`（编辑文件）、`Bash`（执行命令）、`Read`（读文件）、`Glob`（文件搜索）、`Grep`（内容搜索）。

## 环境变量

Hooks 脚本里有几个特别有用的内置变量：

| 变量 | 含义 |
|------|------|
| `CLAUDE_PROJECT_DIR` | 当前项目根目录 |
| `CLAUDE_TOOL_INPUT_FILE_PATH` | Write/Edit 工具操作的文件路径 |
| `CLAUDE_TOOL_INPUT_COMMAND` | Bash 工具将执行的命令 |
| `CLAUDE_TOOL_NAME` | 当前触发的工具名 |
| `CLAUDE_SESSION_ID` | 当前会话 ID |

有了这些变量，脚本就能精确知道 Claude 在操作哪个文件、执行什么命令，而不是对所有文件一刀切。

## 退出码的含义

这一点文档里藏得很深，但非常重要：

- **PreToolUse 钩子**：返回非零退出码会**阻止**工具调用。Claude 会收到你在 stdout 输出的内容作为错误信息，然后自行处理（通常是调整后重试）。
- **PostToolUse / Stop 钩子**：退出码被忽略，只看 stdout 输出——Claude 会把它当作额外上下文读进来。

这意味着：PreToolUse 是"拦截器"，PostToolUse 是"通知器"。

## 10 个实用配置案例

下面是我在博客 Agent、工具站项目和日常开发中实际在用的配置，按使用场景分组。

### 场景一：代码质量自动保障

#### 1. 写完文件自动 ESLint + Prettier

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

只对 JS/TS 文件触发，避免对 markdown、json 等文件无谓地跑 lint。`head -20` 控制输出行数，防止 Claude 被一大堆 lint 报告淹没。

#### 2. Python 项目自动 Black 格式化

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

静默运行（`--quiet`），只在出错时才有输出。

#### 3. 写完测试文件自动跑测试

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

只对测试文件触发，写完测试就自动跑一遍，Claude 能立刻看到失败原因并修正。

### 场景二：危险操作拦截

这是 PreToolUse 最有价值的用途：在危险命令执行之前拦截，强制人工确认或直接阻止。

#### 4. 拦截 rm -rf

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

返回 exit 1，Claude 会收到错误信息，一般会换一种方式处理（比如逐个删除文件或者问你确认）。

#### 5. 阻止向生产环境推送

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

这个规则对我来说是必须的。Claude 有时候会直接 `git push origin main`，这个 hook 让它只能走 PR 流程。

#### 6. 敏感文件保护

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

防止 Claude 意外修改 `.env` 或凭证文件。这个是我在博客 Agent 里加的，因为有时候 Claude 会"好心"修改配置文件。

### 场景三：项目维护自动化

#### 7. 写完 Astro 文章自动生成摘要

这个是我博客项目专属的 hook。每次 Claude 写完博客 markdown 文件，自动用 Claude Code 本身再跑一次，提取 description 字段。

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

`check_frontmatter.py` 会检查 frontmatter 是否完整（有没有 description、tags、pubDatetime），缺失的字段以警告形式输出给 Claude，Claude 会补全。

#### 8. 修改 package.json 后自动安装依赖

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

Claude 添加新依赖后不需要再手动 `npm install`，hook 自动处理。

### 场景四：日志和状态记录

#### 9. 每次对话结束记录 token 消耗

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

Stop 钩子在每次 Claude 完成回复时触发，适合做会话级别的统计记录。

#### 10. Bash 命令执行前记录审计日志

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

记录 Claude 执行的所有命令，方便事后 review。文件写到 `/tmp` 避免污染项目目录。

## 进阶：组合多个 Hook

一个 matcher 可以挂多个 hook，按顺序依次执行：

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

写完 TypeScript 文件：先 ESLint，再 tsc 类型检查。两个检查的结果都会被 Claude 读到，一次把所有问题暴露出来。

## 项目级 vs 全局配置

有两个地方可以放 `settings.json`：

- `~/.claude/settings.json`：全局，对所有项目生效
- `<项目根目录>/.claude/settings.json`：项目级，只对该项目生效，**优先级更高**

我的做法：全局配置放通用规则（rm -rf 拦截、敏感文件保护、审计日志），项目级配置放项目专属规则（博客的 frontmatter 检查、工具站的构建检查）。

项目级配置会覆盖全局同名规则，但两者不是完全替换关系——Claude Code 会合并两个文件的 hooks 配置，所以不用担心全局规则被项目配置覆盖掉。

## 调试 Hooks

配置完后怎么确认 hook 在跑？两个方法：

**方法一：在 hook 命令里加 echo**

```bash
echo "[HOOK TRIGGERED] $CLAUDE_TOOL_NAME -> $CLAUDE_TOOL_INPUT_FILE_PATH" >&2
```

写到 stderr 的内容会出现在 Claude Code 的 debug 日志里，不会被 Claude 当成上下文读入。

**方法二：写临时日志文件**

```bash
echo "$(date): $CLAUDE_TOOL_NAME $CLAUDE_TOOL_INPUT_FILE_PATH" >> /tmp/hooks-debug.log
```

然后 `tail -f /tmp/hooks-debug.log` 实时监控。

## 使用边界

几点需要注意：

**Hook 是阻塞的。** PostToolUse hook 跑完之前，Claude 不会继续下一步。如果你的 hook 命令很慢（比如跑完整的测试套件），会明显拖慢节奏。建议耗时操作加超时：

```bash
timeout 10 npx eslint --fix "$f" || true
```

**PreToolUse 拦截不等于完全阻止。** Claude 收到拦截信息后通常会重试或换方式，而不是完全放弃。如果你想彻底禁止某类操作，还需要在 CLAUDE.md 或 system prompt 里加明确指令。

**Hooks 不能访问 Claude 的内部状态。** 你只能拿到工具名、文件路径、命令字符串，拿不到对话内容或 Claude 的推理过程。

## 我现在的实际配置

分享一下我目前实际在跑的完整配置，供参考：

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

用了几个月下来，感受是：Hooks 不是什么神奇功能，就是把原来需要手动做的事情自动化。但好处是实实在在的——Claude 写完代码之后不需要我再问"有没有 lint 错误"，它自己就能看到并修复。这种小反馈循环的自动化，才是提升日常效率的关键。
