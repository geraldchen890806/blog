---
author: Gerald Chen
pubDatetime: 2026-03-25T14:00:00+08:00
title: "Tool Guide 12: Online Cron Expression Parser"
slug: blog100_cron-parser-guide
featured: false
draft: true
reviewed: true
approved: true
tags:
  - 工具指南
  - 工具
  - 自动化
description: "A deep dive into cron expression syntax and common patterns, plus an online cron parser that helps you quickly validate and understand your scheduled task configurations."
---

If you've ever written a scheduled job, chances are cron expressions have given you grief. Does `0 */2 * * *` mean every two hours or every two minutes? Does `15 10 * * 1-5` include Friday or not? You can always look these things up in the docs, but doing that every single time gets old fast.

This post walks through the complete cron expression syntax first, then introduces an online parser that shows you the next run times the moment you finish typing — no more mental simulation.

## Cron Expression Basics

### The Standard Five-Field Format

A standard Unix cron expression consists of 5 space-separated fields:

```
┌──────── minute (0-59)
│ ┌────── hour (0-23)
│ │ ┌──── day of month (1-31)
│ │ │ ┌── month (1-12)
│ │ │ │ ┌ day of week (0-7, both 0 and 7 mean Sunday)
│ │ │ │ │
* * * * *
```

Each field supports the following notations:

| Symbol | Meaning | Example |
|------|------|------|
| `*` | Any value | `* * * * *` every minute |
| `,` | List | `1,15,30 * * * *` at minutes 1, 15, and 30 |
| `-` | Range | `0 9-17 * * *` on the hour from 9 to 17 |
| `/` | Step | `*/5 * * * *` every 5 minutes |

### The Parts That Trip People Up

**Where the day-of-week field starts.** Different systems define the weekday numbering slightly differently:

- Standard crontab: 0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday, and 7 is also Sunday
- Some extended formats (such as Quartz): 1 = Sunday, 2 = Monday, ..., 7 = Saturday

In my testing, most Linux distributions (Ubuntu 22.04, CentOS 7) follow the standard definition — both 0 and 7 mean Sunday. So `1-5` is Monday through Friday, Friday included. If you're using Java's Quartz framework or Spring's `@Scheduled`, watch out: their weekday numbering starts at 1 (1 = Sunday), so the same `1-5` means something completely different in Quartz.

**Day-of-month and day-of-week are OR'd together.** When both the day-of-month field and the day-of-week field are set to non-`*` values, crontab treats them as "OR", not "AND":

```bash
# 这条表达式的含义是：每月15号 或 每周一，都会执行
0 9 15 * 1
```

This is not "the 15th of the month AND a Monday." Plenty of people get burned here. If you need "AND" semantics (e.g. "the first Monday of each month"), standard crontab can't express it — you'll need an extra check inside your script.

## Quick Reference: Common Expressions

Here are the patterns you'll reach for most often:

```bash
# 每天凌晨2点执行数据库备份
0 2 * * *

# 工作日（周一到周五）上午9:30
30 9 * * 1-5

# 每5分钟检查一次服务健康状态
*/5 * * * *

# 每月1号和15号零点执行
0 0 1,15 * *

# 每周日凌晨3点清理日志
0 3 * * 0

# 每小时的第30分钟
30 * * * *

# 每季度第一天（1月、4月、7月、10月的1号）
0 0 1 1,4,7,10 *
```

### A Real-World Scenario: Log Rotation

Say you need to set up a log rotation job: hourly on weekdays, every 6 hours on weekends. Standard crontab can't express that kind of conditional branching in a single line, so you write two:

```bash
# 工作日每小时
0 * * * 1-5 /usr/local/bin/rotate-logs.sh --mode hourly

# 周末每6小时
0 */6 * * 0,6 /usr/local/bin/rotate-logs.sh --mode relaxed
```

Splitting like this is common, but also error-prone — especially when you update one line and forget the other.

## An Online Cron Parser

The biggest problem with hand-writing cron expressions is the lack of immediate feedback. After you write one, you either wait for it to actually fire (which could take hours or even days), or you simulate the execution in your head. Neither is efficient.

