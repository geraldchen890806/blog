---
title: OpenClaw 自动化工作流实战：Cron + Heartbeat 构建 24/7 智能助手
pubDatetime: 2026-03-09T21:30:00+08:00
description: 深度解析 OpenClaw 的 Cron Job 和 Heartbeat 机制，从选型策略到工程实践，结合真实案例展示如何构建可靠的自动化工作流，涵盖错误处理、状态管理、成本优化等关键环节。
featured: true
tags:
  - OpenClaw
  - AI Agent
  - 自动化
  - Cron
  - 工程化
  - 最佳实践
---

AI Agent 的价值不仅在于被动响应，更在于主动执行。OpenClaw 提供了两种自动化机制：**Cron Job**（定时任务）和 **Heartbeat**（心跳检查）。但如何选择？如何设计可靠的自动化工作流？如何处理错误和成本优化？

本文将结合真实生产案例（技术博客监控系统），深入探讨 OpenClaw 自动化的工程实践。

## 核心概念：Cron vs Heartbeat

### Cron Job：精确控制的定时任务

**特点**：
- 精确的时间控制（cron 表达式 / at / every）
- 独立的隔离会话（isolated session）
- 可选的结果投递（announce / webhook）
- 支持一次性和周期性任务

**适用场景**：
- 定时提醒（"每天 9:00 提醒我开会"）
- 周期性报告（"每周一生成上周数据分析"）
- 定时检查（"每小时检查服务器状态"）
- 一次性任务（"30 分钟后提醒我"）

### Heartbeat：上下文感知的轮询

**特点**：
- 在主会话中执行（有完整上下文）
- 灵活的检查逻辑（可批量处理多个检查）
- 轻量级（HEARTBEAT_OK 不计费）
- 可访问会话历史和记忆

**适用场景**：
- 批量检查（一次检查：邮件 + 日历 + 通知）
- 上下文相关任务（基于最近对话决定是否提醒）
- 主动工作（整理文件、提交代码）
- 定期回顾（总结今天的工作）

### 选型决策矩阵

| 维度 | Cron Job | Heartbeat |
|------|---------|-----------|
| 时间精度 | 精确（秒级） | 宽松（分钟级） |
| 上下文 | 无（隔离会话） | 有（主会话） |
| 批量操作 | 需要多个 job | 一次 poll 搞定 |
| API 成本 | 每次都调用 | 可选择性响应 |
| 结果投递 | 灵活（announce/webhook） | 直接回复 |
| 适合频率 | 低频（小时/天） | 高频（分钟） |

**经验法则**：
- ✅ **Cron**：准时很重要（提醒、报告、定时任务）
- ✅ **Heartbeat**：需要上下文或批量检查（邮件+日历+RSS）
- ✅ **混合**：Cron 触发关键任务，Heartbeat 处理日常检查

## Cron Job 完全指南

### 1. Schedule 类型详解

#### 类型 1：at（一次性任务）

```json
{
  "schedule": {
    "kind": "at",
    "at": "2026-03-10T09:00:00.000Z"
  },
  "deleteAfterRun": true
}
```

**适用场景**：
- 临时提醒（"20 分钟后提醒我"）
- 证书到期提醒（固定日期）
- 一次性数据迁移

**注意事项**：
- ⚠️ 时间戳必须是 ISO 8601 格式
- ⚠️ **默认 UTC 时区**（无显式 timezone）
- ⚠️ 建议设置 `deleteAfterRun: true`（避免过期任务堆积）

#### 类型 2：every（固定间隔）

```json
{
  "schedule": {
    "kind": "every",
    "everyMs": 3600000,
    "anchorMs": 1709697600000
  }
}
```

**参数说明**：
- `everyMs`：间隔毫秒数（3600000 = 1 小时）
- `anchorMs`：起始时间戳（可选，默认为首次运行时间）

**适用场景**：
- 健康检查（每 5 分钟）
- 数据同步（每 30 分钟）
- 资源清理（每 12 小时）

**计算公式**：
```javascript
// 下次运行时间
nextRunMs = anchorMs + N * everyMs
```

**示例**：每 30 分钟运行一次

