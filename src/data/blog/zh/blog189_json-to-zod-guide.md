---
author: 陈广亮
pubDatetime: 2026-06-11T14:00:00+08:00
title: 工具指南67-在线JSON转Zod Schema生成器
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
description: 介绍一款在线JSON转Zod Schema生成器，粘贴JSON即可自动生成带类型推断的Zod验证代码，支持嵌套对象、数组、可选字段等复杂结构，帮助TypeScript开发者快速建立运行时类型校验。
---

写 TypeScript 项目的人，大概率已经在用 Zod 了。截至 2026 年 6 月，Zod 在 npm 的周下载量超过 3000 万次（来源：npm 官方统计），几乎成了 TypeScript 运行时类型校验的事实标准。

但有一个场景一直不太方便：拿到一个 API 返回的 JSON，想快速写出对应的 Zod schema。手动写不难，但字段多了之后就是纯体力活 -- 尤其是嵌套三四层的 JSON 响应，写着写着容易漏字段或者搞错类型。

这篇文章介绍一个在线工具，粘贴 JSON 就能生成 Zod schema 代码，省掉这部分机械劳动。

## 工具地址

[AnyFreeTools JSON to Zod](https://anyfreetools.com/tools/json-to-zod)

所有转换在浏览器本地完成，JSON 数据不会上传到服务器。

## 为什么需要 Zod

先快速过一下背景。TypeScript 的类型系统只在编译时生效，运行时是完全透明的。也就是说，你定义了一个 `interface User`，但从 API 拿到的数据如果缺了字段或者类型不对，TypeScript 编译器帮不了你。

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

// 编译通过，但运行时 data 可能是任何东西
const data: User = await fetch("/api/user").then(r => r.json());
```

Zod 的作用就是在运行时补上这一环：

```typescript
import { z } from "zod";

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
});

type User = z.infer<typeof UserSchema>; // 自动推断出 TypeScript 类型

const result = UserSchema.safeParse(data);
if (!result.success) {
  console.error("数据格式不对:", result.error.issues);
}
```

一份代码同时搞定运行时校验和编译时类型，这是 Zod 能火起来的核心原因。

## 实际使用场景

### 场景一：对接第三方 API

最典型的情况。拿到一个 API 的 JSON 响应，需要写 Zod schema 来校验。比如一个用户列表接口返回：

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

这个 JSON 嵌套了 4 层（根对象 → data → users 数组 → profile → social）。手动写 Zod schema 大概要 5-10 分钟，而且很容易漏掉 `twitter: null` 这种可空字段。

把这段 JSON 粘贴到工具里，几秒钟就能得到完整的 Zod schema：

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

生成后通常需要做一些微调。比如 `twitter` 字段实际上应该是 `z.string().nullable()` 而不是 `z.null()`，`email` 可以加上 `.email()` 校验，`createdAt` 可以用 `z.coerce.date()` 自动转换。但核心的结构骨架已经有了，修改比从零开始快得多。

### 场景二：从数据库 JSON 字段生成 schema

很多项目会在数据库里存 JSON 字段（比如 PostgreSQL 的 `jsonb`）。从数据库取出一条记录，复制 JSON 值，直接生成 Zod schema，然后在应用层做校验。

### 场景三：配合表单库使用

Zod 和 React Hook Form、Formik 等表单库的集成已经非常成熟。用工具生成基础 schema，再加上 `.min()`、`.max()`、`.regex()` 等细化校验，就能同时覆盖表单验证和 API 数据校验。

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// 从工具生成的基础 schema 出发，加上业务校验
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

## 工具的转换规则

了解工具的类型映射逻辑，有助于判断生成结果是否需要调整：

| JSON 值 | 生成的 Zod 类型 | 可能需要调整 |
|---------|---------------|------------|
| `"hello"` | `z.string()` | 可加 `.email()` `.url()` 等 |
| `42` | `z.number()` | 可加 `.int()` `.positive()` 等 |
| `true` / `false` | `z.boolean()` | 通常不需要调整 |
| `null` | `z.null()` | 通常应改为 `z.string().nullable()` 等 |
| `[...]` | `z.array(...)` | 空数组会生成 `z.array(z.unknown())` |
| `{...}` | `z.object({...})` | 通常不需要调整 |

几个需要注意的点：

**null 值的处理**。JSON 里的 `null` 没有携带"原本应该是什么类型"的信息，工具只能生成 `z.null()`。实际开发中，你几乎总是想要 `z.string().nullable()` 或 `z.number().nullable()` 这样的写法。这一步必须手动调整。

**空数组**。如果 JSON 里有个 `"tags": []`，工具不知道数组元素应该是什么类型，会生成 `z.array(z.unknown())`。你需要根据业务逻辑改成 `z.array(z.string())` 之类的具体类型。

**数字的整数判断**。JSON 的数字类型不区分整数和浮点数，`42` 和 `42.0` 对 JSON 来说是一样的。工具统一生成 `z.number()`，如果需要整数校验要手动加 `.int()`。

## Zod Schema 和 TypeScript Interface 的对比

有人会问：我已经有了 JSON to TypeScript 的工具（[AnyFreeTools JSON to TypeScript](https://anyfreetools.com/tools/json-to-typescript)），为什么还需要 JSON to Zod？

区别在于 TypeScript interface 只在编译时有效，Zod schema 在运行时也能校验：

```typescript
// TypeScript interface -- 编译时类型检查，运行时无效
interface User {
  name: string;
  age: number;
}

