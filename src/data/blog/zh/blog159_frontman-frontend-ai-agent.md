---
author: 陈广亮
pubDatetime: 2026-05-01T16:00:00+08:00
title: Frontman 拆解：当 AI Agent 从浏览器看你的代码，配合前端 Skills 能做什么
slug: blog159_frontman-frontend-ai-agent
featured: true
draft: false
reviewed: true
approved: true
tags:
  - 前端
  - AI Agent
  - Claude Code
  - 开发效率
description: Cursor、Claude Code 都从源码出发，但前端工程师的真实工作发生在浏览器——hover 后的实际颜色、SSR 后的真实 DOM、第 3 个 useState 触发的 re-render。Frontman 反方向工作：从浏览器看代码。本文拆解它的架构，并组合 Anthropic frontend-design 等 Skill 形成完整前端 AI 工作流。
---

主流 AI 编程工具——Cursor、Claude Code、Copilot——有一个共同假设：从源码出发，模型读 JSX/CSS 文件、改源码、给你个 diff。但前端工程师真正调试的，是浏览器里那个东西：hover 状态下 button 实际算出来的颜色、Tailwind 那一长串 class 实际叠成什么、Server Component 在客户端最终渲染成什么 DOM。源码到渲染态之间的损耗，是当前 AI 前端工具最大的空白。

`frontman-ai/frontman` 这两周冲上 GitHub Trending，⭐ 接近 400，定位很直接：**从浏览器开始反向工作到源码**。这篇文章拆它的架构思路，再讲怎么把它和 Anthropic 官方 frontend-design Skill、React 组合模式 Skill、可访问性审计 Skill 配合起来，形成一套完整的前端 AI 工作流。

## 现有工具的盲区

设计师在 Figma 上画好一个按钮：圆角 8px、悬停时背景从 `#3B82F6` 渐变到 `#2563EB`。前端实现完，设计师看了说"圆角看起来更小、悬停色不太对"。

放进 Cursor 解决这个问题，流程通常是：

1. 你截一张图给 Cursor
2. Cursor 找到对应组件文件
3. 它读 className 列表，看到 `rounded-lg hover:bg-blue-600`
4. 它告诉你 `rounded-lg` 是 8px，`hover:bg-blue-600` 是 `#2563EB`，跟设计稿一致
5. 你回去和设计师吵：是不是设计师视觉差异，圆角和颜色明明对的

但实际：

- 这个组件外层有 `Card` 包了一层 `rounded-xl`（12px），内层 button 实际看上去因为父容器的 overflow-hidden 和 box-shadow 显得圆角不一致
- `hover:bg-blue-600` 被一个 `bg-gradient-to-r` 父规则在某些浏览器下覆盖
- Tailwind 的 `bg-blue-600` 在 dark mode 下被 `dark:bg-blue-700` 覆盖，但你测试时的浏览器是 light mode

**所有这些信息都不在源码里**，只存在于浏览器的实际渲染态。Cursor 只读源码，所以它永远只能告诉你"代码上是对的"。

这就是 Frontman 切入的地方。

## Frontman 的架构

Frontman 把自己注入到开发服务器的 middleware 里，提供一个 `/frontman` 路由作为浏览器内 overlay。开发模式下你既能看到正在调的页面，也能看到 Frontman 的工具面板。

它给 AI Agent 提供的能力——也就是 Cursor 看不到的那些——核心几项：

1. **运行态 DOM 树**：不是源码里的 JSX 树，是 React/Vue 渲染、hydration 之后的最终 DOM
2. **computed CSS values**：每个元素实际生效的样式（已经做完层叠和继承），不是 className 字符串
3. **组件树 ↔ DOM 节点映射**：通过 source map 反推哪个 JSX 文件的哪一行渲染了这个 DOM 节点
4. **服务器日志和路由信息**：哪个请求的渲染输出对应这个页面
5. **截图和热更新**：改完源码立刻预览，AI 能"看见"它的修改效果

工作流大致是：

```text
你 → 在浏览器点中那个按钮 →
描述 "圆角再大一点，悬停时颜色更深" →
Frontman 把【DOM 节点 + computed CSS + 源码位置】打包给 AI →
AI 改源码 → 热更新生效 → 你直接看到结果
```

