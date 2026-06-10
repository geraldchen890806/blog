---
author: Gerald Chen
pubDatetime: 2026-04-22T10:00:00+08:00
title: "Tool Guide 42: Online JSON Schema Validator"
slug: blog141_json-schema-validator-guide
featured: false
draft: true
reviewed: false
approved: false
tags:
  - 工具指南
  - 工具
description: "A practical guide to using an online JSON Schema validator, covering the core keywords across Draft 4/6/7/2019-09/2020-12, common validation scenarios, and debugging tips to help developers quickly verify API payloads and config file formats."
---

You're debugging an API integration and the backend returns a JSON field with the wrong type. A config file ships to production missing a required key. The data structure a frontend form submits doesn't match the docs. These problems all share one trait: they surface at runtime instead of being caught at authoring time.

JSON Schema is the standard built to solve exactly this. A schema file describes what your data should look like; a validator compares actual data against the schema and, when it fails, tells you precisely where and why.

The [Online JSON Schema Validator](https://anyfreetools.com/tools/json-schema-validator) is a free browser-based tool that supports every mainstream version—Draft 4/6/7/2019-09/2020-12—with no installation, no account, and no data ever leaving your browser.

## What Is JSON Schema

A JSON Schema is itself a piece of JSON that describes the structural constraints of another piece of JSON. The simplest example:

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

This schema says: the data must be an object, `name` must be a string and is required, and `age`, if present, must be a non-negative integer.

Paste it into the left side of the validator, paste the data you want to check on the right, and the tool tells you immediately whether it passes.

## Tool Interface Overview

The tool is split into three areas:

- **Schema input (top left)**: paste or edit your JSON Schema
- **Data input (bottom left)**: paste the JSON data to validate
- **Result panel (right)**: shows validation results in real time

A passing validation shows a green "Valid"; a failing one shows a red "Invalid" along with each error's path (e.g. `/user/email`) and reason (e.g. `"must be string"`).

The version selector defaults to Draft 7 (the most widely used). You can switch to any other version, and the tool re-validates automatically.

## Core Keywords Quick Reference

### Type Constraints

```json
{
  "type": "string"
}
```

`type` supports `string`, `number`, `integer`, `boolean`, `array`, `object`, and `null`. It can also be an array to allow multiple types:

```json
{
  "type": ["string", "null"]
}
```

This is the equivalent of `string | null` in TypeScript.

### String Constraints

```json
{
  "type": "string",
  "minLength": 1,
  "maxLength": 100,
  "pattern": "^[a-zA-Z0-9_]+$",
  "format": "email"
}
```

`format` is an advisory keyword. Common values: `email`, `uri`, `date` (`2024-01-15`), `date-time` (ISO 8601), `uuid`, `ipv4`, `ipv6`. Implementations vary in how strictly they treat `format`—some libraries skip validating it by default and only record it as an annotation.

### Number Constraints

```json
{
  "type": "number",
  "minimum": 0,
  "maximum": 100,
  "exclusiveMinimum": true,
  "multipleOf": 0.5
}
```

Note: in Draft 4, `exclusiveMinimum` is a boolean; Draft 6+ changed it to a number (you write the exclusive bound directly). Same semantics, different syntax:

```json
// Draft 4
{ "minimum": 0, "exclusiveMinimum": true }

// Draft 6+
{ "exclusiveMinimum": 0 }
```

### Array Constraints

```json
{
  "type": "array",
  "items": { "type": "string" },
  "minItems": 1,
  "maxItems": 10,
  "uniqueItems": true
}
```

`items` defines the schema for each element. `uniqueItems: true` requires all elements to be distinct—useful for tags, permission lists, and the like.

For arrays with a fixed tuple structure, use the array form of `items` (renamed to `prefixItems` in Draft 2020-12):

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

This means: the array has exactly three elements—a string, a number, then a boolean—with no extra elements allowed.

### Object Constraints

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

`additionalProperties: false` is strict mode: only fields declared in `properties` are allowed, and anything extra is an error. This is handy for API validation, where it prevents clients from sending unexpected fields.

If you want to allow extra fields but constrain their type:

```json
{
  "additionalProperties": { "type": "string" }
}
```

## Composition Keywords

### allOf, anyOf, oneOf

```json
{
  "allOf": [
    { "type": "object" },
    { "required": ["id"] }
  ]
}
```

- `allOf`: must satisfy every schema (like AND)
- `anyOf`: must satisfy at least one schema (like OR)
- `oneOf`: must satisfy exactly one schema (like XOR)

`oneOf` is the strictest and is typically used for mutually exclusive union types. For example, a payment is either by card (with a card number field) or by Alipay (with an account field)—never both, never neither:

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

Conditional constraints, introduced in Draft 7, are often more intuitive than `oneOf`:

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

If `country` is "CN", then `province` is required; otherwise `state` is required.

## References and Reuse: $ref

In larger projects you can split schemas into reusable pieces:

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

`$defs` (Draft 2019-09+; older versions use `definitions`) defines reusable sub-schemas, and `$ref` references them. The `Address` rules are written once and shared by both address fields.

## Real-World Examples

### Validating an API Response

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

### Validating a Config File

CI/CD configs, Docker Compose files, and application config files are all good candidates for schema constraints:

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

## Key Differences Between Versions

| Feature | Draft 4 | Draft 7 | 2019-09/2020-12 |
|------|---------|---------|----------------|
| `exclusiveMinimum/Maximum` | boolean | number | number |
| `if/then/else` | not supported | supported | supported |
| Keywords alongside `$ref` | ignored | ignored | supported (recommended) |
| Tuple definition | `items` (array form) | `items` (array form) | `prefixItems` |
| Reusable definitions location | `definitions` | `definitions` | `$defs` |
| `readOnly`/`writeOnly` | not supported | supported | supported |

Draft 7 is enough for most projects. For new projects, going straight to 2020-12 gets you cleaner semantics (`$ref` no longer conflicts with sibling keywords, and tuple definitions are more explicit).

## Integrating into Your Code

Beyond manual debugging, validation can be wired directly into your project.

**Node.js (Ajv)**:

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

Ajv supports Draft 7 by default; for 2020-12 you need `ajv` v8:

```typescript
import Ajv2020 from "ajv/dist/2020";
const ajv = new Ajv2020();
```

**Python (jsonschema)**:

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

## Debugging Tips

**Start with a minimal schema**: write just the `type` first, then add constraints one at a time once it passes. This quickly pinpoints which rule is breaking things.

**Declare the version with `$schema`**: add `"$schema": "https://json-schema.org/draft/2020-12/schema"` to your schema so tools and editors apply the correct hints and validation behavior.

**Be careful with `additionalProperties: false`**: setting it to `false` during development is great for catching unexpected fields, but if your schema is published as part of a library or framework and extended by third parties, being too strict breaks forward compatibility.

**Read error paths carefully**: when validation fails, the tool gives you a JSON Pointer path (e.g. `/data/items/0/email`) that pinpoints exactly which nested field is wrong—no need to hunt from the top.

---

Online tool: [JSON Schema Validator](https://anyfreetools.com/tools/json-schema-validator)

The real value of JSON Schema is "docs as spec"—a schema file is documentation and an executable validation rule at the same time, written once and used twice. Debug your schemas with the online validator, then integrate them into your project with libraries like Ajv or jsonschema. Combining the two is the most efficient workflow.
