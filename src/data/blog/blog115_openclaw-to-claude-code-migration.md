---
author: 陈广亮
pubDatetime: 2026-04-09T22:00:00+08:00
title: OpenClaw 停服之后——用 Claude Code CLI 重建多 Agent 自动化体验
slug: blog115_openclaw-to-claude-code-migration
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI Agent
  - Claude Code
  - 自动化
description: 第三方 AI Agent 框架 OpenClaw 停服后，记录如何用 Claude Code CLI 重建完整的多 Agent 自动化体验：Telegram Bot、定时任务、会话持久化，以及迁移过程踩到的那些坑。
---

## 一觉醒来，七个 Agent 全挂了

2026年4月，Anthropic 修改了订阅政策，第三方应用不能再直接使用 Claude 订阅额度。这条改动直接宣判了 OpenClaw 的死刑。

OpenClaw 是我用了将近一年的多 Agent CLI 框架。七个 Agent——虾米（主助手）、博客助手、工具助手、小说助手、翻译助手、交易机器人、DG（开发助手）——每个绑定一个 Telegram Bot，有独立的角色设定、长期记忆和定时任务。这套工作流已经深度融入日常，从博客写作到代码 review，几乎每天都在用。

政策改了，OpenClaw 无法继续调用 Claude，全部中断。

没有多想，直接开始迁移。这篇文章记录整个过程——技术方案、核心代码、踩过的坑，以及最终跑通后的一些感受。

## 原来的架构是什么样的

OpenClaw 的核心设计是 "workspace 即 Agent"。每个 Agent 有一个目录，里面放 SOUL.md（角色定义）、TOOLS.md（工具配置）、AGENTS.md（工作空间规则）、MEMORY.md（长期记忆）等文件。框架启动时读取这些文件拼成 system prompt，再配上内置的 Telegram Bot 和 Cron 调度器。

用起来很顺手：`/new` 重置会话，`/list` 查看定时任务，直接发消息就是对话。Agent 会记住上下文，定时任务到点自动跑，结果推送到 Telegram。

现在 LLM 调用这条路断了，其余的——多 Bot、Cron、会话持久化——都需要自己实现。

## 新方案：claude -p + Node.js

核心思路很简单：用 `claude -p`（print mode，非交互调用）替代 OpenClaw 的 LLM 调用，写一个 Node.js 脚本做 Telegram 桥接，每个 Agent 一个独立进程。

目录结构几乎和 OpenClaw 一样，加了几个新目录：

```text
~/ai/agents/
├── bot.js              # 通用 Bot 服务（所有 Agent 共用）
├── start.sh            # 一键启动所有 Agent
├── logs/               # 进程日志
├── main/               # 虾米
│   ├── SOUL.md         # 角色定义
│   ├── USER.md         # 用户信息
│   ├── TOOLS.md        # 工具配置
│   ├── MEMORY.md       # 长期记忆
│   ├── crons/          # 定时任务
│   │   └── system-check.md
│   └── sessions/       # 会话持久化
│       └── session.json
├── blog/
│   ├── SOUL.md  TOOLS.md  MEMORY.md
│   └── crons/
│       └── daily-article.md
└── ...（其余 Agent 同样结构）
```

整个方案的核心是一个约 500 行的 `bot.js` 文件。

## bot.js：桥接 Telegram 和 Claude

`bot.js` 通过环境变量区分 Agent：

```javascript
const AGENT_NAME = process.env.AGENT_NAME;   // "blog"、"main" 等
const BOT_TOKEN  = process.env.BOT_TOKEN;    // Telegram Bot Token
const AGENT_DIR  = process.env.HOME + "/ai/agents/" + AGENT_NAME;
```

启动时自动加载 Agent 目录下所有大写命名的 `.md` 文件，合并为 system prompt：

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