```json
{
  "schedule": {
    "kind": "every",
    "everyMs": 1800000
  }
}
```

#### 类型 3：cron（Cron 表达式）

```json
{
  "schedule": {
    "kind": "cron",
    "expr": "0 9 * * 1,3,5",
    "tz": "Asia/Shanghai"
  }
}
```

**表达式格式**：
```text
* * * * *
│ │ │ │ │
│ │ │ │ └─ 星期 (0-7, 0和7都是周日)
│ │ │ └─── 月份 (1-12)
│ │ └───── 日期 (1-31)
│ └─────── 小时 (0-23)
└───────── 分钟 (0-59)
```

**常用表达式**：

| 表达式 | 说明 |
|--------|------|
| `0 9 * * *` | 每天 9:00 |
| `0 */2 * * *` | 每 2 小时整点 |
| `0 9 * * 1` | 每周一 9:00 |
| `0 9 1 * *` | 每月 1 号 9:00 |
| `0 9 * * 1-5` | 工作日 9:00 |

**时区处理**：
- ✅ **强烈推荐设置 `tz`**（避免 UTC 混淆）
- ✅ 支持 IANA 时区（`Asia/Shanghai`, `America/New_York`）
- ⚠️ 不设置 `tz` 默认使用 UTC

**示例**：每周一、三、五上午 10:00（上海时间）

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

### 2. Payload 类型选择

#### systemEvent：注入主会话

```json
{
  "payload": {
    "kind": "systemEvent",
    "text": "提醒：SSL 证书将于 2026-05-12 到期"
  },
  "sessionTarget": "main"
}
```

**特点**：
- 注入到主会话（有上下文）
- 用户会在聊天中看到系统消息
- 可以触发后续对话

**适用场景**：
- 简单提醒
- 状态通知
- 触发主 agent 处理

**限制**：
- ⚠️ **必须** `sessionTarget: "main"`
- ⚠️ 不支持 `isolated` session

#### agentTurn：独立执行

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

**特点**：
- 独立隔离会话（无主会话上下文）
- 完整的 agent 执行能力
- 支持工具调用
- 可配置模型和超时

**适用场景**：
- 复杂任务（需要工具调用）
- 独立研究（监控、分析）
- 长时间任务（生成报告）

**参数说明**：
- `message`：任务描述（相当于用户消息）
- `model`：可选，覆盖默认模型
- `thinking`：可选，推理模式（`low`/`medium`/`high`）
- `timeoutSeconds`：可选，超时时间（0 = 无限）

**限制**：
- ⚠️ **必须** `sessionTarget: "isolated"`
- ⚠️ 不支持 `main` session

### 3. Delivery 模式详解

#### announce：发送到聊天

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

**参数说明**：
- `channel`：目标渠道（`telegram`/`discord`/`slack` 等）
- `to`：目标地址（格式：`<channel>:<id>`）
- `bestEffort`：可选，失败不影响任务状态

**适用场景**：
- 发送结果给用户
- 推送通知
- 多人协作

**注意事项**：
- ✅ 支持跨 channel 发送
- ⚠️ `to` 格式必须正确（`telegram:123456`）
- ⚠️ 检查目标是否有权限

#### webhook：POST 到 URL

```json
{
  "delivery": {
    "mode": "webhook",
    "to": "https://your-server.com/webhook",
    "bestEffort": false
  }
}
```

**Payload 格式**：
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

**适用场景**：
- 集成外部系统
- 触发后续流程
- 记录日志

#### none / 省略：静默执行

```json
{
  "delivery": {
    "mode": "none"
  }
}
```

**适用场景**：
- 后台清理任务
- 数据同步
- 不需要通知的任务

**默认行为**：
- `systemEvent` → 无 delivery
- `agentTurn` (isolated) → 默认 `announce`

### 4. 实战案例：技术趋势监控

**需求**：每周二、四、六上午 9:00 监控技术趋势，发现有趣话题时通知用户

**完整配置**：

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

**关键设计**：
1. ✅ 使用 `cron`（精确时间）而非 `every`（避免时间漂移）
2. ✅ `timeoutSeconds: 600`（10 分钟，足够完成搜索）
3. ✅ `bestEffort: true`（投递失败不影响任务状态）
4. ✅ Message 中明确 "如果...否则..."（避免每次都打扰）

