---
author: Gerald Chen
pubDatetime: 2026-04-09T22:00:00+08:00
title: "After OpenClaw Shut Down: Rebuilding a Multi-Agent Automation Setup with the Claude Code CLI"
slug: blog115_openclaw-to-claude-code-migration
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI Agent
  - Claude Code
  - 自动化
description: "When the third-party AI agent framework OpenClaw shut down, I rebuilt the entire multi-agent automation experience with the Claude Code CLI: Telegram bots, scheduled tasks, session persistence — plus every pitfall I hit along the way."
---

## Waking Up to Seven Dead Agents

In April 2026, Anthropic changed its subscription policy: third-party applications could no longer consume Claude subscription quota directly. That change was a death sentence for OpenClaw.

OpenClaw was the multi-agent CLI framework I'd been running for over two months. Seven agents — Xiami (my main assistant), a blog assistant, a tools assistant, a fiction assistant, a translation assistant, a trading bot, and DG (a dev assistant) — each bound to its own Telegram bot, with its own persona, long-term memory, and scheduled tasks. The whole workflow had become part of my daily routine, from blog writing to code review.

The policy changed, OpenClaw could no longer call Claude, and everything stopped.

I didn't dwell on it — I started migrating. This post documents the whole process: the technical approach, the core code, the pitfalls, and a few reflections once everything was running again.

## What the Old Architecture Looked Like

OpenClaw's core design was "workspace as agent." Each agent had a directory containing SOUL.md (persona definition), TOOLS.md (tool configuration), AGENTS.md (workspace rules), MEMORY.md (long-term memory), and so on. On startup, the framework read these files and assembled them into a system prompt, paired with a built-in Telegram bot and a cron scheduler.

It was pleasant to use: `/new` reset the session, `/list` showed scheduled tasks, and sending a message just worked as conversation. Agents remembered context, scheduled tasks fired on time, and results were pushed to Telegram.

Now the LLM call path was gone, and everything else — multiple bots, cron, session persistence — had to be rebuilt by hand.

## The New Approach: claude -p + Node.js

The core idea is simple: replace OpenClaw's LLM calls with `claude -p` (print mode, non-interactive invocation), and write a Node.js script as the Telegram bridge, one independent process per agent.

The directory layout is almost identical to OpenClaw's, with a few new directories:

```text
~/ai/agents/
├── bot.js              # Shared bot service (used by all agents)
├── start.sh            # One-command startup for all agents
├── logs/               # Process logs
├── main/               # Xiami
│   ├── SOUL.md         # Persona definition
│   ├── USER.md         # User info
│   ├── TOOLS.md        # Tool configuration
│   ├── MEMORY.md       # Long-term memory
│   ├── crons/          # Scheduled tasks
│   │   └── system-check.md
│   └── sessions/       # Session persistence
│       └── session.json
├── blog/
│   ├── SOUL.md  TOOLS.md  MEMORY.md
│   └── crons/
│       └── daily-article.md
└── ...(remaining agents follow the same structure)
```

The heart of the whole setup is a single `bot.js` file of roughly 500 lines.

## bot.js: Bridging Telegram and Claude

`bot.js` distinguishes agents via environment variables:

```javascript
const AGENT_NAME = process.env.AGENT_NAME;   // "blog"、"main" 等
const BOT_TOKEN  = process.env.BOT_TOKEN;    // Telegram Bot Token
const AGENT_DIR  = process.env.HOME + "/ai/agents/" + AGENT_NAME;
```

On startup it automatically loads every uppercase-named `.md` file in the agent directory and merges them into the system prompt:

