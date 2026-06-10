---
author: Gerald Chen
pubDatetime: 2016-09-01T10:00:00+08:00
title: "Migrating My Blog from MySQL to SQLite"
slug: mysql-to-sqlite
featured: false
draft: true
tags:
  - Node.js
  - 数据库
description: "How I moved my blog from MySQL to SQLite and saved 48 CNY/month."
---

My Aliyun MySQL instance was about to expire, and renewing it cost 48 CNY/month — so I switched to SQLite without a second thought.

## Steps

1. Back up the Aliyun MySQL instance (export it as a SQL file)
2. Fix the type differences in the SQL statements
3. Generate the SQLite db file
4. Update the SQL statements in the project

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

That's 48 CNY/month saved ^_^