**优化技巧**：
- 📊 **条件投递**：在 message 中指导 agent 判断是否值得通知
- 💾 **持久化**：不重要的发现保存到文件，避免刷屏
- ⏱️ **合理超时**：根据任务复杂度设置（简单 60s，复杂 600s）

### 5. 错误处理与重试

#### 查看任务状态

```bash
# 列出所有任务
openclaw cron list

# 查看特定任务的执行历史
openclaw cron runs --jobId <job-id>
```

**状态字段**：
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

**关键指标**：
- `lastRunStatus`：`ok` / `error` / `timeout`
- `consecutiveErrors`：连续失败次数
- `lastDurationMs`：执行耗时（优化依据）

#### 手动触发

```bash
# 立即执行（不等下次计划时间）
openclaw cron run --jobId <job-id>

# 强制执行（忽略上次状态）
openclaw cron run --jobId <job-id> --mode force
```

**适用场景**：
- 调试新任务
- 紧急执行
- 测试配置变更

#### 错误处理策略

**策略 1：优雅降级**

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

**策略 2：重试机制**

OpenClaw 本身不支持自动重试，但可以通过设计实现：

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

**策略 3：告警通知**

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

## Heartbeat 实战技巧

### 1. HEARTBEAT.md 编写技巧

**文件位置**：`<workspace>/HEARTBEAT.md`

**示例**：

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

**设计原则**：
1. ✅ **分组检查**：按星期轮流，避免每次都检查所有项
2. ✅ **清晰分类**：定期检查 vs 实时任务
3. ✅ **明确规则**：何时发送消息，何时静默
4. ✅ **控制频率**：避免过度打扰

### 2. 状态追踪实现

**状态文件**：`memory/heartbeat-state.json`

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

**读取和更新**：

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

**最佳实践**：
- ✅ 记录最后检查时间（避免重复检查）
- ✅ 记录告警状态（避免重复告警）
- ✅ 使用 Unix 时间戳（易于计算间隔）
- ✅ 定期清理过期状态

### 3. 批量检查示例

**场景**：每次 heartbeat 检查邮件、日历、天气

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

**优势**：
- ✅ 一次 poll 完成多个检查（节省 API 调用）
- ✅ 根据重要性设置不同检查频率
- ✅ 状态持久化（重启后不丢失）

### 4. 主动工作 vs 静默返回

**何时主动工作**（Heartbeat 中执行任务）：

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

**设计原则**：
- ✅ **低风险任务**：直接执行（整理文件、优化资源）
- ⚠️ **中风险任务**：记录日志，定期汇报（清理缓存、更新依赖）
- 🔴 **高风险任务**：立即通知（异常、告警、重要事件）

### 5. 频率控制策略

**问题**：Heartbeat 每 N 分钟 poll 一次，如何避免过度检查？

**方案 1：时间窗口**

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

**方案 2：星期轮换**

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

**方案 3：优先级队列**

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

## 混合策略：Cron + Heartbeat

### 案例：博客监控系统

**架构设计**：

```text
Cron Jobs（精确时间任务）
├─ 博客内容提案生成（周一、三、五 10:00）
├─ 技术趋势监控（周二、四、六 9:00）
├─ SSL 证书提醒（到期前 30 天）
└─ 每日系统巡查（每天 8:00）

Heartbeat（轮询检查）
├─ 网站可访问性（每 30 分钟）
├─ GitHub 同步状态（每 1 小时）
├─ Google Analytics（每天一次）
└─ Memory 整理（每天凌晨，主动工作）
```

**分工逻辑**：
- **Cron**：时间敏感任务（提案、监控、提醒）
- **Heartbeat**：状态检查 + 后台维护

### 配置示例

**Cron Job 1：博客内容提案**

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

**Cron Job 2：SSL 证书提醒**

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

**Heartbeat（HEARTBEAT.md）**：

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

## 错误处理与可靠性

### 1. 超时处理

**问题**：任务执行时间过长

**方案**：

