---
author: 陈广亮
pubDatetime: 2026-03-29T14:00:00+08:00
title: 工具指南16-在线JSON对比工具
slug: blog106_json-diff-guide
featured: false
draft: false
reviewed: true
approved: true
tags:
  - 工具指南
  - 工具
  - 开发效率
description: 详解在线 JSON Diff 工具的使用场景和技术原理，帮助开发者高效对比 API 响应、配置文件和数据变更，快速定位差异。
---

作为开发者，你一定遇到过这样的场景：线上接口返回的数据和本地不一样，配置文件改了一堆不知道改了啥，数据库导出前后两份数据想快速看差异。这些问题的共同解法就是 JSON Diff——把两份 JSON 放在一起，自动标出哪里不同。

本文介绍如何用在线工具高效完成 JSON 对比，同时深入聊聊 JSON Diff 背后的技术原理。

## 什么场景需要 JSON Diff

### API 调试

前后端联调时，后端改了接口字段，前端没收到通知，页面就挂了。这时候把旧响应和新响应丢进 Diff 工具，一眼就能看到哪些字段被改名、删除或新增。

比如一个用户信息接口，版本升级后：

**v1 响应**：

```json
{
  "user_name": "zhangsan",
  "user_age": 28,
  "avatar_url": "https://cdn.example.com/avatar/1.jpg"
}
```

**v2 响应**：

```json
{
  "username": "zhangsan",
  "age": 28,
  "avatar": "https://cdn.example.com/avatar/1.jpg",
  "created_at": "2026-01-15T08:00:00Z"
}
```

肉眼对比容易漏，Diff 工具会精确告诉你：`user_name` 变成了 `username`，`user_age` 变成了 `age`，`avatar_url` 变成了 `avatar`，还新增了 `created_at` 字段。

### 配置文件变更审查

项目配置文件（webpack config、package.json 的 dependencies、CI/CD 配置）改动后，需要确认改了什么。尤其是 package.json，依赖版本升级时，把升级前后的 lock 文件或 dependencies 对象对比一下，能快速确认影响范围。

### 数据迁移验证

数据库迁移、ETL 流水线处理后，需要验证数据是否正确转换。把源数据和目标数据导出为 JSON，跑一次 Diff 就知道有没有丢字段、类型有没有变。

### 测试快照对比

前端组件测试中，快照测试（Snapshot Testing）的本质就是 JSON Diff。当组件渲染结果的 JSON 表示发生变化时，需要判断这个变化是预期的还是 bug。

## 在线 JSON Diff 工具实操

[AnyFreeTools 的 JSON 对比工具](https://anyfreetools.com/tools/json-diff) 提供了一个简洁的在线 JSON Diff 功能。

### 基本用法

1. 打开工具页面，左右两个输入框分别对应"原始 JSON"和"对比 JSON"
2. 粘贴或输入两份 JSON 数据
3. 点击对比按钮，差异结果会用颜色高亮展示

高亮规则通常是：
- **绿色**：新增的字段或值
- **红色**：删除的字段或值
- **黄色/橙色**：值发生了修改

### 实战示例：对比两个 API 响应

假设你在调试一个商品列表接口，测试环境和生产环境返回的数据不一致：

**测试环境**：

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": 1001,
        "name": "TypeScript实战",
        "price": 59.9,
        "stock": 100,
        "tags": ["编程", "前端"]
      }
    ],
    "total": 1
  }
}
```

**生产环境**：

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": 1001,
        "name": "TypeScript实战",
        "price": 69.9,
        "stock": 85,
        "tags": ["编程", "前端", "TypeScript"]
      }
    ],
    "total": 1
  }
}
```

Diff 结果会精确标出：`price` 从 59.9 变成了 69.9，`stock` 从 100 变成了 85，`tags` 数组新增了 "TypeScript" 元素。三个差异，几秒钟定位完毕。

### 处理大型 JSON

对比大型 JSON 文件时（比如几千行的配置），在线工具的优势更明显：

- **自动折叠相同部分**：只展开有差异的节点，不用在茫茫 JSON 中找不同
- **路径定位**：每个差异项会标注完整的 JSON Path（如 `$.data.list[0].price`），方便在代码中定位
- **统计信息**：汇总有多少处新增、删除、修改，对改动规模有个整体认知

## JSON Diff 的技术原理

JSON Diff 看起来简单，但要做对其实有不少细节。

### 深度递归对比

最基础的实现是递归遍历两棵 JSON 树，逐节点对比：

