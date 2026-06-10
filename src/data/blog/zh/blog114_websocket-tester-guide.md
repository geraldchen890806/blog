---
author: 陈广亮
pubDatetime: 2026-04-09T10:00:00+08:00
title: 工具指南22-WebSocket在线测试工具
slug: blog114_websocket-tester-guide
featured: false
draft: true
reviewed: true
approved: true
tags:
  - 工具指南
  - 工具
  - 前端
description: 介绍 anyfreetools.com 的 WebSocket 在线测试工具，无需安装任何客户端，直接在浏览器中建立 WebSocket 连接、发送消息、查看实时响应，是调试 WebSocket 服务的利器。
---

## 什么是 WebSocket？

WebSocket 是一种在单个 TCP 连接上进行全双工通信的协议。与传统 HTTP 请求-响应模式不同，WebSocket 允许服务器主动向客户端推送数据，客户端也可以随时向服务器发送消息，双方通信是持续的、实时的。

WebSocket 协议于 2011 年被 IETF 标准化为 RFC 6455，目前所有主流浏览器都原生支持。它广泛应用于以下场景：

- **实时聊天**：微信 Web、Slack、Discord 等 IM 应用
- **在线协作**：多人同时编辑文档（Google Docs、Notion）
- **实时行情**：股票、加密货币价格推送
- **游戏**：多人在线游戏的状态同步
- **监控告警**：服务器指标、日志实时推送
- **IoT 设备**：传感器数据采集与控制指令下发

## 调试 WebSocket 的痛点

在开发 WebSocket 服务时，调试是一个令人头疼的环节。常见的困境有：

**浏览器 DevTools 能力有限**：Chrome DevTools 可以查看 WebSocket 帧，但无法主动发起连接或自定义消息内容，只能被动观察页面已有的 WebSocket 通信。

**命令行工具学习成本高**：`websocat`、`wscat` 等命令行工具功能强大，但需要安装，且对不熟悉命令行的开发者不友好。

**Postman 需要额外配置**：Postman 支持 WebSocket 测试，但需要注册登录，界面较重，启动慢。

**环境依赖问题**：在团队协作中，"在我机器上能跑"是常见问题，依赖特定版本的工具会带来不一致性。

## WebSocket 在线测试工具

