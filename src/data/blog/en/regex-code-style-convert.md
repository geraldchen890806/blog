---
author: Gerald Chen
pubDatetime: 2015-12-01T10:00:00+08:00
title: "Regular Expressions: Converting Between Code Naming Styles"
slug: regex-code-style-convert
featured: false
draft: true
tags:
  - JavaScript
  - 正则表达式
description: "Converting between camelCase, dash-case, and snake_case naming styles with regular expressions."
---

Three common naming styles:

- Camel case: `testTest`
- Dash case: `test-test`
- Snake case: `test_test`

## To camel case

```js
function camelize(target) {
  return target.replace(/[_-][^_-]/g, function (match) {
    return match.charAt(1).toUpperCase();
  });
}
camelize("te-pp"); // "tePp"
```

## To snake case

```js
function underscored(target) {
  return target
    .replace(/([a-z\d])([A-Z])/g, "$1_$2")
    .replace(/-/g, "_")
    .toLowerCase();
}
```

## To dash case

```js
function dasherize(target) {
  return target
    .replace(/([a-z\d])([A-Z])/g, "$1_$2")
    .replace(/_/g, "-")
    .toLowerCase();
}
```
