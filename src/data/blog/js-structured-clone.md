---
author: 陈广亮
pubDatetime: 2026-02-11T14:00:00+08:00
title: "告别 JSON.parse(JSON.stringify()) — 原生深拷贝 structuredClone"
slug: js-structured-clone
featured: true
draft: false
tags:
  - JavaScript
  - Web API
description: "JavaScript 终于有了原生深拷贝方法 structuredClone，来看看它解决了哪些痛点。"
---

## 深拷贝的老办法

在 JavaScript 中深拷贝一个对象，最常见的"hack"写法是：

```js
const copy = JSON.parse(JSON.stringify(original));
```

这个方法简单粗暴，但有一堆坑：

```js
const obj = {
  date: new Date(),
  regex: /test/gi,
  map: new Map([["key", "value"]]),
  set: new Set([1, 2, 3]),
  undef: undefined,
  fn: () => "hello",
  nan: NaN,
  infinity: Infinity,
};

const copy = JSON.parse(JSON.stringify(obj));
console.log(copy);
// {
//   date: "2026-02-11T06:00:00.000Z",  ← 变成了字符串
//   regex: {},                           ← 丢失了
//   map: {},                             ← 丢失了
//   set: {},                             ← 丢失了
//                                        ← undefined 直接消失
//                                        ← 函数直接消失
//   nan: null,                           ← 变成了 null
//   infinity: null                       ← 变成了 null
// }
```

还有一个致命问题 —— 循环引用直接报错：

```js
const a = { name: "a" };
a.self = a;
JSON.parse(JSON.stringify(a)); // ❌ TypeError: Converting circular structure to JSON
```

## structuredClone 登场

`structuredClone()` 是浏览器和 Node.js (v17+) 提供的**原生深拷贝**方法：

```js
const original = {
  date: new Date(),
  regex: /test/gi,
  map: new Map([["key", "value"]]),
  set: new Set([1, 2, 3]),
  nested: { deep: { value: 42 } },
  arr: [1, [2, [3]]],
};

const copy = structuredClone(original);

copy.nested.deep.value = 0;
console.log(original.nested.deep.value); // 42 ✅ 互不影响

copy.date instanceof Date; // true ✅ 类型保留
copy.regex instanceof RegExp; // true ✅
copy.map instanceof Map; // true ✅
copy.set instanceof Set; // true ✅
```

循环引用也能正确处理：

```js
const a = { name: "a" };
a.self = a;
const b = structuredClone(a); // ✅ 正常工作
b.self === b; // true（引用指向拷贝后的自身）
```

## 支持的类型

structuredClone 使用的是 [结构化克隆算法](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)，支持绝大多数内置类型：

| 类型 | JSON 方式 | structuredClone |
|------|-----------|-----------------|
| Date | ❌ 变字符串 | ✅ |
| RegExp | ❌ 变 `{}` | ✅ |
| Map / Set | ❌ 变 `{}` | ✅ |
| ArrayBuffer | ❌ | ✅ |
| undefined | ❌ 丢失 | ✅ |
| NaN / Infinity | ❌ 变 null | ✅ |
| 循环引用 | ❌ 报错 | ✅ |

## 不支持什么

有几种东西是 structuredClone **无法克隆**的：

```js
// ❌ 函数
structuredClone({ fn: () => {} });
// DOMException: () => {} could not be cloned.

// ❌ DOM 节点
structuredClone(document.body);

// ❌ 原型链（拷贝后丢失）
class Dog {
  bark() { return "woof"; }
}
const dog = new Dog();
const cloned = structuredClone(dog);
cloned instanceof Dog; // false
cloned.bark; // undefined
```

所以如果你的对象包含函数或需要保留原型链，structuredClone 不适用。

## 一个实用技巧：transferable objects

structuredClone 支持第二个参数 `transfer`，可以"移交"而不是"复制"某些对象（如 ArrayBuffer），避免内存翻倍：

```js
const buffer = new ArrayBuffer(1024 * 1024); // 1MB
const copy = structuredClone(buffer, { transfer: [buffer] });

console.log(buffer.byteLength); // 0 ← 原始的被清空了
console.log(copy.byteLength); // 1048576 ← 数据转移到了 copy
```

这在处理大型二进制数据时非常有用。

## 兼容性

- Chrome 98+, Firefox 94+, Safari 15.4+, Node.js 17+
- 2026 年的今天，基本可以放心使用

## 总结

| 场景 | 推荐方案 |
|------|---------|
| 简单对象，无特殊类型 | `JSON.parse(JSON.stringify())` 仍然可用 |
| 包含 Date/Map/Set/循环引用 | `structuredClone()` |
| 需要保留原型链/函数 | 手写递归或 lodash `_.cloneDeep()` |

以后深拷贝，先想想 `structuredClone` 吧。
