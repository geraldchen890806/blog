---
author: Gerald Chen
pubDatetime: 2026-03-24T14:00:00+08:00
title: "Tool Guide 11: JSON to TypeScript Type Generator"
slug: blog099_json-to-typescript-guide
featured: false
draft: true
reviewed: true
approved: true
tags:
  - 工具指南
  - 工具
  - TypeScript
description: "Starting from the pain of hand-writing TypeScript types, this post covers how JSON-to-TypeScript conversion works under the hood, the type inference strategies involved, and how to replace manual type definitions with automatic generation in real projects."
---

When you get a JSON response from an API, what's the first thing you do? Write the type definitions.

If you're using TypeScript, this step is almost impossible to skip. Without type definitions, your editor gives you no autocomplete, and a misspelled field name won't surface until runtime. But hand-writing types is tedious work—especially when you're staring at JSON that's nested three or four levels deep with dozens of fields. Mechanically transcribing every field's type is both boring and error-prone.

This post covers automatic JSON-to-TypeScript conversion: what problem it solves, how the type inference behind it works, and how to make this workflow smooth in real projects.

## The Problem with Hand-Written Type Definitions

Let's start with a typical scenario. The backend returns a user list endpoint:

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 156,
    "page": 1,
    "pageSize": 20,
    "list": [
      {
        "id": 10234,
        "name": "张三",
        "email": "zhangsan@example.com",
        "role": "admin",
        "createdAt": "2026-01-15T08:30:00Z",
        "profile": {
          "avatar": "https://cdn.example.com/avatars/10234.jpg",
          "bio": "全栈开发者",
          "social": {
            "github": "zhangsan",
            "twitter": null
          }
        },
        "permissions": ["read", "write", "admin"]
      }
    ]
  }
}
```

To write complete TypeScript types for this JSON by hand, you need:

```typescript
interface Social {
  github: string;
  twitter: string | null;
}

interface Profile {
  avatar: string;
  bio: string;
  social: Social;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  profile: Profile;
  permissions: string[];
}

interface UserListData {
  total: number;
  page: number;
  pageSize: number;
  list: User[];
}

interface UserListResponse {
  code: number;
  message: string;
  data: UserListData;
}
```

Five interfaces, twenty-plus fields. And that's just one endpoint. A mid-sized project typically has dozens of APIs—writing all the types by hand can eat up the better part of a day. Worse, when the backend changes a field, you have to keep everything in sync, and missing a single update means a production bug.

## How Type Inference Works

The core of JSON-to-TypeScript conversion is type inference—deriving the corresponding TypeScript type from the actual content of each JSON value.

### Primitive Type Mapping

The most straightforward part is the primitives:

```text
JSON value       →  TypeScript type
"hello"          →  string
42               →  number
true             →  boolean
null             →  null
```

No surprises here. A quick `typeof` tells you everything.

### Object Inference

When the converter hits a JSON object, it recursively processes each field:

```typescript
// 推断逻辑的简化版本
function inferType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return inferArrayType(value);
  if (typeof value === "object") return inferObjectType(value);
  return typeof value; // "string" | "number" | "boolean"
}

// 返回类型描述字符串（TypeScript 类型的文本表示）
function inferObjectType(obj: Record<string, unknown>): string {
  const fields = Object.entries(obj).map(
    ([key, val]) => `  ${key}: ${inferType(val)};`
  );
  return `{\n${fields.join("\n")}\n}`;
}
```

Object inference itself isn't hard—naming is. JSON keys naturally become field names, but nested objects need type names generated for them. A common strategy is to derive the type name from the parent field: the `profile` field maps to a `Profile` interface, and `profile.social` maps to a `Social` interface.

### Array Inference

Arrays are where things most often go wrong. Consider a few cases:

```json
// 情况1: 简单数组
["read", "write", "admin"]  →  string[]

// 情况2: 对象数组
[{"id": 1, "name": "a"}, {"id": 2, "name": "b"}]  →  Item[]

// 情况3: 空数组
[]  →  unknown[]

// 情况4: 混合类型数组（实际 API 中很少出现，但工具需要处理）
[1, "hello", true]  →  (number | string | boolean)[]
```

Empty arrays are the classic hard case: with no elements, there's nothing to infer from, and the type degrades to `unknown[]`. You'll need to fill in the type manually.

Object arrays require merging the fields of all elements to produce a type. When elements don't share exactly the same fields (very common in real data), optional fields come into play:

```typescript
// 元素1: { id: 1, name: "张三", email: "a@b.com" }
// 元素2: { id: 2, name: "李四" }
// 合并结果:
interface Item {
  id: number;
  name: string;
  email?: string; // 只在部分元素中出现，标记为可选
}
```

### Handling null

`null` values in JSON need special treatment. When you see `"twitter": null`, you can't just infer `twitter: null`—it should most likely be `twitter: string | null`, meaning the field is a string when present and null otherwise.

But from a single JSON sample alone, you can't know the true type of a null field. The practical approach:

1. If the array contains multiple objects and the same field is null in some and has a value in others, union the non-null type with null: `string | null`
2. If there's only one sample and the value is null, generate `unknown | null` or just `any`, and let the developer fix it manually

## Real-World Use Cases

### Use Case 1: Integrating a New API

The most common use. The backend hands you the API docs—or you just call the endpoint and grab the response—paste it into an online converter, and get type definitions in a second.

Workflow comparison:

```text
Manual approach:
  1. Read the JSON structure
  2. Write the interface field by field
  3. Handle nested objects
  4. Verify the types are correct
  Time: 5-15 minutes per endpoint

Automated approach:
  1. Paste the JSON
  2. Copy the generated types
  3. Tweak as needed (rename, add comments)
  Time: 1-2 minutes per endpoint
