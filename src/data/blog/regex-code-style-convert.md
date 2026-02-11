---
author: 陈广亮
pubDatetime: 2015-12-01T10:00:00+08:00
title: "正则表达式：代码风格互转"
slug: regex-code-style-convert
featured: false
draft: false
tags:
  - JavaScript
  - 正则表达式
description: "驼峰、连字符、下划线三种代码风格的正则互转。"
---

三种常见命名风格：

- 驼峰风格：`testTest`
- 连字风格：`test-test`
- 下划线风格：`test_test`

## 转驼峰

```js
function camelize(target) {
  return target.replace(/[_-][^_-]/g, function (match) {
    return match.charAt(1).toUpperCase();
  });
}
camelize("te-pp"); // "tePp"
```

## 转下划线

```js
function underscored(target) {
  return target
    .replace(/([a-z\d])([A-Z])/g, "$1_$2")
    .replace(/-/g, "_")
    .toLowerCase();
}
```

## 转连字符

```js
function dasherize(target) {
  return target
    .replace(/([a-z\d])([A-Z])/g, "$1_$2")
    .replace(/_/g, "-")
    .toLowerCase();
}
```
