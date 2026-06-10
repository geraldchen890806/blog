---
title: "OpenClaw Automation in Practice: Building a 24/7 AI Assistant with Cron + Heartbeat"
pubDatetime: 2026-03-09T21:30:00+08:00
description: "A deep dive into OpenClaw's Cron Job and Heartbeat mechanisms—from choosing between them to engineering practice—with a real production case study covering error handling, state management, and cost optimization."
author: Gerald Chen
featured: true
tags:
  - AI Agent
  - 自动化
  - 开发效率
---

The value of an AI agent isn't just in responding passively—it's in acting proactively. OpenClaw offers two automation mechanisms: **Cron Jobs** (scheduled tasks) and **Heartbeat** (periodic polling). But which one should you use? How do you design automation workflows that are actually reliable? And how do you handle errors and keep costs under control?

This article walks through the engineering practice of OpenClaw automation, grounded in a real production case: a tech blog monitoring system.

## Core Concepts: Cron vs Heartbeat

### Cron Job: Precisely Scheduled Tasks

**Characteristics**:
- Precise time control (cron expressions / at / every)
- Runs in an isolated session
- Optional result delivery (announce / webhook)
- Supports both one-off and recurring tasks

**Best for**:
- Scheduled reminders ("remind me about the meeting at 9:00 every day")
- Recurring reports ("generate last week's data analysis every Monday")
- Scheduled checks ("check server status every hour")
- One-off tasks ("remind me in 30 minutes")

### Heartbeat: Context-Aware Polling

**Characteristics**:
- Executes in the main session (full context available)
- Flexible check logic (can batch multiple checks together)
- Lightweight (a HEARTBEAT_OK response costs almost nothing—just a few output tokens)
- Has access to session history and memory

