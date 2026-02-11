---
author: 陈广亮
pubDatetime: 2016-09-01T10:00:00+08:00
title: "MySQL 更换 SQLite 记录"
slug: mysql-to-sqlite
featured: false
draft: false
tags:
  - Node.js
  - 数据库
description: "博客从 MySQL 迁移到 SQLite 的全过程，省了 48 元/月。"
---

阿里云 MySQL 到期了，续费 48 元/月，果断换 SQLite。

## 步骤

1. 备份阿里云 MySQL 实例（导出 SQL 文件）
2. 处理 SQL 语句中的类型差异
3. 生成 SQLite db 文件
4. 修改项目中的 SQL 语句

```js
// Koa 框架中使用 sqlite3
var res = yield new Promise(function (resolve, reject) {
  self.db.run(
    "insert into comments values (?,?,?,?,?,?,?)",
    [null, comment.blogID, comment.name, comment.email, comment.content, comment.addTime, comment.relID]
  );
  self.db.get(
    "select * from comments where blogID = ? and name = ?",
    [comment.blogID, comment.name],
    function (err, rows) { resolve(rows); }
  );
});
```

省了 48 元/月 ^_^