```

For a mid-sized project with 30 endpoints, the difference adds up to hours of work.

### Use Case 2: JSON Configs from Third-Party SDKs

Many third-party SDKs use JSON for configuration but don't ship TypeScript types. Paste a sample config into the tool and you get type definitions:

```json
{
  "apiKey": "your-api-key",
  "region": "us-east-1",
  "retries": 3,
  "timeout": 5000,
  "features": {
    "analytics": true,
    "logging": false,
    "cache": {
      "enabled": true,
      "ttl": 3600,
      "maxSize": 1000
    }
  }
}
```

Generated output:

```typescript
interface Cache {
  enabled: boolean;
  ttl: number;
  maxSize: number;
}

interface Features {
  analytics: boolean;
  logging: boolean;
  cache: Cache;
}

interface RootObject {
  apiKey: string;
  region: string;
  retries: number;
  timeout: number;
  features: Features;
}
```

Rename a couple of things (turn `RootObject` into `SDKConfig`) and you're ready to go.

### Use Case 3: Keeping Mock Data and Types in Sync

When frontend and backend development run in parallel, the frontend often needs to write mock data. Define the mock structure in JSON first, then generate the matching types—this guarantees the mock data and type definitions stay consistent:

```typescript
// mock.json → 生成类型
import type { UserListResponse } from "./types";

// mock 数据直接满足类型约束
const mockData: UserListResponse = {
  code: 0,
  message: "success",
  data: {
    total: 2,
    page: 1,
    pageSize: 20,
    list: [
      // TypeScript 会校验每个字段
    ],
  },
};
```

## Polishing the Generated Output

Generated types are usable as-is, but for a production project, a few cleanup steps are worth it:

### 1. Rename the Interfaces

Auto-generated names are usually derived from field paths (`RootObject`, `DataList`, etc.) and aren't very meaningful. Rename them to match your domain:

```typescript
// 生成的
interface RootObject { ... }
interface DataList { ... }

// 优化后
interface ApiResponse<T> { ... }
interface UserListData { ... }
```

### 2. Extract Shared Types

Multiple endpoints often share the same outer envelope (code + message + data). Pull it out into a generic:

```typescript
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

// 各接口只定义 data 部分
type UserListResponse = ApiResponse<UserListData>;
type OrderDetailResponse = ApiResponse<OrderDetail>;
```

### 3. Narrow string Types

Inference can only give you `string`, but in real business logic many string fields are enums:

```typescript
// 生成的
interface User {
  role: string;
  status: string;
}

// 优化后
type UserRole = "admin" | "editor" | "viewer";
type UserStatus = "active" | "inactive" | "banned";

interface User {
  role: UserRole;
  status: UserStatus;
}
```

### 4. Add JSDoc Comments

With comments on the type definitions, hovering in the editor shows what each field means:

```typescript
interface User {
  /** 用户唯一ID */
  id: number;
  /** 显示名称 */
  name: string;
  /** 注册邮箱 */
  email: string;
  /** 账号创建时间 (ISO 8601) */
  createdAt: string;
}
```

## Comparison with Other Approaches

JSON-to-TypeScript isn't the only way to generate types. A quick comparison:

| Approach | Best for | Pros | Limitations |
|------|---------|------|------|
| JSON to TypeScript | You have a JSON sample | Zero config, paste and go | Depends on sample quality |
| OpenAPI/Swagger generation | An API spec exists | Most accurate types | Backend must maintain the spec |
| GraphQL codegen | GraphQL APIs | Auto-syncs with the schema | GraphQL only |
| Runtime validation (zod, io-ts) | Runtime validation needed | Compile-time + runtime guarantees | Steeper learning curve |

JSON-to-TypeScript is best suited for "get it done fast" scenarios: you have a chunk of JSON and need type definitions right now so you can start writing code. It requires no backend cooperation and no extra toolchain—paste it in and you have your result.

## Recommended Online Tool

[The JSON to TypeScript tool on AnyFreeTools](https://anyfreetools.com/tools/json-to-typescript) supports:

- Paste JSON, auto-generate TypeScript interfaces
- Handles nested objects and arrays
- Detects null values and generates union types
- Supports custom root type names
- According to the tool's page, all conversion happens locally in the browser; data is never uploaded to a server

The whole process takes three steps: paste JSON → click convert → copy the result. For the type definitions that come up constantly in day-to-day development, it saves a meaningful amount of time.

---

**More posts in this series**:

- [Tool Guide 1: Online Image Compression](/en/posts/blog084_image-compress-guide/) - Image compression principles and practice
- [Tool Guide #2: Online JSON Formatter](/en/posts/blog085_json-formatter-guide/) - JSON formatting and validation
- [Tool Guide #3: Online Regex Tester](/en/posts/blog086_regex-tester-guide/) - Regex debugging techniques
- [Tool Guide 4: QR Code Generator](/en/posts/blog089_qrcode-generator-guide/) - QR code generation and customization
- [Tool Guide 5: Base64 Encoder/Decoder](/en/posts/blog090_base64-tool-guide/) - How Base64 encoding works
- [Tool Guide 6: Online JWT Decoder](/en/posts/blog092_jwt-decoder-guide/) - JWT structure and security
- [Tool Guide 7: Unix Timestamp Converter](/en/posts/blog094_timestamp-tool-guide/) - Timestamp conversion explained
- [Tool Guide 8: Online Password Generator](/en/posts/blog095_password-generator-guide/) - Password generation and security
- [Tool Guide 9: URL Encoder/Decoder](/en/posts/blog096_url-encoder-guide/) - URL encoding standards
- [Tool Guide 10: Online Hash Generator](/en/posts/blog097_hash-generator-guide/) - Hash functions and their applications
