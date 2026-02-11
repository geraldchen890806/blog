---
author: 陈广亮
pubDatetime: 2018-09-01T10:00:00+08:00
title: "ES6 Iterator 遍历器详解"
slug: iterator
featured: false
draft: false
tags:
  - JavaScript
  - ES6
description: "Iterator 接口原理，for...of 循环，以及让普通对象可迭代的四种方式。"
---

Iterator 是一种接口，为各种不同的数据结构提供统一的访问机制。它也是解构赋值、扩展运算符、Generator、for...of 的实现基础。

## 原生具备 Iterator 的数据结构

Array、Map、Set、String、TypedArray、arguments、NodeList

## 让对象支持 for...of

### 方式一：实现 Symbol.iterator

```js
class RangeIterator {
  constructor(start, stop) {
    this.value = start;
    this.stop = stop;
  }
  [Symbol.iterator]() { return this; }
  next() {
    if (this.value < this.stop) {
      return { done: false, value: this.value++ };
    }
    return { done: true, value: undefined };
  }
}

for (var value of new RangeIterator(0, 3)) {
  console.log(value); // 0, 1, 2
}
```

### 方式二：借用 Array 的迭代器

```js
let iterable = {
  0: "a", 1: "b", 2: "c",
  length: 3,
  [Symbol.iterator]: Array.prototype[Symbol.iterator],
};
```

### 方式三：Generator 函数

```js
let obj = {
  *[Symbol.iterator]() {
    yield "hello";
    yield "world";
  },
};
```

### 方式四：Object.keys 遍历

```js
for (var key of Object.keys(someObject)) {
  console.log(key + ": " + someObject[key]);
}
```
