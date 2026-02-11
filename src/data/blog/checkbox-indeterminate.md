---
author: 陈广亮
pubDatetime: 2016-01-10T10:00:00+08:00
title: "Checkbox 模糊状态（indeterminate）"
slug: checkbox-indeterminate
featured: false
draft: false
tags:
  - JavaScript
  - CSS
description: "checkbox 的 indeterminate 属性实现半选状态。"
---

Checkbox 有一个模糊状态（上面显示一条横线），通过 `indeterminate` 属性实现：

```js
input.indeterminate = true;

// jQuery
input.prop("indeterminate", true);
```

`indeterminate` 属性只能使用 JS 来设置，不能通过 HTML 属性设置。