注意第三步是关键：AI 不是收到一段"圆角再大一点"的模糊描述，而是收到带着精确上下文的请求："`<button class='rounded-lg hover:bg-blue-600'>` 在 `src/components/ui/Button.tsx:42`，computed border-radius 是 8px，hover background 是 rgb(37, 99, 235)，需要：增大圆角，加深 hover 颜色。"

## 它和 Cursor / Claude Code 不冲突

容易误读的一点：Frontman 不是要替代 Cursor。它**作为 OpenClaw Skill 安装**，给现有 Agent 加一项"看浏览器"的能力。

实际工作流变成混搭：

- 写新功能、重构后端逻辑：继续用 Cursor / Claude Code（源码视角更高效）
- 调样式、对设计稿、写 UI 微调：切到 Frontman（运行态视角更准）
- 排查 hydration 错误、Server Component 边界问题：用 Frontman 看实际 DOM 和服务端日志

支持的框架范围已经覆盖大多数现代前端栈：Next.js（App Router + Pages Router、Turbopack）、Astro（Islands、Content Collections、SSR/Hybrid）、所有 Vite 项目（React、Vue、Svelte、SvelteKit）。

## BYOK 和 license 设计

Frontman 是 BYOK（Bring Your Own Keys）模型：你接入自己的 Anthropic / OpenAI / OpenRouter API key，Frontman 不收订阅费、不限调用量。这是它和 Cursor、v0 这种付费产品最直接的差别。

License 用了双层结构：

| 部分 | License | 含义 |
|---|---|---|
| 客户端库 | Apache 2.0 | 宽松开源，可商用、可修改 |
| 服务端 | AGPL-3.0 | Copyleft，二次开发后必须开源 |

**生产构建会完全剥离 Frontman**——开发依赖中加了它，部署 bundle 跟没加一样。这是必要的安全设计：Frontman 在浏览器暴露源码访问能力，不能进生产环境。

## 与 Anthropic frontend-design Skill 的配合

Anthropic 官方 frontend-design Skill 是目前装机量最大的前端 Skill，3 月已破 27 万次安装。它的定位和 Frontman 完全互补：

- **frontend-design**：先给 AI 一个设计哲学（鲜明的色彩、刻意的字体、有目的的动效），让生成的 UI 不再千篇一律
- **Frontman**：给 AI 看真实渲染结果，避免源码改完但视觉对不上设计稿

组合用法：

```text
1. 用 frontend-design Skill 让 AI 出第一版组件
   → 自动应用一套整体设计语言（色板、字体、间距）

2. 在浏览器打开看效果

3. 用 Frontman 点中需要微调的元素
   → AI 拿到 computed style + 源码位置
   → 在 frontend-design 定义的设计系统约束下做调整
```

这两个 Skill 一起开，前端工作流接近 Figma + 编辑器同步——AI 既理解你的设计哲学，又能感知浏览器里发生了什么。

## 配套的前端 Skill 清单

把生态里几个值得安装的前端 Skill 整理一下，按职责分组：

### 设计系统层

- **`frontend-design`**（Anthropic 官方）— 最广泛使用的前端 Skill，让 AI 输出有设计感的 UI
- **UI/UX Pro Max** — 内置 50+ UI 风格、97 色板、57 字体配对、99 条 UX guideline，AI 可在生成时随机检索

### 组件架构层

- **React Component Composition Patterns** — 教 AI 用 compound components、context provider、explicit variants 等模式，避免 boolean prop 爆炸
- **React Best Practices**（Vercel）— 性能模式 + 既定最佳实践（避免不必要 re-render、useMemo / useCallback 的真实使用边界）

### 运行态感知层

- **Frontman** — 本文主角，让 AI 看到浏览器渲染态
- **Browser Use Skill** — 通用浏览器自动化，适合做端到端测试场景

### 质量审计层

- **Accessibility Skill** — 扫 JSX 找缺失的 alt、错误的 heading 层级、色彩对比度、ARIA 标签缺失、键盘导航问题
- **Performance Audit Skill** — 跑 Lighthouse + 解读结果，给具体优化建议

