---
author: 陈广亮
pubDatetime: 2026-02-13T00:45:00+08:00
title: OpenClaw 多 Agent 配置实战：踩坑指南与最佳实践
slug: openclaw-multi-agent-guide
featured: true
draft: false
tags:
  - OpenClaw
  - AI
  - 配置
description: 配置 OpenClaw 多 Agent 和 Telegram 多账号有不少坑。本文基于实战经验，总结所有常见问题和解决方案，让你少走弯路。
---

如果你已经用了一段时间 OpenClaw，肯定会遇到这样的需求：我需要一个专门写博客的 AI 助手，一个写小说的，一个做代码开发的……每个都有独立的角色定位、工作目录和配置。这就是多 Agent 配置要解决的问题。

本文不是理论教程，而是实战踩坑记录。我会告诉你配置过程中会遇到哪些坑，为什么会踩坑，以及怎么避免和解决。

## 为什么需要多 Agent

**场景隔离**。不同的工作场景需要不同的 AI 助手：

- **博客助手**：专注于技术写作，熟悉你的博客部署流程，有独立的文章草稿目录
- **小说助手**：创意写作风格，管理小说章节和人物设定，不需要访问技术代码
- **开发助手**：熟悉代码规范，可以执行敏感命令，但不应该访问私人笔记
- **家庭助手**：绑定到家庭 WhatsApp 群，只能访问受限的工具集，保护隐私

**独立配置**。每个 Agent 有自己的：
- **Workspace**：独立的工作目录，互不干扰
- **SOUL.md**：独立的角色定位和性格设定
- **Model**：可以给不同 Agent 配置不同模型（Opus 做深度思考，Sonnet 做日常聊天）
- **Tool Policy**：限制某些 Agent 的工具权限（比如家庭助手不能执行 shell 命令）

**账号路由**。多个 Telegram bot 或 WhatsApp 账号，路由到不同的 Agent，一个 Gateway 管理所有账号。

我的实践：配置了 4 个 Agent：
- `main`：日常聊天，全功能
- `blog`：技术博客写作
- `novel`：小说创作
- `tools`：工具开发和实验

## 多 Agent 配置流程

### 1. 创建 Agent

```bash
# 创建一个新 Agent
openclaw agents add blog --workspace ~/.openclaw/workspace-blog

# 验证创建结果
openclaw agents list
```

这会在配置文件中添加：

```json5
{
  agents: {
    list: [
      {
        id: "main",
        default: true,
        workspace: "~/.openclaw/workspace",
      },
      {
        id: "blog",
        workspace: "~/.openclaw/workspace-blog",
      },
    ],
  },
}
```

### 2. 设置模型

**⚠️ 第一个坑：模型 ID 格式**

配置模型时，要用**别名**，不要带日期后缀！

```bash
# ✅ 正确：使用别名
openclaw config patch agents.list.1.model "anthropic/claude-sonnet-4-5"

# ❌ 错误：带日期后缀的完整 ID
openclaw config patch agents.list.1.model "anthropic/claude-sonnet-4-20250514"
```

**为什么？**

带日期的 ID 会在新版本发布时失效。别名（如 `claude-sonnet-4-5`）会自动指向最新版本。

验证配置：

```bash
openclaw config get agents.list.1.model
# 应该输出：anthropic/claude-sonnet-4-5
```

### 3. 编写 SOUL.md 定义角色

每个 Agent 的 workspace 下创建 `SOUL.md`，定义它的角色：

```bash
cd ~/.openclaw/workspace-blog
```

创建 `SOUL.md`：

```markdown
# SOUL.md - 博客写手

你是技术博客写手，为 chenguangliang.com 撰写文章。

## 角色定位
- 专注于技术写作，风格简洁实用
- 熟悉 Astro 博客框架和部署流程
- 所有文章需要通过审核才能发布

## 工作流程
1. 根据需求撰写文章草稿
2. 保存到 src/data/blog/ 目录
3. 提交给主人审核
4. 审核通过后部署到生产环境

## 写作规范
- 避免 AI 痕迹（"随着""标志着""见证了"等）
- 代码示例要完整可用
- 标题层级清晰，使用中文标点
```

