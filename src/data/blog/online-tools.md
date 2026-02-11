---
author: 陈广亮
pubDatetime: 2026-02-11T18:00:00+08:00
title: 博客上线两款实用在线工具：二维码生成器 & CSV 转 JSON
slug: online-tools
featured: true
draft: false
tags:
  - 工具
  - 前端
description: 介绍博客新上线的两款纯前端在线工具——二维码生成/解析和 CSV 转 JSON 转换器。
---

## 工具上线了！

技术博客不只有文章，也可以有实用的小工具。今天上线两款纯前端在线工具，无需安装、无需注册、数据不上传服务器，打开浏览器就能用。

👉 [工具入口](/tools)

---

## 1. 📱 二维码生成 & 解析

**地址**: [/tools/qrcode](/tools/qrcode)

### 能做什么？

**生成二维码**：输入任意文本或 URL，实时生成二维码图片，支持一键下载 PNG。

**解析二维码**：上传一张二维码图片，自动识别并显示内容。扫码枪坏了？截图上传就行。

### 使用场景

- 快速生成 Wi-Fi 分享二维码
- 把一段文本编码成二维码传给同事
- 拿到一张二维码截图，不想掏手机扫——直接上传解析
- 生成 URL 短链接的二维码

### 技术实现

纯前端实现，使用 [qrcode](https://github.com/soldair/node-qrcode) 生成、[jsQR](https://github.com/cozmo/jsQR) 解析。所有计算都在浏览器本地完成，**你的数据不会离开你的设备**。

---

## 2. 📊 CSV 转 JSON

**地址**: [/tools/csv-to-json](/tools/csv-to-json)

### 能做什么？

将 CSV 数据实时转换为 JSON 格式。支持两种模式：

**普通模式**：CSV 的每一行转为一个 JSON 对象，首行作为字段名。

```
name,age,city
Alice,30,Beijing
Bob,25,Shanghai
```

输出：

```json
[
  { "name": "Alice", "age": "30", "city": "Beijing" },
  { "name": "Bob", "age": "25", "city": "Shanghai" }
]
```

**Key 模式**（首列为 `key` 时自动触发）：每一列生成一个独立的 JSON 文件，key 列的值作为键名。这个模式对**国际化（i18n）场景**特别好用：

```
key,en,zh,ja
logout,Logout,登出,ログアウト
login,Login,登入,ログイン
```

自动生成三个文件：

**en.json**
```json
{ "logout": "Logout", "login": "Login" }
```

**zh.json**
```json
{ "logout": "登出", "login": "登入" }
```

**ja.json**
```json
{ "logout": "ログアウト", "login": "ログイン" }
```

每个文件支持**单独复制**和**单独下载**，也可以一键**全部下载**。

### 使用场景

- 后端给了 CSV 数据，前端需要 JSON 格式
- 多语言翻译表 → 直接生成各语言的 i18n JSON 文件
- Excel 导出的 CSV → 快速转为 API Mock 数据
- 自定义分隔符（支持 Tab、分号等）

### 技术实现

同样是纯前端，支持文件上传和手动输入。CSV 解析处理了引号转义、自定义分隔符等边界情况。

---

## 为什么做纯前端工具？

1. **隐私安全** — 数据不离开浏览器，不经过任何服务器
2. **零依赖** — 不需要安装任何东西，打开就用
3. **离线可用** — 加载完页面后断网也能正常使用
4. **响应快** — 没有网络请求，转换是实时的

后续还会陆续增加更多实用工具，有什么需求欢迎留言！

👉 [立即使用](/tools)
