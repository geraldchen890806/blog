---
author: Gerald Chen
pubDatetime: 2026-03-20T14:00:00+08:00
title: "Tool Guide 7: Unix Timestamp Converter"
slug: blog094_timestamp-tool-guide
featured: false
draft: true
reviewed: true
approved: true
tags:
  - 工具指南
  - 工具
  - 前端
description: "A deep dive into Unix timestamps: how they work, common pitfalls, and real-world use cases — covering time zones, the Year 2038 problem, and conversion in multiple languages."
---

Almost every developer has been here: the backend returns `1710921600`, you stare at it for three seconds, and you have no idea what day or time that is. Or the other way around — you need to pass a time parameter to an API, so you have to turn "March 20, 2026, 2 PM" into a Unix timestamp, and off you go to search "timestamp converter" in your browser.

This happens more often than you'd think. Log debugging, API testing, database queries, cron job configuration — timestamps are everywhere. This post starts from first principles, explains the design logic behind Unix timestamps and the common pitfalls, and shares some practical tips along the way.

## What a Unix Timestamp Really Is

The definition of a Unix timestamp is simple: **the number of seconds elapsed since 00:00:00 UTC on January 1, 1970**.

So `0` is 1970-01-01T00:00:00Z, `86400` is 1970-01-02T00:00:00Z (there are 86400 seconds in a day), and the current time as you read this article is a ten-digit number starting with `17`.

The design comes from the Unix operating system. Times before 1970 are represented as negative numbers — for example, `-86400` is 1969-12-31T00:00:00Z.

### Why Timestamps Instead of Date Strings

Intuitively, `"2026-03-20 14:00:00"` is easier to read than `1773986400`. But in system design, timestamps have several clear advantages:

**Unambiguous**: Which time zone is `"2026-03-20 14:00:00"` in? No idea. But `1773986400` points to one specific moment, identical everywhere on the planet.

**Easy to compute with**: Subtract two timestamps and you get the difference in seconds. Checking whether "A is after B" is just an integer comparison. With date strings, you'd have to parse first, then compute.

**Compact storage**: A 32-bit integer takes 4 bytes; an ISO 8601 date string takes at least 19. At scale, the difference adds up fast.

**Efficient sorting**: Sorting integers is far faster than sorting strings, and database indexes on integer columns are more efficient too.

That's why backend systems and databases generally store time as timestamps and only convert to a human-readable format for display.

## Seconds vs. Milliseconds: Don't Mix Them Up

This is one of the most common pitfalls. Different systems and languages use different timestamp precisions:

| Precision | Digits | Example | Common usage |
|------|------|------|----------|
| Seconds | 10 | `1773986400` | Unix/Linux, PHP, Python `time.time()` |
| Milliseconds | 13 | `1773986400000` | JavaScript `Date.now()`, Java `System.currentTimeMillis()` |
| Microseconds | 16 | `1773986400000000` | Python `time.time_ns() // 1000`, high-precision database records |
| Nanoseconds | 19 | `1773986400000000000` | Go `time.Now().UnixNano()`, high-precision timing |

In practice, the most frequent mix-up is seconds vs. milliseconds. Quick check: **count the digits**. 10 digits means seconds, 13 means milliseconds.

A classic bug: the frontend grabs a millisecond timestamp with `Date.now()` and sends it to the backend, the backend parses it as seconds, and the date ends up somewhere around the year 58000 AD. The reverse happens too — the backend returns a second-level timestamp, the frontend passes it straight to `new Date()` without multiplying by 1000, and the UI shows 1970.

