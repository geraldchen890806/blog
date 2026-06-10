---
author: Gerald Chen
pubDatetime: 2015-09-01T10:00:00+08:00
title: "Using Feedly and RSS with Node"
slug: node-feedly-rss
featured: false
draft: true
tags:
  - Node.js
description: "Adding an RSS feed to a Node.js blog and hooking it up to Feedly."
---

Use [node-rss](https://github.com/dylang/node-rss) to generate the RSS XML:

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
