---
author: Gerald Chen
pubDatetime: 2019-08-10T10:00:00+08:00
title: "Function Scope and Block Scope"
slug: function-scope-block-scope
featured: false
draft: true
tags:
  - JavaScript
description: "A close look at the principle of least exposure, IIFEs, and block scope (let/const/try-catch)."
---

## The Principle of Least Exposure

Expose only what is strictly necessary and keep everything else "hidden."

## Special Uses for IIFEs

### Restoring `undefined` (in ES3, `undefined` could be reassigned)

```js
(function IIFE(undefined) {
  var a;
  if (a === undefined) {
    console.log("Undefined is safe here!");
  }
})();
```

## Block Scope

- The catch clause of a `try/catch` creates its own block scope
- `let` binds a variable to the enclosing `{}` block
- `const` creates a block-scoped constant

```js
if (true) {
  {
    let i = 11;
    var s = 11;
  }
  // console.log(i); // ReferenceError
  console.log(s); // 11
}
```

Block scoping also helps garbage collection — closures won't accidentally hold on to large objects.