[The AnyFreeTools Cron Parser](https://anyfreetools.com/tools/cron-parser) offers a straightforward fix:

### Core Features

**Real-time parsing**: as soon as you type an expression, the tool translates it into a plain-language description. Enter `30 9 * * 1-5` and it shows "At 9:30 AM, Monday through Friday." That's much faster than staring at five fields and working it out in your head.

**Next-run preview**: the tool lists the upcoming execution times. This is especially handy for confirming an expression behaves as you expect. Say you wrote `0 */2 * * *` and want to verify it runs every 2 hours starting from midnight — one glance at the preview list and you know.

**Timezone support**: timezones are another classic scheduling pitfall. The server is in UTC, you're in UTC+8 — whose 9 AM does `0 9 * * *` mean? The tool lets you switch timezones to view execution times, so you catch the offset before it bites you.

### Use Cases

**Use case 1: scheduled CI/CD builds**

You configure a scheduled trigger in GitHub Actions:

```yaml
on:
  schedule:
    - cron: '0 2 * * 1'
```

GitHub Actions uses UTC. If you're in UTC+8 and want it to run at 10 AM Monday (UTC+8), the right expression is `0 2 * * 1` (2 AM UTC = 10 AM UTC+8). Switch the timezone in the tool to verify, instead of discovering the time is wrong after it ships.

**Use case 2: Kubernetes CronJob**

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: db-backup
spec:
  schedule: "0 18 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:15
            command: ["/bin/sh", "-c", "pg_dump -h db-host -U backup_user mydb > /backup/db-$(date +%Y%m%d).sql"]
          restartPolicy: OnFailure
```

K8s CronJobs also use UTC. If your database backup should run during off-peak hours (say 2 AM Beijing time), the schedule should be `0 18 * * *` (18:00 UTC corresponds to 2:00 AM Beijing time the next day — note the date rolls forward).

**Use case 3: debugging production issues**

A crontab job in production is firing at times the logs say it shouldn't. Paste the expression into the tool and you immediately see its actual schedule — far quicker than running `man 5 crontab` in a terminal and doing the arithmetic yourself.

## Going Further: 6-Field and 7-Field Formats

Standard Unix crontab uses 5 fields, but some frameworks extend the format:

**6-field format** (second-level precision):

```
┌──────── second (0-59)
│ ┌────── minute (0-59)
│ │ ┌──── hour (0-23)
│ │ │ ┌── day of month (1-31)
│ │ │ │ ┌ month (1-12)
│ │ │ │ │ ┌ day of week (0-7)
│ │ │ │ │ │
* * * * * *
```

Node.js's `node-cron` library and some job schedulers support this format. Note that standard Linux crontab does not support second-level precision. Different libraries may also define the 6-field format differently (e.g. whether the seconds field supports `/` steps), so check the specific library's docs before relying on it.

**7-field format** (with a year field):

Spring and Quartz support appending a year field at the end, but it's rarely used in practice. Five fields cover the vast majority of cases.

## Practical Tips for Debugging Cron

### Inspect current jobs with `crontab -l`

```bash
# 查看当前用户的 crontab
crontab -l

# 查看特定用户的 crontab（需要 root 权限）
crontab -l -u www-data
```

### Check the cron logs

```bash
# Ubuntu/Debian
grep CRON /var/log/syslog | tail -20

# CentOS/RHEL
cat /var/log/cron | tail -20
```

### Common reasons cron "doesn't run"

1. **Missing environment variables**: the cron execution environment differs from your shell — `PATH` may not include the directories you're used to. Fix it by using absolute paths in your scripts, or declaring `PATH` at the top of the crontab.

2. **Permission problems**: the script isn't executable (`chmod +x`), or the directory it writes to isn't writable by the current user.

3. **Unredirected output**: by default, cron emails output (if an MTA is configured). If there's no MTA, the output is simply lost. Redirect explicitly:

```bash
# 标准输出和错误输出都记录到日志
0 2 * * * /path/to/script.sh >> /var/log/my-cron.log 2>&1
```

4. **Timezone confusion**: as mentioned earlier, the server's timezone may not match the one you assumed. Use the `date` command to confirm the server's current time.

## Wrapping Up

Cron syntax itself isn't complicated, but there are plenty of places where real-world usage goes wrong: weekday numbering, the "OR" relationship between day-of-month and day-of-week, timezone offsets, missing environment variables. Relying on memory for these is risky — verifying with a tool is the safer bet.

The [online cron parser](https://anyfreetools.com/tools/cron-parser) lets you quickly validate expressions, preview run times, and chase down timezone issues. Running your expression through the tool first beats deploying it and waiting hours to find out it's wrong.

**Further reading**:
- [crontab.guru](https://crontab.guru/) - another popular online cron validator with a clean interface
- [crontab(5) man page](https://man7.org/linux/man-pages/man5/crontab.5.html) - the official Linux crontab documentation

---

**Other posts in this series**:
- [Tool Guide 1: Online Image Compression](/en/posts/blog084_image-compress-guide/)
- [Tool Guide #2: Online JSON Formatter](/en/posts/blog085_json-formatter-guide/)
- [Tool Guide #3: Online Regex Tester](/en/posts/blog086_regex-tester-guide/)
- [Tool Guide 4: QR Code Generator](/en/posts/blog089_qrcode-generator-guide/)
- [Tool Guide 5: Base64 Encoder/Decoder](/en/posts/blog090_base64-tool-guide/)
- [Tool Guide 6: Online JWT Decoder](/en/posts/blog092_jwt-decoder-guide/)
- [Tool Guide 7: Unix Timestamp Converter](/en/posts/blog094_timestamp-tool-guide/)
- [Tool Guide 8: Online Password Generator](/en/posts/blog095_password-generator-guide/)
- [Tool Guide 9: URL Encoder/Decoder](/en/posts/blog096_url-encoder-guide/)
- [Tool Guide 10: Online Hash Generator](/en/posts/blog097_hash-generator-guide/)
- [Tool Guide 11: JSON to TypeScript Type Generator](/en/posts/blog099_json-to-typescript-guide/)
