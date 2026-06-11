---
author: Gerald Chen
pubDatetime: 2026-06-11T14:00:00+08:00
title: Tool Guide 67 - Online JSON to Zod Schema Generator
slug: blog189_json-to-zod-guide
featured: true
draft: true
reviewed: true
approved: false
tags:
  - 工具指南
  - 工具
  - TypeScript
  - Zod
  - 前端
description: An online JSON to Zod Schema generator that turns pasted JSON into Zod validation code with type inference. It handles nested objects, arrays, and optional fields, helping TypeScript developers wire up runtime type checks in seconds.
---

If you write TypeScript, chances are you're already using Zod. As of June 2026, Zod pulls more than 30 million weekly downloads on npm (source: official npm stats), making it the de facto standard for runtime type validation in TypeScript.

There's one workflow that's always been a pain, though: you get a JSON response from some API and want to write the matching Zod schema quickly. Writing it by hand isn't hard, but once the field count goes up it turns into pure grunt work — especially for responses nested three or four levels deep, where it's easy to miss a field or get a type wrong halfway through.

This post introduces an online tool that generates Zod schema code from pasted JSON, so you can skip that mechanical part.

## The tool

[AnyFreeTools JSON to Zod](https://anyfreetools.com/tools/json-to-zod)

Everything runs locally in the browser. Your JSON never leaves your machine.

## Why Zod

A quick bit of background. TypeScript's type system only exists at compile time — at runtime it's completely transparent. You can define an `interface User`, but if the API response is missing a field or has the wrong type, the TypeScript compiler can't help you.

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

// Compiles fine, but at runtime data could be anything
const data: User = await fetch("/api/user").then(r => r.json());
```

Zod fills that gap at runtime:

```typescript
import { z } from "zod";

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
});

type User = z.infer<typeof UserSchema>; // Auto-infers TypeScript type

const result = UserSchema.safeParse(data);
if (!result.success) {
  console.error("Invalid data format:", result.error.issues);
}
```

One piece of code covers both runtime validation and compile-time types. That's the core reason Zod took off.

## Real-world use cases

### Case 1: Integrating a third-party API

The most common scenario. You get a JSON response from an API and need a Zod schema to validate it. Say a user-list endpoint returns:

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "users": [
      {
        "id": 1,
        "name": "Alice",
        "email": "alice@example.com",
        "role": "admin",
        "profile": {
          "avatar": "https://example.com/avatar.png",
          "bio": "Hello world",
          "social": {
            "github": "alice",
            "twitter": null
          }
        },
        "createdAt": "2026-01-15T08:30:00Z"
      }
    ],
    "total": 42,
    "page": 1,
    "pageSize": 20
  }
}
```

That JSON is nested four levels deep (root → data → users array → profile → social). Writing the Zod schema by hand takes roughly 5–10 minutes, and it's easy to miss nullable fields like `twitter: null`.

Paste the same JSON into the tool and you get the full Zod schema in seconds:

```typescript
const schema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.object({
    users: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        email: z.string(),
        role: z.string(),
        profile: z.object({
          avatar: z.string(),
          bio: z.string(),
          social: z.object({
            github: z.string(),
            twitter: z.null(),
          }),
        }),
        createdAt: z.string(),
      })
    ),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
  }),
});
```

The output usually needs a bit of tuning. For example, `twitter` should really be `z.string().nullable()` rather than `z.null()`; `email` deserves an `.email()` check; `createdAt` is a good fit for `z.coerce.date()`. But the structural skeleton is already there, and tweaking it is much faster than starting from scratch.

### Case 2: Generating schemas from a database JSON column

Plenty of projects store JSON in the database (PostgreSQL's `jsonb`, for instance). Pull a row, copy the JSON value, generate the Zod schema, and use it to validate at the application layer.

### Case 3: Pairing with form libraries

Zod's integration with React Hook Form, Formik, and friends is rock solid. Generate the base schema with the tool, then layer on `.min()`, `.max()`, `.regex()`, etc. — the same schema can cover both form validation and API data checks.

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Start from the tool-generated base schema, add business rules
const FormSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  age: z.number().int().min(18).max(120),
});

