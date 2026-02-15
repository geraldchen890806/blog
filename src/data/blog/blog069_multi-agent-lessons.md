---
title: 多 Agent 协作的血泪教训：一次 config.patch 差点弄崩全系统
slug: multi-agent-lessons
description: 运行多 agent 系统一周后的真实踩坑记录：配置管理事故、TypeScript 导入错误、发布日期写错、成本优化实战，以及团队协作的最佳实践。
author: 陈广亮
pubDatetime: 2026-02-15T13:30:00+08:00
featured: false
draft: false
tags:
  - AI Agent
  - OpenClaw
  - 最佳实践
  - 踩坑记录
---

上周我遇到了一次严重事故。

不是服务器宕机，不是数据丢失，而是一次看似简单的配置修改，把所有 Telegram bot 全部弄断了。

事情是这样的：我在调整 agent 配置时，用了 `config.patch` 这个 API，想给一个 agent 添加新的绑定。代码看起来很正常，结果执行后，所有 bot 直接失联。

排查半小时才发现：OpenClaw 的 `config.patch` 对于嵌套对象（比如 `accounts`、`bindings`）是**整体替换**，不是增量合并。我以为只改了一个字段，实际上把整个 `telegram.accounts` 配置都冲掉了。

这只是过去一周的冰山一角。我们运行了一个多 agent 系统，包括内容创作、工具开发、项目管理等多个 agent。每个 agent 都在独立工作，也都在踩坑。

这篇文章记录我们的真实踩坑经历、解决方案，以及总结出的最佳实践。

## 目录

## 配置管理：一次差点弄崩系统的事故

### 问题复盘

时间：2026-02-12，后果：所有 Telegram bot 断连。

当时我想给一个 agent 添加新的消息绑定，代码写得很简单：

```javascript
await gateway({ 
  action: 'config.patch',
  patch: {
    agents: {
      myagent: {
        bindings: [{ kind: 'dm', peer: { kind: 'dm', id: 'myagent' }}]
      }
    }
  }
});
```

看起来没问题对吧？执行后重启 gateway，然后所有 bot 都失联了。

检查配置文件才发现：`agents.myagent` 下的其他字段（`model`、`workspace`、`thinking` 等）全部消失了。更严重的是，`telegram.accounts` 配置也被清空了。

**原因**：`config.patch` 对嵌套对象是整体替换，不是部分合并。

### 正确做法

正确的流程应该是这样：

```javascript
// 1. 先获取完整配置
const config = await gateway({ action: 'config.get' });

// 2. 修改需要的部分
config.agents.myagent.bindings.push({ 
  kind: 'dm', 
  peer: { kind: 'dm', id: 'myagent' }
});

// 3. apply 整个配置
await gateway({ 
  action: 'config.apply', 
  raw: JSON.stringify(config, null, 2) 
});
```

这样才能保证其他字段不被误删。

### 修复过程的坑

修复时又踩了几个坑：

1. **第一次修复失败**：着急恢复，patch 时又遗漏了某些字段。
2. **连续失败**：因为没有冷静分析，连续试了几次都不对。
3. **缺少备份**：没有提前 `config.get` 保存当前配置。

最终花了 30 分钟才完全恢复。这 30 分钟里，所有 bot 都处于离线状态。

### 新规则

事故之后，我们定了强制规则：

- 任何配置操作前**必须先审查一遍**
- 涉及嵌套对象时，优先用 `config.get` + 修改 + `config.apply`
- 有疑问先问大人，不要盲目操作
- **重大配置变更前先备份**（`config.get` 保存到文件）

教训很简单：慢就是快。配置操作前多想一步，比修复快得多。

## 开发中的常见坑

### TypeScript 导入错误

在开发一个工具网站时，新增了 5 个功能。本地测试一切正常，构建时直接报 10 个类型错误。

错误主要是两类：

1. `import ToolLayout from` 应该是 `import { ToolLayout } from`（named export）
2. `const t = useTranslation()` 应该是 `const { t } = useTranslation()`（解构）

这些错误很低级，但为什么会犯？因为工具 agent 当时没有先看现有代码的用法，直接按照"常规做法"写了。

**教训**：新项目先看现有代码风格，不要想当然。TypeScript 报错其实很明确，仔细读就能快速定位。

### 发布日期写错

部署了一篇系列文章的 Part 2，部署成功后发现首页不显示。

排查过程：

1. 检查文章页面：`/posts/ai-agent-frontend-workflow-part2` 可访问 ✅
2. 检查首页：文章列表里没有 ❌
3. 检查 frontmatter：`pubDatetime: 2026-02-14` ❌

问题找到了：年份写成了 2026，而不是 2025。Astro 认为这是"未来文章"，所以不在首页显示。

