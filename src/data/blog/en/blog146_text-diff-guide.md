---
author: Gerald Chen
pubDatetime: 2026-04-25T10:00:00+08:00
title: "Tool Guide 46: Online Text Diff Tool"
slug: blog146_text-diff-guide
featured: false
draft: true
reviewed: false
approved: false
tags:
  - 工具指南
  - 工具
description: "A guide to using an online text diff tool, covering how diff algorithms work (Myers diff), character/line/word-level comparison modes, structured JSON diffs, and practical scenarios like code review and config file change tracking."
---

Merge conflicts, config file changes, document version drift—all of these come down to quickly spotting the differences between two pieces of text. The terminal has the `diff` command, IDEs have built-in diff views, but sometimes you just want to paste two snippets and compare them—without opening an IDE or typing a command.

The [online text diff tool](https://anyfreetools.com/tools/text-diff) is a free browser-based tool: paste text into the left and right panes, and differences are highlighted in real time. It supports three comparison granularities—line, word, and character—and all processing happens locally; nothing is uploaded.

## How diff works

Understanding the diff algorithm helps you read the results—especially why sometimes "I only changed one word" but the diff shows the entire line as changed.

Modern diff tools generally use the **Myers diff algorithm** (proposed by Eugene Myers in 1986). The core idea is to find the **Longest Common Subsequence (LCS)** between two texts, then mark everything not in the LCS as additions or deletions.

Example:

```
Original: The quick brown fox jumps over the lazy dog
New:      The quick red fox leaps over a lazy dog
```

The LCS is the sequence of fragments both texts share: `The quick`, `fox`, `over`, `lazy dog`. The parts not in the LCS:

- Deleted (in the original, not in the new text): `brown`, `jumps`, `the`
- Added (in the new text, not in the original): `red`, `leaps`, `a`

That's where the red (deleted) and green (added) in diff output comes from.

### Why did the whole line change?

In line-level comparison, diff computes the LCS with "line" as the smallest unit. If anything anywhere in a line changes, the entire line is marked as "old line deleted, new line added":

```diff
- server_host = "192.168.1.1"
+ server_host = "192.168.1.2"
```

This isn't a bug—it's normal diff behavior. To see exactly which characters within the line changed, switch to **character-level diff**.

## The tool's three comparison modes

### Line Diff

The default mode. Text is split on newlines and differences are computed at the line level. Good for:

- Comparing code files
- Comparing log files
- Config file changes

Output format: deleted lines get a red background, added lines get a green background, unchanged lines are shown in gray.

### Word Diff

Text is split into words (tokens) on whitespace, and differences are computed at the word level. Good for:

- Reviewing article/document revisions
- Comparing translation versions
- Natural-language text comparison

In word mode, even if the whole sentence structure changes, you can see precisely which words were replaced:

```
Original: The quick brown fox
New:      The quick red fox

Word diff:
The quick [brown → red] fox
```

### Character Diff

Differences are computed character by character—the highest precision. Good for:

- Spotting subtle typos (e.g. `conifg` vs `config`)
- Comparing similar short strings (URLs, regular expressions, command arguments)
- Verifying passwords/hash values

The downside of character mode is that output can get noisy—when two texts differ substantially, nearly every character gets marked, making the result harder to read. Use it only when the texts are highly similar.

## Real-world scenarios

### Scenario 1: Comparing nginx config changes

Before a deploy, compare old and new config files to confirm the scope of changes:

```nginx
# 旧版本
server {
    listen 80;
    server_name example.com;
    root /var/www/html;
    index index.html;
}

# 新版本
server {
    listen 80;
    listen 443 ssl;
    server_name example.com www.example.com;
    root /var/www/html;
    index index.html index.php;
    ssl_certificate /etc/ssl/cert.pem;
}
```

A line-level diff makes it clear: four additions—`listen 443 ssl`, `www.example.com`, `index.php`, and `ssl_certificate`—with everything else unchanged. That's far more reliable than eyeballing line by line, especially with long config files.

### Scenario 2: Self-review before a code review

Before submitting a PR, paste in your local code changes and compare to make sure you didn't accidentally touch anything else:

```javascript
// 旧版本
function fetchUserData(userId) {
  return fetch(`/api/users/${userId}`)
    .then(res => res.json())
    .catch(err => console.error(err));
}

// 新版本
async function fetchUserData(userId) {
  try {
    const res = await fetch(`/api/users/${userId}`);
    return await res.json();
  } catch (err) {
    console.error("Fetch failed:", err);
    throw err;
  }
}
```

The diff shows it all at a glance: the Promise chain was converted to async/await, error handling gained a `throw err`, and the function signature got `async`—a clearly scoped change with no surprises.

### Scenario 3: Document version comparison

When revising technical docs or contracts, compare differences between two versions:

```
# Old version (Section 3.2)
All API requests must carry an Authorization token in the Header.
Tokens are valid for 24 hours; once expired, you must log in again to obtain a new one.

# New version (Section 3.2)
All API requests must carry a Bearer token in the Header.
Tokens are valid for 7 days, with automatic renewal supported via refresh token.
```

A word-level diff shows precisely: `Authorization` changed to `Bearer`, `24 hours` changed to `7 days`, and the final sentence was completely replaced.

### Scenario 4: Comparing environment variable files

`.env` files easily drift apart across environments (dev/staging/production):

```bash
# 开发环境 .env
DATABASE_URL=postgresql://localhost:5432/myapp_dev
REDIS_URL=redis://localhost:6379
LOG_LEVEL=debug
API_RATE_LIMIT=1000

# 生产环境 .env
DATABASE_URL=postgresql://prod-db.internal:5432/myapp
REDIS_URL=redis://prod-redis.internal:6379
LOG_LEVEL=error
API_RATE_LIMIT=100
SENTRY_DSN=https://xxx@sentry.io/yyy
```

The diff makes it obvious: four variables have different values, and production has an extra `SENTRY_DSN`. Much less error-prone than checking by hand.

## What the statistics mean

The tool shows summary statistics above the diff result:

```
Added 12 lines  Deleted 8 lines  Modified 3 lines  Unchanged 47 lines
```

- **Added**: lines present in the new text but not the original
- **Deleted**: lines present in the original but not the new text
- **Modified**: line numbers match but the content changed (this category only exists in line-diff mode)
- **Unchanged**: lines identical on both sides

The change rate (`(added + deleted) / total lines`) gives a quick sense of the size of the change. If you made a one-line bug fix but the diff shows a 60% change rate, there are probably unintended changes worth checking.

## Ignoring whitespace differences

In many cases, differences in spaces, tabs, or line endings don't matter (e.g. a code formatter only changed indentation), but they generate a lot of noise in the diff. The tool offers an "ignore whitespace" option. When checked:

- Leading/trailing spaces on each line are ignored
- Multiple consecutive spaces are treated as a single space
- Differences between Windows (`\r\n`) and Unix (`\n`) line endings are ignored

This option is especially useful when comparing files across platforms (e.g. code synced between Windows and Mac).

## Compared with command-line diff

The terminal's `diff` command is powerful, but its output is plain text and takes some effort to interpret:

```bash
diff old.txt new.txt

# 输出
2c2
< server_host = "192.168.1.1"
---
> server_host = "192.168.1.2"
5a6,7
> LOG_LEVEL=error
> SENTRY_DSN=https://xxx@sentry.io/yyy
```

Format explanation: `2c2` means line 2 was replaced (change), `5a6,7` means lines 6-7 were added after line 5. `<` is the original, `>` is the new text.

This format is convenient in scripts and CI, but not friendly to human eyes. The online tool's advantage is that it marks differences directly with color—no need to decode hunk headers (formatting markers like `2c2` and `5a6,7`).

The output format of `git diff` (unified diff) is more common, using `+` and `-` markers:

```bash
git diff HEAD~1 HEAD -- config.yml

# 输出
@@ -2,4 +2,6 @@
-server_host = "192.168.1.1"
+server_host = "192.168.1.2"
+LOG_LEVEL=error
+SENTRY_DSN=https://xxx@sentry.io/yyy
```

The online tool is best for text snippets you've already collected; command-line tools are best for working directly with the filesystem and git history. They complement each other rather than replace each other.

## Tips for long text

When both texts are long (hundreds to thousands of lines), the full diff output can be hard to scan. A few tips:

**Show only changed lines**: the tool offers a "changed lines only" mode that filters out unchanged lines and shows only the differing context (similar to the unified format of `diff -u`).

**Jump buttons**: "previous/next" navigation between diff blocks lets you hop between change points without manual scrolling.

**Collapse unchanged regions**: long runs of unchanged lines are collapsed into a summary (e.g. "47 identical lines hidden"), which you can click to expand.

---

Tool link: [Text Diff Tool](https://anyfreetools.com/tools/text-diff)

At its core, diff finds the minimal edit distance between two texts—letting you see what changed with the least attention cost. Line/word/character granularities fit different scenarios, the ignore-whitespace option filters out formatting noise, and the statistics give a quick read on the size of a change. Paste and go—a lot less work than decoding hunk headers on the command line.
