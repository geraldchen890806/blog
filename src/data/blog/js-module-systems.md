---
author: 陈广亮
pubDatetime: 2018-09-15T10:00:00+08:00
title: "JS 模块规范：CommonJS、AMD、CMD、ES Module"
slug: js-module-systems
featured: false
draft: false
tags:
  - JavaScript
  - 前端工程化
description: "浅析 CommonJS、AMD、CMD、ES6 Module 的区别。"
---

## CommonJS（Node.js）
- 同步加载，适合服务器端
- 输出的是值的**拷贝**

## AMD（RequireJS）
- 异步加载，初始定义所有依赖模块

## CMD（SeaJS）
- 依赖就近，用的时候再 require
- AMD 和 CMD 最大区别是对依赖模块的**执行时机**不同

## ES6 Module
- 输出的是值的**引用**，编译时输出接口
- 静态分析，支持 Tree Shaking

```js
const foo = 10;
export { foo as default }; // foo 更新会影响 default
export default foo; // foo 更新不影响 default
```