```json
{
  "payload": {
    "kind": "agentTurn",
    "message": "执行数据分析。如果 5 分钟内无法完成，先返回部分结果。",
    "timeoutSeconds": 300
  }
}
```

**设计技巧**：
- ✅ 在 message 中明确超时策略
- ✅ 设置合理的 `timeoutSeconds`
- ✅ 部分结果 > 完全失败

### 2. 投递失败

**问题**：Telegram 投递失败（网络问题、bot 被封）

**方案 1：bestEffort**

```json
{
  "delivery": {
    "mode": "announce",
    "to": "telegram:YOUR_TELEGRAM_ID",
    "bestEffort": true
  }
}
```

**方案 2：Webhook 备份**

```json
{
  "delivery": {
    "mode": "webhook",
    "to": "https://your-server.com/cron-results"
  }
}
```

**方案 3：文件备份**

```text
// Message 中指示
如果 Telegram 投递失败，将结果写入 /workspace/cron-results/YYYY-MM-DD.md
```

### 3. 状态一致性

**问题**：Heartbeat 状态文件损坏

**解决方案**：

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

### 4. 监控与告警

**Cron Job 健康检查**：

```bash
# 检查连续失败次数
openclaw cron list --json | jq '.jobs[] | select(.state.consecutiveErrors > 3)'

# 检查上次执行时间（超过 24 小时未执行）
openclaw cron list --json | jq '.jobs[] | select(.state.lastRunAtMs < (now - 86400000))'
```

**自动告警**：

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

## 性能优化与成本控制

### 1. 减少 API 调用

**策略 1：批量检查**（Heartbeat）

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

**成本对比**：
- 方案 1：3 个 Cron Jobs × 48 次/天 = 144 次调用
- 方案 2：1 个 Heartbeat × 48 次/天 = 48 次调用（节省 67%）

**策略 2：条件触发**

```text
// Message 中包含条件
检查邮件。如果没有重要邮件，返回 HEARTBEAT_OK（不计费）。
只有发现重要邮件时才生成详细回复。
```

**策略 3：增量检查**

```typescript
// 只检查新增数据
const lastCheckTime = state.lastChecks.email;
const emails = await gmail.listMessages({
  q: `after:${lastCheckTime} is:unread`
});
```

### 2. 模型选择

**场景 1：简单检查**

```json
{
  "payload": {
    "kind": "agentTurn",
    "message": "检查网站是否可访问（curl https://example.com）",
    "model": "anthropic/claude-haiku-3-5"
  }
}
```

**成本**：Haiku ≈ $0.25/1M tokens（Sonnet 的 1/12）

**场景 2：复杂分析**

```json
{
  "payload": {
    "kind": "agentTurn",
    "message": "分析 GitHub Trending，生成博客提案",
    "model": "anthropic/claude-sonnet-4"
  }
}
```

**策略**：
- ✅ 检查任务 → Haiku
- ✅ 分析任务 → Sonnet
- ✅ 复杂推理 → Opus（仅在必要时）

### 3. 频率优化

**原则**：根据重要性设置频率

| 任务 | 频率 | 理由 |
|------|------|------|
| SSL 证书检查 | 每天 | 提前 30 天提醒足够 |
| 邮件检查 | 每 30 分钟 | 平衡实时性和成本 |
| 趋势监控 | 每周 3 次 | 趋势变化较慢 |
| 网站健康检查 | 每 5 分钟 | 关键服务，需要快速发现问题 |

**成本计算**：

```text
每月成本 = 频率 × 每次 token 数 × 模型价格

示例：邮件检查
- 频率：48 次/天 × 30 天 = 1440 次/月
- Token：平均 500 tokens/次
- 模型：Haiku ($0.25/1M tokens)
- 成本：1440 × 500 × 0.25 / 1000000 = $0.18/月
```

### 4. 缓存策略

**场景**：GitHub Trending 数据

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

**适用场景**：
- ✅ 数据变化慢（趋势、统计）
- ✅ API 有速率限制
- ✅ 查询成本高

## 最佳实践总结

### ✅ Do