[WebSocket 在线测试工具](https://anyfreetools.com/tools/websocket-tester) 是 anyfreetools.com 提供的一款免费在线调试工具。打开浏览器即用，无需安装任何插件或客户端，非常适合快速验证 WebSocket 接口。

### 核心功能

**1. 连接管理**

在地址栏输入 WebSocket 服务地址（支持 `ws://` 和 `wss://` 协议），点击"连接"按钮即可建立连接。连接状态实时显示：

- 绿色：已连接
- 红色：已断开或连接失败
- 黄色：连接中

支持随时断开重连，方便测试服务端的重连逻辑。

**2. 消息发送**

连接建立后，可以在消息输入框中输入任意内容并发送。支持：

- 纯文本消息
- JSON 格式消息（带格式高亮）
- 二进制消息（Base64 编码输入）

消息历史会自动保留，方便重复发送同一条消息。

**3. 实时消息流**

所有收发消息按时间顺序显示在消息流区域，每条消息标注：

- 发送方向（上行/下行箭头）
- 精确时间戳（毫秒级）
- 消息内容（支持 JSON 美化展示）
- 消息大小（字节数）

**4. 自定义请求头**

支持添加自定义 HTTP 请求头，用于连接握手阶段携带认证信息，例如：

```http
Authorization: Bearer <your-jwt-token>
```

这对于需要鉴权的 WebSocket 接口非常实用。

**5. 心跳配置**

支持配置自动心跳（Ping）间隔，防止连接因超时被服务端断开。可以自定义心跳消息内容和发送间隔（单位：秒）。

## 实战案例

### 案例一：测试公共 Echo 服务

最简单的入门方式是连接公共 WebSocket Echo 服务，它会将收到的消息原样返回。

在地址栏输入：

```text
wss://ws.postman-echo.com/raw
```

点击连接，连接成功后发送任意消息，例如：

```json
{"type": "ping", "timestamp": 1712640000000}
```

服务器会立即返回相同内容，确认双向通信正常。

### 案例二：调试自研 WebSocket 服务

假设本地运行了一个 Node.js WebSocket 服务：

```javascript
// server.js
const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", (ws) => {
  console.log("客户端已连接");

  ws.on("message", (message) => {
    console.log("收到消息:", message.toString());
    // 广播给所有客户端
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(`[广播] ${message}`);
      }
    });
  });

  ws.send("欢迎连接！");
});
```

在工具中输入本地服务地址：

```text
ws://localhost:8080
```

连接后即可看到服务端推送的"欢迎连接！"消息，然后发送自定义消息测试广播逻辑。

### 案例三：测试需要鉴权的接口

某些 WebSocket 接口需要在握手时携带 JWT Token：

```text
wss://example.com/ws/chat
```

在"请求头"配置中添加：

```http
Authorization: Bearer <your-jwt-token>
```

连接后即可正常通信，无需修改代码或使用复杂的 curl 命令。

### 案例四：模拟客户端测试服务端逻辑

在测试以下场景时，WebSocket 在线测试工具可以充当"模拟客户端"：

**测试消息协议**：发送不同格式的消息，观察服务端是否正确解析和响应。

正常消息：

```json
{"action": "subscribe", "channel": "btc_usdt"}
```

异常消息（缺少必填字段）：

```json
{"action": "subscribe"}
```

非法消息（非 JSON 格式）：

```text
hello world
```

**测试断线重连**：手动断开连接，观察服务端是否正确处理客户端离线事件（清理会话、广播离线通知等）。

**测试并发**：同时开多个浏览器标签，各自连接服务器，模拟多客户端并发场景。

## WebSocket 握手协议细节

理解握手过程有助于排查连接失败问题，也能更好地利用测试工具中的"自定义请求头"功能。

### HTTP Upgrade 握手

WebSocket 连接由一次普通 HTTP 请求发起，客户端在请求头中携带以下关键字段：

```http
GET /ws HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```

服务端收到请求后，将 `Sec-WebSocket-Key` 拼接固定 GUID `258EAFA5-E914-47DA-95CA-C5AB0DC85B11`，然后计算 `Base64(SHA1(key + GUID))`，写入响应头：

```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

状态码 101 表示协议切换成功，后续通信不再走 HTTP，直接走 WebSocket 帧协议。

### 帧格式

WebSocket 数据以"帧（Frame）"为单位传输，帧头最小 2 字节，包含以下关键字段：

- **FIN bit**：标记是否为消息的最后一帧，分片传输时中间帧 FIN=0，最后帧 FIN=1。
- **Opcode**：帧类型标识，常用值如下：
  - `0x1`：文本帧（UTF-8 编码）
  - `0x2`：二进制帧
  - `0x8`：关闭帧（含关闭码）
  - `0x9`：Ping 帧
  - `0xA`：Pong 帧（对 Ping 的应答）
- **Mask 掩码**：客户端向服务端发送的帧**必须**进行掩码处理（RFC 6455 强制要求），服务端向客户端发送的帧则不需要。掩码可防止代理缓存污染攻击。

## 服务端实现示例（Node.js ws 库）

以下是一个生产可用的 Node.js WebSocket 服务端，包含心跳检测和广播逻辑：

```javascript
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`客户端连接: ${ip}`);

  // 心跳检测
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (data, isBinary) => {
    const msg = isBinary ? data : data.toString();
    // 广播给所有在线客户端
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg, { binary: isBinary });
      }
    });
  });

  ws.on('close', (code, reason) => {
    console.log(`断开: ${code} ${reason}`);
  });
});

// 定时心跳，清理僵尸连接
const interval = setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => clearInterval(interval));
```

关键细节说明：

- `ws.isAlive` 标志位结合 `pong` 事件实现心跳检测，每 30 秒清理一次无响应的僵尸连接，避免服务端连接数无限增长。
- `isBinary` 参数区分文本帧和二进制帧，转发时保持原始帧类型，不做多余转换。
- `ws.terminate()` 强制断开 TCP 连接，`ws.close()` 则会先发送关闭帧（优雅关闭），两者适用场景不同。

用 [WebSocket 在线测试工具](https://anyfreetools.com/tools/websocket-tester) 连接上述本地服务时，消息流面板可以直观看到广播回显，方便验证多连接广播逻辑是否正常。

## 浏览器原生 WebSocket API

前端代码直接使用浏览器内置的 `WebSocket` 类，无需任何依赖：

```javascript
const ws = new WebSocket('wss://example.com/ws');

