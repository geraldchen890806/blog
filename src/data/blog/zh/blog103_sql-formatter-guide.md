---
author: 陈广亮
pubDatetime: 2026-03-27T14:00:00+08:00
title: 工具指南14-在线SQL格式化工具
slug: blog103_sql-formatter-guide
featured: false
draft: true
reviewed: true
approved: true
tags:
  - 工具指南
  - 工具
  - 开发效率
description: 详解 SQL 格式化的核心规则与常见场景，介绍一款支持多方言的在线 SQL 格式化工具，帮助开发者写出可读性更强的 SQL 语句。
---

写 SQL 和写代码一样，能跑不等于写得好。一行塞进三个 JOIN 加两个子查询的 SQL，机器执行没问题，但同事 review 时想骂人。SQL 格式化这件事说起来不难，但手动对齐缩进、统一大小写的体力活，实际上耗掉的时间远超你的预期。

这篇文章会先聊聊 SQL 格式化的核心规则和为什么它比你想象中重要，然后介绍一个[在线 SQL 格式化工具](https://anyfreetools.com/tools/sql-formatter)的实际用法。

## 为什么 SQL 格式化不是小事

先看一个真实场景。下面这段 SQL 能正确执行：

```sql
SELECT u.id,u.name,o.order_id,o.amount,p.product_name FROM users u INNER JOIN orders o ON u.id=o.user_id LEFT JOIN products p ON o.product_id=p.id WHERE u.status='active' AND o.created_at>='2026-01-01' AND o.amount>100 ORDER BY o.created_at DESC LIMIT 50;
```

能看懂吗？能。但你需要花多久？如果这条 SQL 出了 bug，你能快速定位是哪个 JOIN 条件写错了吗？

格式化后：

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

同一条语句，可读性完全不同。格式化不只是"好看"，它直接影响三件事：

1. **Debug 效率**：结构清晰的 SQL 让你一眼看出 JOIN 关系和过滤条件
2. **团队协作**：统一格式减少 code review 中的格式争论，把精力留给逻辑本身
3. **版本控制**：格式化后的 SQL 每个子句独占一行，git diff 能精确显示改了哪个条件

## SQL 格式化的核心规则

SQL 格式化没有唯一标准，但业界有一些被广泛接受的规则。理解这些规则比死记硬背更重要。

### 关键字大写 vs 小写

这是最经典的争论之一。两种风格都有大量使用者：

```sql
-- 大写关键字（传统风格）
SELECT id, name FROM users WHERE status = 'active';

-- 小写关键字（现代风格）
select id, name from users where status = 'active';
```

大写关键字的优势是区分度高——关键字和表名、字段名一眼就能分开。这在没有语法高亮的环境下（比如终端、日志文件、打印出来的 SQL）特别有用。

小写关键字的支持者认为，现代 IDE 和编辑器都有语法高亮，大写只是增加输入成本（多按 Shift 或开 Caps Lock）。

我个人倾向于大写关键字。原因很简单：SQL 经常出现在日志、Slack 消息、文档等没有语法高亮的场景。大写让 SQL 在任何上下文中都保持可读。

### 缩进策略

缩进决定了 SQL 的层次结构。常见的做法是：

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

SELECT、FROM、WHERE、GROUP BY、HAVING、ORDER BY 这些主要子句左对齐，它们的内容统一缩进。这种结构让每个子句的边界一目了然。

缩进宽度通常用 2 空格或 4 空格。2 空格在嵌套子查询多的时候不容易右移太远，4 空格在简单查询中层次感更强。选哪个不重要，团队统一就行。

### 子查询与 CTE 的格式化

子查询是 SQL 可读性的重灾区。没格式化的子查询可以让人看到头疼：

```sql
SELECT * FROM users WHERE id IN (SELECT user_id FROM orders WHERE amount > (SELECT AVG(amount) FROM orders WHERE created_at >= '2026-01-01'));
```

格式化后用缩进体现嵌套关系：

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

但更好的做法是用 CTE（Common Table Expression）重构，避免深层嵌套：

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

CTE 把复杂逻辑拆成命名块，每一步做什么清清楚楚。这不只是格式问题，更是 SQL 设计思路的改善。

## 多方言差异：不只是语法糖

SQL 有 ISO 标准（目前最新的是 SQL:2023），但各数据库的实际实现差异不小。格式化工具需要理解这些差异，否则可能破坏语义。

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

不同方言的关键字、函数名、操作符都不同。一个靠谱的格式化工具应该能识别方言，避免把方言特有语法当作错误处理。[AnyFreeTools 的 SQL 格式化工具](https://anyfreetools.com/tools/sql-formatter)支持选择数据库方言，这在处理混合项目时很实用。

## 实际使用场景

### 场景 1：整理遗留项目的 SQL

接手老项目时，经常遇到各种风格混杂的 SQL。有的用大写关键字，有的用小写；有的缩进 2 空格，有的用 Tab。批量格式化是统一风格最快的方式。

操作步骤：
1. 打开[在线 SQL 格式化工具](https://anyfreetools.com/tools/sql-formatter)
2. 选择对应的数据库方言
3. 设置缩进宽度和关键字大小写
4. 粘贴 SQL，一键格式化

### 场景 2：Debug 慢查询

数据库慢查询日志输出的 SQL 通常是单行的。把它格式化后再分析，能更快定位问题：

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

格式化后一眼就能看出：两表 JOIN + 一个 LEFT JOIN，过滤条件有公司 ID 和日期范围，按用户分组统计任务数。如果有索引问题，马上能判断该给 `departments.company_id`、`tasks.created_at`、`tasks.assignee_id` 加索引。

### 场景 3：SQL 压缩

格式化的反向操作也有用处。把多行 SQL 压缩成单行，适合嵌入到日志配置、API 参数、或某些只支持单行输入的工具中。比如你在 shell 脚本里需要拼一条 SQL：

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

### 场景 4：团队 Code Review

在 PR 里看到一段复杂的 SQL 改动，格式化后再 diff 能更准确地看出实际修改了什么。不然很可能一大片 diff 只是缩进变了，真正的逻辑改动藏在中间。

## SQL 格式化工具的选择

市面上有不少 SQL 格式化工具，本地工具和在线工具各有适用场景：

**本地方案（适合集成到开发流程）**：
- IDE 插件（VSCode 的 SQL Formatter、JetBrains 内置格式化）
- CLI 工具（`sql-formatter` npm 包、`sqlfluff`）
- Git hooks（提交前自动格式化 `.sql` 文件）

**在线工具（适合临时使用）**：
- 不需要安装，打开浏览器直接用
- 适合处理日志中的 SQL、临时调试、非开发环境
- 跨团队分享时不依赖个人开发环境

实际工作中两种方案互补。日常开发用 IDE 插件自动格式化，遇到从日志、Slack、文档里复制出来的 SQL 就用[在线工具](https://anyfreetools.com/tools/sql-formatter)快速处理。

## 格式化之外：写出好 SQL 的几个习惯

格式化只是让 SQL 好看，但好看的 SQL 不一定是好 SQL。几个实用习惯：

**明确列出字段，不用 SELECT \***：

```sql
-- 不推荐
SELECT * FROM users WHERE status = 'active';

-- 推荐
SELECT id, name, email, created_at
FROM users
WHERE status = 'active';
```

`SELECT *` 在表结构变更时容易引发意外问题，而且会传输不必要的数据。

**给复杂表达式加别名**：

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

别名让每个计算字段的含义清晰，不需要反复阅读 CASE 表达式才能理解它在算什么。

**用注释标记业务逻辑**：

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

SQL 注释经常被忽略，但业务逻辑（"活跃用户"的定义是什么）只有注释能说清楚，单看代码是推断不出来的。

## 小结

SQL 格式化看起来是个小工具，但它触及了代码可读性这个核心问题。好的 SQL 格式让团队协作更顺畅、Debug 更高效、版本控制更精确。工具只是辅助，理解格式化规则背后的逻辑（为什么大写、为什么这样缩进）才能写出真正可维护的 SQL。

日常开发中，IDE 插件处理大部分格式化需求，遇到日志里的单行 SQL 或临时调试时用在线工具快速处理即可。

---

**本系列其他文章**：
- [工具指南1-在线图片压缩](https://chenguangliang.com/posts/blog084_image-compress-guide/)
- [工具指南2-在线JSON格式化工具](https://chenguangliang.com/posts/blog085_json-formatter-guide/)
- [工具指南3-在线正则表达式测试](https://chenguangliang.com/posts/blog086_regex-tester-guide/)
- [工具指南4-二维码生成工具](https://chenguangliang.com/posts/blog089_qrcode-generator-guide/)
- [工具指南5-Base64编解码工具](https://chenguangliang.com/posts/blog090_base64-tool-guide/)
- [工具指南6-JWT在线解码工具](https://chenguangliang.com/posts/blog092_jwt-decoder-guide/)
- [工具指南7-Unix时间戳转换工具](https://chenguangliang.com/posts/blog094_timestamp-tool-guide/)
- [工具指南8-在线密码生成器](https://chenguangliang.com/posts/blog095_password-generator-guide/)
- [工具指南9-URL编解码工具](https://chenguangliang.com/posts/blog096_url-encoder-guide/)
- [工具指南10-在线哈希生成器](https://chenguangliang.com/posts/blog097_hash-generator-guide/)
- [工具指南11-JSON转TypeScript类型生成器](https://chenguangliang.com/posts/blog099_json-to-typescript-guide/)
- [工具指南12-Cron表达式在线解析工具](https://chenguangliang.com/posts/blog100_cron-parser-guide/)
- [工具指南13-在线颜色转换工具](https://chenguangliang.com/posts/blog102_color-converter-guide/)