```typescript
type DiffType = "added" | "removed" | "changed" | "unchanged";

interface DiffResult {
  path: string;
  type: DiffType;
  oldValue?: unknown;
  newValue?: unknown;
}

function jsonDiff(
  obj1: unknown,
  obj2: unknown,
  path: string = "$"
): DiffResult[] {
  const results: DiffResult[] = [];

  // 类型不同，直接标记为 changed
  if (typeof obj1 !== typeof obj2) {
    results.push({ path, type: "changed", oldValue: obj1, newValue: obj2 });
    return results;
  }

  // 都是 null 或基础类型
  if (obj1 === null || typeof obj1 !== "object") {
    if (obj1 !== obj2) {
      results.push({ path, type: "changed", oldValue: obj1, newValue: obj2 });
    }
    return results;
  }

  // 一个是数组一个是对象，视为类型不同
  if (Array.isArray(obj1) !== Array.isArray(obj2)) {
    results.push({ path, type: "changed", oldValue: obj1, newValue: obj2 });
    return results;
  }

  // 数组对比
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    const maxLen = Math.max(obj1.length, obj2.length);
    for (let i = 0; i < maxLen; i++) {
      if (i >= obj1.length) {
        results.push({
          path: `${path}[${i}]`,
          type: "added",
          newValue: obj2[i],
        });
      } else if (i >= obj2.length) {
        results.push({
          path: `${path}[${i}]`,
          type: "removed",
          oldValue: obj1[i],
        });
      } else {
        results.push(...jsonDiff(obj1[i], obj2[i], `${path}[${i}]`));
      }
    }
    return results;
  }

  // 对象对比
  const o1 = obj1 as Record<string, unknown>;
  const o2 = obj2 as Record<string, unknown>;
  const allKeys = new Set([...Object.keys(o1), ...Object.keys(o2)]);

  for (const key of allKeys) {
    const newPath = `${path}.${key}`;
    if (!(key in o1)) {
      results.push({ path: newPath, type: "added", newValue: o2[key] });
    } else if (!(key in o2)) {
      results.push({ path: newPath, type: "removed", oldValue: o1[key] });
    } else {
      results.push(...jsonDiff(o1[key], o2[key], newPath));
    }
  }

  return results;
}
```

这段代码处理了三种情况：基础类型直接比值、数组按索引逐一对比、对象按 key 合并后逐个检查。

### 数组对比的难点

上面的实现有个问题：数组是按索引对比的。如果数组元素顺序变了，就会产生大量"误报"差异。

比如：

原始数据：`["apple", "banana", "cherry"]`

变更后（只是顺序变了）：`["cherry", "apple", "banana"]`

按索引对比会报三处 changed，但实际上内容没变，只是排了个序。

更复杂的场景是对象数组，比如用户列表中间插入了一条记录，后面的索引全部移位，导致每一项都被标记为 changed。

解决方案是**基于唯一标识的匹配**：如果数组元素有 `id` 字段，就按 id 匹配而不是按索引。这也是为什么很多专业 Diff 工具会提供"按 key 匹配"的选项。

### 性能考量

JSON Diff 的时间复杂度和 JSON 的嵌套深度、节点数量直接相关。对于普通场景（几百到几千个节点），深度递归完全够用。但如果要对比几十 MB 的 JSON 文件，就需要考虑：

- **流式解析**：不把整个 JSON 加载到内存，而是边解析边对比
- **提前剪枝**：如果两个子树的哈希值相同，跳过深度对比
- **Web Worker**：浏览器端把对比逻辑放到 Worker 线程，避免阻塞 UI

根据实测，对于 10MB 以下的 JSON 文件，现代浏览器的处理速度通常在 1-3 秒内（取决于嵌套深度和差异数量）。

## 开发中的 JSON Diff 工具链

除了在线工具，开发流程中也有不少 JSON Diff 的集成方案。

### 命令行工具

```bash
# jd - 专门的 JSON diff 命令行工具（https://github.com/josephburnett/jd）
# 安装：brew install jd 或 go install github.com/josephburnett/jd@latest
jd old.json new.json

# 输出示例（部分）：
# @ ["price"]
# - 59.9
# + 69.9
# @ ["stock"]
# - 100
# + 85
# @ ["tags", 2]
# + "TypeScript"
```

`jd` 的输出格式简洁，适合在 CI 脚本中使用。也可以用 `diff <(jq -S . a.json) <(jq -S . b.json)` 的组合拳，先用 `jq` 排序 key 再 diff。

### 代码中集成

如果需要在项目中做 JSON 对比（比如实现配置变更审计），可以用现成的库：

