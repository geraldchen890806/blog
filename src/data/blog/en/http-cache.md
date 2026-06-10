---
author: Gerald Chen
pubDatetime: 2019-08-23T10:00:00+08:00
title: "HTTP Caching Explained"
slug: http-cache
featured: true
draft: true
tags:
  - HTTP
  - 浏览器
  - 性能优化
description: "A deep dive into how HTTP strong caching and conditional (negotiated) caching work."
---

## HTTP caching: strong cache vs. conditional cache

### Strong cache

With a strong cache, the browser uses the cached resource directly without sending a request at all. The relevant headers are Expires and Cache-Control.

In DevTools this shows up as status code 200 with size: (memory cache / disk cache)

- **memory cache**: the resource lives in memory, so read time is essentially zero. It's released when the page closes; on the next visit, a strong-cache hit comes from disk cache instead
- **disk cache**: the resource lives on disk, with millisecond-level read times

### Conditional cache

If the resource can't be served from the strong cache, the browser sends a request to the server, which validates the conditional cache (Last-Modified/If-Modified-Since, ETag/If-None-Match)

- On a conditional-cache hit, the server returns **304** — the resource isn't downloaded and the cached copy is used
- On a miss, the server returns **200** — the resource is downloaded and the cache is updated

### How caching strategies evolved

1. **No caching** — fetch the resource from the server every time. Downside: wastes bandwidth and time

2. **Cache everything** — serve every request from cache. Downside: the browser has no way to know when a resource has been updated

3. **Expires** — the response header carries an expiration time in GMT format. Downside: the client's clock can be set to anything

4. **Cache-Control** — `Cache-Control: max-age=10` (in seconds); once expired, the resource is re-downloaded and the expiration timer resets

> Everything above is strong caching. The drawback: once the cache expires, the resource must be re-downloaded whether or not it has actually changed

5. **Last-Modified** — the first response for a file includes Last-Modified (a GMT timestamp); when the strong cache expires, the request carries If-Modified-Since (set to the Last-Modified from the previous response)

6. **ETag** — the server generates a unique identifier for the resource, and the request sends it back via If-None-Match for comparison

### Wrapping up

Using HTTP caching well is the foundation of front-end performance optimization. Only by understanding the difference between strong and conditional caching can you make the right caching decisions in real projects.
