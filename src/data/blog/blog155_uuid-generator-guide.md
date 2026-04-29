---
author: 陈广亮
pubDatetime: 2026-04-29T10:00:00+08:00
title: 工具指南52-在线 UUID 生成器
slug: blog155_uuid-generator-guide
featured: false
draft: true
reviewed: false
approved: false
tags:
  - 工具指南
  - 工具
  - 开发效率
description: UUID 是分布式系统里最常用的唯一标识符。本文拆解 v1/v4/v7 三种版本的原理差异，结合在线 UUID 生成器演示批量生成和格式转换，附带 Node.js/Python/Go 代码示例。
---

每个需要唯一标识符的场景，UUID 几乎都是默认选择——数据库主键、文件名、请求追踪 ID、分布式事务 ID。但 UUID 有好几个版本，v1、v4、v7 的设计逻辑完全不同，用错了场景会带来实际问题。

这篇文章拆解 UUID 的核心原理，说清楚各版本的适用场景，然后演示怎么用 [在线 UUID 生成器](https://anyfreetools.com/tools/uuid-generator) 快速生成和格式转换。

## UUID 是什么

UUID（Universally Unique Identifier）是一个 128 位的数字，通常用连字符分成五组、以十六进制表示：

```text
xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx
         版本位↑   变体位↑
```

- **M**（第 13 位）：版本号，1-8
- **N**（第 17 位）：变体标识，固定为 `8`、`9`、`a`、`b`

一个标准 UUID 示例：

```text
550e8400-e29b-41d4-a716-446655440000
```

完全随机生成时，碰撞概率极低：生成 10 亿个 v4 UUID，发生一次碰撞的概率约为 0.000000006%。

## 三个主流版本的原理差异

### UUID v1：时间戳 + MAC 地址

v1 把当前时间戳（精确到 100 纳秒）和机器的 MAC 地址组合成 UUID：

```text
时间戳低位-时间戳中位-时间戳高位+版本-时钟序列-节点(MAC地址)
```

**特点**：
- 单调递增（按时间排序）
- 包含机器 MAC 地址，有隐私泄露风险
- 同一台机器同一毫秒内生成的 UUID 有时钟序列保证不重复

**适用**：需要按时间排序、且不在意 MAC 地址暴露的场景（如内网日志系统）。现代系统几乎不用，已被 v7 替代。

### UUID v4：纯随机

v4 是使用最广泛的版本，122 位完全随机，只有版本位和变体位是固定的：

```javascript
// 内部生成逻辑示意（不是实际算法）
const bytes = crypto.getRandomValues(new Uint8Array(16));
bytes[6] = (bytes[6] & 0x0f) | 0x40; // 版本位设为 4
bytes[8] = (bytes[8] & 0x3f) | 0x80; // 变体位设为 10xx
```

**特点**：
- 完全随机，无规律可循
- 不包含任何机器或时间信息
- 无序——如果用作数据库索引，大量插入时会导致 B+ 树频繁分裂，影响写入性能

**适用**：绝大多数场景的默认选择——请求 ID、会话 token、临时文件名。

### UUID v7：时间戳前缀 + 随机

v7 是 2024 年 RFC 9562 正式纳入标准的新版本，结合了 v1 的有序性和 v4 的随机性：

```text
毫秒时间戳(48位) | 版本(4位) | 随机(12位) | 变体(2位) | 随机(62位)
```

示例（时间部分可读）：

```text
018f5e6f-1a2b-7c3d-8e4f-5a6b7c8d9e0f
^^^^^^^^^^^^         ↑版本7
时间戳部分
```

**特点**：
- 按创建时间单调递增，天然有序
- 随机部分保证同一毫秒内的唯一性
- 完全取代 v1，无隐私问题
- 作为数据库主键时，顺序插入对 B+ 树友好，写入性能接近自增 ID

**适用**：数据库主键、需要按时间排序的 ID、分布式系统的全局 ID——2024 年之后新项目推荐直接用 v7。

## 格式变体

UUID 标准格式有连字符，但实际使用中还有几种变体：

| 格式 | 示例 | 说明 |
|------|------|------|
| 标准（带连字符） | `550e8400-e29b-41d4-a716-446655440000` | 默认格式，可读性好 |
| 紧凑（去连字符） | `550e8400e29b41d4a716446655440000` | 存储字段长度减少 4 字符 |
| 大写 | `550E8400-E29B-41D4-A716-446655440000` | 部分老系统要求 |
| Base64 | `VQ6EAOKbQdSnFkRmVUQAAA==` | URL 安全场景，长度压缩到 24 字符 |
| URN | `urn:uuid:550e8400-e29b-41d4-a716-446655440000` | RFC 标准 URN 格式 |

[在线 UUID 生成器](https://anyfreetools.com/tools/uuid-generator) 支持选择版本（v1/v4/v7）、批量生成（1-1000 个）、格式切换（标准/紧凑/大写）和一键复制。

## 代码示例

### Node.js

Node.js 18+ 内置 `crypto.randomUUID()`，无需安装依赖：

```javascript
// v4 — Node.js 原生
const { randomUUID } = require("crypto");
const id = randomUUID();
console.log(id); // e.g. "550e8400-e29b-41d4-a716-446655440000"

// 批量生成
const ids = Array.from({ length: 10 }, () => randomUUID());
```

v7 目前 Node.js 原生还不支持，需要用 `uuid` 包：

```javascript
// npm install uuid
import { v4 as uuidv4, v7 as uuidv7 } from "uuid";

const idV4 = uuidv4(); // 随机
const idV7 = uuidv7(); // 时间有序

// 去掉连字符
const compact = idV4.replace(/-/g, "");

// 验证 UUID 格式
import { validate, version } from "uuid";
console.log(validate("550e8400-e29b-41d4-a716-446655440000")); // true
console.log(version("550e8400-e29b-41d4-a716-446655440000")); // 4
```

### Python

Python 3 标准库内置 `uuid` 模块：

```python
import uuid

# v4 随机
id_v4 = uuid.uuid4()
print(str(id_v4))        # 550e8400-e29b-41d4-a716-446655440000
print(id_v4.hex)         # 550e8400e29b41d4a716446655440000（无连字符）

# v1 时间戳
id_v1 = uuid.uuid1()
print(id_v1.time)        # 时间戳（100纳秒精度）

# 批量生成 100 个 v4
ids = [str(uuid.uuid4()) for _ in range(100)]

# 从字符串解析
parsed = uuid.UUID("550e8400-e29b-41d4-a716-446655440000")
print(parsed.version)    # 4
```

v7 需要 Python 3.14+（原生支持）或第三方库：

```python
# Python 3.14+
import uuid
id_v7 = uuid.uuid7()
print(str(id_v7))
```

### Go

```go
package main

import (
    "fmt"
    "github.com/google/uuid"
)

func main() {
    // v4
    idV4 := uuid.New()
    fmt.Println(idV4.String())

    // v7（有序）
    idV7, err := uuid.NewV7()
    if err != nil {
        panic(err)
    }
    fmt.Println(idV7.String())

    // 解析和验证
    parsed, err := uuid.Parse("550e8400-e29b-41d4-a716-446655440000")
    if err != nil {
        panic(err)
    }
    fmt.Println(parsed.Version()) // 4
}
```

### 数据库中存储 UUID

不同数据库对 UUID 的存储方式不同，影响存储空间和查询性能：

```sql
-- PostgreSQL：原生 UUID 类型（16 字节）
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL
);

-- MySQL 8.0+：推荐用 BINARY(16) 存储，节省空间
CREATE TABLE users (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID(), 1)),
    name VARCHAR(255)
);

-- 查询时转换回字符串
SELECT BIN_TO_UUID(id, 1) AS id, name FROM users;

-- SQLite：没有原生 UUID 类型，用 TEXT 存储
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT
);
```

**UUID v7 作为主键的性能优势**：由于 v7 前 48 位是时间戳，新记录总是插入到索引末尾，避免了 v4 随机主键导致的 B+ 树页分裂问题。在写入密集场景下，v7 主键的写入性能可以接近自增整数 ID。

## 选版本的判断标准

```text
需要数据库主键 / 需要有序性？
  ├── 是 → UUID v7（2024 年后新项目推荐）
  └── 否 → UUID v4（通用场景，零配置）

遗留系统要求 v1？
  └── 考虑迁移到 v7，v7 是 v1 的现代替代品
```

简单记：**新项目数据库 ID 用 v7，其他场景用 v4**。

## 常见问题

**UUID 和 ULID 怎么选？**
ULID 也是有序的唯一 ID，格式为 26 个字符的 Base32 字符串，更短、不含连字符。两者功能接近，UUID v7 是 IETF 标准，生态支持更广；ULID 格式更紧凑，适合需要可读性的场景。新项目如果没有框架/库的限制，UUID v7 是更安全的默认选择。

**同一毫秒内大量生成会碰撞吗？**
UUID v4 的 122 位随机性使碰撞概率极低，即使同一毫秒生成数百万个也基本不会碰撞。v7 在时间戳相同时，随机部分（62 位）也足以支撑每毫秒数十亿次生成。

**可以在前端直接生成 UUID 吗？**
可以。现代浏览器支持 `crypto.randomUUID()`（Chrome 92+、Firefox 95+、Safari 15.4+），安全性足够：

```javascript
// 浏览器直接生成 v4
const id = crypto.randomUUID();
```