这里有个教训：最初是加载目录下所有 `.md` 文件，结果把记忆文件、日志文件全塞进去，system prompt 超过 100KB，Claude 直接拒绝了。后来改为白名单 + 全大写命名规则，小写开头的文件（数据文件）和 MEMORY.md 等跳过。

### 会话持久化

OpenClaw 会自动维护对话上下文，迁移到 `claude -p` 后需要手动处理。`claude -p` 支持 `--resume <session-id>` 续接已有会话，关键是拿到 session_id。

整个 handleChat 始终使用 `--output-format stream-json --verbose`，无论是第一轮还是续接轮次。session_id 从事件流中提取，不是通过切换输出格式来获取：

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

流中提取 session_id 的逻辑：

```javascript
var evt = JSON.parse(line);
if (evt.session_id && !result.sessionId) {
  result.sessionId = evt.session_id;  // 从任意事件行拿 session_id
}
```

`/new` 命令调用 `resetSession`，生成新的本地 UUID，下次对话重新建 session。

### Telegram 图片和文件支持

OpenClaw 原生支持在 Telegram 里发图片，Claude 能直接看到。迁移后 `claude -p` 是纯文本接口，图片怎么办？

思路是：Telegram Bot API 提供了文件下载接口，收到图片后先下载到本地，再把文件路径告诉 Claude——因为 Claude Code 本身是多模态的，它能读取本地图片文件。

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

文档/文件也一样处理。实测效果不错，发一张截图让 Agent 分析、发一张设计稿让它写代码，都能正常工作。

### 实时进度推送

OpenClaw 执行任务时 Telegram 里能看到实时动态，比如"正在读取文件"、"正在执行命令"。迁移后最初只发一条"🤔 思考中..."，然后等 Claude 跑完才回复。任务复杂时可能要跑几分钟，用户完全不知道它在干什么，还以为卡死了。

解决方案是用 `--output-format stream-json --verbose`。这个组合让 `claude -p` 以 JSON 事件流的方式输出每一步的中间过程，包括调用了什么工具、传了什么参数。

解析事件流，提取工具调用信息，实时编辑 Telegram 消息：

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

效果是 Telegram 消息实时更新：

```
✓ 📄 读取文件 bot.js
✓ 🔎 搜索内容 handleChat
▸ ✏️ 编辑文件 bot.js
⏱ 23s
```

已完成的动作打 ✓，当前正在执行的打 ▸，底部始终显示已用时间。Claude 跑完后删掉进度消息，发送最终回复。

### 定时任务

每个 Cron 任务是一个 markdown 文件，用 YAML frontmatter 定义调度信息，正文是 prompt：

```markdown
---
name: 每日工具文章
schedule: "0 6 * * *"
timezone: Asia/Shanghai
model: claude-sonnet-4-6
timeout: 600
budget: 0.5
---

为 anyfreetools.com 的工具撰写博客文章。
读取工具列表，选择一个还没写过的工具，按规范写一篇 1500-2500 字中文技术博客。
```

`bot.js` 启动时加载 `crons/*.md`，内置一个简易调度器每分钟检查。时区转换用 `toLocaleString` 处理，每个任务按自己的 timezone 字段计算，不依赖系统时区：

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

任务执行完把结果推送到 Telegram，和 OpenClaw 的体验一致。

### 启动脚本

一个 `start.sh` 启动所有 Agent：

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

## 踩坑记录

### 坑1：--resume 必须用 Claude 分配的 session_id

最初以为可以本地生成一个固定 UUID，每次用 `--resume <本地UUID>` 续接，重启后也能复用。实测不行，`--resume` 传入的 session_id 必须是 Claude 服务端分配的，传一个本地生成的 UUID 会报 "No conversation found"。

正确做法：第一轮用 `stream-json` 模式调用，从流事件中读 `session_id` 字段存下来，后续用 `--resume <服务端uuid>` 续接。

