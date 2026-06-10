---
author: 陈广亮
pubDatetime: 2026-04-22T10:00:00+08:00
title: 工具指南42-在线JSON Schema验证器
slug: blog141_json-schema-validator-guide
featured: false
draft: true
reviewed: false
approved: false
tags:
  - 工具指南
  - 工具
description: 介绍在线JSON Schema验证器的使用方法，涵盖Draft 4/6/7/2019-09/2020-12各版本核心关键字、常见验证场景和调试技巧，帮助开发者快速校验API接口数据、配置文件格式。
---

API 接口联调时，后端返回的 JSON 字段类型对不上；配置文件上线后才发现少填了必填项；前端表单提交的数据结构和文档描述不一致——这些问题的共同点是：在运行时才发现，而不是在编写时就拦截。

JSON Schema 是专门解决这类问题的标准。一份 Schema 文件描述数据应该长什么样，验证工具把实际数据和 Schema 对比，不通过就告诉你哪里错了。

[在线JSON Schema验证器](https://anyfreetools.com/tools/json-schema-validator) 是一个免费的浏览器端工具，支持 Draft 4/6/7/2019-09/2020-12 全部主流版本，无需安装、无需账户、数据不上传服务器。

## JSON Schema 是什么

JSON Schema 本身也是一段 JSON，描述另一段 JSON 数据的结构约束。最简单的例子：

```json
{
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "age": { "type": "integer", "minimum": 0 }
  },
  "required": ["name"]
}
```

这个 Schema 说：数据必须是对象，`name` 字段必须是字符串且必填，`age` 字段如果有则必须是非负整数。

把它粘贴到验证器左侧，再把要校验的数据粘贴到右侧，工具立刻告诉你是否通过。

## 工具界面说明

工具分三个区域：

- **Schema 输入框（左上）**：粘贴或编辑 JSON Schema
- **数据输入框（左下）**：粘贴要验证的 JSON 数据
- **结果面板（右侧）**：实时显示验证结果

验证通过显示绿色 "Valid"；不通过显示红色 "Invalid"，并列出每个错误的路径（如 `/user/email`）和原因（如 `"must be string"`）。

版本选择器默认是 Draft 7（使用最广泛），可以切换到其他版本，切换后自动重新验证。

## 核心关键字速查

### 类型约束

```json
{
  "type": "string"
}
```

`type` 支持：`string`、`number`、`integer`、`boolean`、`array`、`object`、`null`。也可以是数组，表示允许多种类型：

```json
{
  "type": ["string", "null"]
}
```

这在 TypeScript 中对应 `string | null`。

### 字符串约束

```json
{
  "type": "string",
  "minLength": 1,
  "maxLength": 100,
  "pattern": "^[a-zA-Z0-9_]+$",
  "format": "email"
}
```

`format` 是一个建议性关键字，常用值：`email`、`uri`、`date`（`2024-01-15`）、`date-time`（ISO 8601）、`uuid`、`ipv4`、`ipv6`。不同实现对 `format` 的严格程度不同，部分库默认不校验 `format`，只做类型记录。

### 数字约束

```json
{
  "type": "number",
  "minimum": 0,
  "maximum": 100,
  "exclusiveMinimum": true,
  "multipleOf": 0.5
}
```

注意：Draft 4 中 `exclusiveMinimum` 是布尔值，Draft 6+ 改成了数值（直接写排他边界值），两者语义相同但写法不同：

```json
// Draft 4
{ "minimum": 0, "exclusiveMinimum": true }

// Draft 6+
{ "exclusiveMinimum": 0 }
```

### 数组约束

```json
{
  "type": "array",
  "items": { "type": "string" },
  "minItems": 1,
  "maxItems": 10,
  "uniqueItems": true
}
```

`items` 定义每个元素的 Schema。`uniqueItems: true` 要求所有元素不重复，适合标签、权限列表等场景。

如果数组是固定结构的元组，可以用数组形式的 `items`（Draft 2020-12 改名为 `prefixItems`）：

```json
{
  "type": "array",
  "prefixItems": [
    { "type": "string" },
    { "type": "number" },
    { "type": "boolean" }
  ],
  "items": false
}
```

这表示：数组恰好有三个元素，第一个字符串、第二个数字、第三个布尔值，不允许多余元素。

### 对象约束

```json
{
  "type": "object",
  "properties": {
    "id": { "type": "integer" },
    "name": { "type": "string" },
    "email": { "type": "string", "format": "email" }
  },
  "required": ["id", "name"],
  "additionalProperties": false
}
```

`additionalProperties: false` 是一个严格模式：只允许 `properties` 里声明的字段，任何多余字段都会报错。在 API 校验时很有用，能防止客户端传入意外字段。

如果希望允许额外字段但限制其类型：

```json
{
  "additionalProperties": { "type": "string" }
}
```

## 组合关键字

### allOf、anyOf、oneOf

```json
{
  "allOf": [
    { "type": "object" },
    { "required": ["id"] }
  ]
}
```

- `allOf`：必须满足所有 Schema（类似 AND）
- `anyOf`：满足至少一个 Schema（类似 OR）
- `oneOf`：恰好满足一个 Schema（类似 XOR）

`oneOf` 最严格，常用于互斥的联合类型。例如支付方式要么是银行卡（有卡号字段），要么是支付宝（有账户字段），不能同时有也不能都没有：

```json
{
  "oneOf": [
    {
      "properties": {
        "method": { "const": "card" },
        "cardNumber": { "type": "string" }
      },
      "required": ["method", "cardNumber"]
    },
    {
      "properties": {
        "method": { "const": "alipay" },
        "account": { "type": "string" }
      },
      "required": ["method", "account"]
    }
  ]
}
```

### if / then / else

Draft 7 引入的条件约束，比 `oneOf` 更直观：

```json
{
  "if": {
    "properties": { "country": { "const": "CN" } },
    "required": ["country"]
  },
  "then": {
    "required": ["province"]
  },
  "else": {
    "required": ["state"]
  }
}
```

如果 `country` 是 "CN"，则 `province` 必填；否则 `state` 必填。

## 引用和复用：$ref

大型项目中 Schema 可以拆分复用：

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$defs": {
    "Address": {
      "type": "object",
      "properties": {
        "street": { "type": "string" },
        "city": { "type": "string" },
        "zip": { "type": "string", "pattern": "^[0-9]{6}$" }
      },
      "required": ["street", "city", "zip"]
    }
  },
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "shippingAddress": { "$ref": "#/$defs/Address" },
    "billingAddress": { "$ref": "#/$defs/Address" }
  }
}
```

`$defs`（Draft 2019-09+，旧版用 `definitions`）定义可复用的子 Schema，`$ref` 引用它。这样 `Address` 的规则只写一次，两个地址字段都能用。

## 实际场景示例

### API 响应校验

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "code": { "type": "integer", "enum": [0, 200] },
    "message": { "type": "string" },
    "data": {
      "type": "object",
      "properties": {
        "userId": { "type": "string", "format": "uuid" },
        "username": { "type": "string", "minLength": 2, "maxLength": 30 },
        "createdAt": { "type": "string", "format": "date-time" },
        "roles": {
          "type": "array",
          "items": { "type": "string", "enum": ["admin", "editor", "viewer"] },
          "uniqueItems": true
        }
      },
      "required": ["userId", "username", "createdAt", "roles"]
    }
  },
  "required": ["code", "message", "data"]
}
```

