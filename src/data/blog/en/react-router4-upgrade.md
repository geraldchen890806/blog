---
author: Gerald Chen
pubDatetime: 2018-05-01T10:00:00+08:00
title: "React Router 4 Upgrade Guide"
slug: react-router4-upgrade
featured: false
draft: true
tags:
  - React
  - 前端
description: "Step-by-step notes on upgrading react-router to 4.x, plus the pitfalls we hit along the way."
---

## Required packages

```js
"query-string": "5.1.1",
"react-router-dom": "4.3.1",
"connected-react-router": "5.0.1",
```

## Key changes

1. **React Router 4 no longer parses location.search** — you have to parse it yourself with `query-string`
2. **`params` / `routeParams` are gone** — use `match.params` instead
3. **Route syntax has changed**: use `<Route path="/home" render={...} />`
4. **History is managed separately**: `import createHistory from 'history/createBrowserHistory'`

## Migrating application code

```js
// 之前
import { browserHistory } from "react-router";
browserHistory.push("xxx");

// 之后
import history from "js/redux/middleware/history";
history.push("xxx");
```
