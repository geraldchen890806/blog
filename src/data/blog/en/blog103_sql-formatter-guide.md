---
author: Gerald Chen
pubDatetime: 2026-03-27T14:00:00+08:00
title: "Tool Guide 14: Online SQL Formatter"
slug: blog103_sql-formatter-guide
featured: false
draft: true
reviewed: true
approved: true
tags:
  - 工具指南
  - 工具
  - 开发效率
description: "A deep dive into the core rules of SQL formatting and common use cases, plus an online SQL formatter with multi-dialect support to help developers write more readable SQL."
---

Writing SQL is like writing any other code: the fact that it runs doesn't mean it's well written. A single line crammed with three JOINs and two subqueries executes just fine, but your teammates will curse you during review. SQL formatting sounds trivial, yet the manual grind of aligning indentation and normalizing keyword casing eats far more time than you'd expect.

This post first walks through the core rules of SQL formatting and why it matters more than you think, then covers how to actually use an [online SQL formatter](https://anyfreetools.com/tools/sql-formatter).

## Why SQL Formatting Is Not a Small Thing

Let's start with a real-world scenario. The following SQL executes correctly:

```sql
SELECT u.id,u.name,o.order_id,o.amount,p.product_name FROM users u INNER JOIN orders o ON u.id=o.user_id LEFT JOIN products p ON o.product_id=p.id WHERE u.status='active' AND o.created_at>='2026-01-01' AND o.amount>100 ORDER BY o.created_at DESC LIMIT 50;
```

Can you read it? Sure. But how long does it take? If this query had a bug, could you quickly spot which JOIN condition was wrong?

After formatting:

```sql
SELECT
  u.id,
  u.name,
  o.order_id,
  o.amount,
  p.product_name
FROM
  users u
  INNER JOIN orders o ON u.id = o.user_id
  LEFT JOIN products p ON o.product_id = p.id
WHERE
  u.status = 'active'
  AND o.created_at >= '2026-01-01'
  AND o.amount > 100
ORDER BY
  o.created_at DESC
LIMIT
  50;
```

Same statement, completely different readability. Formatting isn't just about looking nice — it directly affects three things:

1. **Debugging speed**: Well-structured SQL lets you see JOIN relationships and filter conditions at a glance
2. **Team collaboration**: A consistent format eliminates style debates in code review, leaving the energy for the actual logic
3. **Version control**: With each clause on its own line, git diff shows you exactly which condition changed

## Core Rules of SQL Formatting

There's no single standard for SQL formatting, but the industry has settled on a few widely accepted rules. Understanding them matters more than memorizing them.

### Uppercase vs Lowercase Keywords

This is one of the classic debates. Both styles have plenty of users:

```sql
-- 大写关键字（传统风格）
SELECT id, name FROM users WHERE status = 'active';

-- 小写关键字（现代风格）
select id, name from users where status = 'active';
```

The advantage of uppercase keywords is contrast — keywords stand out from table and column names instantly. This is especially useful where there's no syntax highlighting (terminals, log files, printed SQL).

Proponents of lowercase argue that modern IDEs and editors all have syntax highlighting, so uppercase just adds typing cost (extra Shift presses or Caps Lock).

I personally lean toward uppercase keywords. The reason is simple: SQL often shows up in logs, Slack messages, documentation, and other places without syntax highlighting. Uppercase keeps SQL readable in any context.

### Indentation Strategy

Indentation defines the hierarchy of a SQL statement. The common approach:

```sql
-- 子句关键字左对齐，内容缩进
SELECT
  u.id,
  u.name,
  COUNT(o.id) AS order_count
FROM
  users u
  LEFT JOIN orders o ON u.id = o.user_id
WHERE
  u.created_at >= '2026-01-01'
GROUP BY
  u.id, u.name
HAVING
  COUNT(o.id) > 5
ORDER BY
  order_count DESC;
```

The major clauses — SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY — are left-aligned, with their contents indented uniformly. This structure makes each clause's boundary obvious at a glance.

Indent width is usually 2 or 4 spaces. Two spaces avoid drifting too far right when subqueries nest deeply; four spaces give simple queries a stronger visual hierarchy. The choice doesn't matter much — just keep the team consistent.

### Formatting Subqueries and CTEs

Subqueries are where SQL readability goes to die. Unformatted nested subqueries are headache-inducing:

```sql
SELECT * FROM users WHERE id IN (SELECT user_id FROM orders WHERE amount > (SELECT AVG(amount) FROM orders WHERE created_at >= '2026-01-01'));
```

After formatting, indentation reflects the nesting:

```sql
SELECT *
FROM users
WHERE id IN (
  SELECT user_id
  FROM orders
  WHERE amount > (
    SELECT AVG(amount)
    FROM orders
    WHERE created_at >= '2026-01-01'
  )
);
```

But an even better move is refactoring with a CTE (Common Table Expression) to avoid deep nesting entirely:

```sql
WITH avg_amount AS (
  SELECT AVG(amount) AS val
  FROM orders
  WHERE created_at >= '2026-01-01'
),
high_value_orders AS (
  SELECT user_id
  FROM orders
  WHERE amount > (SELECT val FROM avg_amount)
)
SELECT *
FROM users
WHERE id IN (SELECT user_id FROM high_value_orders);
```

CTEs break complex logic into named blocks, making each step self-explanatory. This goes beyond formatting — it's a genuine improvement in how the SQL is designed.

## Dialect Differences: More Than Syntactic Sugar

SQL has an ISO standard (the latest is SQL:2023), but actual database implementations diverge significantly. A formatter needs to understand these differences, or it can break your query's semantics.

### MySQL

```sql
-- MySQL 特有的 LIMIT 语法
SELECT * FROM users LIMIT 10 OFFSET 20;

-- 反引号转义保留字
SELECT `order`, `group` FROM `table`;

-- INSERT ... ON DUPLICATE KEY UPDATE（MySQL 8.0.19+ 推荐别名语法）
INSERT INTO users (id, name, email)
VALUES (1, 'test', 'test@example.com') AS new_val
ON DUPLICATE KEY UPDATE
  name = new_val.name,
  email = new_val.email;
```

### PostgreSQL

```sql
-- PostgreSQL 的 DISTINCT ON
SELECT DISTINCT ON (user_id)
  user_id, order_id, created_at
FROM orders
ORDER BY user_id, created_at DESC;

-- RETURNING 子句
INSERT INTO users (name, email)
VALUES ('test', 'test@example.com')
RETURNING id, created_at;

-- 数组操作
SELECT * FROM users WHERE tags @> ARRAY['developer'];
```

### SQLite

```sql
-- SQLite 的 UPSERT
INSERT INTO users (id, name)
VALUES (1, 'test')
ON CONFLICT(id) DO UPDATE SET name = excluded.name;

-- 没有原生的布尔类型，用 0/1
SELECT * FROM users WHERE is_active = 1;
```

Keywords, function names, and operators all vary across dialects. A solid formatter should recognize the dialect instead of flagging dialect-specific syntax as errors. [AnyFreeTools' SQL formatter](https://anyfreetools.com/tools/sql-formatter) lets you pick the database dialect, which is genuinely useful when you work across mixed projects.

## Real-World Use Cases

### Case 1: Cleaning Up SQL in Legacy Projects

When you inherit an old project, you'll often find SQL written in every style imaginable: some uppercase keywords, some lowercase; some indented with 2 spaces, some with tabs. Batch formatting is the fastest way to unify the style.

Steps:
1. Open the [online SQL formatter](https://anyfreetools.com/tools/sql-formatter)
2. Select the matching database dialect
3. Set the indent width and keyword casing
4. Paste your SQL and format it with one click

### Case 2: Debugging Slow Queries

SQL captured in a database slow-query log is usually a single line. Formatting it before analysis helps you locate the problem faster:

```sql
-- 慢查询日志原始输出（单行）
SELECT u.id, u.name, d.dept_name, COUNT(t.id) as task_count, AVG(t.duration) as avg_duration FROM users u JOIN departments d ON u.dept_id = d.id LEFT JOIN tasks t ON u.id = t.assignee_id WHERE d.company_id = 42 AND t.created_at BETWEEN '2026-01-01' AND '2026-03-31' GROUP BY u.id, u.name, d.dept_name HAVING COUNT(t.id) > 10 ORDER BY avg_duration DESC;

-- 格式化后
SELECT
  u.id,
  u.name,
  d.dept_name,
  COUNT(t.id) AS task_count,
  AVG(t.duration) AS avg_duration
FROM
  users u
  JOIN departments d ON u.dept_id = d.id
  LEFT JOIN tasks t ON u.id = t.assignee_id
WHERE
  d.company_id = 42
  AND t.created_at BETWEEN '2026-01-01' AND '2026-03-31'
GROUP BY
  u.id,
  u.name,
  d.dept_name
HAVING
  COUNT(t.id) > 10
ORDER BY
  avg_duration DESC;
```

Once formatted, the query's structure jumps out: a two-table JOIN plus a LEFT JOIN, filtering by company ID and date range, grouped by user to count tasks. If there's an indexing problem, you can immediately tell that `departments.company_id`, `tasks.created_at`, and `tasks.assignee_id` are the candidates for indexes.

### Case 3: SQL Minification

The reverse of formatting is useful too. Compressing multi-line SQL into a single line works well for embedding into log configurations, API parameters, or tools that only accept single-line input. Say you need to inline a query in a shell script:

```sql
-- 格式化的多行版本（开发时用）
SELECT u.id, u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.status = 'active'
GROUP BY u.id, u.name;

-- 压缩后的单行版本（嵌入脚本或配置时用）
SELECT u.id, u.name, COUNT(o.id) AS order_count FROM users u LEFT JOIN orders o ON u.id = o.user_id WHERE u.status = 'active' GROUP BY u.id, u.name;
```

### Case 4: Team Code Review

When a PR contains a complex SQL change, formatting it before diffing reveals what actually changed. Otherwise you may stare at a wall of diff that's mostly indentation noise, with the real logic change buried in the middle.

## Choosing a SQL Formatting Tool

There are plenty of SQL formatters out there. Local tools and online tools each have their place:

**Local options (best for integrating into your dev workflow)**:
- IDE plugins (SQL Formatter for VSCode, JetBrains built-in formatting)
- CLI tools (the `sql-formatter` npm package, `sqlfluff`)
- Git hooks (auto-format `.sql` files before commit)

**Online tools (best for ad-hoc use)**:
- No installation — just open a browser
- Great for SQL pulled from logs, quick debugging, or non-development environments
- Sharing across teams doesn't depend on anyone's personal dev setup

In practice the two approaches complement each other. Use an IDE plugin for auto-formatting in daily development, and reach for the [online tool](https://anyfreetools.com/tools/sql-formatter) when you've copied SQL out of a log, Slack, or a document.

## Beyond Formatting: Habits for Writing Good SQL

Formatting only makes SQL look good, and good-looking SQL isn't necessarily good SQL. A few practical habits:

**List columns explicitly — avoid SELECT \***:

```sql
-- 不推荐
SELECT * FROM users WHERE status = 'active';

-- 推荐
SELECT id, name, email, created_at
FROM users
WHERE status = 'active';
```

`SELECT *` invites surprises when the table schema changes, and it transfers data you don't need.

**Alias complex expressions**:

```sql
SELECT
  user_id,
  SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) AS completed_amount,
  SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS pending_amount,
  ROUND(
    SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) * 100.0
    / NULLIF(SUM(amount), 0),
    2
  ) AS completion_rate
FROM orders
GROUP BY user_id;
```

Aliases make the meaning of each computed column clear, so readers don't have to re-parse the CASE expressions to figure out what's being calculated.

**Document business logic with comments**:

```sql
-- PostgreSQL 示例
-- 筛选条件：只看最近 90 天的活跃用户
-- 活跃定义：有登录记录或有订单
SELECT u.id, u.name
FROM users u
WHERE u.last_login >= CURRENT_DATE - INTERVAL '90 days'
   OR EXISTS (
     SELECT 1 FROM orders o
     WHERE o.user_id = u.id
       AND o.created_at >= CURRENT_DATE - INTERVAL '90 days'
   );
```

SQL comments are easily overlooked, but business logic (what exactly counts as an "active user") can only be captured in comments — you can't infer it from the code alone.

## Wrapping Up

A SQL formatter looks like a small tool, but it touches the core issue of code readability. Well-formatted SQL makes team collaboration smoother, debugging faster, and version control more precise. The tool is just an aid — understanding the logic behind the formatting rules (why uppercase, why this indentation) is what lets you write SQL that's truly maintainable.

In day-to-day development, an IDE plugin handles most of your formatting needs; when you run into a single-line query from a log or need a quick one-off cleanup, an online tool gets it done fast.

---

**Other articles in this series**:
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
- [Tool Guide 12: Online Cron Expression Parser](/en/posts/blog100_cron-parser-guide/)
- [Tool Guide 13: Online Color Converter](/en/posts/blog102_color-converter-guide/)