```typescript
// 使用 deep-diff 库
import { diff } from "deep-diff";

const changes = diff(oldConfig, newConfig);
changes?.forEach((change) => {
  console.log(`${change.kind}: ${change.path?.join(".")}`);
  // N: 新增, D: 删除, E: 编辑, A: 数组变更
});
```

常用的 npm 包有 `deep-diff`（截至 2026 年 3 月周下载量约 200 万，数据来源：npmjs.com）和 `jsondiffpatch`（功能更丰富，支持文本 diff 和移动检测）。

### Git 中的 JSON Diff

Git 默认的 diff 是基于文本行的，对 JSON 不太友好。一个 key 从第 5 行移到第 50 行，Git 会报一大堆变化。可以配置 Git 使用 JSON-aware 的 diff：

```bash
# .gitattributes
*.json diff=json

# .gitconfig
[diff "json"]
  textconv = jq -S .
```

这样 `git diff` 会先对 JSON 排序再对比，忽略 key 顺序变化和格式差异。

## 实用技巧

### 对比前先格式化

很多时候两份 JSON 的差异其实是格式不同——一个压缩的一行 JSON 和一个美化过的多行 JSON。对比前先统一格式化，能避免大量无意义的差异噪音。

### 忽略特定字段

有些字段天然不同，比如 `timestamp`、`requestId`、`traceId`。好的 Diff 工具支持配置忽略列表，过滤掉这些"预期内的差异"。

### 保存对比结果

对比结果有时需要分享给团队成员或存档。可以：

- 截图标注关键差异
- 导出 Diff 报告（部分工具支持导出 JSON 格式的差异结果）
- 在 PR 评审中贴上 Diff 结果，说明配置变更的具体内容

### 结合 JSON Path 快速定位

当 Diff 结果告诉你 `$.data.list[0].price` 发生了变化，可以直接在代码中搜索对应的字段访问路径，不用一层一层展开看。如果你还不熟悉 JSON Path 语法，可以用 [AnyFreeTools 的 JSON Path 工具](https://anyfreetools.com/tools/json-path) 练习。

## 总结

JSON Diff 是开发者的基础工具之一。在线工具适合快速对比、临时使用；命令行工具适合 CI/CD 集成；代码库适合业务逻辑中的差异检测。核心算法是深度递归对比，难点在于数组元素的智能匹配和大文件性能优化。

掌握 JSON Diff 的使用和原理，能在调试、审查、测试等环节节省大量时间。遇到"这两份数据哪里不一样"的问题，别再手动对比了。

---

**相关阅读**：
- [工具指南2-在线JSON格式化工具](https://chenguangliang.com/posts/blog085_json-formatter-guide/) - JSON 格式化是 Diff 对比的前置步骤
- [工具指南11-JSON转TypeScript类型生成器](https://chenguangliang.com/posts/blog099_json-to-typescript-guide/) - 从 JSON 生成类型定义，配合 Diff 做接口变更检测

---

**本系列其他文章**：
- [工具指南1-在线图片压缩](https://chenguangliang.com/posts/blog084_image-compress-guide/)
- [工具指南2-在线JSON格式化工具](https://chenguangliang.com/posts/blog085_json-formatter-guide/)
- [工具指南3-在线正则表达式测试](https://chenguangliang.com/posts/blog086_regex-tester-guide/)
- [工具指南4-二维码生成工具](https://chenguangliang.com/posts/blog089_qrcode-generator-guide/)
- [工具指南5-Base64编解码工具](https://chenguangliang.com/posts/blog090_base64-tool-guide/)
- [工具指南6-JWT在线解码工具](https://chenguangliang.com/posts/blog092_jwt-decoder-guide/)
- [工具指南7-Unix时间戳转换工具](https://chenguangliang.com/posts/blog094_timestamp-tool-guide/)
- [工具指南8-在线密码生成器](https://chenguangliang.com/posts/blog095_password-generator-guide/)
- [工具指南9-URL编解码工具](https://chenguangliang.com/posts/blog096_url-encoder-guide/)
- [工具指南10-在线哈希生成器](https://chenguangliang.com/posts/blog097_hash-generator-guide/)
- [工具指南11-JSON转TypeScript类型生成器](https://chenguangliang.com/posts/blog099_json-to-typescript-guide/)
- [工具指南12-Cron表达式在线解析工具](https://chenguangliang.com/posts/blog100_cron-parser-guide/)
- [工具指南13-在线颜色转换工具](https://chenguangliang.com/posts/blog102_color-converter-guide/)
- [工具指南14-在线SQL格式化工具](https://chenguangliang.com/posts/blog103_sql-formatter-guide/)
- [工具指南15-在线Markdown实时预览工具](https://chenguangliang.com/posts/blog104_markdown-preview-guide/)