`--continue`（续接最近一次 session）也试过，行为不可控，多 agent 并发时容易串到别的 session。`--resume <uuid>` 是最可靠的续接方式。

### 坑2：macOS Keychain 问题

Claude Code 的 OAuth token 存在 macOS Keychain 里。用 launchd 启动的后台进程无法访问 Keychain，`claude` 命令会报认证失败。

解决方案：用 nohup 从当前交互 Shell 启动（`bash start.sh`），进程继承当前 Shell 的 Keychain 访问权限，认证正常。每次重启 Mac 后需要重新跑一次 `start.sh`。

### 坑3：--dangerously-skip-permissions 是必须的

`claude -p` 遇到需要权限确认的操作（读写文件、执行命令等）会弹出交互提示，非交互模式下直接挂起或失败。

批量自动化场景必须加 `--dangerously-skip-permissions`，表示跳过所有权限弹窗。这个参数名字很吓人，但对于可信任的自动化任务是正确的选项。

### 坑4：system prompt 大小

Agent 目录里时间久了会积累大量 `.md` 文件——记忆片段、任务记录、执行日志。最初加载所有文件，system prompt 很快就超限了。

规则改为：白名单文件（`SOUL.md`、`TOOLS.md`、`USER.md`、`AGENTS.md`）优先加载，再加载其他全大写命名文件；`MEMORY.md` 等数据文件明确跳过，小写命名文件一律不加载。

### 坑5：bash 3.2 兼容性

macOS 自带的 bash 是 3.2（因为 GPL 授权问题 Apple 一直没升级），不支持 `declare -A`（关联数组）。`start.sh` 里用关联数组存 token 映射，跑起来直接报错。

改用 `case` 语句替代，或者直接用 zsh：

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

### 坑6：Telegram polling 冲突

迁移期间，OpenClaw 和新 bot.js 同时运行了一段时间，同一个 Bot Token 两个进程都在 polling，Telegram 返回冲突错误，消息乱跑。

迁移时要先停 OpenClaw，再启动 bot.js，不能并行运行。

### 坑7：进程守护和静默崩溃

跑了一天后发现部分 bot 没有回复消息。查日志，bot 收到了消息（`[收到]`），但之后没有任何 Claude 调用日志。再看 stderr，大量 `ECONNRESET`、`ETIMEDOUT`。

原因是多层的：

1. **没有 uncaught exception 处理**。Node.js 默认行为是遇到未捕获异常直接退出进程。Telegram 网络抖动导致的异常没被 catch，进程默默挂了。
2. **`start.sh` 没有守护机制**。nohup 启动后就不管了，进程死了没人拉起。
3. **Telegram API 调用没有重试**。网络恢复后，之前失败的消息发送不会重试，用户看到"思考中…"就再也没有回复。

修复方案：

```javascript
// 全局异常捕获，防止进程退出
process.on("uncaughtException", (err) => {
  console.error("[FATAL] uncaughtException:", err.message);
});
process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] unhandledRejection:", reason);
});
```

Telegram API 调用加了 3 次重试和指数退避。`start.sh` 加了 watchdog 模式（`./start.sh watch`），每 30 秒检查一次各 bot 的健康端点，挂掉的自动重启。

### 坑8：消息并发导致 session 混乱

连续发多条消息，bot.js 会并行启动多个 `claude -p` 进程，都试图 `--resume` 同一个 session_id。Claude CLI 不支持同一 session 的并发调用，第二个会报错。

修复很简单——加一个 per-chatId 的 Promise 队列，消息串行处理：

```javascript
const chatQueues = new Map();
function enqueueChat(chatId, fn) {
  if (!chatQueues.has(chatId)) chatQueues.set(chatId, Promise.resolve());
  var p = chatQueues.get(chatId).then(fn);
  chatQueues.set(chatId, p);
  return p;
}
```

### 坑9：敏感信息差点提交到 Git