**⚠️ 第二个坑：不要创建 BOOTSTRAP.md**

如果你手动创建了 `BOOTSTRAP.md`，Agent 会一直卡在 bootstrapping 状态！

**为什么？**

`BOOTSTRAP.md` 是 Agent 的"初始化任务清单"。Agent 启动后会执行里面的指令，执行完才会删除这个文件。如果你手动创建了这个文件但内容不完整，Agent 会不断尝试执行，永远无法进入正常状态。

**解决方法：**

```bash
# 如果发现 Agent 卡住了，检查是否有 BOOTSTRAP.md
ls ~/.openclaw/workspace-blog/BOOTSTRAP.md

# 如果存在，直接删除
rm ~/.openclaw/workspace-blog/BOOTSTRAP.md

# 重启 Gateway
openclaw gateway restart
```

### 4. 测试 Agent

```bash
# 列出所有 Agent
openclaw agents list

# 查看 Agent 详细配置
openclaw config get agents.list.1

# 重启 Gateway 让配置生效
openclaw gateway restart
```

## Telegram 多账号配置

多 Agent 的典型用法是配置多个 Telegram bot，每个 bot 路由到不同的 Agent。

### 1. 创建 Telegram Bot

在 Telegram 找 [@BotFather](https://t.me/BotFather)，创建 bot：

```
/newbot
```

按提示输入名称和用户名，获得 token（类似 `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`）。

假设你创建了两个 bot：
- `@MyMainBot` → token1
- `@GeraldBlogBot` → token2

### 2. 配置多账号

编辑 `~/.openclaw/openclaw.json`（或用 `openclaw config patch`）：

```json5
{
  channels: {
    telegram: {
      accounts: {
        main: {
          token: "token1",
          dmPolicy: "allowlist",
          allowFrom: ["768429799"], // 你的 Telegram user ID
        },
        blog: {
          token: "token2",
          dmPolicy: "allowlist",
          allowFrom: ["768429799"],
        },
      },
    },
  },
}
```

**⚠️ 第三个坑：dmPolicy 默认值**

如果不设置 `dmPolicy`，默认是 `pairing`，这意味着用户必须先执行 `/pair` 命令才能聊天。但如果配置有问题，`/pair` 可能也不会响应，消息会被**静默丢弃**！

**解决方法：**

明确设置 `dmPolicy: "allowlist"`，并配置 `allowFrom` 列表：

```json5
{
  dmPolicy: "allowlist",
  allowFrom: ["768429799", "1638777420"], // 允许的 user ID 列表
}
```

获取你的 Telegram user ID：给 [@userinfobot](https://t.me/userinfobot) 发消息。

### 3. 配置路由规则

添加 `bindings` 将不同的 Telegram 账号路由到不同的 Agent：

```json5
{
  bindings: [
    {
      agentId: "main",
      match: { channel: "telegram", accountId: "main" },
    },
    {
      agentId: "blog",
      match: { channel: "telegram", accountId: "blog" },
    },
  ],
}
```

**路由规则优先级**：
1. `peer` 精确匹配（具体的 DM 或群组 ID）
2. `accountId` 匹配（哪个 Telegram 账号）
3. `channel` 匹配（哪个平台）
4. 默认 Agent（`default: true` 或列表中第一个）

### 4. 重启 Gateway

```bash
openclaw gateway restart --reason "添加新 Telegram bot"
```

测试：给两个 bot 发 `/start`，应该分别收到来自不同 Agent 的回复。

## 常见问题与解决

### 问题 1：config.patch 把配置冲掉了

**现象：**

我想给 `telegram.accounts` 添加一个新账号，执行：

```bash
openclaw config patch channels.telegram.accounts.blog '{"token":"xxx"}'
```

结果其他账号的配置全没了！

**原因：**

`config.patch` 对**嵌套对象**是**整体替换**，不是增量修改！

如果配置是：

```json5
{
  channels: {
    telegram: {
      accounts: {
        main: {...},
        novel: {...},
      },
    },
  },
}
```

执行 `patch channels.telegram.accounts.blog {...}` 会导致：

```json5
{
  channels: {
    telegram: {
      accounts: {
        blog: {...}, // 只剩这一个！
      },
    },
  },
}
```

**解决方法：**

patch 时带上**完整的对象**：

```bash
# ❌ 错误：只 patch 一个子项
openclaw config patch channels.telegram.accounts.blog '{"token":"xxx"}'

# ✅ 正确：patch 整个 accounts 对象
openclaw config patch channels.telegram.accounts '{
  "main": {"token":"token1", "dmPolicy":"allowlist", "allowFrom":["768429799"]},
  "blog": {"token":"token2", "dmPolicy":"allowlist", "allowFrom":["768429799"]}
}'
```

同样适用于 `bindings`、`agents.list` 等数组或对象。

**最佳实践：**

配置变更前，先导出当前配置：

```bash
# 导出当前配置
openclaw config get channels.telegram.accounts > telegram-accounts-backup.json

# 编辑后再 patch 回去
openclaw config patch channels.telegram.accounts "$(cat telegram-accounts-edited.json)"
```

### 问题 2：Telegram bot 不响应消息

**现象：**

给 bot 发 `/start` 或任何消息，都没有回复。

**可能的原因 1：dmPolicy 配置问题**

检查配置：

```bash
openclaw config get channels.telegram.accounts.blog.dmPolicy
```

如果是 `pairing` 或未设置，改成 `allowlist`：

```bash
openclaw config patch channels.telegram.accounts.blog.dmPolicy '"allowlist"'
openclaw config patch channels.telegram.accounts.blog.allowFrom '["768429799"]'
openclaw gateway restart
```

**可能的原因 2：Telegram 409 冲突**

**症状：** 日志中有 `getUpdates conflict (409)` 错误。

**原因：** 同一个 bot token 被多个实例同时使用！常见场景：
- OpenClaw.app (GUI) 和 CLI gateway 同时运行
- 两个 terminal 同时启动了 gateway

**检查：**

```bash
ps aux | grep -i openclaw
```

如果看到多个进程（GUI app 和 CLI gateway），说明冲突了。

**解决方法：**

1. 退出 OpenClaw.app (GUI)
2. 重启 CLI gateway：

```bash
openclaw gateway restart --reason "清除 Telegram bot 冲突"
```

**教训：**

同一个 Telegram bot token **只能被一个 Gateway 实例使用**。如果要切换 GUI/CLI，必须先停掉其中一个。

### 问题 3：绑定规则不生效

**现象：**

配置了 `bindings`，但消息还是路由到了错误的 Agent。

**检查绑定：**

```bash
openclaw agents list --bindings
```

**常见错误：**

1. **顺序错误**：更具体的规则要放在前面

```json5
// ❌ 错误：通配规则在前，精确规则在后
bindings: [
  { agentId: "main", match: { channel: "telegram" } }, // 会匹配所有 telegram 消息
  { agentId: "blog", match: { channel: "telegram", accountId: "blog" } }, // 永远不会执行
]

// ✅ 正确：精确规则在前
bindings: [
  { agentId: "blog", match: { channel: "telegram", accountId: "blog" } },
  { agentId: "main", match: { channel: "telegram", accountId: "main" } },
]
```

2. **accountId 拼写错误**：检查是否与 `channels.telegram.accounts` 中的 key 一致

```bash
# 列出所有配置的账号
openclaw config get channels.telegram.accounts | jq 'keys'
```

### 问题 4：Agent 配置变更后不生效

**解决方法：**

Gateway 需要重启才能加载新配置：

```bash
openclaw gateway restart --reason "更新 Agent 配置"
```

检查 Agent 是否正常启动：

```bash
openclaw status --deep
```

如果看到某个 Agent 状态异常，查看日志：

```bash
tail -n 100 ~/.openclaw/gateway.err.log
```

### 问题 5：配置了嵌套对象，但只有部分生效

**现象：**

我在顶层配置了 `channels.telegram.dmPolicy`，为什么某个账号还是用了不同的策略？

**原因：**

配置有**继承关系**，account 级别的配置会**覆盖**顶层配置：

```json5
{
  channels: {
    telegram: {
      dmPolicy: "allowlist", // 顶层默认
      allowFrom: ["768429799"],
      accounts: {
        main: {
          token: "token1",
          // 继承顶层的 dmPolicy 和 allowFrom
        },
        public: {
          token: "token2",
          dmPolicy: "pairing", // 覆盖顶层配置
        },
      },
    },
  },
}
```

**最佳实践：**

- 如果所有账号都用相同策略，配置在顶层
- 如果某个账号需要不同策略，在 account 级别覆盖
- 明确写出每个 account 的 `dmPolicy`，避免继承混淆

## 最佳实践

### 1. 配置变更前先审查

**教训：** 我曾因为没仔细审查 patch 命令，把所有 Telegram 账号配置冲掉，导致所有 bot 连接中断。

**规则：**
- 任何 `config.patch`、`gateway restart`、模型变更等操作，**先审查一遍**
- 嵌套对象（`bindings`、`accounts`）必须带完整列表
- 有疑问先导出当前配置对比

```bash
# 变更前备份
openclaw config get > openclaw-config-backup.json

# 变更后对比
openclaw config get > openclaw-config-new.json
diff openclaw-config-backup.json openclaw-config-new.json
```

### 2. 使用 status --deep 诊断

```bash
openclaw status --deep
```

输出包括：
- 每个 Agent 的状态
- Channel 连接状态
- 最近的错误日志

如果某个 Agent 或 Channel 异常，会直接显示。

### 3. 查看错误日志

```bash
# 实时查看日志
tail -f ~/.openclaw/gateway.err.log

# 搜索特定错误
grep -i "error\|conflict\|fail" ~/.openclaw/gateway.err.log | tail -n 50
```

常见错误关键词：
- `409 conflict`：Telegram bot 冲突
- `unauthorized`：token 错误或过期
- `dmPolicy`：消息被访问控制策略拦截
- `binding`：路由规则问题

### 4. 分阶段配置

不要一次性配置所有 Agent 和 Channel，容易出错且难以排查。

**推荐流程：**

1. 先配置一个新 Agent（不配置 Telegram），本地测试
2. Agent 正常后，添加一个 Telegram bot，测试路由
3. 验证通过后，再添加其他 Agent 和 bot
4. 每次变更后，验证所有已有功能正常

### 5. 文档化你的配置

在 workspace 下创建 `SETUP.md`，记录：
- 每个 Agent 的用途和配置
- Telegram bot 对应关系
- 特殊配置的原因

```markdown
# SETUP.md

## Agents
- main: 日常聊天，全功能，Telegram @MyMainBot
- blog: 技术写作，workspace-blog，Telegram @GeraldBlogBot
- novel: 小说创作，workspace-novel，仅本地使用

## Telegram Bots
- @MyMainBot (768429799): main agent
- @GeraldBlogBot (1638777420): blog agent

## 特殊配置
- blog agent 的 dmPolicy 设为 allowlist，只允许我自己访问
- main agent 启用了 heartbeat，每 30 分钟检查一次日程
```

## 总结

OpenClaw 多 Agent 配置不复杂，但有几个容易踩的坑：

1. **config.patch 陷阱**：嵌套对象是整体替换，不是增量修改
2. **模型 ID**：用别名（`claude-sonnet-4-5`），不要带日期
3. **BOOTSTRAP.md**：不要手动创建，会导致 Agent 卡住
4. **dmPolicy**：默认是 `pairing`，建议改成 `allowlist`
5. **Telegram 409**：同一个 bot token 只能被一个 Gateway 使用
6. **配置继承**：account 级别配置会覆盖顶层配置

**核心原则：**
- 配置前先备份
- 变更后先验证
- 出问题先看日志
- 分阶段逐步配置

希望这篇文章能帮你少走弯路。如果还有其他问题，欢迎在评论区讨论！