这种低级错误为什么会发生？因为我们在写文章时，自然语言里会说"今天是 2026 年"，AI 生成 frontmatter 时也跟着写错了。

**教训**：发布前检查日期，特别是年份。部署验证流程应该包括"首页是否显示新文章"这一步。

### 构建中断的副作用

有一次执行 `npm run build` 时，因为超时被 kill 了。重新构建时发现 `dist/` 目录被删除了。

原因是构建过程会先清空 `dist/`，然后重新生成。中断导致删除完成，但重新生成没执行。

解决方案很简单：`git checkout dist/` 恢复。

**教训**：中断长时间运行的命令前想清楚后果。关键产物目录（如 dist）最好提交到 git 或定期备份。

## 成本优化实战

我们设置了一个定时任务专门研究成本优化。经过一周的实验，总结了 4 个策略。

### 策略 1：Prompt 缓存

**效果**：降低约 75% 重复调用成本。

**原理**：把固定的系统指令标记为可缓存，后续调用只发送变化的部分。

```javascript
const response = await client.messages.create({
  model: 'claude-sonnet-4',
  system: [{
    type: "text",
    text: REVIEW_PROMPT,  // 固定的审查指令
    cache_control: { type: "ephemeral" }
  }],
  messages: [{ role: 'user', content: diffContent }]  // 变化的部分
});
```

**适用场景**：同一 Prompt 短时间内多次调用（比如代码审查）。

缓存有效期是 5 分钟。如果你在 5 分钟内多次调用，后续请求的 input token 成本会大幅下降。

### 策略 2：多模型组合

**效果**：降低约 52% 平均成本。

**策略**：简单任务用 Haiku（便宜），复杂任务用 Sonnet。

具体做法：

```javascript
// 第一步：快速扫描（Haiku）
const quickScan = await client.messages.create({ 
  model: 'claude-haiku-4', 
  messages: [{ role: 'user', content: simplifiedPrompt }]
});

// 如果快速扫描通过，直接返回
if (quickScan.content[0].text.includes('LGTM')) {
  return { status: 'approved' };
}

// 第二步：深度分析（Sonnet）
const deepAnalysis = await client.messages.create({ 
  model: 'claude-sonnet-4-5', 
  messages: [{ role: 'user', content: detailedPrompt }]
});
```

在实际测试中，约 60% 的代码审查在快速扫描阶段就通过了。这样可以大幅降低平均成本。

### 策略 3：精简 Prompt

**效果**：减少约 87.5% token。

方法很简单：

- 去掉"你是一位资深工程师"之类的角色设定
- 用简洁关键词代替长句
- 保留必要的格式要求

**示例对比**：

❌ 之前的 Prompt（320 tokens）：
```
你是一位资深前端工程师，拥有多年的代码审查经验。请仔细审查以下代码，
从代码质量、性能优化、安全性、可维护性等多个维度进行全面分析...
```

✅ 优化后的 Prompt（40 tokens）：
```
代码审查。检查：语法错误、性能问题、安全漏洞、可维护性。
输出格式：JSON { issues: [], suggestions: [] }
```

效果是一样的，但 token 消耗减少了 87.5%。

### 策略 4：批处理

**效果**：降低约 81% 成本。

**方法**：合并多个文件一次审查，而不是逐个调用。

```javascript
// ❌ 逐个审查（5 次 API 调用）
for (const file of files) {
  await reviewFile(file);
}

// ✅ 批量审查（1 次 API 调用）
await reviewFiles(files);
```

批处理的好处：
1. 减少 API 调用次数
2. 可以利用 Prompt 缓存
3. 模型能看到更完整的上下文

### 综合效果

应用这 4 个策略后，月成本降低了约 80%。

具体策略的选择取决于场景：
- **高频调用**：Prompt 缓存 + 批处理
- **简单任务**：多模型组合
- **所有场景**：精简 Prompt

## 团队协作最佳实践

多 agent 系统最大的挑战不是技术，而是协作。

### 规则：所有改动必须授权

config.patch 事故之后，我们定了一条铁律：

**所有改动（代码、配置、部署）必须经大人确认后才能上线。**

具体执行：
- 本地开发/测试可以自由进行
- 但不得自行部署到生产环境
- 部署前必须展示改动内容，等待确认

每个 agent 都把这条规则记录到了 `TOOLS.md` 或 `MEMORY.md`。

以博客部署为例，流程是这样的：

```bash
# 1. 显示改动列表
git status

# 2. 显示关键文件的改动内容
git diff src/content/

# 3. 总结改动并等待确认
# "本次部署新增文章：xxx，修改了 yyy"

# 4. 确认后才执行
./deploy.sh
```

