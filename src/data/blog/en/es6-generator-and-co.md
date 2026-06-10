---
author: Gerald Chen
pubDatetime: 2016-03-15T10:00:00+08:00
title: ES6 Generators and the co Module
slug: es6-generator-and-co
featured: false
draft: true
tags:
  - JavaScript
  - ES6
description: Understanding the basics of ES6 generators and how TJ Holowaychuk's co module works under the hood.
---

## Generator Basics

Here's an example:

```js
function* foo() {
  yield 4;
  var res = yield 2;
  console.log("res:", res);
  return 5;
}

var g = foo();
g.next(1); // { value: 4, done: false }
g.next(2); // { value: 2, done: false }
g.next(3); // res:3 { value: 5, done: true }
```

A few things worth noting:

1. Calling `foo()` doesn't execute the function body at all — nothing runs until you call `g.next()`
2. Each call to `g.next()` returns `{ value: *, done: * }`
3. As long as `done` is `false`, the function hasn't finished running
4. The final call returns the result of the `return` statement, with `done` set to `true`
5. The line `var res = yield 2` only runs its right-hand side before pausing; `res` doesn't get assigned until the next call, `g.next(3)`, passes a value back in

## How the co Module Works

TJ Holowaychuk's co module is built entirely on these properties. The core idea:

1. Inside a generator function, yield an async operation
2. When the async operation completes, pass its result back into the generator via `next()`
3. Recurse until the generator is done

This pattern makes asynchronous code read like synchronous code — and ES7's `async/await` is essentially syntactic sugar built on the same idea.
