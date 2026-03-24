---
author: 陈广亮
pubDatetime: 2026-03-24T09:00:00+08:00
title: Computer-Use：当 AI Agent 不再需要 API
slug: blog098_computer-use-agents
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI
  - Agent
  - Computer-Use
  - 自动化
  - 前端
description: AI Agent 正在学会像人一样操作电脑——看屏幕、点鼠标、敲键盘。从 Anthropic Claude Computer Use 到 Microsoft CUA 再到 OpenAI Operator，Computer-Use 正在重新定义"软件集成"的含义。
---

昨天 Anthropic 官宣了 Claude 的 Computer Use 功能正式进入 macOS：打开 Claude Desktop，让它帮你操作电脑，它会自己打开应用、点击按钮、填写表单、切换窗口。不需要你写任何代码，不需要任何 API 集成。

这不是第一次有人做这件事。OpenAI 的 Operator、Microsoft 的 Computer-Using Agent（CUA）、Perplexity Computer、Manus 的 "My Computer" 都在做类似的事情。但 Claude Computer Use 直接内置到桌面应用里，加上新发布的 Dispatch（用手机远程指挥电脑上的 Claude），把这个方向的体验推到了一个新水平。

这篇文章不是产品评测。我想聊的是一个更根本的问题：**当 AI 学会了"看屏幕、点鼠标"，软件之间的连接方式是不是要变了？**

## 什么是 Computer-Use

Computer-Use 的核心机制是一个感知-推理-行动循环（Perception-Reasoning-Action Loop）：

1. **感知**：截取当前屏幕截图
2. **推理**：分析截图中的 UI 元素（按钮、输入框、菜单），决定下一步操作
3. **行动**：执行操作（移动鼠标、点击、输入文字、运行命令）
4. **重复**：操作完成后再截一张图，根据新状态规划下一步

这个循环持续到任务完成。AI 不是在调用 API，它是在"看"屏幕，像人一样操作软件。

从技术实现上说，Anthropic 提供了三个基础工具：Computer Tool（鼠标键盘控制）、Text Editor（文件操作）、Bash Tool（终端命令）。这三个原语覆盖了人在电脑上做的绝大多数事情。

## 为什么这件事重要

你可能会问：既然有 API，为什么还要用"看屏幕点鼠标"这种笨方法？

答案很简单：**大多数软件没有 API**。

这里说的不是 GitHub、Slack、Notion 这些开发者工具。它们有完善的 REST API，集成起来不难。问题在于企业环境里那些真正重要的系统：

- 运行了 20 年的 ERP 系统，用的还是 Windows Forms
- 银行的核心交易系统，只有 Citrix 远程桌面界面
- 医院的 HIS 系统，只能通过特定客户端操作
- 政府办公系统，只有 IE 兼容的 Web 界面

这些系统承载着关键业务，但它们的设计年代没有考虑过"被其他程序调用"这件事。IT 部门想集成它们，要么花几百万做定制开发，要么用 RPA（机器人流程自动化）写死每一步的坐标和操作——一旦 UI 改版就全部报废。

Computer-Use 改变了这个局面。**GUI 本身变成了集成层**。只要人能操作的软件，AI 就能操作。不需要 API，不需要数据库直连，不需要厂商配合。

## 当前的主要玩家

### Anthropic Claude Computer Use

最早发布（2024 年 10 月公测），也是目前能力最全面的。既能操作浏览器，也能控制桌面应用、终端、文件系统。昨天的更新把它从 API-only 变成了 Claude Desktop 内置功能，Mac 用户直接用。

新增的 Dispatch 功能让你可以从手机给电脑上的 Claude 下指令——"帮我把今天的会议纪要整理成邮件发出去"，然后 Claude 自己在电脑上打开日历、读会议记录、打开邮件客户端、写好发送。

成本：截图是主要开销。根据 Anthropic API 定价估算，一个 50 步的自动化任务大约花 $0.50-$2.00，取决于屏幕分辨率和模型选择。

### OpenAI Operator

2025 年 1 月发布，主要定位是浏览器自动化。在云端运行一个浏览器实例，AI 在里面操作。优势是不需要本地安装任何东西，适合网页端的任务（订餐、填表、搜索信息）。限制是只能操作浏览器，不能控制桌面应用。

### Microsoft Computer-Using Agent（CUA）

2025 年 4 月在 Copilot Studio 里发布，持续迭代中。最大的特点是企业级特性：内置凭据管理（不用把密码暴露给 AI）、操作审计日志（每一步截图 + 动作记录）、Cloud PC 池（自动分配虚拟桌面来跑任务）。

支持多个模型：OpenAI CUA 和 Claude Sonnet 4.5 都可以选。这说明微软自己也认为，Computer-Use 能力不是一家独大，而是会变成一个通用的 AI 能力层。

### 其他玩家

- **Perplexity**：提供云端版 Computer 和基于 Mac Mini 的 Personal Computer 两个方案
- **Manus "My Computer"**：把你的 Mac 变成 AI Agent
- **AskUI**：开源方案，用计算机视觉操作任何应用，支持离线运行
- **CLI-Anything**：另一个思路——不操作 GUI，而是给桌面应用自动生成 CLI 接口，让 Agent 通过结构化命令操作

## Computer-Use vs API vs MCP

现在 AI Agent 连接外部软件有三种主要方式：

### API 集成

传统方式。软件提供 REST/GraphQL API，Agent 通过 function calling 调用。

- **优点**：速度快、可靠、结构化数据
- **缺点**：需要软件提供 API（很多不提供）；需要开发者写集成代码；API 变动要维护

### MCP（Model Context Protocol）

Anthropic 去年提出的协议，正在成为 AI 工具连接的标准。软件提供 MCP Server，Agent 通过标准协议调用。