ws.onopen = () => {
  console.log('已连接');
  ws.send(JSON.stringify({ type: 'subscribe', channel: 'market' }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('收到:', data);
};

ws.onerror = (error) => console.error('WebSocket 错误:', error);

ws.onclose = (event) => {
  console.log(`连接关闭: ${event.code} ${event.reason}`);
  // 自动重连逻辑
  if (event.code !== 1000) {
    setTimeout(() => reconnect(), 3000);
  }
};

// 主动关闭
ws.close(1000, '正常关闭');
```

几个使用要点：

- `ws.readyState` 有四种状态：`0`（CONNECTING）、`1`（OPEN）、`2`（CLOSING）、`3`（CLOSED），发送消息前需确认状态为 `1`，否则会抛出异常。
- `onerror` 回调的 `error` 对象信息有限，详细原因通常在紧随其后的 `onclose` 事件中，通过 `event.code` 和 `event.reason` 获取。
- 自动重连时建议加入指数退避（Exponential Backoff），避免服务端重启时大量客户端同时重连造成雪崩。

## WebSocket 关闭码速查

关闭帧（Opcode `0x8`）携带 2 字节关闭码，标准关闭码由 IANA 维护，常见值如下：

| 关闭码 | 含义 | 常见原因 |
|--------|------|----------|
| 1000 | 正常关闭 | 双方主动、正常结束会话 |
| 1001 | 端点离开 | 浏览器页面导航或关闭标签 |
| 1006 | 异常关闭 | 无关闭帧，通常是网络中断或进程崩溃 |
| 1008 | 违反策略 | 消息内容不符合服务端策略 |
| 1011 | 服务端内部错误 | 服务端处理消息时发生未预期异常 |

调试时，`1006` 是最常见的"非正常"关闭码——它意味着 TCP 连接直接断开，没有完成 WebSocket 级别的握手关闭。遇到 `1006` 应优先排查网络连通性、服务端进程状态和反向代理超时配置。

## WebSocket 与 HTTP 的对比

| 特性 | HTTP | WebSocket |
|------|------|-----------|
| 连接模式 | 短连接（请求-响应） | 长连接（持久双向） |
| 服务端推送 | 需要轮询或 SSE | 原生支持 |
| 协议头开销 | 每次请求带完整 Headers | 握手后帧头仅 2-14 字节 |
| 适用场景 | 资源获取、表单提交 | 实时通信、事件推送 |
| 浏览器支持 | 全部 | 全部现代浏览器 |

在需要**低延迟、高频率**双向通信的场景下，WebSocket 远优于 HTTP 轮询。

## 常见问题排查

**连接被拒绝（Connection Refused）**

- 检查服务端是否已启动
- 确认端口号是否正确
- 查看服务端防火墙规则

**握手失败（Handshake Failed）**

- 确认服务端支持 WebSocket 协议升级
- 检查 Nginx/Apache 等反向代理是否配置了 WebSocket 转发：

```nginx
location /ws/ {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```

**连接频繁断开**

- 服务端可能设置了连接超时时间
- 启用心跳机制，定期发送 Ping 保持连接活跃
- 检查网络中间件（负载均衡、代理）是否有连接超时限制

**消息发送失败**

- 确认连接状态为"已连接"
- 检查消息格式是否符合服务端要求
- 查看服务端日志，排查消息解析错误

## 安全注意事项

在使用 WebSocket 时，需要注意以下安全问题：

**1. 使用 WSS（加密）**

生产环境务必使用 `wss://`（WebSocket over TLS）而非 `ws://`，防止消息被中间人截获。这与 HTTPS 和 HTTP 的关系类似。

**2. 身份验证**

WebSocket 握手虽然会携带同源 Cookie，但在跨域或移动端等场景下 Cookie 机制不一定可靠，因此推荐通过 Token 机制进行身份验证，或在连接建立后发送认证消息。

**3. 输入验证**

服务端必须对收到的所有消息进行验证和清洗，防止恶意客户端发送非法数据导致服务崩溃或注入攻击。

**4. 跨站 WebSocket 劫持（CSWSH）**

服务端应验证握手请求的 `Origin` 头，拒绝来自未授权域名的连接请求。

## 总结

[WebSocket 在线测试工具](https://anyfreetools.com/tools/websocket-tester) 是开发者调试 WebSocket 接口的得力助手。它具备以下优势：

- **零安装**：打开浏览器即可使用，无需配置环境
- **功能完整**：连接管理、消息收发、自定义头部、心跳配置一应俱全
- **实时可视**：消息流清晰展示收发方向、时间戳和内容
- **完全免费**：无需注册，无使用限制

无论是快速验证一个公共 WebSocket 服务，还是调试自研的实时通信接口，这款工具都能帮你省去繁琐的环境配置，专注于业务逻辑本身。下次遇到 WebSocket 调试需求，不妨打开 [anyfreetools.com](https://anyfreetools.com/tools/websocket-tester) 试试。
