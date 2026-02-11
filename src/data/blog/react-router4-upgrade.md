---
author: 陈广亮
pubDatetime: 2018-05-01T10:00:00+08:00
title: "React Router 4 升级指南"
slug: react-router4-upgrade
featured: false
draft: false
tags:
  - React
  - 前端
description: "react-router 升级到 4.x 的具体步骤与踩坑记录。"
---

## 需要的包

```js
"query-string": "5.1.1",
"react-router-dom": "4.3.1",
"connected-react-router": "5.0.1",
```

## 关键变更

1. **react-router 4 不再 parse location.search**，需要手动用 `query-string` 解析
2. **没有 `params` / `routeParams`** 了，改用 `match.params`
3. **Route 写法变化**：使用 `<Route path="/home" render={...} />`
4. **history 独立管理**：`import createHistory from 'history/createBrowserHistory'`

## 业务代码迁移

```js
// 之前
import { browserHistory } from "react-router";
browserHistory.push("xxx");

// 之后
import history from "js/redux/middleware/history";
history.push("xxx");
```
