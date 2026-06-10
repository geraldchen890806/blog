---
author: Gerald Chen
pubDatetime: 2026-04-26T14:00:00+08:00
title: "Tool Guide 48: Online JSONPath Query Tool"
slug: blog150_jsonpath-guide
featured: false
draft: true
reviewed: false
approved: false
tags:
  - 工具指南
  - 工具
description: "A guide to the online JSONPath query tool, covering the core JSONPath syntax (path expressions, wildcards, recursive descent, filters, slices), how it compares to jq, and practical use cases in API debugging, log analysis, and config file processing."
---

An API returns a deeply nested JSON payload and you need one field out of it — you can drill in level by level, or you can grab it with a single JSONPath expression.

JSONPath is a path query language for JSON, much like XPath is for XML. It lets you extract data from arbitrarily deep JSON structures with a concise expression — no loops, no temporary variables, no need to open a code editor.

The [online JSONPath query tool](https://anyfreetools.com/tools/json-path) is a browser-based tool: paste JSON on the left, type a JSONPath expression on the right, and results show up live. Everything runs locally — no data is uploaded.

## JSONPath Syntax at a Glance

A JSONPath expression starts with `$`, which represents the root of the JSON document.

### Basic Paths

```jsonpath
$               → root node (the entire JSON)
$.name          → the name field under the root
$.user.email    → nested field user.email
$['user']       → equivalent to $.user (bracket syntax, for field names with special characters)
```

### Array Access

```jsonpath
$.items[0]      → first element of the array
$.items[-1]     → last element
$.items[0,2]    → elements at index 0 and 2
$.items[1:3]    → slice, elements 1 through 2 (3 excluded)
$.items[::2]    → step slice, every other element
```

### Wildcards

```jsonpath
$.*             → all direct children of the root
$.items[*]      → all elements of the array
$.items[*].name → the name field of every array element
```

### Recursive Descent (`..`)

The double dot `..` is the most powerful — and most overlooked — operator in JSONPath. It recursively searches the entire JSON tree for matching fields, no matter how deeply nested:

```jsonpath
$..name         → every name field anywhere in the JSON (any depth)
$..price        → price fields at every level
$..items[*]     → every element of every items array, at any level
```

An example to show what `..` can do:

```json
{
  "store": {
    "book": [
      { "title": "Effective Java", "price": 45 },
      { "title": "Clean Code", "price": 38 }
    ],
    "featured": {
      "title": "Designing Data-Intensive Applications",
      "price": 56
    }
  }
}
```

```jsonpath
$..title
→ ["Effective Java", "Clean Code", "Designing Data-Intensive Applications"]

$..price
→ [45, 38, 56]
```

No matter which level a title sits at, `$..title` finds it.

### Filter Expressions (`?()`)

Filters are the most flexible feature in JSONPath. The `?()` syntax filters array elements by condition:

```jsonpath
$.items[?(@.price < 50)]        → elements with price below 50
$.items[?(@.in_stock == true)]  → elements that are in stock
$.items[?(@.tags)]              → elements that have a tags field (existence check)
$.users[?(@.age >= 18)]         → users with age >= 18
$.items[?(@.name =~ /^A/)]      → name starts with the letter A (regex match, supported by some implementations)
```

`@` refers to the array element currently being evaluated, so `@.price` is the price field of the current element.

Combined conditions:

```jsonpath
$.items[?(@.price < 50 && @.in_stock == true)]
→ elements priced below 50 that are in stock

$.users[?(@.role == "admin" || @.role == "owner")]
→ users whose role is admin or owner
```

## Practical Examples

### Scenario 1: Extracting Paginated Data from an API Response

The GitHub search API response format:

```json
{
  "total_count": 1823,
  "incomplete_results": false,
  "items": [
    { "id": 11730342, "full_name": "expressjs/express", "stargazers_count": 63000, "language": "JavaScript" },
    { "id": 27193779, "full_name": "koajs/koa", "stargazers_count": 35000, "language": "JavaScript" },
    { "id": 8784040, "full_name": "fastify/fastify", "stargazers_count": 32000, "language": "JavaScript" }
  ]
}
```

Common queries:

```jsonpath
$.items[*].full_name
→ ["expressjs/express", "koajs/koa", "fastify/fastify"]

$.items[?(@.stargazers_count > 40000)].full_name
→ ["expressjs/express"]

$.items[0:2].full_name
→ ["expressjs/express", "koajs/koa"] (only the first two)
```

### Scenario 2: Working with Nested Config Files

A Kubernetes deployment config:

```json
{
  "apiVersion": "apps/v1",
  "kind": "Deployment",
  "metadata": { "name": "api-server", "namespace": "production" },
  "spec": {
    "replicas": 3,
    "template": {
      "spec": {
        "containers": [
          {
            "name": "api",
            "image": "api-server:v2.1.0",
            "env": [
              { "name": "NODE_ENV", "value": "production" },
              { "name": "PORT", "value": "3000" },
              { "name": "DB_HOST", "value": "postgres.internal" }
            ],
            "resources": {
              "requests": { "memory": "256Mi", "cpu": "250m" },
              "limits": { "memory": "512Mi", "cpu": "500m" }
            }
          }
        ]
      }
    }
  }
}
```

```jsonpath
$.spec.template.spec.containers[0].image
→ "api-server:v2.1.0"

$.spec.template.spec.containers[0].env[?(@.name == "DB_HOST")].value
→ "postgres.internal"

$..env[*].name
→ ["NODE_ENV", "PORT", "DB_HOST"]

$.spec.replicas
→ 3
```

### Scenario 3: Analyzing Log Data

Aggregated application logs as JSON:

```json
{
  "logs": [
    { "level": "error", "message": "Database connection failed", "timestamp": 1714100000, "service": "api" },
    { "level": "info", "message": "Request processed", "timestamp": 1714100050, "service": "api" },
    { "level": "error", "message": "Timeout exceeded", "timestamp": 1714100100, "service": "worker" },
    { "level": "warn", "message": "Memory usage high", "timestamp": 1714100150, "service": "api" }
  ]
}
```

```jsonpath
$.logs[?(@.level == "error")].message
→ ["Database connection failed", "Timeout exceeded"]

$.logs[?(@.service == "api")].level
→ ["error", "info", "warn"]

$.logs[-1]
→ the last log record (full object)
```

### Scenario 4: Extracting from npm package.json

```jsonpath
$.dependencies
→ all production dependencies (key-value object)

$.scripts.build
→ the build command string

$..version
→ version fields at every level (including the package version and dependency versions)
```

## Using JSONPath in Code

### JavaScript (jsonpath-plus)

```bash
npm install jsonpath-plus
```

```javascript
import { JSONPath } from "jsonpath-plus";

const data = {
  store: {
    books: [
      { title: "JavaScript: The Good Parts", price: 29 },
      { title: "You Don't Know JS", price: 22 },
    ],
  },
};

// 提取所有书名
const titles = JSONPath({ path: "$..title", json: data });
// ["JavaScript: The Good Parts", "You Don't Know JS"]

// 过滤价格
const cheapBooks = JSONPath({ path: "$.store.books[?(@.price < 25)]", json: data });
// [{ title: "You Don't Know JS", price: 22 }]

// 带 resultType 参数，返回路径+值
const withPaths = JSONPath({
  path: "$..title",
  json: data,
  resultType: "all",
});
// [{ path: "$.store.books[0].title", value: "JavaScript: The Good Parts" }, ...]
```

### Python (jsonpath-ng)

```bash
pip install jsonpath-ng
```

```python
from jsonpath_ng import parse

data = {
    "users": [
        {"name": "Alice", "role": "admin", "active": True},
        {"name": "Bob", "role": "viewer", "active": False},
        {"name": "Charlie", "role": "admin", "active": True},
    ]
}

# 提取所有活跃管理员的名字
expr = parse("$.users[?(@.role == 'admin' && @.active == true)].name")
matches = [m.value for m in expr.find(data)]
# ["Alice", "Charlie"]
```

### Server-Side Node.js

```typescript
import { JSONPath } from "jsonpath-plus";

// 从 webhook payload 中提取关键字段
function extractFromWebhook(payload: object, path: string): unknown[] {
  return JSONPath({ path, json: payload });
}

// 使用
const eventType = extractFromWebhook(githubPayload, "$.action")[0];
const changedFiles = extractFromWebhook(githubPayload, "$..filename");
const prTitle = extractFromWebhook(githubPayload, "$.pull_request.title")[0];
```

## JSONPath vs jq

Both query JSON, but they fit different situations:

| Dimension | JSONPath | jq |
|----------|----------|-----|
| Runtime | Browser / code libraries | Command line |
| Syntax | Concise, gentle learning curve | Powerful but complex |
| Data transformation | Not supported | Supported (can reshape structures) |
| Filters | Basic conditional expressions | A full expression language |
| Streaming large files | Not supported | Supported (`--stream` flag) |
| Code integration | Libraries for many languages | CLI, scripting scenarios |

JSONPath fits: data extraction in code, debugging API responses online, lightweight queries in CI/CD configs.

jq fits: command-line pipelines, complex data transformation and restructuring, processing large JSON files.

```bash
# jq 等价的 JSONPath 查询
# JSONPath: $.items[?(@.price < 50)].name
jq '.items[] | select(.price < 50) | .name' data.json
```

## Tool Interface Overview

Open [https://anyfreetools.com/tools/json-path](https://anyfreetools.com/tools/json-path) and you'll see three areas:

**JSON input (left)**: Paste any valid JSON. The tool validates the format automatically and highlights errors. A format button expands minified single-line JSON into readable indented form.

**Expression input (top)**: Type a JSONPath expression and results update live — no run button needed. An error indicator next to the input gives instant feedback when the syntax is off.

**Results (right)**: Shows query results as a JSON array (even a single match is wrapped in an array). Results can be copied with one click or saved as a JSON file.

The tool supports the mainstream JSONPath spec, including recursive descent, filter expressions, and array slices, and is compatible with the Goessner standard (the baseline most library implementations follow).

## Common Errors and Debugging

**The expression returns an empty array**: The most common causes are a case mismatch in field names (`$.Name` vs `$.name`), or the JSON structure differing from what you expect (an intermediate level is an array rather than an object). Use `$.*` to see what fields exist at the root, then work your way down level by level.

**`..` returns too many results**: Recursive descent matches every level. If the results include lots of fields you don't want, add a filter to narrow the scope: `$..items[?(@.type == "product")]`.

**Do array indexes start at 0 or 1?**: Like most programming languages, JSONPath arrays start at 0. `$.items[1]` is the second element.

**String values inside filters**: Strings in a filter must be quoted: `$.users[?(@.role == "admin")]`. Without quotes the value is evaluated as another JSONPath expression, producing unexpected results.