[The AnyFreeTools timestamp converter](https://anyfreetools.com/tools/timestamp) automatically detects whether your input is in seconds or milliseconds, saving you the manual check.

## Time Zones: Where Timestamps Go Wrong Most Often

A timestamp itself is UTC — it has no concept of a time zone. But the moment you convert a timestamp into a readable date, time zones enter the picture.

Take the timestamp `1773986400`:
- In UTC it's `2026-03-20 06:00:00`
- In Beijing time (UTC+8) it's `2026-03-20 14:00:00`
- In New York time (UTC-4, daylight saving) it's `2026-03-20 02:00:00`

One timestamp, three different "date-times". That's not a bug — that's just what time zones are.

### Common Time Zone Problems

**Inconsistent server time zones**: Your frontend server is in UTC+8, the backend is in UTC, and the database is on the US West Coast. The same timestamp converted to local time in different services doesn't line up, which makes log debugging confusing.

**Daylight saving time**: The US shifts clocks every March and November. A cron job scheduled for "2 AM every day" might not run on the switchover day (2 AM gets skipped) or might run twice (2 AM happens twice).

**Implicit time zone conversion in Date objects**:

```javascript
// 这两行代码的结果可能不同
const d1 = new Date("2026-03-20");           // 解析为 UTC 00:00
const d2 = new Date("2026-03-20T00:00:00");  // 解析为本地时区 00:00

console.log(d1.getTime() === d2.getTime());  // false（如果你不在 UTC 时区）
```

JavaScript's `Date` constructor handles time zones inconsistently depending on the date string format. This design is widely regarded as one of the most counterintuitive parts of date handling in JS.

### Best Practices

1. **Always store and transmit UTC timestamps**, and convert to the user's time zone only for display
2. **Document the timestamp precision explicitly in your API docs** (seconds or milliseconds)
3. **Use UTC consistently in logs** to make cross-time-zone debugging easier
4. **Avoid relying on server local time**; sync with NTP

## Working with Timestamps in Different Languages

### JavaScript

```javascript
// 获取当前时间戳（毫秒）
const nowMs = Date.now();
const nowSec = Math.floor(Date.now() / 1000);

// 时间戳转日期
const date = new Date(1773986400 * 1000);  // 注意乘 1000
console.log(date.toISOString());           // "2026-03-20T06:00:00.000Z"
console.log(date.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }));
// "2026/3/20 14:00:00"

// 日期转时间戳
const ts = new Date("2026-03-20T14:00:00+08:00").getTime() / 1000;
```

### Python

```python
import time
from datetime import datetime, timezone, timedelta

# 获取当前时间戳
now = int(time.time())

# 时间戳转日期
dt = datetime.fromtimestamp(1773986400, tz=timezone.utc)
print(dt.isoformat())  # "2026-03-20T06:00:00+00:00"

# 日期转时间戳
dt = datetime(2026, 3, 20, 14, 0, 0, tzinfo=timezone(timedelta(hours=8)))
ts = int(dt.timestamp())
```

### Go

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    // 获取当前时间戳
    now := time.Now().Unix()

    // 时间戳转日期
    t := time.Unix(1773986400, 0)
    fmt.Println(t.UTC().Format(time.RFC3339))

    // 日期转时间戳
    loc, _ := time.LoadLocation("Asia/Shanghai")
    t2 := time.Date(2026, 3, 20, 14, 0, 0, 0, loc)
    fmt.Println(t2.Unix())
}
```

### Bash

```bash
# 获取当前时间戳
date +%s

# 时间戳转日期（macOS）
date -r 1773986400

# 时间戳转日期（Linux）
date -d @1773986400