1. **选择合适的机制**
   - 精确时间 → Cron
   - 批量检查 → Heartbeat
   - 混合使用 → 最佳效果

2. **设置合理超时**
   - 简单任务：60s
   - 复杂任务：300s
   - 长时间任务：600s

3. **优雅降级**
   - 部分失败 ≠ 完全失败
   - 备份方案（webhook、文件）
   - 状态持久化

4. **成本优化**
   - 批量检查（Heartbeat）
   - 条件触发（HEARTBEAT_OK）
   - 选择合适模型（Haiku vs Sonnet）

5. **监控与告警**
   - 定期检查任务状态
   - 连续失败告警
   - 执行时间监控

### ❌ Don't

1. **不要过度轮询**
   - ❌ 每分钟检查邮件（太频繁）
   - ✅ 每 30 分钟检查一次

2. **不要忽略时区**
   - ❌ 使用 UTC（容易搞混）
   - ✅ 明确设置 `tz: "Asia/Shanghai"`

3. **不要硬编码**
   - ❌ `to: "telegram:123456"`
   - ✅ 配置文件 / 环境变量

4. **不要忽略错误**
   - ❌ 失败了就失败了
   - ✅ 记录日志、告警、重试

5. **不要滥用 main session**
   - ❌ 所有任务都用 systemEvent
   - ✅ 复杂任务用 isolated session

## 实战工具脚本

### 1. 批量创建 Cron Jobs

```bash
#!/bin/bash
# create-cron-jobs.sh

# 博客内容提案
openclaw cron add << 'EOF'
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
    "message": "生成技术博客提案...",
    "timeoutSeconds": 300
  },
  "delivery": {
    "mode": "announce",
    "to": "telegram:YOUR_TELEGRAM_ID"
  }
}
EOF

# 技术趋势监控
openclaw cron add << 'EOF'
{
  "name": "技术趋势监控",
  "agentId": "blog",
  "schedule": {
    "kind": "cron",
    "expr": "0 9 * * 2,4,6",
    "tz": "Asia/Shanghai"
  },
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "message": "监控技术趋势...",
    "timeoutSeconds": 600
  },
  "delivery": {
    "mode": "announce",
    "to": "telegram:YOUR_TELEGRAM_ID"
  }
}
EOF

echo "✅ Cron jobs 创建完成"
openclaw cron list
```

### 2. 健康检查脚本

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
  select(.state.lastRunAtMs < ($now | tonumber - 86400) * 1000) |
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

### 3. 成本估算脚本

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

## 总结

OpenClaw 的 Cron 和 Heartbeat 机制为 AI Agent 提供了强大的自动化能力：

**核心原则**：
1. **选型清晰**：精确时间用 Cron，批量检查用 Heartbeat
2. **成本优化**：批量检查、条件触发、选择合适模型
3. **可靠性优先**：超时处理、错误告警、状态持久化
4. **监控完善**：健康检查、执行时间、连续失败

**实战经验**：
- ✅ Cron 适合低频、独立的定时任务
- ✅ Heartbeat 适合高频、批量的状态检查
- ✅ 混合策略：Cron 触发关键任务，Heartbeat 维护日常
- ✅ 主动工作：让 Agent 在后台默默完成低风险任务

**下一步**：
- 尝试创建第一个 Cron Job
- 编写 HEARTBEAT.md 清单
- 实现状态追踪（heartbeat-state.json）
- 定期检查任务健康状态

从简单的提醒开始，逐步构建你的 24/7 智能助手系统！

---

**相关阅读**：
- [OpenClaw 入门实战：5分钟搭建你的自托管 AI 助手](https://example.com/posts/openclaw-getting-started/) - OpenClaw 基础使用指南
- [AI Agent 记忆系统实战：OpenClaw Memory 最佳实践](https://example.com/posts/blog074_openclaw-memory-best-practices/) - Memory 系统配合自动化使用

**延伸阅读**：
- [OpenClaw 官方文档 - Cron Jobs](https://docs.openclaw.ai/tools/cron)
- [OpenClaw 官方文档 - Heartbeat](https://docs.openclaw.ai/guides/heartbeat)
- [Cron 表达式在线生成器](https://crontab.guru/)
