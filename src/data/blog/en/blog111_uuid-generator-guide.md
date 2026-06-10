---
author: Gerald Chen
pubDatetime: 2026-04-03T14:00:00+08:00
title: Tool Guide 20 - Online UUID Generator
slug: blog111_uuid-generator-guide
featured: false
draft: true
reviewed: true
approved: true
tags:
  - 工具指南
  - 工具
  - 前端
description: "A deep dive into UUID versions and their real-world use cases, plus an online tool that batch-generates UUID v4 so developers can grab unique identifiers in seconds."
---

Generating unique identifiers comes up constantly in development. Database primary keys, node IDs in distributed systems, temporary keys on the frontend, idempotency tokens for APIs—UUIDs show up everywhere. Many people think of a UUID as just "a string of random characters," but there are actually multiple versions, each with completely different generation logic and use cases.

This post first covers the essential UUID knowledge, then introduces a handy [online UUID generator](https://anyfreetools.com/tools/uuid-generator).

## What Is a UUID

A UUID (Universally Unique Identifier) is a 128-bit identifier, usually written as 32 hexadecimal characters split into 5 groups by hyphens:

```text
550e8400-e29b-41d4-a716-446655440000
```

The format is `8-4-4-4-12`, and the first character of the third group encodes the version number. In the example above, the third group starts with `4`, which means it's a v4 UUID.

The design goal of UUID is that any node can independently generate non-colliding identifiers without any centralized coordination. That matters a lot for distributed systems—you don't need an "ID dispenser" to hand out IDs; every node just generates its own.

## UUID Versions Compared

There are currently 8 UUID versions (v1 through v8). In day-to-day development, the ones you'll actually use are v1, v4, and v7. The other versions either have niche use cases or have been superseded by newer ones.

### v1: Timestamp + MAC Address

v1 builds the UUID from the current timestamp and the machine's MAC address. The upside is natural ordering (time increases), and you can recover the generation time from the UUID itself. The downside is just as clear: the MAC address leaks machine information, which is a privacy risk.

```text
v1 example: 6fa459ea-ee8a-11e3-a10e-0800200c9a66
            ^^^^^^^^          ^^^^
            timestamp low bits  MAC address fragment
```

Best for: internal systems that need time ordering and don't care about privacy leakage.

### v4: Purely Random

v4 is by far the most widely used version. Apart from the fixed version number and variant bits, the remaining 122 bits are entirely random. No time information, no machine information—uniqueness relies purely on the statistics of random numbers.

```javascript
// Node.js 内置支持(v14.17+)
import { randomUUID } from "crypto";  // ESM
// const { randomUUID } = require("crypto");  // CJS
console.log(randomUUID());
// 输出: 1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed
```

```javascript
// 浏览器原生API
crypto.randomUUID();
// 输出: 3f5e9a2c-7b1d-4f8e-a6c3-2d4e5f6a7b8c
```

How low is the collision probability? You'd have to generate 2^61 (roughly 2.3 * 10^18) v4 UUIDs before the collision probability reaches 50%. At a rate of one billion UUIDs per second, that's about 73 years of continuous generation before you might see a single collision (source: RFC 9562). In real projects, you can safely treat collisions as impossible.

Best for: the default choice for the vast majority of business scenarios.

### v7: Timestamp + Random (the New Standard)

v7 was added in RFC 9562, officially published in 2024. It puts a Unix millisecond timestamp in the first 48 bits, followed by random bits. It combines v1's time ordering with v4's privacy safety.

```text
v7 layout:
|-- 48-bit ms timestamp --|-- 4-bit version --|-- 12-bit random --|-- 2-bit variant --|-- 62-bit random --|
```

v7's killer feature is being **database-friendly**. When used as the primary key in a B+ tree index, time-ordered UUIDs ensure new rows are always appended at the end of the index, avoiding frequent page splits. Write performance is much better than v4.

One caveat: mainstream databases don't ship a built-in v7 generator yet. PostgreSQL's `gen_random_uuid()` produces v4, and MySQL's `UUID()` produces v1. If you need v7 at the database layer, PostgreSQL can use the `pg_uuidv7` extension, or you can generate it in the application layer and write it in.

Best for: database primary keys and any scenario that needs ordering by generation time.

### Side-by-Side Comparison

| Feature | v1 | v4 | v7 |
|------|-----|-----|-----|
| Time-ordered | Yes | No | Yes |
| Privacy-safe | Poor (contains MAC) | Good | Good |
| Database index performance | Good | Poor | Good |
| Native browser/JS support | No | Yes (`crypto.randomUUID()`) | No (third-party library required) |
| Recommendation | Legacy systems | General-purpose default | First choice for new projects |

If you're starting a new project, reach for v7 first. That said, v7 has no native JavaScript API yet, so you'll need an npm package like `uuid` or `uuidv7`. For existing systems or simple cases, v4 is plenty—both browsers and Node.js support it out of the box.

## The Online UUID Generator

[AnyFreeTools' UUID generator](https://anyfreetools.com/tools/uuid-generator) supports batch-generating UUID v4. Open the page, set how many you need, and click generate. All computation happens locally in your browser—nothing is sent to a server.

What the tool offers:

- **Batch generation**: produce multiple UUIDs in one go, no repetitive clicking
- **One-click copy**: copy the results to your clipboard with a single click
- **Pure frontend computation**: built on the browser's `crypto.randomUUID()` API, so no data ever crosses the network
- **Free and unlimited**: no sign-up required, no usage caps

### Typical Use Cases

**Use case 1: Database test data**

When writing unit tests or preparing mock data, you often need a batch of UUIDs as primary keys:

```sql
INSERT INTO users (id, name, email) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', '测试用户1', 'test1@example.com'),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', '测试用户2', 'test2@example.com'),
  ('7c9e6679-7425-40de-944b-e07fc1f90ae7', '测试用户3', 'test3@example.com');
```

Just batch-generate them with the [online tool](https://anyfreetools.com/tools/uuid-generator) and paste them into your SQL—far faster than making them up by hand.

**Use case 2: Message IDs in distributed systems**

In microservice communication, every message needs a globally unique ID for tracing:

```javascript
const message = {
  messageId: crypto.randomUUID(),
  source: "order-service",
  target: "payment-service",
  payload: { orderId: "ORD-2026001", amount: 99.9 },
  timestamp: Date.now()
};
```

**Use case 3: Temporary identifiers on the frontend**

When rendering dynamic lists in React/Vue, you need stable keys:

```jsx
import { useState } from "react";

const [items, setItems] = useState([]);

const addItem = () => {
  setItems(prev => [...prev, {
    id: crypto.randomUUID(),
    content: "",
    createdAt: new Date()
  }]);
};

return items.map(item => (
  <ListItem key={item.id} data={item} />
));
```

Using UUIDs instead of array indexes as keys avoids rendering glitches when items are added or removed from the list.

## Generating UUIDs in Different Languages

Different languages and platforms generate UUIDs in slightly different ways. Here's a quick reference:

```javascript
// JavaScript (浏览器 / Node.js 14.17+)
crypto.randomUUID()
```

```python
# Python 3
import uuid
str(uuid.uuid4())
```

```go
// Go (使用 google/uuid 包)
import "github.com/google/uuid"
id := uuid.New().String()
```

```java
// Java
import java.util.UUID;
UUID.randomUUID().toString();
```

```bash
# Linux 命令行
uuidgen
# 或者
cat /proc/sys/kernel/random/uuid
```

```sql
-- PostgreSQL (生成v4)
SELECT gen_random_uuid();

-- MySQL (生成v1)
SELECT UUID();
```

If you just need a few UUIDs right now and don't feel like writing code, opening the [online generator](https://anyfreetools.com/tools/uuid-generator) is easier.

## UUID vs Other ID Schemes

UUID isn't the only ID generation scheme. Before picking one, it's worth knowing the alternatives:

**Auto-increment IDs**: the simplest option, but tied to the database and requiring extra coordination in distributed environments. Good for monoliths.

**Snowflake**: Twitter's open-source 64-bit ID scheme, composed of a timestamp + machine ID + sequence number. Shorter than UUID (64 bits vs 128 bits), but requires pre-assigning machine IDs. Good for high-throughput distributed systems.

**NanoID**: a shorter random ID (21 characters by default), URL-safe. Good for frontend scenarios like short links and CSS class names.

**ULID**: similar idea to UUID v7—26 characters, time-ordered + random. Encoded in Crockford Base32, more compact than UUID.

How to choose:
- Not sure what to use → UUID v4 (the most universal)
- Database primary keys → UUID v7 or Snowflake
- Short frontend IDs → NanoID
- Need time ordering but don't want UUID → ULID

## Security Considerations

Even though UUID v4 is random, it is **not a cryptographically secure token**. Don't use UUIDs as passwords, API keys, or session tokens. Two reasons:

1. The UUID format is public (version and variant bits sit at fixed positions), so the actual random portion is only 122 bits
2. UUIDs are usually transmitted in plaintext and offer no tamper protection

When you need a secure token, use a dedicated cryptographic random function:

```javascript
// 生成32字节的安全随机token
const token = crypto.randomBytes(32).toString("hex");
// 输出: a3f2b8c9d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9
```

UUIDs are for identification, not for secrets. Use the right tool for the job and you'll stay safe.

---

**Related reading**:
- [Tool Guide 10: Online Hash Generator](/en/posts/blog097_hash-generator-guide/) - Learn about MD5/SHA hash algorithms, the foundation of UUID v3/v5
- [Tool Guide 8: Online Password Generator](/en/posts/blog095_password-generator-guide/) - Another practical tool built on secure random number generation

**More in this series**:
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
- [Tool Guide 14: Online SQL Formatter](/en/posts/blog103_sql-formatter-guide/)
- [Tool Guide 15: Online Markdown Live Preview Tool](/en/posts/blog104_markdown-preview-guide/)
- [Tool Guide 16: Online JSON Diff Tool](/en/posts/blog106_json-diff-guide/)
- [Tool Guide 17: AI Token Counter](/en/posts/blog107_token-counter-guide/)
- [Tool Guide 18: Online OCR Text Recognition](/en/posts/blog108_ocr-tool-guide/)
- [Tool Guide 19: Online CSS Gradient Generator](/en/posts/blog110_css-gradient-guide/)