### 移动端

- **React Native + Expo Skill** — 60fps 约束、手势导航、iOS/Android 平台差异

### 推荐组合（三种工作流）

**新建项目从 0 开始**：

```text
frontend-design + React Best Practices + Accessibility
```

让 AI 在生成第一版时就遵循设计系统、性能、可访问性。

**已有项目调样式**：

```text
Frontman + frontend-design
```

浏览器视角微调 + 设计语言一致性，这是 Frontman 最有价值的场景。

**重构遗留代码**：

```text
React Component Composition + Accessibility + Performance Audit
```

把"prop 爆炸的 monster 组件"拆成可组合的小组件，同时审计可访问性和性能。

## 一个具体场景的对比

让 AI 改一个真实问题：列表卡片在移动端展开后内容溢出，需要修复。

**只用 Cursor**：

1. 你截图 + 描述："移动端卡片溢出"
2. Cursor 读 `Card.tsx`，看到 `max-w-sm`、`overflow-hidden`
3. Cursor 猜：可能是 image 没加 `max-w-full`
4. 改了，不一定对，因为问题可能在父容器的 grid template

**Frontman + Accessibility Skill**：

1. 你在手机模拟器里点中溢出的卡片
2. Frontman 把 computed style 给 AI：实际宽度 412px、父容器 grid `1fr 1fr` 在 mobile 没改成 `1fr`
3. AI 改 grid template 而不是 image
4. Accessibility Skill 顺便检查这个改动有没有破坏屏幕阅读器顺序

第一种是 SPA 调试常见的"瞎猜风格"；第二种是有运行态数据支撑的修复。

## 当前局限和适用边界

Frontman 不是没有问题：

- **服务端 RSC 边界**：React 19 Server Component 渲染发生在服务端，Frontman 看到的只是序列化后的 RSC payload，不是组件实例。复杂 RSC 场景下定位准确度比 client component 差
- **CSS-in-JS 运行态**：styled-components / Emotion 这种生成动态类名的库，source map 反推可能跳到一个 generated class，需要手动跳到组件源
- **生产环境无法用**：production build 完全剥离，所以线上问题只能先 reproduce 到本地
- **依赖热更新**：HMR 出问题时 Frontman 也连带不灵敏

适合的场景：日常开发、设计走查、UI 微调、新组件验证。
不适合的场景：生产 bug 排查（必须 reproduce）、纯逻辑层代码（没必要打开浏览器）、需要离线运行的环境。

## 怎么开始用

最低门槛尝试：

```bash
# Next.js 项目
npx @frontman-ai/nextjs install

# Astro 项目
astro add @frontman-ai/astro

# 任何 Vite 项目
npx @frontman-ai/vite install
```

安装完启动 dev server，访问 `http://localhost:3000/frontman` 进 overlay，配置一个 Anthropic 或 OpenAI API key 就能用。

如果用 Claude Code 而不是独立 Agent，把 Frontman 装成 OpenClaw Skill，让 Claude Code 在前端任务中自动调用它。这样可以保留 Claude Code 现有的 CLAUDE.md、其他 Skill、工作流，只是多了一双"浏览器的眼睛"。

## 一个判断标准

是否值得加 Frontman 进工作流，可以用一个问题判断：**你的 AI 编程工具有多少次"代码上看起来对的，但浏览器里就是不对"？**

- 几乎没有：你写的应用逻辑重、UI 简单，加 Frontman 收益小
- 偶尔会有：尝试一下，作为补充工具
- 经常发生：核心痛点匹配，加上去会有显著体感

前端工程师的真实瓶颈往往不在"写代码慢"，而在"代码、设计、浏览器三方对不齐"。Frontman 这一步，是把 AI 工具从"代码助手"延伸到"前端协作工具"——这是 2026 年值得关注的方向。

---

**延伸阅读**：
- [Frontman GitHub 仓库](https://github.com/frontman-ai/frontman) - 项目源码和 issue 区
- [Anthropic frontend-design Skill](https://www.aitmpl.com/component/skill/frontend-design) - 装机量最大的前端 Skill
