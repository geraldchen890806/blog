---
author: Gerald Chen
pubDatetime: 2026-04-29T10:00:00+08:00
title: "Tool Guide 52: Online UUID Generator"
slug: blog155_uuid-generator-guide
featured: false
draft: true
reviewed: true
approved: true
tags:
  - 工具指南
  - 工具
  - 开发效率
description: "UUIDs are the go-to unique identifier in distributed systems. This post breaks down how v1, v4, and v7 differ under the hood, demonstrates batch generation and format conversion with an online UUID generator, and includes code examples for Node.js, Python, and Go."
---

Wherever you need a unique identifier, UUIDs are almost always the default choice—database primary keys, file names, request tracing IDs, distributed transaction IDs. But UUIDs come in several versions, and v1, v4, and v7 are designed around completely different ideas. Picking the wrong one for your use case causes real problems.

This post breaks down how UUIDs work, clarifies which version fits which scenario, and then shows how to use the [online UUID generator](https://anyfreetools.com/tools/uuid-generator) for quick generation and format conversion.

## What Is a UUID

A UUID (Universally Unique Identifier) is a 128-bit number, conventionally written in hexadecimal and split into five groups by hyphens:

```text
xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx
      version bit↑   variant bit↑
```

- **M** (13th character): the version number, 1-8
- **N** (17th character): the variant identifier, always one of `8`, `9`, `a`, `b`

A standard UUID looks like this:

```text
550e8400-e29b-41d4-a716-446655440000
```

With fully random generation, the collision probability is vanishingly small: if you generate 1 billion v4 UUIDs, the chance of a single collision is about 0.000000006%.

## How the Three Major Versions Differ

### UUID v1: Timestamp + MAC Address

v1 combines the current timestamp (100-nanosecond precision) with the machine's MAC address:

```text
time-low - time-mid - time-high+version - clock-sequence - node (MAC address)
```

**Characteristics**:
- Monotonically increasing (sortable by time)
- Embeds the machine's MAC address, which is a privacy leak risk
- A clock sequence guarantees uniqueness for UUIDs generated within the same millisecond on the same machine

**Use it when**: you need time-ordered IDs and don't care about exposing the MAC address (e.g., an internal logging system). Modern systems rarely use it—v7 has replaced it.

### UUID v4: Pure Randomness

v4 is the most widely used version. 122 bits are fully random; only the version and variant bits are fixed:

```javascript
// 内部生成逻辑示意（不是实际算法）
const bytes = crypto.getRandomValues(new Uint8Array(16));
bytes[6] = (bytes[6] & 0x0f) | 0x40; // 版本位设为 4
bytes[8] = (bytes[8] & 0x3f) | 0x80; // 变体位设为 10xx
```

**Characteristics**:
- Completely random, no discernible pattern
- Contains no machine or time information
- Unordered—when used as a database index, heavy insert traffic causes frequent B+ tree page splits and hurts write performance

**Use it when**: it's the default for the vast majority of cases—request IDs, session tokens, temporary file names.

### UUID v7: Timestamp Prefix + Randomness

v7 is the new version formally standardized in 2024 by RFC 9562. It combines v1's ordering with v4's randomness:

```text
millisecond timestamp (48 bits) | version (4 bits) | random (12 bits) | variant (2 bits) | random (62 bits)
```

Example (the time portion is human-readable):

```text
018f5e6f-1a2b-7c3d-8e4f-5a6b7c8d9e0f
^^^^^^^^^^^^         ↑version 7
timestamp portion
```

**Characteristics**:
- Monotonically increasing by creation time, naturally ordered
- The random portion guarantees uniqueness within the same millisecond
- Fully replaces v1, with no privacy issues
- As a database primary key, sequential inserts are B+ tree friendly—write performance approaches auto-increment IDs

**Use it when**: database primary keys, IDs that need time ordering, global IDs in distributed systems—for new projects after 2024, just use v7.

## Format Variants

The standard UUID format uses hyphens, but several variants show up in practice:

| Format | Example | Notes |
|------|------|------|
| Standard (with hyphens) | `550e8400-e29b-41d4-a716-446655440000` | The default, most readable |
| Compact (no hyphens) | `550e8400e29b41d4a716446655440000` | Saves 4 characters of storage |
| Uppercase | `550E8400-E29B-41D4-A716-446655440000` | Required by some legacy systems |
| Base64 | `VQ6EAOKbQdSnFkRmVUQAAA==` | URL-safe scenarios, compressed to 24 characters |
| URN | `urn:uuid:550e8400-e29b-41d4-a716-446655440000` | The RFC-standard URN format |

The [online UUID generator](https://anyfreetools.com/tools/uuid-generator) lets you choose the version (v1/v4/v7), generate in batches (1-1000), switch formats (standard/compact/uppercase), and copy with one click.

## Code Examples

### Node.js

Node.js 18+ ships `crypto.randomUUID()` out of the box—no dependencies needed:

```javascript
// v4 — Node.js 原生
const { randomUUID } = require("crypto");
const id = randomUUID();
console.log(id); // e.g. "550e8400-e29b-41d4-a716-446655440000"

// 批量生成
const ids = Array.from({ length: 10 }, () => randomUUID());
```

Node.js doesn't natively support v7 yet, so use the `uuid` package:

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

Python 3 includes the `uuid` module in the standard library:

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

v7 requires Python 3.14+ (native support) or a third-party library:

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

### Storing UUIDs in a Database

Different databases store UUIDs differently, which affects storage size and query performance:

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

**Why v7 wins as a primary key**: since the first 48 bits of a v7 UUID are a timestamp, new rows always land at the end of the index, avoiding the B+ tree page splits that v4 random keys cause. Under write-heavy workloads, v7 primary keys can perform close to auto-increment integer IDs.

## How to Pick a Version

```text
Need a database primary key / need ordering?
  ├── Yes → UUID v7 (recommended for new projects after 2024)
  └── No  → UUID v4 (general purpose, zero configuration)

Legacy system requires v1?
  └── Consider migrating to v7 — it is the modern replacement for v1
```

The short version: **use v7 for new-project database IDs, v4 for everything else**.

## FAQ

**UUID or ULID?**
ULID is also a sortable unique ID, formatted as a 26-character Base32 string—shorter, with no hyphens. Functionally the two are close. UUID v7 is an IETF standard with broader ecosystem support; ULID is more compact and suits scenarios where readability matters. For a new project with no framework/library constraints, UUID v7 is the safer default.

**Will heavy generation within the same millisecond collide?**
The 122 bits of randomness in UUID v4 make collisions extremely unlikely—even millions generated in the same millisecond essentially won't collide. For v7, when timestamps match, the random portion (62 bits) is still enough to support billions of generations per millisecond.

**Can I generate UUIDs directly in the frontend?**
Yes. Modern browsers support `crypto.randomUUID()` (Chrome 92+, Firefox 95+, Safari 15.4+), and it's secure enough:

```javascript
// 浏览器直接生成 v4
const id = crypto.randomUUID();
```