function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(FormSchema),
  });
  // ...
}
```

## How the tool maps types

Knowing the mapping rules helps you judge what to tweak in the generated code:

| JSON value | Generated Zod type | Likely needs adjustment |
|---------|---------------|------------|
| `"hello"` | `z.string()` | Consider `.email()`, `.url()`, etc. |
| `42` | `z.number()` | Consider `.int()`, `.positive()`, etc. |
| `true` / `false` | `z.boolean()` | Usually fine as-is |
| `null` | `z.null()` | Usually should become `z.string().nullable()` etc. |
| `[...]` | `z.array(...)` | Empty arrays become `z.array(z.unknown())` |
| `{...}` | `z.object({...})` | Usually fine as-is |

A few things worth flagging:

**Handling `null`**. A JSON `null` carries no information about what type the value "should" be, so the tool can only emit `z.null()`. In real code you almost always want `z.string().nullable()` or `z.number().nullable()` instead. You have to fix this by hand.

**Empty arrays**. If the JSON contains `"tags": []`, the tool has no way to know the element type and emits `z.array(z.unknown())`. You need to swap that for the concrete type — `z.array(z.string())` or whatever fits your domain.

**Integers vs. floats**. JSON doesn't distinguish between integers and floats — `42` and `42.0` are the same number to it. The tool always emits `z.number()`; add `.int()` yourself when you need integer validation.

## Zod schemas vs. TypeScript interfaces

Some folks ask: I already have a JSON-to-TypeScript tool ([AnyFreeTools JSON to TypeScript](https://anyfreetools.com/tools/json-to-typescript)), why bother with JSON-to-Zod?

The difference is that a TypeScript interface only exists at compile time, while a Zod schema validates at runtime too:

```typescript
// TypeScript interface — compile-time type check, no runtime
interface User {
  name: string;
  age: number;
}

// Zod schema — compile-time + runtime, both guaranteed
const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
});
type User = z.infer<typeof UserSchema>;
```

In real projects the two are often used together. Validate API responses with a Zod schema, let `z.infer` derive the type for your business logic, and you stop maintaining two parallel definitions.

## Polishing the generated code

The tool gives you "working" code; the gap between that and "good" code is usually a few targeted edits. Common things to do:

### Tighten the validation

```typescript
// Tool-generated
const schema = z.object({
  email: z.string(),
  age: z.number(),
  url: z.string(),
});

// Optimized
const schema = z.object({
  email: z.string().email("Invalid email format"),
  age: z.number().int().min(0).max(150),
  url: z.string().url("Invalid URL format"),
});
```

### Mark optional fields

Some API fields show up sometimes and not others. If the sample JSON happens to include the field, the tool will treat it as required. Cross-check against the API docs and add `.optional()` where it belongs:

```typescript
const schema = z.object({
  id: z.number(),
  name: z.string(),
  nickname: z.string().optional(), // Optional
  avatar: z.string().url().optional(), // Optional
});
```

### Add defaults

```typescript
const ConfigSchema = z.object({
  theme: z.string().default("light"),
  pageSize: z.number().default(20),
  enableNotification: z.boolean().default(true),
});
```

### Prefer enums over open-ended strings

When a field has a fixed set of values, `z.enum()` is much safer than `z.string()`:

```typescript
// Tool-generated
const schema = z.object({
  role: z.string(),
  status: z.string(),
});

// Optimized
const schema = z.object({
  role: z.enum(["admin", "editor", "viewer"]),
  status: z.enum(["active", "inactive", "suspended"]),
});
```

## Chaining with other tools

In a real workflow this tool slots in next to a few others:

1. Clean up the API response with the [JSON formatter](https://anyfreetools.com/tools/json-formatter)
2. Generate the base schema with [JSON to Zod](https://anyfreetools.com/tools/json-to-zod)
3. Generate type definitions for reference with [JSON to TypeScript](https://anyfreetools.com/tools/json-to-typescript)
4. Tighten the Zod schema by hand with your domain validation rules

This pipeline is especially efficient when integrating a new API — it shrinks "read the docs → write types → write validation" from half an hour down to a few minutes.

## Wrap-up

JSON to Zod solves a specific but very frequent problem: turning a JSON shape into the skeleton of a Zod schema. It won't replace understanding your domain — null handling, optional fields, and precise validation rules still need your judgment — but it cuts out the most mechanical part of the job.

If your project already uses Zod, this one is worth bookmarking.

---

**Other posts in this series**:

- [Tool Guide 1 - Online Image Compression](https://chenguangliang.com/en/posts/blog084_image-compress-guide/)
- [Tool Guide 2 - Online JSON Formatter](https://chenguangliang.com/en/posts/blog085_json-formatter-guide/)
- [Tool Guide 5 - Base64 Encoder/Decoder](https://chenguangliang.com/en/posts/blog090_base64-tool-guide/)
- [Tool Guide 11 - JSON to TypeScript Type Generator](https://chenguangliang.com/en/posts/blog099_json-to-typescript-guide/)
- [Tool Guide 17 - AI Token Counter](https://chenguangliang.com/en/posts/blog107_token-counter-guide/)
- [Tool Guide 42 - Online JSON Schema Validator](https://chenguangliang.com/en/posts/blog141_json-schema-validator-guide/)
- [Tool Guide 48 - Online JSONPath Query Tool](https://chenguangliang.com/en/posts/blog150_jsonpath-guide/)
