---
author: 陈广亮
pubDatetime: 2019-08-23T10:00:00+08:00
title: HTTP 缓存机制详解
slug: http-cache
featured: true
draft: false
tags:
  - HTTP
  - 浏览器
  - 性能优化
description: 深入理解 HTTP 强缓存与协商缓存的工作原理。
---

## HTTP 缓存分为强缓存与协商缓存

### 强缓存

强缓存表示直接使用缓存中的资源，不发请求，主要值有 Expires 和 Cache-Control。

表现为请求状态码 200，size: (memory cache / disk cache)

- **memory cache**：资源在内存中，读取时间几乎为 0，关闭页面时资源释放，下次打开如果再次命中强缓存就是 disk cache
- **disk cache**：资源在磁盘中，毫秒级读取时间

### 协商缓存

如果未能从强缓存中读取资源，则发送请求到服务器，判断协商缓存（Last-Modified/If-Modified-Since，ETag/If-None-Match）

- 协商缓存命中返回 **304**，不下载资源，使用缓存资源
- 协商缓存未命中返回 **200**，下载资源，更新缓存

### 缓存方式演进

1. **无缓存** — 每次从服务器获取资源。缺点：浪费流量和时间

2. **全量缓存** — 每次请求使用缓存资源。缺点：资源更新后浏览器无法感知

3. **Expires** — response header 中返回 GMT 格式的过期时间。缺点：客户端时间可以任意修改

4. **Cache-Control** — `Cache-Control: max-age=10`（秒），过期后重新下载资源并重置过期时间

> 以上为强缓存，缺点为过期后需要重新下载资源，无论资源有没有更新

5. **Last-Modified** — 第一次请求文件时返回 Last-Modified（GMT 时间），强缓存失效时，request header 带上 If-Modified-Since（等于上一次请求的 Last-Modified）

6. **ETag** — 服务器为资源生成唯一标识，请求时通过 If-None-Match 比对

### 总结

合理使用 HTTP 缓存是前端性能优化的基础。理解强缓存和协商缓存的区别，才能在实际项目中做出正确的缓存策略。