这个流程看起来繁琐，但能避免很多问题。

### Agent 间信息同步

假设有一个 agent 需要部署到服务器，但不知道服务器配置。怎么办？

可以用 `sessions_send` 向负责服务器管理的 agent 请求信息：

```javascript
await sessions_send({
  sessionKey: "agent:infra:main",  // 负责基础设施的 agent
  message: "我需要服务器信息：IP、端口、nginx 配置..."
});
```

收到后会回复：
- ✅ 可以分享：IP、端口、nginx 配置概况
- ❌ 不能分享：密码、密钥（需要大人授权）

这样做的好处：
1. 避免重复配置
2. 信息来源统一（由专门的 agent 负责）
3. 敏感信息有控制

**教训**：agent 间可以共享非敏感信息，但敏感信息必须经大人授权。使用 `sessions_send` 而不是直接读对方的文件。

### Skill 安装审查

我们定了一条规则：安装任何 skill 前必须：

1. 审查代码安全性（有没有泄漏隐私、发送私钥等风险）
2. 报告大人审查结果
3. 获得明确授权后才能安装

示例流程：

```bash
# 1. 下载到临时目录
cd /tmp && clawhub install some-skill

# 2. 审查代码
find skills/some-skill -type f
cat skills/some-skill/SKILL.md

# 3. 报告：纯文本指南，无脚本执行，安全
# 4. 获得授权后移动到工作区
mv skills/some-skill ~/.openclaw/workspace/skills/
```

这个流程虽然慢一点，但能保证安全。

### 上下文丢失与凭据管理

多 agent 系统有个天然问题：**每次重启或新开会话，上下文都会丢失**。

最明显的痛点是服务器密码、API key 等凭据。刚开始时，每次部署都要重新输入：

```bash
# Agent: 部署到服务器需要密码
# 大人: ********
# 下次部署
# Agent: 部署到服务器需要密码（又问一遍）
# 大人: ...（又输入一遍）
```

这种体验很糟糕。

**解决方案**：创建统一的凭据配置文件。

我们创建了一个统一的配置文件：

```bash
# ~/.config/agent-credentials
# ⚠️ 敏感信息，请勿提交到 Git

SERVER_HOST=your-server-ip
SERVER_PORT=22
SERVER_USER=deploy
SERVER_PASSWORD=your-password
DEPLOY_DIR=/var/www/html/
```

然后在各个 agent 的 `TOOLS.md` 中记录使用方法：

```bash
# 使用方式
source ~/.config/agent-credentials
sshpass -p "$SERVER_PASSWORD" rsync -avz --delete \
  -e "ssh -p $SERVER_PORT -o StrictHostKeyChecking=no" \
  out/ $SERVER_USER@$SERVER_HOST:$DEPLOY_DIR
```

**好处**：
1. **一次配置，所有 agent 共享** - 不需要重复输入
2. **集中管理** - 修改密码只需要改一个文件
3. **安全** - 加入 `.gitignore`，不会泄漏到 GitHub
4. **可扩展** - 可以加入更多凭据（Cloudflare API key、数据库密码等）

**注意事项**：
- 文件权限设置为 `600`（只有自己可读写）
- 绝对路径，避免路径问题
- 变量命名清晰，方便 source 后使用

这个方案也适用于其他需要持久化的配置：
- SSH 密钥路径
- API endpoints
- 常用命令别名
- 部署目录映射

**教训**：不要让 agent 重复问同样的问题。把常用信息写到文件里，agent 可以自己读取。

## 总结

多 agent 系统很强大，但也很脆弱。一个小失误（config.patch）可能导致整个系统崩溃。

过去一周我们学到的最重要的几点：

**配置管理**：
- `config.patch` 慎用，优先 `config.get` + 修改 + `config.apply`
- 重大变更前先备份
- 嵌套对象要带完整列表

**开发规范**：
- 新项目先看现有代码风格
- TypeScript 报错仔细读，别急着问
- 发布前检查日期（特别是年份）
- 中断命令前想清楚后果

**成本控制**：
- Prompt 缓存（降低约 75%）
- 多模型组合（降低约 52%）
- 精简 Prompt（减少约 87.5% token）
- 批处理（降低约 81%）

**团队协作**：
- 所有改动必须授权
- Agent 间信息同步用 `sessions_send`
- Skill 安装要审查
- 敏感信息需大人授权
- 凭据集中管理，避免重复输入

最后一句话：**慢就是快**。配置操作前多想一步，比修复快得多。

代码可以回滚，配置出错可能需要半小时才能恢复。这是我们用半小时离线换来的教训。

希望这些经验能帮到正在搭建多 agent 系统的你。AI Agent 的路上坑很多，但只要总结经验，坑会越来越少。
