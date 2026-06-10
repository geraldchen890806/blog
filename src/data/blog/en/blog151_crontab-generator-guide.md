---
author: Gerald Chen
pubDatetime: 2026-04-27T10:00:00+08:00
title: "Tool Guide 49: Online Crontab Generator"
slug: blog151_crontab-generator-guide
featured: false
draft: true
reviewed: false
approved: false
tags:
  - 工具指南
  - 工具
description: "How to use the online Crontab Generator, covering crontab's five-field syntax, special characters (`/`, `,`, `-`, `*`, `?`), common scenario templates (overnight backups, weekday notifications, monthly billing), and how to use the generated expressions on Linux servers and in GitHub Actions."
---

The easiest mistake to make when writing crontab is getting the field order wrong.

`0 9 * * 1-5` and `9 0 * * 1-5` — one means "9 AM every weekday," the other means "12:09 AM every weekday." The two expressions look almost identical, but their meanings are completely different.

The order and meaning of crontab's five fields (minute, hour, day, month, weekday) have to be memorized, and even after years of writing them, it's easy to slip up in scenarios you don't use often. The [online Crontab Generator](https://anyfreetools.com/tools/crontab-generator) provides a visual interface: pick the frequency, time, and recurrence rules, and it generates the correct crontab expression automatically — with a live preview of the next 5 run times — eliminating the risk of hand-writing errors entirely.

## The Five-Field Crontab Syntax

A crontab expression consists of five fields separated by spaces:

```
* * * * *
│ │ │ │ └── Weekday (0-7, both 0 and 7 mean Sunday)
│ │ │ └──── Month (1-12)
│ │ └────── Day of month (1-31)
│ └──────── Hour (0-23)
└────────── Minute (0-59)
```

Mnemonic: **minute, hour, day, month, weekday** — from the smallest unit (minute) up to the largest (month), with weekday last.

Each field can be:
- `*`: any value ("every")
- A specific number: `5` (the 5th minute, the 5th day, May...)
- A range: `1-5` (1 through 5, inclusive)
- A list: `1,3,5` (the 1st, 3rd, and 5th)
- A step: `*/15` (every 15 units)
- A combination: `1-5/2` (1 through 5, every 2 — i.e., 1, 3, 5)

## Special Characters Explained

### `*` (asterisk) — Any Value

```
* * * * *    Run every minute
0 * * * *    Run at the top of every hour
0 0 * * *    Run at midnight every day
```

### `/` (slash) — Step

```
*/5 * * * *        Run every 5 minutes (0, 5, 10, 15...)
*/15 * * * *       Run every 15 minutes
0 */2 * * *        Run every 2 hours on the hour (0:00, 2:00, 4:00...)
0 9-17/2 * * *     Run every 2 hours from 9 to 17 (9:00, 11:00, 13:00, 15:00, 17:00)
```

### `,` (comma) — List

```
0 9,18 * * *       Run at 9:00 and 18:00 every day
0 0 1,15 * *       Run at midnight on the 1st and 15th of every month
0 0 * * 1,3,5      Run at midnight on Monday, Wednesday, and Friday
```

### `-` (hyphen) — Range

```
0 9-17 * * *       Run on the hour from 9:00 to 17:00 every day
0 0 * * 1-5        Run at midnight Monday through Friday (weekdays)
0 0 * * 6-7        Run at midnight on Saturday and Sunday (weekends)
```

### Combinations

```
5,35 9-18 * * 1-5     Run at 9:05, 9:35, 10:05, 10:35... 18:05, 18:35 on weekdays
0 */4 * * *           Run every 4 hours on the hour (0:00, 4:00, 8:00, 12:00, 16:00, 20:00)
30 8 1 * *            Run at 8:30 on the 1st of every month
```

## Tool Interface Overview