- **优点**：标准化、工具发现自动化、比裸 API 更适合 AI 场景
- **缺点**：需要软件方适配 MCP（比写 API 简单，但仍需要开发）；目前生态还在早期

### Computer-Use

不需要软件做任何改动。AI 直接看屏幕操作。

- **优点**：对被操作的软件零要求；能处理任何有 GUI 的系统
- **缺点**：慢（截图-分析-操作的循环比 API 调用慢一个数量级）；不够可靠（UI 变化可能导致操作失败）；成本高（每一步都要消耗视觉推理 token）；安全风险（AI 能看到屏幕上的所有内容）

三种方式不是互相替代的关系，而是互补的。实际的 Agent 工作流会混合使用：

```text
有 API 的软件 → 用 API（快、稳、便宜）
有 MCP 的软件 → 用 MCP（标准化、适合 AI）
没有 API 也没有 MCP 的软件 → 用 Computer-Use（最后手段）
```

这像极了 Web 开发中的渐进增强（Progressive Enhancement）：优先用最好的方式，但确保在最差的条件下也能工作。

## 安全问题不能忽视

给 AI 控制你的电脑，安全隐患是显而易见的。

**屏幕信息泄露**：Computer-Use 需要截取屏幕截图发送给 AI 模型。如果你的屏幕上有敏感信息（密码、私钥、客户数据），这些信息会被 AI 服务看到。Anthropic 的做法是在本地处理截图，但 API 模式下截图确实会发送到云端。

**误操作风险**：AI 可能点错按钮、在错误的输入框里输入内容、意外删除文件。目前的 Computer-Use 还不够精确——拖拽、滚动、点击小目标这些操作的失败率比较高。

**权限过大**：一旦给了 AI 桌面控制权限，它理论上可以访问你电脑上的任何东西。Anthropic 强调了"最小权限"原则，但实际执行中很难精确控制。

微软的 CUA 在这方面做得比较认真：凭据加密存储（AI 模型看不到密码明文）、每一步操作都有截图日志和审计记录、支持人工审批节点。企业场景下这些功能不是可选的，是必须的。

对于个人用户，目前的建议是：

1. 不要在包含敏感信息的环境中运行 Computer-Use
2. 使用单独的用户账号或虚拟机来隔离 Agent 操作
3. 重要操作前设置确认节点（让 AI 先告诉你要做什么，你确认后再执行）

## 对开发者意味着什么

如果你是前端或全栈开发者，Computer-Use 趋势有几个值得关注的点：

### 1. UI 的"可读性"变得更重要

当 AI 通过截图理解你的 UI 时，语义化的设计比视觉花哨更重要。清晰的按钮标签、合理的布局层次、一致的交互模式——这些原本是给人看的最佳实践，现在 AI 也需要。

写好 ARIA 标签、用语义化 HTML、保持 UI 一致性——这些做法现在有了额外的收益：让 AI Agent 也能更好地理解和操作你的应用。

### 2. MCP 是更好的 AI 集成方式

如果你在做面向开发者的工具，与其等着别人用 Computer-Use 来"暴力"操作你的 UI，不如主动提供 MCP Server。MCP 集成比 Computer-Use 快 10 倍以上、可靠得多、成本低得多。

Google Stitch 前几天刚发布了 MCP Server，Figma、VS Code、各种数据库都在接入。这个生态在快速成长。

### 3. RPA 行业面临冲击

传统 RPA（UiPath、Automation Anywhere）的核心卖点是"自动化没有 API 的软件"。Computer-Use 做的是同样的事，但不需要硬编码每一步的坐标和操作，而是用 AI 理解 UI 语义后自适应操作。UI 改版了？Computer-Use 自己看新界面重新理解，不需要人工维护脚本。

这不是说 RPA 马上消失——企业有大量已经部署的 RPA 流程，迁移需要时间。但对于新的自动化项目，Computer-Use 的灵活性优势很明显。

## 现在的局限

说了这么多好处，也要客观看问题：

**速度**：截图-分析-操作的循环天生比 API 调用慢。一个 API 调用毫秒级完成的事情，Computer-Use 可能需要几十秒。

**可靠性**：AI 有时候会"看错"——把一个按钮认成另一个，在错误的位置点击，或者面对弹窗不知道怎么处理。复杂任务可能需要多次重试。

**成本**：每一步截图都要消耗视觉推理 token。长流程下来费用不低。

**分辨率依赖**：屏幕分辨率越高，截图越大，token 消耗越多，但 AI 看小元素反而更困难。

这些问题都在快速改善。Anthropic 收购了 Vercept（专做视觉感知的公司）来强化底层能力，Microsoft 在用 Cloud PC 解决基础设施问题，各家都在优化截图压缩和 UI 元素识别算法。

## 结论

Computer-Use 不是 API 的替代品，而是 API 的补充。它填补了一个长期存在的空白：**如何让 AI 操作那些没有编程接口的软件**。

短期来看，它最大的价值在企业场景——用 AI 打通那些用了十几年但没有 API 的老系统。长期来看，它可能改变我们对"软件集成"的理解：未来的 Agent 不需要每个软件都提供 API，它自己看着屏幕就能用。

对于开发者，当下最务实的做法是：

1. 核心集成用 API/MCP（快、稳、便宜）
2. 长尾需求用 Computer-Use 兜底（慢但灵活）
3. 给自己的产品提供 MCP Server，让 AI 集成走正道而不是暴力操作 UI

AI Agent 的交互方式正在从"调用 API"扩展到"像人一样使用软件"。这不是取代，是进化。

---

**相关阅读**：
- [AI Agent 开发者工具全景 2026](https://chenguangliang.com/posts/ai-agent-tools-landscape-2026/) - 更宏观的 AI Agent 工具生态分析