```javascript
// 优先加载白名单文件（SOUL.md、USER.md、TOOLS.md、AGENTS.md）
// 再加载其他全大写命名文件（如 DEPLOY_RULES.md），跳过 MEMORY.md 等数据文件
const PROMPT_FILES = ["SOUL.md", "USER.md", "TOOLS.md", "AGENTS.md"];
const skip = new Set([...PROMPT_FILES, "MEMORY.md", "HEARTBEAT.md"]);

var parts = [];
for (var pf of PROMPT_FILES) {
  if (fs.existsSync(path.join(agentDir, pf))) {
    parts.push(fs.readFileSync(path.join(agentDir, pf), "utf-8"));
  }
}
// 额外加载全大写+下划线命名的 md（配置文件），跳过小写开头的（数据文件）
var extras = fs.readdirSync(agentDir).filter(f =>
  f.endsWith(".md") && !skip.has(f) && /^[A-Z][A-Z0-9_-]+\.md$/.test(f)
);
for (var ef of extras) {
  parts.push(fs.readFileSync(path.join(agentDir, ef), "utf-8"));
}
var SYSTEM_PROMPT = parts.join("\n\n---\n\n");
```

A lesson learned here: initially I loaded every `.md` file in the directory, which stuffed memory files and logs into the prompt — the system prompt blew past 100KB and Claude flat-out refused it. I switched to a whitelist plus an all-uppercase naming rule; files starting with lowercase letters (data files) and MEMORY.md and friends are skipped.

### Session Persistence

OpenClaw maintained conversation context automatically; after moving to `claude -p`, that's manual. `claude -p` supports `--resume <session-id>` to continue an existing session — the trick is getting hold of the session_id.

handleChat always uses `--output-format stream-json --verbose`, whether it's the first turn or a follow-up. The session_id is extracted from the event stream, not by switching output formats:

```javascript
async function handleChat(chatId, text) {
  var session = getOrCreateSession(chatId);
  var isFirstTurn = session.turns === 0 || !session.id;

  // 始终用 stream-json，无论第几轮
  var args = ["-p", text, "--model", CLAUDE_MODEL,
    "--dangerously-skip-permissions",
    "--output-format", "stream-json", "--verbose"];

  if (!isFirstTurn) {
    // 后续轮：续接已有 session
    args.push("--resume", session.id);
  } else {
    // 第一轮：传 system prompt
    if (SYSTEM_PROMPT) args.push("--system-prompt", SYSTEM_PROMPT);
  }

  var streamResult = await runClaudeStream(chatId, statusId, startTime, args);

  // 从流中提取 session_id（每个事件行都可能携带）
  if (streamResult.sessionId) session.id = streamResult.sessionId;
  session.turns++;
  saveSession(chatId);
}
```

Extracting the session_id from the stream:

```javascript
var evt = JSON.parse(line);
if (evt.session_id && !result.sessionId) {
  result.sessionId = evt.session_id;  // 从任意事件行拿 session_id
}
```

The `/new` command calls `resetSession`, which generates a fresh local UUID; the next message starts a brand-new session.

### Telegram Image and File Support

OpenClaw natively supported sending images in Telegram, and Claude could see them directly. After the migration, `claude -p` is a plain-text interface — so what about images?

The approach: the Telegram Bot API provides a file download endpoint. When an image arrives, download it locally first, then tell Claude the file path — Claude Code itself is multimodal and can read local image files.

```javascript
// 收到图片时
if (msg.photo && msg.photo.length > 0) {
  var photo = msg.photo[msg.photo.length - 1]; // 取最大尺寸
  var filePath = await downloadTgFile(photo.file_id);
  text += "\n\n[图片已保存到: " + filePath + "]\n请查看这张图片并回复。";
}

async function downloadTgFile(fileId, fileName) {
  // 1. 通过 getFile API 拿到文件在 Telegram 服务器上的路径
  var fileInfo = await tgApi("getFile", { file_id: fileId });
  var tgPath = fileInfo.result.file_path;
  // 2. 下载到本地 downloads/ 目录
  var localPath = path.join(DOWNLOAD_DIR, fileName || Date.now() + path.extname(tgPath));
  var url = "https://api.telegram.org/file/bot" + BOT_TOKEN + "/" + tgPath;
  // ... https.get 下载 ...
  return localPath;
}
```

Documents and files are handled the same way. In practice it works well: send a screenshot for the agent to analyze, or a design mockup for it to turn into code — both work fine.

### Real-Time Progress Updates

While OpenClaw executed tasks, Telegram showed live activity like "reading file" or "running command." After the migration, my first version just sent a single "🤔 Thinking..." message and waited until Claude finished. Complex tasks can run for several minutes, leaving the user with no idea what's happening — it looked frozen.

