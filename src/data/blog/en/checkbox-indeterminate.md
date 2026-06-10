---
author: Gerald Chen
pubDatetime: 2016-01-10T10:00:00+08:00
title: "The Checkbox Indeterminate State"
slug: checkbox-indeterminate
featured: false
draft: true
tags:
  - JavaScript
  - CSS
description: "Using the indeterminate property to give a checkbox a partially-checked state."
---

A checkbox has an indeterminate state (shown as a horizontal bar across the box), which you enable through the `indeterminate` property:

```js
input.indeterminate = true;

// jQuery
input.prop("indeterminate", true);
```

The `indeterminate` property can only be set via JavaScript — there is no HTML attribute for it.
