---
author: 陈广亮
pubDatetime: 2026-02-13T00:40:00+08:00
title: OpenClaw 入门实战：5分钟搭建你的自托管 AI 助手
slug: openclaw-getting-started
featured: true
draft: false
tags:
  - OpenClaw
  - AI
  - 自托管
description: OpenClaw 是个强大的自托管 AI 代理网关，让你用 Telegram 等 App 随时随地调用 Claude。本文带你从零开始，5分钟搭建第一个 AI bot。
---

最近在研究如何更高效地使用 AI 助手，发现了一个很有意思的开源项目：**OpenClaw**。它能让你在 Telegram、WhatsApp、Discord 等各种 App 里直接跟 Claude 对话，而且完全由你自己掌控。今天就来分享一下如何从零搭建你的第一个 OpenClaw AI 助手。

## OpenClaw 是什么？

简单说，**OpenClaw 是一个自托管的 AI 代理网关**。它帮你把 Claude、GPT 等 AI 模型接入到各种消息平台，让你可以像跟朋友聊天一样跟 AI 交互。

### 核心特性

- **多渠道支持**：Telegram、WhatsApp、Discord、Slack 等主流平台
- **自托管架构**：所有数据留在你自己的服务器上
- **灵活配置**：支持多个 Agent、自定义工具、记忆管理
- **开箱即用**：内置 Web 控制面板，配置简单

### 为什么选择自托管？

很多人可能会问：市面上已经有 ChatGPT、Claude.ai 这些现成服务了，为什么还要自己搭建？

**数据隐私**：所有对话记录、配置信息都存储在你自己的设备上，不会被第三方收集。

**完全可控**：想换模型就换模型，想接入哪个平台就接入哪个平台，不受平台限制。

**成本透明**：直接调用 API，按实际用量付费，不用担心订阅费用。

**功能自由**：可以自定义工具、配置记忆系统、接入本地服务，玩法更多。

对于开发者和注重隐私的用户来说，自托管是个更好的选择。

## 快速安装（macOS）

下面以 macOS 为例，演示如何安装 OpenClaw。其他系统的安装方法类似，可以参考[官方文档](https://openclaw.ai/install)。

### 前置条件

在开始之前，确保你的系统满足以下条件：

1. **Node.js 22+**：OpenClaw 基于 Node.js 运行
   ```bash
   node --version  # 检查版本，应该 >= 22
   ```
   如果版本不够，建议用 [nvm](https://github.com/nvm-sh/nvm) 安装最新版。

2. **Anthropic API Key**：你需要一个 Claude 的 API 密钥
   - 前往 [Anthropic Console](https://console.anthropic.com/) 注册账号
   - 在 API Keys 页面创建新密钥
   - 记下这个密钥，稍后会用到

### 一键安装

OpenClaw 提供了非常方便的一键安装脚本：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

这个脚本会自动下载并安装 OpenClaw CLI。安装完成后，验证一下：

```bash
openclaw --version
```

### 运行配置向导

安装好之后，运行配置向导来初始化你的 Gateway：

```bash
openclaw onboard --install-daemon
```

向导会引导你完成以下配置：

1. **选择模型提供商**：选择 Anthropic（Claude）
2. **输入 API Key**：粘贴你刚才获取的 Anthropic API Key
3. **配置 Gateway 端口**：默认 18789，一般不用改
4. **选择渠道**：暂时先跳过，我们后面手动配置 Telegram

向导运行完成后，OpenClaw Gateway 会自动启动。

## 配置你的第一个 Telegram Bot

接下来是最有趣的部分：创建一个 Telegram bot，让它接入你的 OpenClaw Gateway。

### 1. 通过 @BotFather 创建 Bot

打开 Telegram，搜索 **@BotFather**（Telegram 官方的 bot 管理工具），然后：

1. 发送 `/newbot` 命令
2. 输入你的 bot 名称，比如：`My OpenClaw Assistant`
3. 输入 bot 的用户名（必须以 `bot` 结尾），比如：`my_openclaw_bot`
4. 创建成功后，**BotFather 会给你一个 Token**，类似：
   ```
   7123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw
   ```
   **务必保存好这个 Token**！

### 2. 配置 OpenClaw

现在需要把你的 Telegram bot 接入 OpenClaw。编辑配置文件：

```bash
openclaw config edit
```

在配置文件中找到 `channels.telegram` 部分，添加你的 bot 配置：

```yaml
channels:
  telegram:
    enabled: true
    accounts:
      - id: my-bot
        token: "7123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw"
        agent: main
```

**参数说明**：
- `id`：给这个 bot 取个内部标识符，随便起名
- `token`：刚才从 BotFather 获得的 bot token
- `agent`：指定使用哪个 Agent（默认的 `main` agent 就够用）

保存配置后，重启 Gateway 让配置生效：

```bash
openclaw gateway restart
```

### 3. 启动验证

检查 Gateway 状态，确保一切正常：

```bash
openclaw gateway status
```

你应该能看到类似这样的输出：

```
✓ Gateway is running
  PID: 12345
  Port: 18789
  Uptime: 5s
```

## 测试你的 Bot

现在万事俱备，来测试一下你的 AI 助手吧！

### 发送第一条消息

1. 打开 Telegram，搜索你刚才创建的 bot（用户名）
2. 点击 **Start** 或发送 `/start`
3. 发送一条消息，比如：`你好，介绍一下你自己`

如果一切顺利，你的 bot 应该会回复你！这就是 Claude 通过 OpenClaw Gateway 在响应。

### 查看实时日志

想看到 Gateway 内部发生了什么？打开日志监控：

```bash
openclaw logs --follow
```

这会实时显示所有请求、响应、错误信息，方便调试。

### 使用 Web 控制面板

OpenClaw 还提供了一个很实用的 Web 控制面板。打开浏览器访问：

```
http://localhost:18789
```

在控制面板里，你可以：

- 查看所有对话历史
- 手动测试对话（不需要通过 Telegram）
- 查看系统状态和配置
- 管理多个 Agent

这是最方便的调试工具，强烈推荐试试。

## 常见问题

**Q: Bot 没有回复怎么办？**

检查以下几点：
1. `openclaw gateway status` 确认 Gateway 正在运行
2. `openclaw logs --follow` 查看是否有错误信息
3. 确认 Telegram token 配置正确
4. 确认 Anthropic API Key 有效且有余额

**Q: 想让 Bot 更智能怎么办？**

OpenClaw 支持自定义 Agent 配置，可以给 Agent 添加记忆、工具、自定义 prompt 等。这些高级功能我会在下一篇文章详细介绍。

**Q: 可以同时配置多个 Bot 吗？**

当然可以！在 `channels.telegram.accounts` 数组里添加多个配置即可，每个 bot 可以指定不同的 agent。

## 下一步

恭喜你！现在你已经成功搭建了一个完全由你掌控的 AI 助手。

如果你想进一步探索 OpenClaw 的强大功能，可以关注我接下来的系列文章：

- **多 Agent 配置**：为不同场景创建专用助手（工作、娱乐、学习）
- **工具集成**：让 AI 能执行命令、搜索网页、管理文件
- **记忆系统**：让 AI 记住你的偏好和历史对话

也可以直接查看 [OpenClaw 官方文档](https://openclaw.ai/) 了解更多高级用法。

如果在搭建过程中遇到任何问题，欢迎在评论区留言交流。

---

**相关资源**：
- OpenClaw 官网：https://openclaw.ai/
- GitHub 仓库：https://github.com/openclaw/openclaw
- 官方文档：https://openclaw.ai/docs
- Anthropic API：https://console.anthropic.com/
