---
author: Gerald Chen
pubDatetime: 2026-02-11T14:00:00+08:00
title: "Goodbye JSON.parse(JSON.stringify()) — Native Deep Cloning with structuredClone"
slug: js-structured-clone
featured: true
draft: true
tags:
  - JavaScript
  - Web API
description: "JavaScript finally has a native deep clone method: structuredClone. Let's look at the pain points it solves."
---

## The Old Way to Deep Clone

The most common "hack" for deep cloning an object in JavaScript is:

```js
const copy = JSON.parse(JSON.stringify(original));
```

It's quick and dirty, but riddled with gotchas:

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

And there's one fatal flaw — circular references throw outright:

```js
const a = { name: "a" };
a.self = a;
JSON.parse(JSON.stringify(a)); // ❌ TypeError: Converting circular structure to JSON
```

## Enter structuredClone

`structuredClone()` is a **native deep clone** method available in browsers and Node.js (v17+):

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

Circular references are handled correctly too:

```js
const a = { name: "a" };
a.self = a;
const b = structuredClone(a); // ✅ 正常工作
b.self === b; // true（引用指向拷贝后的自身）
```

## Supported Types

structuredClone uses the [structured clone algorithm](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API/Structured_clone_algorithm), which supports the vast majority of built-in types:

| Type | JSON approach | structuredClone |
|------|-----------|-----------------|
| Date | ❌ becomes a string | ✅ |
| RegExp | ❌ becomes `{}` | ✅ |
| Map / Set | ❌ becomes `{}` | ✅ |
| ArrayBuffer | ❌ | ✅ |
| undefined | ❌ dropped | ✅ |
| NaN / Infinity | ❌ becomes null | ✅ |
| Circular references | ❌ throws | ✅ |

## What It Can't Do

There are a few things structuredClone **cannot clone**:

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

So if your object contains functions or you need to preserve the prototype chain, structuredClone isn't the right tool.

## A Handy Trick: Transferable Objects

structuredClone accepts a second `transfer` option that lets you "hand over" certain objects (like ArrayBuffer) instead of copying them, avoiding doubled memory usage:

```js
const buffer = new ArrayBuffer(1024 * 1024); // 1MB
const copy = structuredClone(buffer, { transfer: [buffer] });

console.log(buffer.byteLength); // 0 ← 原始的被清空了
console.log(copy.byteLength); // 1048576 ← 数据转移到了 copy
```

This is extremely useful when working with large binary data.

## Compatibility

- Chrome 98+, Firefox 94+, Safari 15.4+, Node.js 17+
- As of 2026, it's safe to use pretty much everywhere

## Summary

| Scenario | Recommended approach |
|------|---------|
| Plain objects, no special types | `JSON.parse(JSON.stringify())` still works |
| Contains Date/Map/Set/circular references | `structuredClone()` |
| Need to preserve prototype chain/functions | Hand-rolled recursion or lodash `_.cloneDeep()` |

Next time you need a deep clone, reach for `structuredClone` first.
