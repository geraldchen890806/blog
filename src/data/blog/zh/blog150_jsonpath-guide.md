---
author: 陈广亮
pubDatetime: 2026-04-26T14:00:00+08:00
title: 工具指南48-在线 JSONPath 查询工具
slug: blog150_jsonpath-guide
featured: false
draft: true
reviewed: false
approved: false
tags:
  - 工具指南
  - 工具
description: 介绍在线 JSONPath 查询工具的使用方法，覆盖 JSONPath 语法核心规则（路径表达式、通配符、递归下降、过滤器、切片）、与 jq 的对比，以及在 API 调试、日志分析、配置文件处理中的实际场景。
---

API 返回了一个嵌套很深的 JSON，你需要从里面取出某个字段——你可以手动一层一层点进去，也可以用 JSONPath 一行表达式直接拿到。

JSONPath 是 JSON 的路径查询语言，类似 XPath 之于 XML。它让你可以用简洁的表达式从任意深度的 JSON 结构中提取数据，不需要写循环，不需要临时变量，也不需要打开代码编辑器。

[在线 JSONPath 查询工具](https://anyfreetools.com/tools/json-path) 是一个浏览器端工具，左侧粘贴 JSON，右侧输入 JSONPath 表达式，结果实时显示，所有处理在本地完成，不上传数据。

## JSONPath 语法速览

JSONPath 表达式以 `$` 开头，`$` 代表 JSON 的根节点。

### 基本路径

```jsonpath
$               → 根节点（整个 JSON）
$.name          → 根节点下的 name 字段
$.user.email    → 嵌套字段 user.email
$['user']       → 等价于 $.user（方括号语法，用于含特殊字符的字段名）
```

### 数组访问

```jsonpath
$.items[0]      → 数组第一个元素
$.items[-1]     → 最后一个元素
$.items[0,2]    → 第 0 和第 2 个元素
$.items[1:3]    → 切片，第 1 到第 2 个元素（不含第 3）
$.items[::2]    → 步长切片，每隔一个取一个
```

### 通配符

```jsonpath
$.*             → 根节点下所有直接子节点
$.items[*]      → 数组所有元素
$.items[*].name → 数组每个元素的 name 字段
```

### 递归下降（`..`）

双点 `..` 是 JSONPath 里最强大也最容易被忽略的操作符，它会在整个 JSON 树中递归搜索匹配的字段，不管嵌套多深：

```jsonpath
$..name         → 整个 JSON 中所有 name 字段（任意深度）
$..price        → 所有层级的 price 字段
$..items[*]     → 所有层级的 items 数组中的每个元素
```

用一个例子说明 `..` 的威力：

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

不管 title 在第几层，`..title` 都能找到。

### 过滤器表达式（`?()`）

过滤器是 JSONPath 里最灵活的功能，用 `?()` 语法对数组元素做条件筛选：

```jsonpath
$.items[?(@.price < 50)]        → 价格小于 50 的元素
$.items[?(@.in_stock == true)]  → 有库存的元素
$.items[?(@.tags)]              → 有 tags 字段的元素（字段存在性检查）
$.users[?(@.age >= 18)]         → 年龄 >= 18 的用户
$.items[?(@.name =~ /^A/)]      → name 以字母 A 开头（正则匹配，部分实现支持）
```

`@` 代表当前正在被检查的数组元素，`@.price` 是当前元素的 price 字段。

组合条件：

```jsonpath
$.items[?(@.price < 50 && @.in_stock == true)]
→ 价格小于 50 且有库存的元素

$.users[?(@.role == "admin" || @.role == "owner")]
→ 角色是 admin 或 owner 的用户
```

## 实际场景示例

### 场景一：提取 API 响应中的分页数据

GitHub API 的搜索结果格式：

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

常见查询：

```jsonpath
$.items[*].full_name
→ ["expressjs/express", "koajs/koa", "fastify/fastify"]

$.items[?(@.stargazers_count > 40000)].full_name
→ ["expressjs/express"]

$.items[0:2].full_name
→ ["expressjs/express", "koajs/koa"]（只取前两个）
```

### 场景二：处理嵌套配置文件

Kubernetes 部署配置：

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

### 场景三：分析日志数据

应用日志聚合后的 JSON：

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
→ 最后一条日志记录（完整对象）
```

### 场景四：npm package.json 提取

```jsonpath
$.dependencies
→ 所有生产依赖（键值对对象）

$.scripts.build
→ build 命令字符串

$..version
→ 所有层级的 version 字段（包括 package version 和依赖版本）
```

## 在代码中使用 JSONPath

### JavaScript（jsonpath-plus）

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

### Python（jsonpath-ng）

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

### Node.js 服务端场景

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

两者都用于 JSON 查询，适用场景不同：

| 对比维度 | JSONPath | jq |
|----------|----------|-----|
| 运行环境 | 浏览器/代码库 | 命令行 |
| 语法 | 简洁，学习曲线低 | 强大但复杂 |
| 数据转换 | 不支持 | 支持（可以重塑结构） |
| 过滤器 | 基本条件表达式 | 完整的表达式语言 |
| 流式处理大文件 | 不支持 | 支持（`--stream` 标志） |
| 代码集成 | 多语言库支持 | CLI，脚本场景 |

JSONPath 适合：代码里的数据提取、在线调试 API 响应、CI/CD 配置中的轻量级查询。

jq 适合：命令行流水线处理、复杂的数据转换重组、处理大型 JSON 文件。

```bash
# jq 等价的 JSONPath 查询
# JSONPath: $.items[?(@.price < 50)].name
jq '.items[] | select(.price < 50) | .name' data.json
```

## 工具界面说明

打开 [https://anyfreetools.com/tools/json-path](https://anyfreetools.com/tools/json-path)，界面分三个区域：

**JSON 输入区（左侧）**：粘贴任意合法 JSON，工具会自动验证格式并在错误时高亮提示。支持格式化按钮，把压缩的单行 JSON 展开成可读的缩进格式。

**表达式输入区（顶部）**：输入 JSONPath 表达式，结果实时更新，不需要点击执行按钮。表达式输入框旁有错误提示，语法有问题时即时反馈。

**结果区（右侧）**：显示查询结果，以 JSON 数组格式呈现（即使只匹配到一个值，也包装成数组）。结果可以一键复制，也可以单独保存为 JSON 文件。

工具支持主流的 JSONPath 规范，包括递归下降、过滤器表达式、数组切片，兼容 JSONPath 的 Goessner 标准（大多数库的实现基准）。

## 常见错误和调试

**表达式返回空数组**：最常见的原因是字段名大小写不匹配（`$.Name` vs `$.name`），或者 JSON 结构和预期不同（某个中间层是数组而不是对象）。用 `$.*` 先看根节点有哪些字段，再逐层深入。

**`..` 返回结果太多**：递归下降会匹配所有层级，如果结果里有很多不想要的字段，加过滤器缩小范围：`$..items[?(@.type == "product")]`。

**数组下标从 0 还是 1 开始**：JSONPath 和大多数编程语言一样，数组从 0 开始。`$.items[1]` 是第二个元素。

**过滤器里的字符串值**：过滤器中的字符串要加引号：`$.users[?(@.role == "admin")]`，不加引号会被当作另一个 JSONPath 表达式求值，产生意外结果。