The fix is `--output-format stream-json --verbose`. This combination makes `claude -p` emit every intermediate step as a JSON event stream, including which tools it called and with what arguments.

Parse the event stream, extract tool-call info, and edit the Telegram message in real time:

```javascript
// 流式解析 claude 输出
proc.stdout.on("data", function(chunk) {
  // 按行解析 JSON 事件
  for (var line of lines) {
    var evt = JSON.parse(line);
    // 工具调用事件 → 提取动作描述
    if (evt.type === "assistant" && evt.message.content) {
      var toolUse = evt.message.content.find(c => c.type === "tool_use");
      if (toolUse) {
        // "📄 读取文件 bot.js"、"💻 执行命令 npm run build"
        var action = describeToolUse(toolUse);
        updateTelegramStatus(action);
      }
    }
    // 最终结果
    if (evt.type === "result") {
      finalResult = evt.result;
    }
  }
});
```

The result is a Telegram message that updates live:

```
✓ 📄 Read file bot.js
✓ 🔎 Search content handleChat
▸ ✏️ Edit file bot.js
⏱ 23s
```

Completed actions get a ✓, the currently running one gets a ▸, and the elapsed time is always shown at the bottom. Once Claude finishes, the progress message is deleted and the final reply is sent.

### Scheduled Tasks

Each cron task is a markdown file: scheduling info in YAML frontmatter, the prompt as the body:

```markdown
---
name: 每日工具文章
schedule: "0 6 * * *"
timezone: Asia/Shanghai
model: claude-sonnet-4-6
timeout: 600
budget: 0.5
---

为工具站的工具撰写博客文章。
读取工具列表，选择一个还没写过的工具，按规范写一篇 1500-2500 字中文技术博客。
```

`bot.js` loads `crons/*.md` at startup and runs a simple built-in scheduler that checks every minute. Timezone conversion uses `toLocaleString`; each task is evaluated against its own timezone field, independent of the system timezone:

```javascript
// 获取指定时区的当前时间
function getNowInTimezone(tz) {
  var str = new Date().toLocaleString("en-US", { timeZone: tz });
  return new Date(str);
}

// fieldMatch 处理 "*"、"5"、"1-5"、"*/2" 等 cron 字段格式
function cronMatch(expr, now) {
  const [min, hour, day, mon, dow] = expr.split(/\s+/);
  return fieldMatch(min,  now.getMinutes())
      && fieldMatch(hour, now.getHours())
      && fieldMatch(day,  now.getDate())
      && fieldMatch(mon,  now.getMonth() + 1)
      && fieldMatch(dow,  now.getDay());
}

setInterval(() => {
  for (const task of cronJobs) {
    const now = getNowInTimezone(task.timezone);  // 按任务自己的时区
    if (cronMatch(task.schedule, now)) {
      runCronJob(task);
    }
  }
}, 60_000);
```

When a task finishes, the result is pushed to Telegram — the same experience as OpenClaw.

### Startup Script

A single `start.sh` brings up all agents:

```bash
#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
source "$HOME/ai/.bot-tokens"  # 读取 TOKEN_main、TOKEN_blog 等变量

start_bot() {
  local name="$1" token="$2" botname="$3" port="$4"
  BOT_TOKEN="$token" BOT_NAME="$botname" HEALTH_PORT="$port" AGENT_NAME="$name" \
    nohup node "$DIR/bot.js" \
    >> "$DIR/logs/bot-${name}.stdout.log" \
    2>> "$DIR/logs/bot-${name}.stderr.log" &
  echo "Started $name (pid $!)"
}

start_bot main  "$TOKEN_main"  "虾米"    3880
start_bot blog  "$TOKEN_blog"  "博客助手" 3881
start_bot tools "$TOKEN_tools" "工具助手" 3882
```

## Pitfalls Along the Way

### Pitfall 1: --resume requires a Claude-assigned session_id

I initially assumed I could generate a fixed UUID locally and pass it to `--resume <local-UUID>` every time, reusing it across restarts. Nope. The session_id passed to `--resume` must be one assigned by Claude's server side; a locally generated UUID gets you "No conversation found".

