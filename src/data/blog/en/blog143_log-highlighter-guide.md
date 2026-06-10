---
author: Gerald Chen
pubDatetime: 2026-04-23T10:00:00+08:00
title: "Tool Guide 44: Online Log Highlighter"
slug: blog143_log-highlighter-guide
featured: false
draft: true
reviewed: false
approved: false
tags:
  - 工具指南
  - 工具
description: "A guide to the online log highlighter: coloring rules for Nginx/Apache access logs, application error logs, and structured JSON logs, plus how highlighting helps you quickly spot ERROR lines, slow requests, and abnormal status codes."
---

When you're debugging a production incident, the hardest part usually isn't the problem itself—it's that the logs are endless walls of black-and-white text, and the one ERROR you need is buried somewhere in thousands of lines.

Many engineers cope by copying logs into an editor, installing plugins, writing regexes, and coloring things by hand—then doing it all over again next time. The [online log highlighter](https://anyfreetools.com/tools/log-highlighter) is a free, browser-based tool: paste your logs and they're colorized instantly. It supports Nginx, Apache, application logs, JSON logs, and more—no installation, no data upload.

## Why log highlighting matters

The human eye processes color far faster than it scans text. Hunting for `ERROR` in a plain black-and-white log stream means your brain has to match line by line; if ERROR is red, WARNING is yellow, and timestamps are gray, your eyes are drawn straight to the anomalies.

Part of what seasoned debuggers accumulate over the years is the instinct of "see this color, pay attention to that." A highlighter encodes that instinct into rules, so even someone unfamiliar with a given log format can zero in on the important parts quickly.

## How to use the tool

Open [https://anyfreetools.com/tools/log-highlighter](https://anyfreetools.com/tools/log-highlighter):

1. Paste your logs into the input box on the left
2. The tool auto-detects the format and applies the matching highlight rules
3. The colorized result appears on the right in real time
4. You can manually switch the format type (Nginx / Apache / JSON / Generic)
5. Fullscreen view is supported, which helps with very long logs

Everything runs locally in your browser—log content is never sent to any server.

## Highlighting Nginx access logs

Nginx's default `combined` format looks like this:

```
192.168.1.1 - - [22/Apr/2026:14:32:01 +0800] "GET /api/users HTTP/1.1" 200 1234 "-" "Mozilla/5.0"
10.0.0.5 - - [22/Apr/2026:14:32:03 +0800] "POST /api/login HTTP/1.1" 401 89 "-" "curl/7.88.1"
192.168.1.2 - - [22/Apr/2026:14:32:15 +0800] "GET /api/data HTTP/1.1" 500 412 "-" "axios/1.6.0"
192.168.1.3 - - [22/Apr/2026:14:33:00 +0800] "GET /static/app.js HTTP/1.1" 304 0 "-" "Chrome/123"
```

The coloring rules for Nginx logs:

| Element | Color | Why |
|------|------|------|
| IP address | Blue | Quickly identify the source |
| Timestamp | Gray | Supporting info, lower visual weight |
| HTTP method (GET/POST, etc.) | Cyan | Distinguish request types |
| 2xx status codes | Green | Normal |
| 3xx status codes | Blue | Redirects |
| 4xx status codes | Yellow | Client errors |
| 5xx status codes | Bold red | Server errors—needs attention |
| Response size | Default | |
| User-Agent | Purple | Distinguish client types |

Paste the sample log above and the `401` line shows up yellow while the `500` line is an unmissable bold red—even in thousands of lines, those two jump out immediately.

### Spotting slow requests fast

With `$request_time` enabled, Nginx appends the response time to each log line:

```
192.168.1.1 - - [22/Apr/2026:14:35:01 +0800] "GET /api/report HTTP/1.1" 200 45231 "-" "-" 8.234
192.168.1.1 - - [22/Apr/2026:14:35:02 +0800] "GET /api/users HTTP/1.1" 200 1234 "-" "-" 0.043
```

If your Nginx logs include a response time field, you can scan the output for large values to identify slow endpoints.

## Highlighting application logs

Most application frameworks (Spring Boot, Express, Django, etc.) produce logs in a similar shape:

```
2026-04-22 14:32:01.234 INFO  [main] c.example.UserService - User login: userId=1001
2026-04-22 14:32:01.567 DEBUG [worker-1] c.example.DbPool - Connection acquired from pool
2026-04-22 14:32:02.891 WARN  [worker-2] c.example.RateLimit - Rate limit approaching: 95/100
2026-04-22 14:32:03.123 ERROR [worker-3] c.example.PayService - Payment failed: timeout after 30s
java.net.SocketTimeoutException: Read timed out
    at java.net.SocketInputStream.read(SocketInputStream.java:189)
    at com.example.PayService.process(PayService.java:142)
```

The coloring rules:

- `INFO` — green
- `DEBUG` — gray (noise, visually de-emphasized)
- `WARN` — yellow
- `ERROR` — bold red
- Timestamps — gray
- Thread names — blue
- Class names — purple
- **Exception stack traces** — red background, highlighted as a block

That last one is especially useful: stack traces often run a dozen lines or more and blend into regular log output in black and white. With highlighting, you instantly see "an exception happened here, and the trace extends down to there."

## Structured JSON logs

Modern applications increasingly emit JSON-formatted logs (which makes ingestion by ELK, Datadog, and similar platforms easier):

```json
{"timestamp":"2026-04-22T14:32:01.234Z","level":"INFO","message":"User login","userId":1001,"ip":"192.168.1.1"}
{"timestamp":"2026-04-22T14:32:03.123Z","level":"ERROR","message":"Payment failed","orderId":"ORD-20260422-001","error":"timeout","duration":30012}
{"timestamp":"2026-04-22T14:32:05.456Z","level":"WARN","message":"High memory usage","used":87,"total":100,"unit":"percent"}
```

For JSON logs the tool will:

1. **Pretty-print**: expand compact single-line JSON into a readable, indented format
2. **Color by the `level` field**: `ERROR` lines turn fully red, `WARN` lines fully yellow
3. **Highlight key fields**: `timestamp`, `level`, and `message` use distinct colors for field names vs. values
4. **Highlight numbers**: duration fields (`duration`, `latency`) are marked orange when they exceed a threshold

For nested JSON (say, an `error` field containing an object), the expanded indentation makes the hierarchy obvious instead of cramming every field onto one line.

## Generic logs: built-in fallback rules

If your logs don't follow the standard Nginx or application formats, switch to "Generic" mode and the tool applies a baseline rule set:

- Matches `ERROR`, `FATAL`, `CRITICAL` → red
- Matches `WARN`, `WARNING` → yellow
- Matches `INFO`, `SUCCESS` → green
- Matches `DEBUG`, `TRACE` → gray
- Matches ISO timestamps and common time formats → gray
- Matches HTTP status codes (200-599) → colored by range
- Matches IPv4/IPv6 addresses → blue

These rules cover most custom log formats, giving you reasonable highlighting without writing a single regex.

## Practical scenarios

### Scenario 1: An endpoint suddenly returns 500

Paste the last 1000 lines of your Nginx access log into the tool—the red 5xx lines pop out immediately. Note the timestamps, then paste in the application logs from the same window and find the matching ERROR lines. You can usually pin down the problem in a few minutes.

### Scenario 2: Tracing a specific user's request path

In JSON logs, every request carries a `requestId` field. After pasting the logs, use the browser's Ctrl+F to search for the relevant `requestId` value, and the highlighting helps you follow that request from arrival to response.

### Scenario 3: Comparing error rates before and after a deploy

After shipping a new version, paste in half an hour of logs from before the deploy and half an hour from after, and compare the density of red lines (5xx/ERROR)—more intuitive than computing percentages.

### Scenario 4: Sharing with colleagues outside of ops

A screenshot of highlighted logs is far easier to explain to product or QA teammates than raw black-and-white text, saving you the back-and-forth of "what does this line mean?"

## Compared with terminal tools

There are terminal-based log highlighters too; the most common are `lnav` and `grc`:

```bash
# lnav：交互式日志查看器
lnav /var/log/nginx/access.log

# grc：通用着色包装器
grc tail -f /var/log/app.log
```

The online tool's advantages are **zero config, cross-platform, shareable**:
- Nothing to install
- Works directly in any browser on Windows/Mac/Linux
- Highlighted results can be screenshotted and shared
- Well suited to historical log snippets you've already collected

`lnav`'s strength is **real-time streaming**: you can `tail -f` a log file and get live highlighting, which suits continuous monitoring. The two serve different scenarios and don't replace each other.

## Some patterns in log formats

Understanding log formats helps you get more out of a highlighter.

**Log level conventions**: TRACE < DEBUG < INFO < WARN < ERROR < FATAL. Production typically runs at INFO and above. Seeing lots of DEBUG output usually means a development config leaked into production.

**Timestamp formats**: ISO 8601 (`2026-04-22T14:32:01Z`) is the cleanest standard, and timezone-aware formats are critical when debugging cross-timezone issues—more than once, "the log times don't line up" has turned out to be a timezone configuration problem.

**Correlation IDs (Correlation ID / Request ID / Trace ID)**: in modern microservice architectures, every request carries a unique ID through all services. Searching for that ID in the logs reconstructs the full request path.

**Structured vs. unstructured**: JSON logs are easier for machines to process (ELK, Splunk), but line-oriented formats are easier for humans to read. Both have their place, and knowing the difference helps you pick the right viewing approach.

---

Tool link: [Log Highlighter](https://anyfreetools.com/tools/log-highlighter)

Effective log analysis comes down to filtering out noise fast and focusing on the lines that actually matter. Color is the cheapest filter there is, and a highlighter makes it work out of the box.
