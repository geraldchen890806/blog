---
author: Gerald Chen
pubDatetime: 2018-09-01T10:00:00+08:00
title: "ES6 Iterators Explained"
slug: iterator
featured: false
draft: true
tags:
  - JavaScript
  - ES6
description: "How the Iterator interface works, the for...of loop, and four ways to make a plain object iterable."
---

Iterator is an interface that provides a unified access mechanism for all kinds of data structures. It also underpins destructuring assignment, the spread operator, Generators, and for...of.

## Data Structures with Built-in Iterators

Array, Map, Set, String, TypedArray, arguments, NodeList

## Making an Object Work with for...of

### Option 1: Implement Symbol.iterator

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

### Option 2: Borrow Array's Iterator

```js
let iterable = {
  0: "a", 1: "b", 2: "c",
  length: 3,
  [Symbol.iterator]: Array.prototype[Symbol.iterator],
};
```

### Option 3: Generator Function

```js
let obj = {
  *[Symbol.iterator]() {
    yield "hello";
    yield "world";
  },
};
```

### Option 4: Iterate with Object.keys

```js
for (var key of Object.keys(someObject)) {
  console.log(key + ": " + someObject[key]);
}
```
