## http 缓存分为强缓存，协商缓存

### 强缓存

强缓存表示直接使用缓存中的资源，不发请求，主要值有 Expires 和 Cache-Control

表现为请求状态码 200，size: (memory cache / disk cache)

memory cache：资源在内存中，读取时间几乎为 0，关闭页面时资源释放，下次打开如果再次命中强缓存就是 disk cache

disk cache：资源在磁盘中，毫秒级读取时间

### 协商缓存

如果未能从强缓存中读取资源，则发送请求到服务器，判断协商缓存（Last-Modified/If-Modified-Since ，ETag/If-None-Match）

协商缓存命中返回 304，不下载资源，使用缓存资源

协商缓存未命中返回 200，下载资源，更新缓存

### 下面通过实际场景讲解各种缓存方式

1. 浏览器需要请求资源，每次从服务器获取资源，下载解析后使用

   缺点：每次请求浪费流量，时间

2. 浏览器缓存资源，每次请求使用缓存资源

   缺点：资源更新后浏览器无法感知使用最新资源

3. 约定过期时间 [Exipres](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Expires)

   response header 中返回，值为 GMT 格式的标准时间(Fri, 23 Aug 2019 06:04:42 GMT)，表示文件过期时间

   在过期时间内，直接使用缓存中资源

   缺点：客户端时间可以任意修改

4. 约定相对过期时间 [Cache-Contorl](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Cache-Control)

   Cache-Contorl: max-age=10 (秒)

   过期后需要重新下载资源并重置过期时间

##### 以上为强缓存，缺点为过期后需要重新下载资源，无论资源有没有更新

5.  服务器告知文件上次修改时间 [Last-Modified](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Last-Modified)

    第一次请求文件时返回 Last-Modified（GMT 时间）
    强缓存失效时，request header 带上 If-Modified-Since（等于上一次请求的 Last-Modified）

    服务器比较文件修改时间和 If-Modified-Since，如果文件未修改则返回 304，浏览器不下载资源并直接使用缓存资源，如果修改过则返回 200，下载资源并更新 Last-Modified

    缺点：精确到秒

6.  文件内容对比 [Etag](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/ETag)
    第一次请求文件时返回 Etag（GMT 时间）

    强缓存失效时，request header 带上 If-None-Match（等于上一次请求的 Etag）

    服务器比较文件 Etag 和 If-None-Match，如果文件未修改则返回 304，浏览器不下载资源并直接使用缓存资源，如果修改过则返回 200，下

    载资源并更新 Etag

### tips

1. 如果在 Cache-Control 响应头设置了 "max-age" 或者 "s-max-age" 指令，那么 Expires 头会被忽略
2. Cache-Control: no-cache 表示不启用强缓存，Cache-Control: no-store 禁止使用缓存
3. 如果同时使用 Etag 和 Last-Modified，那需要都满足条件
4. url输入使用强缓存 （200）
5. F5, 右键刷新，点击刷新按钮 会忽略强缓存，使用协商缓存验证资源 （304）
6. Ctrl + F5 / Cammand + Shift + r 不使用缓存 (Cache-Control: no-cache)
7. 一般情况设置 html 不缓存，以及时相应更新
8. 实测 firefox 只使用协商缓存，忽略强缓存；chrome 中有强缓存优化，如果未明确禁止强缓存则会触发强缓存
9. Pragma: no-cache，http1.0 标准，所有浏览器支持

   Cache-Control 不存在的时候，它的行为与 Cache-Control: no-cache 一致，表示需跟服务器验证缓存（使用协商缓存）
   基本废弃了，建议只在需要兼容 HTTP/1.0 客户端的场合下应用。

### 参考：

1. [面试精选之 http 缓存](https://juejin.im/post/5b3c87386fb9a04f9a5cb037)
2. [[前端词典]F5 同 Ctrl+F5 的区别你可了解](https://juejin.im/post/5c7d2d80518825408d6fe2aa)