The correct approach: make the first turn in `stream-json` mode, read the `session_id` field from the stream events and persist it, then use `--resume <server-uuid>` for subsequent turns.

I also tried `--continue` (resume the most recent session) — its behavior is unpredictable, and with multiple agents running concurrently it easily picks up the wrong session. `--resume <uuid>` is the most reliable way to continue a conversation.

### Pitfall 2: macOS Keychain issues

Claude Code stores its OAuth token in the macOS Keychain. Background processes started via launchd can't access the Keychain, so the `claude` command fails authentication.

The workaround: start with nohup from a current interactive shell (`bash start.sh`). The processes inherit the shell's Keychain access and authentication works. The downside is having to rerun `start.sh` after every Mac restart.

### Pitfall 3: --dangerously-skip-permissions is mandatory

When `claude -p` hits an operation that needs permission confirmation (reading/writing files, running commands, etc.), it shows an interactive prompt — which in non-interactive mode just hangs or fails.

For batch automation you must add `--dangerously-skip-permissions`, which skips all permission prompts. The flag name is scary, but for trusted automation tasks it's the right choice.

### Pitfall 4: System prompt size

Over time an agent directory accumulates a pile of `.md` files — memory fragments, task records, execution logs. Loading everything blew past the prompt size limit fast.

The rule became: load whitelist files first (`SOUL.md`, `TOOLS.md`, `USER.md`, `AGENTS.md`), then other all-uppercase-named files; explicitly skip data files like `MEMORY.md`, and never load anything with a lowercase name.

### Pitfall 5: bash 3.2 compatibility

macOS ships with bash 3.2 (Apple never upgraded it because of GPL licensing), which doesn't support `declare -A` (associative arrays). `start.sh` used an associative array for the token mapping and crashed immediately.

Use a `case` statement instead, or just use zsh:

```bash
# bash 3.2 不支持这种写法
declare -A TOKENS
TOKENS["main"]="xxx"

# 改用 case
get_token() {
  case "$1" in
    main)  echo "<your-main-bot-token>" ;;
    blog)  echo "<your-blog-bot-token>" ;;
  esac
}
```

### Pitfall 6: Telegram polling conflicts

During the migration, OpenClaw and the new bot.js ran side by side for a while. Two processes polling with the same bot token made Telegram return conflict errors, and messages went to the wrong place.

Stop OpenClaw first, then start bot.js — they cannot run in parallel.

### Pitfall 7: Process supervision and silent crashes

After a day of running, some bots stopped replying. The logs showed messages being received, but no Claude invocation logs afterwards. stderr was full of `ECONNRESET` and `ETIMEDOUT`.

The causes were layered:

1. **No uncaught exception handling.** Node.js's default behavior on an uncaught exception is to exit the process. Exceptions from Telegram network blips weren't caught, and the process quietly died.
2. **No supervision in `start.sh`.** After nohup launched the process, nothing watched it; if it died, nothing restarted it.
3. **No retries on Telegram API calls.** After the network recovered, previously failed message sends were never retried — the user saw "Thinking..." and never got a reply.

The fixes:

```javascript
// 全局异常捕获，防止进程退出
process.on("uncaughtException", (err) => {
  console.error("[FATAL] uncaughtException:", err.message);
});
process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] unhandledRejection:", reason);
});
```

Telegram API calls got 3 retries with exponential backoff. `start.sh` gained a watchdog mode (`./start.sh watch`) that checks each bot's health endpoint every 30 seconds and restarts anything that died.

### Pitfall 8: Concurrent messages corrupting sessions

Send several messages in quick succession and bot.js spawns multiple `claude -p` processes in parallel, all trying to `--resume` the same session_id. The Claude CLI doesn't support concurrent calls on the same session, so the second one errors out.

The fix is simple — a per-chatId Promise queue that serializes message handling:

```javascript
const chatQueues = new Map();
function enqueueChat(chatId, fn) {
  if (!chatQueues.has(chatId)) chatQueues.set(chatId, Promise.resolve());
  var p = chatQueues.get(chatId).then(fn);
  chatQueues.set(chatId, p);
  return p;
}
```

