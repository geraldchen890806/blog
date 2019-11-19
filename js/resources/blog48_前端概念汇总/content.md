### 恶魔 Zalgo

既可能现在（同步）也可能将来（异步）调用你的回调函数。

### 鸭子模型

如果它看起来像只鸭子，叫起来像鸭子，那它一定就是只鸭子。

### http https

HTTP 协议（HyperText Transfer Protocol，超文本传输协议）,运行在 TCP 之上，明文传输，客户端与服务器端都无法验证对方的身份
https 身披 SSL( Secure Socket Layer )外壳的 HTTP，运行于 SSL 上，SSL 运行于 TCP 之上， 是添加了加密和认证机制的 HTTP。
http2 引入了多路复用的技术，这个技术可以只通过一个 TCP 连接就可以传输所有的请求数据。多路复用可以绕过浏览器限制同一个域名下的请求数量的问题，进而提高了网页的性能

1. 3 次握手，4 次挥手 https://juejin.im/post/5b1265edf265da6e155d45a9
2. 状态码
   304(etag|last-Modified)
   301(永久挑战 seo 友好) 302(临时跳转，URL 劫持)

### js

[object.freeze](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze)

[object.assign] polyfill(no symbol) (https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)

[object.create(null)](https://juejin.im/post/5acd8ced6fb9a028d444ee4e)

[Proxy](https://juejin.im/post/5d2e657ae51d4510b71da69d?utm_source=gold_browser_extension)

[Proxy vs defineproperty](https://juejin.im/post/5acd0c8a6fb9a028da7cdfaf)

```
  格式展开 JSON.stringify({ alpha: 'A', beta: 'B', c : {a:1} }, null, '\t')
```

### 浏览器

[缓存](https://www.jianshu.com/p/54cc04190252)

[h5 适配](https://juejin.im/post/5cddf289f265da038f77696c)

[Web 实时推送](https://juejin.im/post/5c20e5766fb9a049b13e387b)

[浏览器与 Node 的事件循环(Event Loop)有何区别?](https://juejin.im/post/5c337ae06fb9a049bc4cd218)

### css
  [灵活运用CSS开发技巧](https://juejin.im/post/5d4d0ec651882549594e7293)
  1. 使用attr()抓取data-*
  2. position: sticky
  3. 使用text-align-last对齐两端文本
  4. 使用writing-mode排版竖文
  5. 使用object-fit规定图像尺寸 // background-size
  6. 使用transform描绘1px边框
  7. 使用letter-spacing排版倒序文本
  8. 使用:valid和:invalid校验表单 (pattern)
  9. 使用:focus-within分发冒泡响应
  10. 使用filter开启悼念模式
  11. 滚动指示器
  12. 加载指示器

### 面试

https://juejin.im/post/5d23e750f265da1b855c7bbe

[new](https://juejin.im/post/5d124a12f265da1b9163a28d)