# 日期转时间戳（Linux，注意带时区）
date -d "2026-03-20T14:00:00+08:00" +%s
```

Of course, for a quick one-off lookup there's no need to open a terminal and write code. Just open the [AnyFreeTools timestamp converter](https://anyfreetools.com/tools/timestamp), paste the timestamp, and see the result — with automatic detection of seconds vs. milliseconds.

## The Year 2038 Problem: The End of 32-Bit Time

If you've ever used a 32-bit system, you may have heard of the "Y2K38" problem. The maximum value of a 32-bit signed integer is `2147483647`, which corresponds to **January 19, 2038, 03:14:07 UTC**. Past that moment, a 32-bit timestamp overflows and wraps around to 1901.

This isn't hypothetical. As of 2023, there were already reports of embedded devices and legacy databases hitting 2038-related bugs simply by computing future dates in advance.

Modern systems have largely migrated to 64-bit timestamps. A 64-bit signed integer can represent dates up to roughly 292 billion years from now — plenty. But if any of the following applies to a system you maintain, take note:

- Database columns storing timestamps as `INT(32)`
- C code using `time_t` compiled for a 32-bit target
- Embedded systems or IoT devices running 32-bit firmware

The check is simple: try storing `2147483648` (a timestamp past 2038) and see whether the system handles it correctly.

## Practical Use Cases

### Log Debugging

Production breaks and you need to find "the logs between 15:23:45 and 15:24:10". Convert both times to timestamps first, then filter your logging system by timestamp range. Much faster than scrolling through logs by hand.

### Cache Expiration

Redis's `EXPIREAT` command takes a Unix timestamp:

```bash
# 设置 key 在 2026-03-21 00:00:00 UTC（北京时间 08:00）过期
redis-cli EXPIREAT mykey 1774051200
```

### Scheduled Jobs

A system's cron jobs may need to compute the next run time from a timestamp. For example, "run every 7 days" is just the last run's timestamp plus `604800` (the number of seconds in 7 days).

### JWT Expiration

JWT's `exp` (expiration) and `iat` (issued at) fields are both Unix timestamps (in seconds). When debugging JWTs, you often need to convert these fields to readable times to confirm whether a token has expired. It pairs well with a [JWT decoder](https://anyfreetools.com/tools/jwt-decoder).

### Database Time Queries

```sql
-- 查询最近 24 小时的订单（假设 created_at 存的是秒级时间戳）
SELECT * FROM orders
WHERE created_at > UNIX_TIMESTAMP() - 86400;

-- MySQL: 时间戳转日期
SELECT FROM_UNIXTIME(1773986400);

-- PostgreSQL: 时间戳转日期
SELECT to_timestamp(1773986400);
```

## Online Tool vs. Command Line

The `date` command can convert timestamps, but the syntax differs across operating systems (macOS uses `-r`, Linux uses `-d @`), and it can't directly handle millisecond timestamps.

The advantages of an online tool:

- **Nothing to memorize**: no command syntax to remember
- **Visual**: shows the corresponding time in multiple time zones at once
- **Automatic precision detection**: paste a 10- or 13-digit number and it figures out seconds vs. milliseconds
- **Two-way conversion**: timestamp → date and date → timestamp on a single page

[The AnyFreeTools timestamp converter](https://anyfreetools.com/tools/timestamp) also shows the current timestamp live (updated every second), so when you need "the current timestamp" you can just copy it.

## Summary

Timestamps look simple, but time zones, precision, and overflow are full of traps. The core principles boil down to three:

1. **Store and transmit UTC timestamps**, convert to the local time zone only for display
2. **Be explicit about precision** (seconds vs. milliseconds) and spell it out in your API docs
3. **Watch out for the 32-bit limit** — upgrade legacy systems when it's due

In day-to-day development, timestamp conversion is a high-frequency, low-effort operation, and there's no need to write code every time. When you just need a quick lookup or conversion, an [online tool](https://anyfreetools.com/tools/timestamp) is the faster way.

---

**Other posts in this series**:
- [Tool Guide 1: Online Image Compression](/en/posts/blog084_image-compress-guide/)
- [Tool Guide #2: Online JSON Formatter](/en/posts/blog085_json-formatter-guide/)
- [Tool Guide #3: Online Regex Tester](/en/posts/blog086_regex-tester-guide/)
- [Tool Guide 4: QR Code Generator](/en/posts/blog089_qrcode-generator-guide/)
- [Tool Guide 5: Base64 Encoder/Decoder](/en/posts/blog090_base64-tool-guide/)
- [Tool Guide 6: Online JWT Decoder](/en/posts/blog092_jwt-decoder-guide/)