**Best for**:
- Batched checks (one pass over: email + calendar + notifications)
- Context-dependent tasks (deciding whether to remind based on recent conversation)
- Proactive work (organizing files, committing code)
- Periodic reviews (summarizing today's work)

### Decision Matrix

| Dimension | Cron Job | Heartbeat |
|------|---------|-----------|
| Time precision | Precise (minute-level, cron expressions) | Loose (minute-level) |
| Context | None (isolated session) | Yes (main session) |
| Batch operations | Requires multiple jobs | One poll covers everything |
| API cost | Every run is a call | Can respond selectively |
| Result delivery | Flexible (announce/webhook) | Direct reply |
| Suitable frequency | Low (hourly/daily) | High (minutes) |

**Rules of thumb**:
- ✅ **Cron**: when punctuality matters (reminders, reports, scheduled tasks)
- ✅ **Heartbeat**: when you need context or batched checks (email + calendar + RSS)
- ✅ **Hybrid**: Cron drives critical tasks, Heartbeat handles routine checks

## The Complete Guide to Cron Jobs

### 1. Schedule Types in Detail

#### Type 1: at (one-off tasks)

```json
{
  "schedule": {
    "kind": "at",
    "at": "2026-03-10T09:00:00.000Z"
  },
  "deleteAfterRun": true
}
```

**Best for**:
- Ad-hoc reminders ("remind me in 20 minutes")
- Certificate expiry reminders (fixed dates)
- One-off data migrations

**Caveats**:
- ⚠️ The timestamp must be ISO 8601 format
- ⚠️ **Defaults to UTC** (no explicit timezone)
- ⚠️ Set `deleteAfterRun: true` so stale jobs don't pile up

#### Type 2: every (fixed interval)

```json
{
  "schedule": {
    "kind": "every",
    "everyMs": 3600000,
    "anchorMs": 1709697600000
  }
}
```

**Parameters**:
- `everyMs`: interval in milliseconds (3600000 = 1 hour)
- `anchorMs`: starting timestamp (optional, defaults to the first run time)

**Best for**:
- Health checks (every 5 minutes)
- Data sync (every 30 minutes)
- Resource cleanup (every 12 hours)

**Formula**:
```javascript
// 下次运行时间
nextRunMs = anchorMs + N * everyMs
```

**Example**: run every 30 minutes

```json
{
  "schedule": {
    "kind": "every",
    "everyMs": 1800000
  }
}
```

#### Type 3: cron (cron expressions)

```json
{
  "schedule": {
    "kind": "cron",
    "expr": "0 9 * * 1,3,5",
    "tz": "Asia/Shanghai"
  }
}
```

**Expression format**:
```text
* * * * *
│ │ │ │ │
│ │ │ │ └─ Day of week (0-7, both 0 and 7 are Sunday)
│ │ │ └─── Month (1-12)
│ │ └───── Day of month (1-31)
│ └─────── Hour (0-23)
└───────── Minute (0-59)
```

**Common expressions**:

| Expression | Meaning |
|--------|------|
| `0 9 * * *` | Every day at 9:00 |
| `0 */2 * * *` | Every 2 hours, on the hour |
| `0 9 * * 1` | Every Monday at 9:00 |
| `0 9 1 * *` | The 1st of every month at 9:00 |
| `0 9 * * 1-5` | Weekdays at 9:00 |

**Timezone handling**:
- ✅ **Strongly recommended: always set `tz`** (avoid UTC confusion)
- ✅ Supports IANA timezones (`Asia/Shanghai`, `America/New_York`)
- ⚠️ Without `tz`, UTC is used by default

**Example**: Mondays, Wednesdays, and Fridays at 10:00 AM (Shanghai time)

```json
{
  "name": "博客内容提案生成",
  "schedule": {
    "kind": "cron",
    "expr": "0 10 * * 1,3,5",
    "tz": "Asia/Shanghai"
  }
}
```

### 2. Choosing a Payload Type

#### systemEvent: inject into the main session

```json
{
  "payload": {
    "kind": "systemEvent",
    "text": "提醒：SSL 证书将于 2026-05-12 到期"
  },
  "sessionTarget": "main"
}
```

**Characteristics**:
- Injected into the main session (with context)
- The user sees a system message in the chat
- Can trigger follow-up conversation

**Best for**:
- Simple reminders
- Status notifications
- Triggering the main agent to act

**Constraints**:
- ⚠️ **Must** use `sessionTarget: "main"`
- ⚠️ Does not support `isolated` sessions

#### agentTurn: independent execution

```json
{
  "payload": {
    "kind": "agentTurn",
    "message": "检查技术趋势并生成提案",
    "model": "anthropic/claude-sonnet-4",
    "thinking": "low",
    "timeoutSeconds": 300
  },
  "sessionTarget": "isolated"
}
```

**Characteristics**:
- Runs in a fully isolated session (no main session context)
- Full agent execution capabilities
- Supports tool calls
- Configurable model and timeout

**Best for**:
- Complex tasks (requiring tool calls)
- Independent research (monitoring, analysis)
- Long-running tasks (report generation)

**Parameters**:
- `message`: the task description (equivalent to a user message)
- `model`: optional, overrides the default model
- `thinking`: optional, reasoning mode (`low`/`medium`/`high`)
- `timeoutSeconds`: optional, timeout (0 = unlimited)

**Constraints**:
- ⚠️ **Must** use `sessionTarget: "isolated"`
- ⚠️ Does not support the `main` session

### 3. Delivery Modes in Detail

#### announce: send to chat

```json
{
  "delivery": {
    "mode": "announce",
    "channel": "telegram",
    "to": "telegram:YOUR_TELEGRAM_ID",
    "bestEffort": true
  }
}
```

**Parameters**:
- `channel`: target channel (`telegram`/`discord`/`slack`, etc.)
- `to`: target address (format: `<channel>:<id>`)
- `bestEffort`: optional, delivery failures won't affect the job status

**Best for**:
- Sending results to the user
- Push notifications
- Multi-person collaboration

**Caveats**:
- ✅ Supports cross-channel delivery
- ⚠️ The `to` format must be correct (`telegram:123456`)
- ⚠️ Verify the target has the necessary permissions

#### webhook: POST to a URL

```json
{
  "delivery": {
    "mode": "webhook",
    "to": "https://your-server.com/webhook",
    "bestEffort": false
  }
}
```

**Payload format**:
```json
{
  "jobId": "xxx",
  "runId": "xxx",
  "status": "ok",
  "result": {
    "text": "任务执行结果...",
    "toolCalls": [...]
  },
  "startedAtMs": 1709697600000,
  "finishedAtMs": 1709697665000
}
```

**Best for**:
- Integrating with external systems
- Triggering downstream workflows
- Logging

#### none / omitted: silent execution

```json
{
  "delivery": {
    "mode": "none"
  }
}
```

**Best for**:
- Background cleanup tasks
- Data sync
- Tasks that don't need notifications

**Default behavior**:
- `systemEvent` → no delivery
- `agentTurn` (isolated) → defaults to `announce`

### 4. Case Study: Tech Trend Monitoring

**Requirement**: Monitor tech trends every Tuesday, Thursday, and Saturday at 9:00 AM, and notify the user when an interesting topic shows up.

**Full configuration**:

```json
{
  "id": "1aaef574-e766-4a0f-81b9-1de86f88e6cd",
  "agentId": "blog",
  "name": "技术趋势监控",
  "enabled": true,
  "schedule": {
    "kind": "cron",
    "expr": "0 9 * * 2,4,6",
    "tz": "Asia/Shanghai"
  },
  "sessionTarget": "isolated",
  "wakeMode": "now",
  "payload": {
    "kind": "agentTurn",
    "message": "监控技术趋势并收集有趣的博客话题。任务：1) 搜索 GitHub Trending 项目；2) 查看前端、AI、Web3 领域热点；3) 分析哪些话题适合写博客；4) 如果发现非常有趣的话题，发送给大人。否则保存到 memory/文件中供后续使用。",
    "timeoutSeconds": 600
  },
  "delivery": {
    "mode": "announce",
    "to": "telegram:YOUR_TELEGRAM_ID",
    "bestEffort": true
  }
}
```

**Key design decisions**:
1. ✅ Use `cron` (precise times) instead of `every` (avoids time drift)
2. ✅ `timeoutSeconds: 600` (10 minutes, enough to complete the searches)
3. ✅ `bestEffort: true` (delivery failures won't affect the job status)
4. ✅ The message spells out "if... otherwise..." (avoids pinging the user every single run)

**Optimization tips**:
- 📊 **Conditional delivery**: instruct the agent in the message to judge whether a notification is warranted
- 💾 **Persistence**: save unremarkable findings to a file instead of flooding the chat
- ⏱️ **Sensible timeouts**: scale with task complexity (60s for simple tasks, 600s for complex ones)

### 5. Error Handling and Retries

#### Checking job status

```bash
# 列出所有任务
openclaw cron list

# 查看特定任务的执行历史
openclaw cron runs --id <job-id>
```

**State fields**:
```json
{
  "state": {
    "nextRunAtMs": 1709784000000,
    "lastRunAtMs": 1709697600000,
    "lastRunStatus": "ok",
    "lastDurationMs": 54112,
    "lastDelivered": true,
    "lastDeliveryStatus": "delivered",
    "consecutiveErrors": 0
  }
}
```

**Key metrics**:
- `lastRunStatus`: `ok` / `error` / `timeout`
- `consecutiveErrors`: number of consecutive failures
- `lastDurationMs`: execution time (a basis for optimization)

#### Manual triggering

```bash
# 立即执行（不等下次计划时间）
openclaw cron run <job-id>

# 仅在到期时执行
openclaw cron run <job-id> --due
```

**Best for**:
- Debugging new jobs
- Urgent runs
- Testing configuration changes

#### Error handling strategies

> **Note**: The TypeScript snippets below are conceptual examples that illustrate the design ideas. In real usage you'll need to adapt imports and context to your environment.

**Strategy 1: Graceful degradation**

```typescript
// Message 中包含降级逻辑
const message = `
检查邮件和日历。

如果 Gmail API 失败，尝试 IMAP。
如果日历 API 失败，跳过日历检查。
如果所有方法都失败，回复 "暂时无法检查，稍后重试"。

不要因为单个失败而终止整个任务。
`;
```

**Strategy 2: Retry mechanism**

OpenClaw doesn't support automatic retries out of the box, but you can design around that:

```json
{
  "schedule": {
    "kind": "every",
    "everyMs": 300000
  },
  "payload": {
    "kind": "agentTurn",
    "message": "检查服务器状态。如果检查失败，记录到 errors.log。连续失败 3 次后发送告警。"
  }
}
```

**Strategy 3: Alert notifications**

```json
{
  "name": "SSL 证书检查",
  "payload": {
    "kind": "agentTurn",
    "message": "检查 SSL 证书到期时间。如果距离到期 < 30 天，立即发送 Telegram 告警。"
  },
  "delivery": {
    "mode": "announce",
    "to": "telegram:YOUR_TELEGRAM_ID"
  }
}
```

## Heartbeat in Practice

### 1. Writing a Good HEARTBEAT.md

**File location**: `<workspace>/HEARTBEAT.md`

**Example**:

```markdown
# HEARTBEAT.md

## 博客自动化检查清单

### 每日检查 (轮流执行，避免频繁 API 调用)

**周一、三、五**:
- [ ] 检查博客网站可访问性
- [ ] 检查 GitHub 仓库同步状态
- [ ] 生成技术博客内容提案（发给大人确认）

**周二、四、六**:
- [ ] 监控技术趋势（GitHub Trending、HN、Reddit）
- [ ] 收集有趣的技术话题
- [ ] 检查 Google Analytics 数据

**周日**:
- [ ] 周报：本周网站访问情况
- [ ] 内容规划：下周博客主题建议

### 实时任务
- 代码更改后立即自动部署
- 重要技术新闻实时提醒
- 用户请求的博客内容立即处理

---

只有当有具体任务需要注意时才会发送消息，否则保持 `HEARTBEAT_OK`
```

**Design principles**:
1. ✅ **Group your checks**: rotate by day of week so you don't run every check every time
2. ✅ **Clear categories**: periodic checks vs real-time tasks
3. ✅ **Explicit rules**: when to send a message, when to stay silent
4. ✅ **Frequency control**: don't over-interrupt the user

### 2. Implementing State Tracking

**State file**: `memory/heartbeat-state.json`

```json
{
  "lastChecks": {
    "email": 1709697600000,
    "calendar": 1709684200000,
    "weather": null,
    "githubTrending": 1709611800000
  },
  "alerts": {
    "lowDiskSpace": false,
    "certificateExpiring": true
  }
}
```

**Reading and updating**:

```typescript
// 在 Heartbeat 检查中
const stateFile = '/workspace/memory/heartbeat-state.json';
const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));

const now = Date.now();
const lastEmailCheck = state.lastChecks.email || 0;

// 距离上次检查 > 2 小时才检查
if (now - lastEmailCheck > 7200000) {
  // 执行邮件检查
  await checkEmail();
  
  // 更新状态
  state.lastChecks.email = now;
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}
```

**Best practices**:
- ✅ Record the last check time (avoids duplicate checks)
- ✅ Record alert states (avoids duplicate alerts)
- ✅ Use Unix timestamps (easy interval math)
- ✅ Clean up stale state periodically

### 3. Batched Checks Example

**Scenario**: each heartbeat checks email, calendar, and weather

```markdown
## Heartbeat 检查流程

1. **读取状态文件** (`heartbeat-state.json`)
2. **邮件检查**（距离上次 > 30 分钟）
   - 连接 Gmail API
   - 检查未读重要邮件
   - 如果有紧急邮件 → 通知
3. **日历检查**（距离上次 > 1 小时）
   - 查询未来 24 小时的事件
   - 如果有 < 2 小时的事件 → 提醒
4. **天气检查**（距离上次 > 3 小时）
   - 检查未来 6 小时天气
   - 如果有极端天气 → 提醒
5. **更新状态文件**
6. **返回结果**
   - 有重要事项 → 发送消息
   - 无重要事项 → `HEARTBEAT_OK`
```

**Benefits**:
- ✅ Multiple checks per poll (fewer API calls)
- ✅ Different check frequencies based on importance
- ✅ Persistent state (survives restarts)

### 4. Proactive Work vs Silent Return

**When to work proactively** (running tasks inside the heartbeat):

```markdown
## 主动工作示例

### 可以做的后台工作（不需要询问）：
- [ ] 整理 memory 文件（删除超过 30 天的日志）
- [ ] 提交未推送的代码（git push）
- [ ] 优化图片（压缩超过 1MB 的图片）
- [ ] 更新依赖（npm audit fix）
- [ ] 清理临时文件

### 需要询问的工作（发消息确认）：
- [ ] 发现重要邮件
- [ ] 日历事件即将开始（< 2 小时）
- [ ] 服务器异常（CPU > 90%）
- [ ] 证书即将到期（< 30 天）
```

**Design principles**:
- ✅ **Low-risk tasks**: just do them (organizing files, optimizing assets)
- ⚠️ **Medium-risk tasks**: log them and report periodically (clearing caches, updating dependencies)
- 🔴 **High-risk tasks**: notify immediately (anomalies, alerts, important events)

### 5. Frequency Control Strategies

**The problem**: Heartbeat polls every N minutes—how do you avoid checking too much?

**Option 1: Time windows**

```typescript
const checks = [
  { name: 'email', intervalMs: 30 * 60 * 1000 },    // 30 分钟
  { name: 'calendar', intervalMs: 60 * 60 * 1000 }, // 1 小时
  { name: 'weather', intervalMs: 180 * 60 * 1000 }, // 3 小时
];

for (const check of checks) {
  const lastCheck = state.lastChecks[check.name] || 0;
  if (now - lastCheck > check.intervalMs) {
    await performCheck(check.name);
    state.lastChecks[check.name] = now;
  }
}
```

**Option 2: Day-of-week rotation**

```typescript
const dayOfWeek = new Date().getDay();

if ([1, 3, 5].includes(dayOfWeek)) {
  // 周一、三、五检查网站和 GitHub
  await checkWebsite();
  await checkGitHub();
} else if ([2, 4, 6].includes(dayOfWeek)) {
  // 周二、四、六检查趋势和分析
  await checkTrends();
  await checkAnalytics();
} else {
  // 周日生成周报
  await generateWeeklyReport();
}
```

**Option 3: Priority queue**

```typescript
const queue = [
  { task: 'checkCriticalAlerts', priority: 1, intervalMs: 5 * 60 * 1000 },
  { task: 'checkEmail', priority: 2, intervalMs: 30 * 60 * 1000 },
  { task: 'checkAnalytics', priority: 3, intervalMs: 24 * 60 * 60 * 1000 },
];

// 按优先级和时间间隔执行
const now = Date.now();
for (const item of queue) {
  const lastRun = state.lastRun[item.task] || 0;
  if (now - lastRun > item.intervalMs) {
    await runTask(item.task);
    state.lastRun[item.task] = now;
    break; // 每次只执行一个任务
  }
}
```

## The Hybrid Strategy: Cron + Heartbeat

### Case Study: A Blog Monitoring System

**Architecture**:

```text
Cron Jobs (precisely timed tasks)
├─ Blog content proposal generation (Mon/Wed/Fri 10:00)
├─ Tech trend monitoring (Tue/Thu/Sat 9:00)
├─ SSL certificate reminder (30 days before expiry)
└─ Daily system inspection (every day at 8:00)

Heartbeat (polling checks)
├─ Website availability (every 30 minutes)
├─ GitHub sync status (every 1 hour)
├─ Google Analytics (once a day)
└─ Memory cleanup (nightly, proactive work)
```

**Division of labor**:
- **Cron**: time-sensitive tasks (proposals, monitoring, reminders)
- **Heartbeat**: status checks + background maintenance

### Configuration Examples

**Cron Job 1: Blog content proposals**

```json
{
  "name": "博客内容提案生成",
  "agentId": "blog",
  "schedule": {
    "kind": "cron",
    "expr": "0 10 * * 1,3,5",
    "tz": "Asia/Shanghai"
  },
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "message": "生成一个技术博客文章提案。要求：1) 基于当前技术热点；2) 适合中文技术博客；3) 深入浅出的风格；4) 包含实际代码示例想法；5) 使用 message 工具发送提案到 Telegram（channel=telegram, target=YOUR_TELEGRAM_ID, accountId=blog）。提案应该包含：标题、简介、大纲、预计篇幅。",
    "timeoutSeconds": 300
  },
  "delivery": {
    "mode": "announce",
    "to": "telegram:YOUR_TELEGRAM_ID",
    "accountId": "blog"
  }
}
```

**Cron Job 2: SSL certificate reminder**

```json
{
  "name": "SSL证书续期提醒",
  "agentId": "main",
  "schedule": {
    "kind": "at",
    "at": "2026-04-10T01:00:00.000Z"
  },
  "sessionTarget": "main",
  "deleteAfterRun": true,
  "payload": {
    "kind": "systemEvent",
    "text": "提醒：example.com 的 SSL 证书将于 2026-05-12 到期，请尽快续期。续期命令：ssh root@your-server 'certbot renew && nginx -s reload'"
  }
}
```

**Heartbeat (HEARTBEAT.md)**:

```markdown
# HEARTBEAT.md

## 博客自动化检查清单

### 每日检查（轮流执行）

**周一、三、五**：
- [ ] 检查博客网站可访问性（curl https://example.com）
- [ ] 检查 GitHub 仓库同步状态（git status）

**周二、四、六**：
- [ ] 收集技术话题（保存到 memory/topics.md）
- [ ] 检查 Google Analytics（访问量异常时提醒）

**周日**：
- [ ] 周报：本周网站访问情况
- [ ] 内容规划：下周博客主题建议

### 主动工作（不需要询问）
- 整理 memory/ 文件夹（删除 > 30 天的日志）
- 提交博客改动（git add + commit + push）
- 压缩过大图片（> 1MB）

### 实时任务
- 代码改动后立即部署
- 重要技术新闻实时提醒

---

只有当有具体任务需要注意时才会发送消息，否则保持 `HEARTBEAT_OK`
```

## Error Handling and Reliability

### 1. Timeout Handling

**Problem**: a task takes too long to execute

**Solution**:

```json
{
  "payload": {
    "kind": "agentTurn",
    "message": "执行数据分析。如果 5 分钟内无法完成，先返回部分结果。",
    "timeoutSeconds": 300
  }
}
```

**Design tips**:
- ✅ State the timeout strategy explicitly in the message
- ✅ Set a sensible `timeoutSeconds`
- ✅ Partial results > total failure

### 2. Delivery Failures

**Problem**: Telegram delivery fails (network issues, bot blocked)

**Option 1: bestEffort**

```json
{
  "delivery": {
    "mode": "announce",
    "to": "telegram:YOUR_TELEGRAM_ID",
    "bestEffort": true
  }
}
```

**Option 2: webhook as a backup**

```json
{
  "delivery": {
    "mode": "webhook",
    "to": "https://your-server.com/cron-results"
  }
}
```

**Option 3: file-based backup**

```text
// Instruct in the message
If Telegram delivery fails, write the result to /workspace/cron-results/YYYY-MM-DD.md
```

### 3. State Consistency

**Problem**: a corrupted heartbeat state file

**Solution**:

```typescript
// 健壮的状态读取
function loadState() {
  try {
    const raw = fs.readFileSync('/workspace/memory/heartbeat-state.json', 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    // 初始化默认状态
    return {
      lastChecks: {},
      alerts: {}
    };
  }
}

// 原子写入
function saveState(state) {
  const temp = '/workspace/memory/heartbeat-state.json.tmp';
  fs.writeFileSync(temp, JSON.stringify(state, null, 2));
  fs.renameSync(temp, '/workspace/memory/heartbeat-state.json');
}
```

### 4. Monitoring and Alerting

**Cron job health checks**:

```bash
# 检查连续失败次数
openclaw cron list --json | jq '.jobs[] | select(.state.consecutiveErrors > 3)'

# 检查上次执行时间（超过 24 小时未执行）
openclaw cron list --json | jq '.jobs[] | select(.state.lastRunAtMs < (now * 1000 - 86400000))'
```

**Automated alerting**:

```json
{
  "name": "每日系统巡查",
  "schedule": {
    "kind": "cron",
    "expr": "0 8 * * *",
    "tz": "Asia/Shanghai"
  },
  "payload": {
    "kind": "agentTurn",
    "message": "检查所有 agent 和 cron jobs 状态：1) 运行 openclaw cron list；2) 检查是否有异常（error、failed、离线等）；3) 如果有问题，通过 Telegram 发送详细报告给大人；4) 如果一切正常，发送简短的 OK 消息"
  }
}
```

## Performance Optimization and Cost Control

### 1. Reducing API Calls

**Strategy 1: Batched checks** (Heartbeat)

```markdown
# ❌ 不推荐：每个检查都触发
- Cron Job: 检查邮件（每 30 分钟）
- Cron Job: 检查日历（每 30 分钟）
- Cron Job: 检查天气（每 30 分钟）

# ✅ 推荐：一次 Heartbeat 搞定
Heartbeat（每 30 分钟）:
  - 检查邮件
  - 检查日历
  - 检查天气
```

**Cost comparison**:
- Option 1: 3 cron jobs × 48 runs/day = 144 calls
- Option 2: 1 heartbeat × 48 runs/day = 48 calls (67% saved)

**Strategy 2: Conditional triggering**

```text
// Include the condition in the message
Check email. If there's nothing important, return HEARTBEAT_OK (not billed).
Only generate a detailed reply when an important email is found.
```

**Strategy 3: Incremental checks**

```typescript
// 只检查新增数据
const lastCheckTime = state.lastChecks.email;
const emails = await gmail.listMessages({
  q: `after:${lastCheckTime} is:unread`
});
```

### 2. Model Selection

**Scenario 1: Simple checks**

```json
{
  "payload": {
    "kind": "agentTurn",
    "message": "检查网站是否可访问（curl https://example.com）",
    "model": "anthropic/claude-haiku-3-5"
  }
}
```

**Cost**: Haiku ≈ $0.25/1M input tokens (as of March 2026; check Anthropic's official pricing page for current numbers)

**Scenario 2: Complex analysis**

```json
{
  "payload": {
    "kind": "agentTurn",
    "message": "分析 GitHub Trending，生成博客提案",
    "model": "anthropic/claude-sonnet-4"
  }
}
```

**Strategy**:
- ✅ Check tasks → Haiku
- ✅ Analysis tasks → Sonnet
- ✅ Complex reasoning → Opus (only when truly necessary)

### 3. Frequency Tuning

**Principle**: set frequency based on importance

| Task | Frequency | Rationale |
|------|------|------|
| SSL certificate check | Daily | A 30-day advance warning is plenty |
| Email check | Every 30 minutes | Balances responsiveness and cost |
| Trend monitoring | 3 times a week | Trends move slowly |
| Website health check | Every 5 minutes | Critical service; problems must surface fast |

**Cost calculation**:

```text
Monthly cost = frequency × tokens per run × model price

Example: email check
- Frequency: 48 runs/day × 30 days = 1440 runs/month
- Tokens: ~500 tokens per run on average
- Model: Haiku ($0.25/1M tokens)
- Cost: 1440 × 500 × 0.25 / 1000000 = $0.18/month
```

### 4. Caching

**Scenario**: GitHub Trending data

```typescript
// 缓存 1 小时
const cacheFile = '/workspace/cache/github-trending.json';
const cacheAge = Date.now() - fs.statSync(cacheFile).mtimeMs;

if (cacheAge < 3600000) {
  // 使用缓存
  return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
} else {
  // 重新抓取
  const data = await fetchGitHubTrending();
  fs.writeFileSync(cacheFile, JSON.stringify(data));
  return data;
}
```

**Best for**:
- ✅ Slow-moving data (trends, statistics)
- ✅ Rate-limited APIs
- ✅ Expensive queries

## Best Practices Summary

### ✅ Do

1. **Pick the right mechanism**
   - Precise timing → Cron
   - Batched checks → Heartbeat
   - Mix them → best results

2. **Set sensible timeouts**
   - Simple tasks: 60s
   - Complex tasks: 300s
   - Long-running tasks: 600s

3. **Degrade gracefully**
   - Partial failure ≠ total failure
   - Have fallbacks (webhook, files)
   - Persist state

4. **Optimize costs**
   - Batch checks (Heartbeat)
   - Conditional triggering (HEARTBEAT_OK)
   - Choose the right model (Haiku vs Sonnet)

5. **Monitor and alert**
   - Check job status regularly
   - Alert on consecutive failures
   - Track execution times

### ❌ Don't

1. **Don't over-poll**
   - ❌ Check email every minute (way too often)
   - ✅ Check every 30 minutes

2. **Don't ignore timezones**
   - ❌ Default to UTC (easy to mix up)
   - ✅ Explicitly set `tz: "Asia/Shanghai"`

3. **Don't hardcode**
   - ❌ `to: "telegram:123456"`
   - ✅ Config files / environment variables

4. **Don't swallow errors**
   - ❌ Let failures vanish silently
   - ✅ Log, alert, retry

5. **Don't abuse the main session**
   - ❌ Run everything via systemEvent
   - ✅ Use isolated sessions for complex tasks

## Utility Scripts

### 1. Bulk-Creating Cron Jobs

```bash
#!/bin/bash
# create-cron-jobs.sh

# 博客内容提案
openclaw cron add \
  --name "博客内容提案生成" \
  --agent blog \
  --cron "0 10 * * 1,3,5" \
  --tz "Asia/Shanghai" \
  --session isolated \
  --message "生成技术博客提案..." \
  --timeout-seconds 300 \
  --announce \
  --to "telegram:YOUR_TELEGRAM_ID"

# 技术趋势监控
openclaw cron add \
  --name "技术趋势监控" \
  --agent blog \
  --cron "0 9 * * 2,4,6" \
  --tz "Asia/Shanghai" \
  --session isolated \
  --message "监控技术趋势..." \
  --timeout-seconds 600 \
  --announce \
  --to "telegram:YOUR_TELEGRAM_ID"

echo "✅ Cron jobs 创建完成"
openclaw cron list
```

### 2. Health Check Script

```bash
#!/bin/bash
# check-cron-health.sh

echo "📊 Cron Jobs 健康检查"
echo "===================="

# 检查连续失败 > 3 次的任务
echo "❌ 连续失败任务："
openclaw cron list --json | jq -r '
  .jobs[] |
  select(.state.consecutiveErrors > 3) |
  "\(.name): \(.state.consecutiveErrors) 次失败"
'

# 检查超过 24 小时未执行的任务
echo ""
echo "⏱️ 长时间未执行："
NOW=$(date +%s)
openclaw cron list --json | jq -r --arg now "$NOW" '
  .jobs[] |
  select(.state.lastRunAtMs < ($now | tonumber * 1000 - 86400000)) |
  "\(.name): 上次执行 \(($now | tonumber * 1000 - .state.lastRunAtMs) / 3600000 | floor) 小时前"
'

# 检查执行时间过长的任务
echo ""
echo "🐢 执行时间过长："
openclaw cron list --json | jq -r '
  .jobs[] |
  select(.state.lastDurationMs > 60000) |
  "\(.name): \(.state.lastDurationMs / 1000) 秒"
'
```

### 3. Cost Estimation Script

```bash
#!/bin/bash
# estimate-cost.sh

echo "💰 Cron Jobs 月度成本估算"
echo "========================"

# 读取所有任务配置
openclaw cron list --json | jq -r '
  .jobs[] |
  {
    name: .name,
    schedule: .schedule.expr // .schedule.everyMs,
    model: .payload.model // "default"
  } |
  "\(.name):\n  Schedule: \(.schedule)\n  Model: \(.model)\n"
'

# 手动计算成本（需要根据实际运行频率和 token 数）
cat << 'EOF'

📊 成本计算公式：
月成本 = 运行次数/月 × 平均 tokens × 模型价格

示例：
- 博客提案（周一三五 10:00，约 2000 tokens，Sonnet）
  = 3×4 次/月 × 2000 × $3/1M = $0.072/月

- 趋势监控（周二四六 9:00，约 3000 tokens，Sonnet）
  = 3×4 次/月 × 3000 × $3/1M = $0.108/月

总成本：约 $0.18/月
EOF
```

## Conclusion

OpenClaw's Cron and Heartbeat mechanisms give AI agents serious automation capabilities:

**Core principles**:
1. **Clear selection criteria**: Cron for precise timing, Heartbeat for batched checks
2. **Cost optimization**: batch checks, conditional triggering, the right model for the job
3. **Reliability first**: timeout handling, error alerting, state persistence
4. **Solid monitoring**: health checks, execution times, consecutive failures

**Lessons from production**:
- ✅ Cron suits low-frequency, self-contained scheduled tasks
- ✅ Heartbeat suits high-frequency, batched status checks
- ✅ The hybrid strategy: Cron drives critical tasks, Heartbeat handles daily upkeep
- ✅ Proactive work: let the agent quietly finish low-risk tasks in the background

**Next steps**:
- Create your first cron job
- Write a HEARTBEAT.md checklist
- Implement state tracking (heartbeat-state.json)
- Check job health regularly

Start with a simple reminder, and build up your 24/7 AI assistant from there!

---

**Related reading**:
- [Getting Started with OpenClaw: Build Your Self-Hosted AI Assistant in 5 Minutes](/en/posts/openclaw-getting-started/) - an introductory guide to OpenClaw
- [AI Agent Memory Systems in Practice: OpenClaw Memory Best Practices](/en/posts/blog074_openclaw-memory-best-practices/) - pairing the memory system with automation

**Further reading**:
- [OpenClaw Docs - Cron Jobs](https://docs.openclaw.ai/tools/cron)
- [OpenClaw Docs - Heartbeat](https://docs.openclaw.ai/guides/heartbeat)
- [Crontab expression generator](https://crontab.guru/)
