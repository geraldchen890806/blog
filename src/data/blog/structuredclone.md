---
author: 陈广亮
pubDatetime: 2026-02-11T14:00:00+08:00
title: 告别 JSON.parse(JSON.stringify()) — 原生深拷贝 structuredClone
slug: structuredclone
featured: true
draft: false
tags:
  - JavaScript
  - Web API
description: 分析 JSON 深拷贝的 6 个坑，介绍原生 structuredClone() API 的正确用法。
---

## 你还在用 JSON.parse(JSON.stringify()) 深拷贝吗？

前端开发中，深拷贝是个绕不开的话题。很多人（包括曾经的我）习惯性地写下这行代码：

```javascript
const copy = JSON.parse(JSON.stringify(original));
```

简单粗暴，面试必答题。但这个方案有 **6 个致命的坑**，你踩过几个？

## JSON 深拷贝的 6 个坑

### 1. Date 变字符串

```javascript
const obj = { date: new Date('2026-02-11') };
const copy = JSON.parse(JSON.stringify(obj));
console.log(copy.date); // "2026-02-11T00:00:00.000Z" — 字符串！
console.log(copy.date instanceof Date); // false
```

### 2. RegExp 变空对象

```javascript
const obj = { pattern: /hello/gi };
const copy = JSON.parse(JSON.stringify(obj));
console.log(copy.pattern); // {} — 正则没了
```

### 3. Map/Set 直接丢失

```javascript
const obj = { map: new Map([['a', 1]]), set: new Set([1, 2, 3]) };
const copy = JSON.parse(JSON.stringify(obj));
console.log(copy.map); // {} — 空对象
console.log(copy.set); // {} — 空对象
```

### 4. undefined 和函数被吞掉

```javascript
const obj = { a: undefined, b: () => {}, c: 'hello' };
const copy = JSON.parse(JSON.stringify(obj));
console.log(Object.keys(copy)); // ['c'] — a 和 b 消失了
```

### 5. 循环引用直接报错

```javascript
const obj = { name: 'test' };
obj.self = obj; // 循环引用
JSON.parse(JSON.stringify(obj)); // ❌ TypeError: Converting circular structure to JSON
```

### 6. NaN 和 Infinity 变 null

```javascript
const obj = { a: NaN, b: Infinity, c: -Infinity };
const copy = JSON.parse(JSON.stringify(obj));
console.log(copy); // { a: null, b: null, c: null }
```

## 原生方案：structuredClone()

从 2022 年起，所有主流浏览器和 Node.js 17+ 都支持了 `structuredClone()`：

```javascript
const original = {
  date: new Date(),
  pattern: /hello/gi,
  map: new Map([['key', 'value']]),
  set: new Set([1, 2, 3]),
  nested: { deep: { value: 42 } }
};

const copy = structuredClone(original);

console.log(copy.date instanceof Date);  // ✅ true
console.log(copy.pattern instanceof RegExp);  // ✅ true
console.log(copy.map instanceof Map);  // ✅ true
console.log(copy.set instanceof Set);  // ✅ true
```

循环引用？也没问题：

```javascript
const obj = { name: 'test' };
obj.self = obj;
const copy = structuredClone(obj); // ✅ 正常工作
console.log(copy.self === copy); // true — 正确保持引用关系
```

## 支持类型对比

| 类型 | JSON 方案 | structuredClone |
|------|----------|-----------------|
| 普通对象/数组 | ✅ | ✅ |
| Date | ❌ 变字符串 | ✅ |
| RegExp | ❌ 变空对象 | ✅ |
| Map/Set | ❌ 变空对象 | ✅ |
| ArrayBuffer/TypedArray | ❌ | ✅ |
| Blob/File | ❌ | ✅ |
| 循环引用 | ❌ 报错 | ✅ |
| undefined | ❌ 丢失 | ✅ |
| NaN/Infinity | ❌ 变 null | ✅ |

## structuredClone 不支持什么？

也不是万能的，这些类型**不支持**：

- **函数** — 无法克隆
- **DOM 节点** — 无法克隆
- **原型链** — 不保留，克隆结果是普通对象
- **Symbol 属性** — 会被忽略

```javascript
class Person {
  constructor(name) { this.name = name; }
  greet() { return `Hi, I'm ${this.name}`; }
}

const p = new Person('陈广亮');
const copy = structuredClone(p);
console.log(copy instanceof Person); // false — 原型链丢失
console.log(copy.greet); // undefined — 方法没了
```

## 实用技巧：transfer 移交所有权

`structuredClone` 有个隐藏参数 `transfer`，可以**移交** ArrayBuffer 的所有权而不是复制，避免内存翻倍：

```javascript
const buffer = new ArrayBuffer(1024 * 1024 * 100); // 100MB
const copy = structuredClone(buffer, { transfer: [buffer] });

console.log(buffer.byteLength);  // 0 — 原始 buffer 已失效
console.log(copy.byteLength);    // 104857600 — 数据转移到新对象
```

这在处理大型二进制数据（图片、音视频）时特别有用，零拷贝传输。

## 各场景推荐方案

| 场景 | 推荐方案 |
|------|---------|
| 简单对象（纯 string/number/boolean） | `JSON.parse(JSON.stringify())` 够用 |
| 含 Date/RegExp/Map/Set | `structuredClone()` |
| 有循环引用 | `structuredClone()` |
| 需要拷贝函数/方法 | 手写递归或 lodash `_.cloneDeep()` |
| 大型 ArrayBuffer 转移 | `structuredClone()` + `transfer` |
| 浅拷贝就够 | `{ ...obj }` 或 `Object.assign()` |

## 总结

`structuredClone()` 是 2022 年后前端深拷贝的**首选方案**。别再写 `JSON.parse(JSON.stringify())` 了——除非你确定数据里只有基本类型。

一行代码，告别 6 个坑。这就是进步。
