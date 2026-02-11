---
author: 陈广亮
pubDatetime: 2015-09-01T10:00:00+08:00
title: "Node 中使用 Feedly 与 RSS"
slug: node-feedly-rss
featured: false
draft: false
tags:
  - Node.js
description: "在 Node.js 博客中添加 RSS 订阅功能，接入 Feedly。"
---

使用 [node-rss](https://github.com/dylang/node-rss) 生成 RSS XML：

```js
exports.feed = function* () {
  var feed = new rss({
    title: "陈佳人",
    description: "人生是一场独自修行的道路",
    feed_url: "http://renjm.com/feed",
    site_url: "http://renjm.com",
  });

  var blogs = yield blogDB.getBlogs();
  blogs.forEach(function (v) {
    feed.item({
      title: v.title,
      description: v.realContent,
      url: "http://renjm.com/blog/" + v.id,
      date: v.addTime,
    });
  });

  this.body = feed.xml();
  this.type = "text/xml";
};
```
