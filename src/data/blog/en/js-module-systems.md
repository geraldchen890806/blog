---
author: Gerald Chen
pubDatetime: 2018-09-15T10:00:00+08:00
title: "JavaScript Module Systems: CommonJS, AMD, CMD, and ES Modules"
slug: js-module-systems
featured: false
draft: true
tags:
  - JavaScript
  - 前端工程化
description: "A quick look at the differences between CommonJS, AMD, CMD, and ES6 Modules."
---

## CommonJS (Node.js)
- Loads modules synchronously, which makes it a good fit for the server side
- Exports a **copy** of the value

## AMD (RequireJS)
- Loads modules asynchronously, with all dependencies declared up front

## CMD (SeaJS)
- Dependencies are declared close to where they're used—you `require` them only when needed
- The biggest difference between AMD and CMD is **when dependencies get executed**

## ES6 Modules
- Exports a **reference** to the value, with the interface resolved at compile time
- Statically analyzable, which enables Tree Shaking

```js
const foo = 10;
export { foo as default }; // foo 更新会影响 default
export default foo; // foo 更新不影响 default
```