// Zod schema -- 编译时 + 运行时双重保障
const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
});
type User = z.infer<typeof UserSchema>;
```

实际项目中，两者经常一起用。用 Zod schema 做 API 层的数据校验，`z.infer` 自动导出类型给业务逻辑使用，不需要手动维护两套定义。

## 生成代码后的优化建议

工具生成的是"能用"的代码，但离"好用"通常还差几步。以下是一些常见的优化方向：

### 添加更精确的校验

```typescript
// 工具生成的
const schema = z.object({
  email: z.string(),
  age: z.number(),
  url: z.string(),
});

// 优化后
const schema = z.object({
  email: z.string().email("邮箱格式不正确"),
  age: z.number().int().min(0).max(150),
  url: z.string().url("URL 格式不正确"),
});
```

### 处理可选字段

API 返回的 JSON 里某些字段可能有时存在有时不存在。JSON 样本里如果恰好包含了这个字段，工具会把它当成必填。需要根据 API 文档手动标记 `.optional()`：

```typescript
const schema = z.object({
  id: z.number(),
  name: z.string(),
  nickname: z.string().optional(), // 非必填
  avatar: z.string().url().optional(), // 非必填
});
```

### 添加默认值

```typescript
const ConfigSchema = z.object({
  theme: z.string().default("light"),
  pageSize: z.number().default(20),
  enableNotification: z.boolean().default(true),
});
```

### 使用 enum 替代宽泛的 string

如果某个字段的值是固定几个选项，用 `z.enum()` 比 `z.string()` 更安全：

```typescript
// 工具生成的
const schema = z.object({
  role: z.string(),
  status: z.string(),
});

// 优化后
const schema = z.object({
  role: z.enum(["admin", "editor", "viewer"]),
  status: z.enum(["active", "inactive", "suspended"]),
});
```

## 和其他工具的配合

在实际开发工作流中，这个工具可以和其他几个工具串联使用：

1. 用 [JSON 格式化工具](https://anyfreetools.com/tools/json-formatter) 先把 API 响应整理好格式
2. 用 [JSON to Zod](https://anyfreetools.com/tools/json-to-zod) 生成基础 schema
3. 用 [JSON to TypeScript](https://anyfreetools.com/tools/json-to-typescript) 生成类型定义作为参考
4. 手动优化 Zod schema，添加业务校验规则

这套流程在对接新 API 时特别高效，能把"看 API 文档 → 写类型 → 写校验"的时间从半小时压缩到几分钟。

## 总结

JSON to Zod 工具解决的是一个具体但高频的问题：把 JSON 结构快速转成 Zod schema 的骨架代码。它不能替代你理解业务逻辑（null 值处理、可选字段、精确校验规则还是得自己加），但能省掉最机械的那部分工作。

如果你的项目已经在用 Zod，这个工具值得加到书签里。

---

**本系列其他文章**：

- [工具指南1-在线图片压缩](https://chenguangliang.com/posts/blog084_image-compress-guide/)
- [工具指南2-在线JSON格式化工具](https://chenguangliang.com/posts/blog085_json-formatter-guide/)
- [工具指南5-Base64编解码工具](https://chenguangliang.com/posts/blog090_base64-tool-guide/)
- [工具指南11-JSON转TypeScript类型生成器](https://chenguangliang.com/posts/blog099_json-to-typescript-guide/)
- [工具指南17-AI Token计数器](https://chenguangliang.com/posts/blog107_token-counter-guide/)
- [工具指南42-在线JSON Schema验证器](https://chenguangliang.com/posts/blog141_json-schema-validator-guide/)
- [工具指南48-在线JSONPath查询工具](https://chenguangliang.com/posts/blog150_jsonpath-guide/)