配置文件里直接写了服务器密码、IP、Telegram Bot Token。准备 `git push` 之前做了一遍安全扫描，发现 `start.sh` 里 7 个 Bot Token 明文写在代码中，SOUL.md 里有服务器密码，TOOLS.md 里有真实 IP。

修复：把 Token 移到 `.bot-tokens` 文件，服务器信息移到 `.server-config`，两个文件加入 `.gitignore`。代码里改为引用这些文件：

```bash
# .bot-tokens（不提交）
TOKEN_main="xxx"
TOKEN_blog="xxx"

# start.sh（提交）
source "$HOME/ai/.bot-tokens"
start_bot main "$TOKEN_main" "虾米" 3880
```

这个坑看起来低级，但在"赶紧让系统跑起来"的迁移心态下很容易忽略。

### 坑10：Session 过期静默失败

跑了几个小时后，所有 bot 开始报 "No conversation found with session ID: xxx"。原来 Claude Code 的 session 在服务端有生命周期，长时间不活跃或者服务端重启后，旧的 session_id 就失效了。而 bot 还忠实地拿着本地存的 session_id 去 `--resume`，每次都失败。

这个问题在 OpenClaw 时代不存在，因为 OpenClaw 自己管理上下文。但用 `claude -p` 后，session 的生命周期完全在 Claude 服务端，本地无法控制。

修复方案是加一个自动降级：检测到 "No conversation found" 错误时，自动清掉旧 session，用新会话重试。对用户来说就是丢失了之前的对话上下文，但至少不会卡死：

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

教训：凡是依赖外部状态的地方，都要考虑状态丢失的情况。

## 云端补充：Remote Triggers

本地 Agent 需要 Mac 持续开机运行，适合需要读写本地文件的任务（写代码、操作博客等）。对于纯搜索、分析类的轻量任务，可以用 Claude Code 的 Remote Triggers，在 Anthropic 云端执行，不占本地资源。

Remote Triggers 是 Claude Code 的托管调度功能，通过 `/schedule` 命令创建，指定 cron 表达式和要执行的 prompt，到时间 Anthropic 服务器自动起一个 Claude Code session 跑任务，结果可以推送到 Telegram 或存到云端。与本地 `setInterval` 调度的区别是：不依赖本地机器存活，适合不需要本地文件权限的任务。

目前博客提案生成（周一三五 10:00）、技术趋势监控（周二四六 09:00）这两个任务已经迁到 Remote Triggers，减少了本地 Agent 的负担。配置方式参考 Claude Code 官方文档的 `/schedule` 命令。

## 迁移完成后的感受

整个迁移花了两天，大部分时间在排查上面那些坑。最终跑通的方案并不复杂——一个 600 行的 JS 文件，一个 Shell 脚本，外加每个 Agent 的配置目录。

体验上和 OpenClaw 差别不大：Telegram 发消息，Agent 回复，定时任务到点推送通知，`/new` 重置上下文。从 OpenClaw workspace 迁移过来的配置文件（SOUL.md、TOOLS.md 等）全部复用，没有改动。

有一点不如之前：nohup 方案每次重启 Mac 都要手动跑一次 `start.sh`（加了 watchdog 模式后至少不用担心运行中挂掉了）。OpenClaw 支持系统服务自动启动，这个还没找到好的替代方案（launchd 因为 Keychain 问题放弃了）。

整个目录放在 git 里管理，换台电脑只需要 clone、配置 `.bot-tokens` 和 `.server-config`，然后跑 `start.sh`，迁移成本很低。

---

**相关阅读**：
- [OpenClaw 记忆系统最佳实践](https://chenguangliang.com/posts/blog074_openclaw-memory-best-practices/) - OpenClaw 时代的记忆管理方案，迁移后大部分仍然适用
- [为什么 AI Agent 会无视规则](https://chenguangliang.com/posts/blog075_why-ai-agents-ignore-rules/) - Agent 行为不可预测的根本原因