Open [https://anyfreetools.com/tools/crontab-generator](https://anyfreetools.com/tools/crontab-generator) — the interface is divided into three areas:

**Frequency selector**: Quick options for common frequencies (every minute, hourly, daily, weekly, monthly, yearly). Selecting one auto-fills the corresponding fields — ideal for quickly generating standard expressions.

**Fine-grained configuration**: Each of the five fields (minute, hour, day, month, weekday) has its own input, supporting direct numbers, range selection, and checkbox-style lists. Every field validates input in real time, with hints showing the valid range as you type.

**Preview area**: Shows the generated expression in real time, plus the next 5 run times (down to the second), so you can confirm the schedule matches your intent before deploying — far more intuitive than working out "when will the next few runs be" by hand.

## Common Scenario Templates

### Scenario 1: Daily Database Backup

Requirement: run the backup script at 3 AM every day — a low-traffic window, away from working hours.

```
0 3 * * *
```

Explanation: minute=0, hour=3, everything else is `*` (every day, every month, any weekday). Next run times: 3:00 AM today, 3:00 AM tomorrow...

To add it on the server:

```bash
# 编辑当前用户的 crontab
crontab -e

# 添加任务
0 3 * * * /opt/scripts/backup.sh >> /var/log/backup.log 2>&1
```

`>> /var/log/backup.log 2>&1` appends both stdout and stderr to the log file, making it easy to investigate failures.

### Scenario 2: Weekday Daily Report Notifications

Requirement: send a report notification at 9 AM, Monday through Friday.

```
0 9 * * 1-5
```

Explanation: minute=0, hour=9, weekday=1-5 (Monday through Friday). No trigger on Saturday or Sunday.

### Scenario 3: Polling Every 15 Minutes

Requirement: check the task queue every 15 minutes and process pending scheduled jobs.

```
*/15 * * * *
```

Next run times: XX:00, XX:15, XX:30, XX:45 — 4 triggers per hour.

### Scenario 4: Monthly Billing on the 1st

Requirement: send last month's bill at 10 AM on the 1st of every month.

```
0 10 1 * *
```

Explanation: minute=0, hour=10, day=1, with month and weekday both `*` (any month, any day of the week).

### Scenario 5: Full Sync Every Sunday Night

Requirement: run a full data sync at 2 AM every Sunday, with only incremental syncs on weekdays.

```
0 2 * * 0
```

Explanation: weekday=0 (Sunday). Note: in the weekday field, both 0 and 7 mean Sunday — `* * * * 0` and `* * * * 7` are equivalent.

### Scenario 6: Multiple Runs Per Day

Requirement: run a heartbeat check at 8 AM, noon, and 5 PM.

```
0 8,12,17 * * *
```

### Scenario 7: Once Per Quarter

Requirement: run a quarterly summary at midnight on the first day of each quarter.

```
0 0 1 1,4,7,10 *
```

Explanation: the month list is 1 (January), 4 (April), 7 (July), and 10 (October) — exactly the starting months of the four quarters.

## Using It in GitHub Actions

The `schedule` trigger in GitHub Actions uses standard crontab syntax, but there's a common pitfall: **the timezone is fixed to UTC**, so you have to convert from local time.

```yaml
name: Daily Report

on:
  schedule:
    # 北京时间 9:00 = UTC 1:00
    - cron: "0 1 * * *"
  workflow_dispatch:  # 同时支持手动触发

jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - name: Run report script
        run: node scripts/daily-report.js
```

The generator lets you switch timezones — select "UTC" and you get an Actions-ready expression directly, no manual conversion needed.

GitHub Actions has a minimum scheduling interval of 5 minutes (`*/5 * * * *`); anything more frequent gets throttled to once every 5 minutes.

## Using Cron Expressions in Node.js

If you need scheduled tasks in a Node.js service, the `node-cron` library reuses crontab expressions directly:

```bash
npm install node-cron
```

```typescript
import cron from "node-cron";

// 每天凌晨 3 点执行备份
cron.schedule("0 3 * * *", () => {
  console.log("Running backup...");
  runBackup();
});

// 每 15 分钟处理队列
cron.schedule("*/15 * * * *", () => {
  processQueue();
});

// 工作日早上 9 点发报告
cron.schedule("0 9 * * 1-5", async () => {
  await sendDailyReport();
});
```

`node-cron` supports the standard five-field crontab format as well as an extended six-field format (the first field is seconds, range 0-59) for when you need second-level precision:

```typescript
// 六字段格式：秒 分 时 日 月 周
// 每 30 秒执行一次
cron.schedule("*/30 * * * * *", () => {
  checkHealth();
});
```

## Online Tool vs. Writing by Hand

**Better suited to the online generator**:
- When you're not fluent in crontab syntax (infrequent ops work)
- Debugging scenarios where you need to confirm "when the next few runs will be"
- Generating complex list/range combinations (like `5,15,25,35,45,55 9-17 * * 1-5`)
- Cross-timezone conversion (local time → UTC)

**Better suited to writing by hand**:
- Simple on-the-hour/daily/weekly rules (familiar patterns like `0 0 * * *`)
- Annotated entries in CI/CD scripts (where templates already exist)

The tool's biggest value isn't writing the expression for you — it's **verification**. The "next 5 run times" preview catches frequency mistakes before deployment, which is far less painful than discovering after the fact, via the logs, that a job didn't run as expected.

## Common Mistakes, Side by Side

```
# Wrong: wanted every 5 minutes, wrote the 5th second of every minute (standard crontab has no seconds field)
5 * * * *      ← This is "the 5th minute of every hour," not every 5 minutes

# Correct: every 5 minutes
*/5 * * * *

# Wrong: wanted weekdays, wrote 1-5 but forgot the field order
* * * * 1-5    ← This is correct (the weekday field comes last)
* * 1-5 * *    ← This is "the 1st through 5th of every month," not weekdays

# Wrong: no timezone conversion — wanted 9 AM Beijing time, wrote 9 AM in UTC+8 terms
0 9 * * *      ← In a UTC timezone this is 9 AM UTC, which is 5 PM Beijing time
0 1 * * *      ← This is 9 AM Beijing time (1 AM UTC)
```

---

Related tools:
- [Tool Guide 12: Online Cron Expression Parser](/en/posts/blog100_cron-parser-guide/) (the reverse tool: input an expression, get its meaning)
- [Online Crontab Generator](https://anyfreetools.com/tools/crontab-generator)