### 配置文件校验

CI/CD 配置、Docker Compose、应用配置文件都适合用 Schema 约束：

```json
{
  "type": "object",
  "properties": {
    "server": {
      "type": "object",
      "properties": {
        "host": { "type": "string" },
        "port": { "type": "integer", "minimum": 1024, "maximum": 65535 }
      },
      "required": ["host", "port"]
    },
    "database": {
      "type": "object",
      "properties": {
        "url": { "type": "string", "format": "uri" },
        "poolSize": { "type": "integer", "minimum": 1, "default": 10 }
      },
      "required": ["url"]
    },
    "logLevel": {
      "type": "string",
      "enum": ["debug", "info", "warn", "error"],
      "default": "info"
    }
  },
  "required": ["server", "database"]
}
```

## 各版本主要差异

| 特性 | Draft 4 | Draft 7 | 2019-09/2020-12 |
|------|---------|---------|----------------|
| `exclusiveMinimum/Maximum` | 布尔值 | 数值 | 数值 |
| `if/then/else` | 不支持 | 支持 | 支持 |
| `$ref` 同级关键字 | 忽略 | 忽略 | 支持（推荐） |
| 元组定义 | `items`（数组） | `items`（数组） | `prefixItems` |
| 复用定义位置 | `definitions` | `definitions` | `$defs` |
| `readOnly`/`writeOnly` | 不支持 | 支持 | 支持 |

大多数项目用 Draft 7 已经足够。如果是新项目，直接用 2020-12 可以获得更清晰的语义（`$ref` 和普通关键字共存不再冲突，元组定义更明确）。

## 在代码中集成

验证器除了手动调试，还可以直接集成到项目里。

**Node.js（Ajv）**：

```typescript
import Ajv from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv();
addFormats(ajv);

const schema = {
  type: "object",
  properties: {
    email: { type: "string", format: "email" },
    age: { type: "integer", minimum: 0 }
  },
  required: ["email"]
};

const validate = ajv.compile(schema);
const data = { email: "user@example.com", age: 25 };

if (!validate(data)) {
  console.error(validate.errors);
}
```

Ajv 默认支持 Draft 7，要用 2020-12 需要安装 `ajv` v8：

```typescript
import Ajv2020 from "ajv/dist/2020";
const ajv = new Ajv2020();
```

**Python（jsonschema）**：

```python
import jsonschema

schema = {
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "age": {"type": "integer"}
    },
    "required": ["name"]
}

try:
    jsonschema.validate(instance={"name": "Alice", "age": 30}, schema=schema)
    print("Valid")
except jsonschema.ValidationError as e:
    print(f"Invalid: {e.message} at {e.json_path}")
```

## 调试技巧

**从最小 Schema 开始**：先只写 `type`，验证通过后再逐步加约束，能快速定位哪条规则出了问题。

**用 `$schema` 声明版本**：把 `"$schema": "https://json-schema.org/draft/2020-12/schema"` 加到 Schema 里，工具和编辑器能据此给出正确的提示和验证行为。

**`additionalProperties` 慎用 `false`**：在开发阶段设成 `false` 方便捕捉意外字段，但在库/框架作为 Schema 被第三方扩展时，太严格会破坏向前兼容性。

**错误路径要看仔细**：验证工具报错时会给出 JSON Pointer 路径（如 `/data/items/0/email`），定位到具体是哪个嵌套字段有问题，不用从头找。

---

在线工具地址：[JSON Schema 验证器](https://anyfreetools.com/tools/json-schema-validator)

JSON Schema 的价值在于"文档即规范"——Schema 文件既是文档，又是可执行的验证规则，写一次两用。用在线验证器调试 Schema，用 Ajv、jsonschema 等库集成到项目里，两者结合是最高效的工作流。