### Pitfall 9: Secrets almost committed to Git

Config files contained server passwords, IPs, and Telegram bot tokens in plain text. Before `git push` I ran a security scan and found 7 bot tokens hardcoded in `start.sh`, a server password in SOUL.md, and a real IP in TOOLS.md.

The fix: move tokens into a `.bot-tokens` file and server info into `.server-config`, add both to `.gitignore`, and have the code source these files:

```bash
# .bot-tokens（不提交）
TOKEN_main="xxx"
TOKEN_blog="xxx"

# start.sh（提交）
source "$HOME/ai/.bot-tokens"
start_bot main "$TOKEN_main" "虾米" 3880
```

This pitfall looks amateurish, but in the "just get the system running" mindset of a migration it's very easy to miss.

### Pitfall 10: Silent failures from expired sessions

After a few hours, all bots started reporting "No conversation found with session ID: xxx". It turns out Claude Code sessions have a server-side lifecycle: after prolonged inactivity or a server restart, the old session_id becomes invalid. The bot kept faithfully passing the locally stored session_id to `--resume`, failing every time.

This problem didn't exist in the OpenClaw days, because OpenClaw managed context itself. With `claude -p`, the session lifecycle lives entirely on Claude's server side, beyond local control.

The fix is automatic fallback: on detecting a "No conversation found" error, clear the stale session and retry with a fresh one. The user loses prior conversation context, but at least nothing hangs:

```javascript
var streamResult = await runClaudeStream(chatId, statusId, startTime, args);

// session 过期时自动重置重试
if (streamResult.error && streamResult.error.includes("No conversation found") && !isFirstTurn) {
  await editMsg(chatId, statusId, "🔄 会话已过期，正在重新开始...");
  resetSession(chatId);
  isFirstTurn = true;
  // 重新构建参数，开新 session
  args = ["-p", text, "--model", CLAUDE_MODEL,
    "--dangerously-skip-permissions", "--output-format", "stream-json", "--verbose"];
  if (SYSTEM_PROMPT) args.push("--system-prompt", SYSTEM_PROMPT);
  streamResult = await runClaudeStream(chatId, statusId, startTime, args);
}
```

The lesson: wherever you depend on external state, plan for that state disappearing.

## A Cloud-Side Complement: Remote Triggers

Local agents require the Mac to stay on, which suits tasks that need local file access (writing code, managing the blog, etc.). For lightweight search-and-analysis tasks, Claude Code's Remote Triggers run them in Anthropic's cloud without touching local resources.

Remote Triggers is Claude Code's managed scheduling feature: create one with the `/schedule` command, specifying a cron expression and the prompt to run. At the scheduled time, an Anthropic server spins up a Claude Code session to execute the task, and the results can be pushed to Telegram or stored in the cloud. The difference from local `setInterval` scheduling: it doesn't depend on the local machine being alive, which makes it ideal for tasks that don't need local file permissions.

So far I've moved two tasks to Remote Triggers — blog proposal generation (Mon/Wed/Fri 10:00) and tech trend monitoring (Tue/Thu/Sat 09:00) — lightening the load on the local agents. For setup, see the `/schedule` command in the official Claude Code docs.

## Reflections After the Migration

The whole migration took two days, most of it spent debugging the pitfalls above. The final working setup isn't complicated — a 600-line JS file, a shell script, and one config directory per agent.

The experience is nearly identical to OpenClaw: send a message in Telegram, the agent replies, scheduled tasks push notifications on time, `/new` resets the context. Every config file migrated from the OpenClaw workspaces (SOUL.md, TOOLS.md, etc.) was reused without modification.

One thing is worse than before: with the nohup approach, every Mac restart requires manually running `start.sh` (though with watchdog mode I at least don't worry about crashes mid-run). OpenClaw supported auto-start as a system service, and I haven't found a good replacement yet (launchd was ruled out because of the Keychain issue).

The whole directory lives in git: on a new machine it's just clone, configure `.bot-tokens` and `.server-config`, and run `start.sh`. Migration cost is minimal.

---
