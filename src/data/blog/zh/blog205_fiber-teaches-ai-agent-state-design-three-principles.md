---
author: 陈广亮
pubDatetime: 2026-07-14T11:15:01+08:00
title: "Fiber 教会我们设计 AI Agent 状态存储的 3 条原则"
slug: blog205_fiber-teaches-ai-agent-state-design-three-principles
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI Agent
  - 前端
  - 开发效率
  - Claude Code
description: React Fiber 掘金上有一篇 6012 热度的深度介绍，同题已被写烂。真正没人写的是 Fiber 三大机制（双缓冲、time slicing、lanes 优先级）如何映射到 AI Agent 状态存储设计。本文从我 blog194/195/202 真做过的 AGENTS.md、loop debt、ponytail 实测经验出发，逐条对应给出 AI Agent 时代该抄的 3 条 Fiber 元规律。
---

## 为什么不直接写"Fiber 是什么"

React Fiber 上周在掘金一篇文章冲到 6012 热度。同题深度介绍是**满互联网都是**的品类——`acdlite/react-fiber-architecture` 这份 2016 年的原始设计文档到现在还是最好的入门材料，别人再写一版还是复述。

真正值得写、也没人写的是——**Fiber 三大核心机制（双缓冲、time slicing、lanes 优先级）能给 AI Agent 状态存储设计什么启发**。写 Fiber 的人多数不做 agent，做 agent 的人多数不研究 Fiber，中间那层类比是空的。

我不是 React 深度用户（[blog202 里 ponytail 实测那个 TableOfContents.astro](/posts/blog202_ponytail-73k-stars-three-weeks-lazy-senior-dev/) 就是本站组件，博客用 Astro 不用 React），所以这篇也不是"看我用 Fiber 写了什么"，是**"我从 Fiber 设计里抄了什么到我做 AI Agent 的实践"**。三条原则每条对应一个我 dogfooding 过的具体决定，[blog194 项目护照](/posts/blog194_project-passport-agents-md-claude-md-memory/)、[blog195 loop debt](/posts/blog195_loop-engineering-three-debts-playbook/)、[blog202 ponytail 实测](/posts/blog202_ponytail-73k-stars-three-weeks-lazy-senior-dev/) 都能对上号。

跨领域类比的价值在于**"这一侧被验证过 10 年的设计原则，另一侧新领域可以直接抄"**——React Fiber 从 2017 年到现在 9 年了，Facebook / Meta 内部用这个架构撑住 100k+ 组件的应用，它的设计约束是**极端场景下磨出来的**。AI Agent 才 2-3 年，能少走的弯路应该主动少走。

## 原则 1：双缓冲（current vs work-in-progress）→ Agent 状态的"提议态 vs 应用态"分离

### Fiber 是怎么做的

React 内部同时维护两棵 Fiber 树：

- **current tree**：当前屏幕上显示的东西对应的 Fiber
- **work-in-progress tree（WIP）**：React 正在后台"设想"下次要变成什么样的 Fiber

WIP 树是**在内存里独立构建的**——用户看不到、可以随时被打断、可以扔掉重建。只有当 WIP 树完全 ready 时，React 才在**commit phase 里原子地** swap 两棵树（`root.current = workInProgress`）。

这个设计有一个非常重要的属性：**不会出现"半完成 UI"**。用户永远看到一致的画面，要么旧的 100%、要么新的 100%，中间没有过渡态。

### AI Agent 应该抄的

大多数早期 AI Agent 状态设计是**"直接改现实"**——LLM 生成 tool call → 直接执行 → 直接写文件/发消息。这跟 React 早期直接改 DOM 是同一个错，都是"UI/世界在半完成状态被用户看到"。

**Ponytail 实测教训**（[blog202](/posts/blog202_ponytail-73k-stars-three-weeks-lazy-senior-dev/) 我装了 ponytail 在博客一个 196 行 TableOfContents 组件上跑）里我看到的一个关键细节——ponytail 给 AI 的第一个 rung 是"**先跑完 7 步 decision ladder 再动手**"，而不是"看到需求立刻改代码"。这就是把"提议态"（ladder 推理）和"应用态"（写代码）分离，跟 Fiber 的 WIP / current 分离**结构完全同构**。

具体到 AI Agent 状态存储设计的实操：

- **maker（提议方）跟 verifier（校对方）context 严格分离** —— [blog195 loop engineering 三条债](/posts/blog195_loop-engineering-three-debts-playbook/) 里治 verification debt 就是这一条。verifier prompt 不能看到 maker 的推理过程，否则会被 maker "催眠"，就像 React 如果 WIP 直接写 current 会看到自己上一步的产物、造成状态泄漏
- **文件写入应该 stage 后再 commit** —— Claude Code 的 PreToolUse hook 可以在 Write tool 触发前拦截：先写到 `.tmp` 目录、跑一次 lint/test/typecheck、通过后再原子 rename。这是 Fiber commit phase 的对应
- **memory 更新分两阶段** —— 可以把 [blog194 项目护照](/posts/blog194_project-passport-agents-md-claude-md-memory/) 的 memory 管理再往前推一步：先写 draft、跑一次自查（跟 AGENTS.md 已有条目不冲突、时间格式正确、tags 在允许集合）、通过后才 commit 到主 memory 文件。**这一步 blog194 没有讲，是本文类比 Fiber 双缓冲之后我补出来的增强**

**反例**：直接把 `claude` API 调 tool call 的结果无 buffer 写到 prod 数据库/发送邮件/删文件 —— 这是没有 double buffering 的 agent，任何中间态错误都是不可逆的破坏。

## 原则 2：Time slicing（5ms 让位）→ Agent 长任务的 checkpoint / resume

### Fiber 是怎么做的

React Scheduler 把渲染工作切成小片段（fiber unit of work）。**每处理 ~5ms 就检查一次**：browser 有没有更紧急的事（用户点击、动画帧）？有 → **yield 让位、下一轮再回来**。没 → 继续下一个 fiber unit。

这个 yield 不是全丢弃，是**保存进度、下次从断点继续**。React 的 `MessageChannel` 底层就是这个"跑一小片、yield、跑一小片"的循环。

关键属性：**长任务不能拖死短交互**。用户点击按钮永远优先，即便 React 正在渲染一个 5000 节点的树。

### AI Agent 应该抄的

Agent loop 里最常见的病是**"一个任务跑 30 分钟没检查外部信号"**：agent 决定 refactor 一整个 codebase → 一路狂跑 → 半小时后用户想中断发现 `Ctrl+C` 都不响应（因为 agent 在等一个 LLM streaming response）。

**LeanOps 那个 $4,200 案例**（[blog195](/posts/blog195_loop-engineering-three-debts-playbook/)）：一个 autonomous refactor loop 周末跑了两天，人下班后 agent 没有 checkpoint、没有 5ms yield 的对应机制，直接烧到 monday morning bill 出来才发现方向错了。

具体 agent 应该抄 time slicing 的三件事：

- **agent loop 应该有"每 N 步 tool call 之后必须 flush 到持久 state"** —— 断点续跑而不是从头开始。类比 React 的 fiber unit of work，每处理 5ms 就把进度记下来
- **checkpoint 内容应该是"最小可 resume 集合"** —— 当前 goal 描述、已完成的 sub-goals、未完成的 sub-goals、关键中间产物路径。就像 fiber node 里存的 `alternate` 指针 + `child` / `sibling` 结构，用最小信息重构完整 tree
- **long-running agent 必须暴露"合作中断接口"** —— 不是 kill signal，是"下一个 checkpoint 后请停下"。Fiber 的 `shouldYield()` 就是这个 —— 不硬打断当前 unit，而是问"下一个安全点你能不能停一下"

**Claude Code 的对应**：[blog194](/posts/blog194_project-passport-agents-md-claude-md-memory/) 里讲的 session 恢复能力——你昨天关了终端，今天 `claude --resume` 能从上次的 message 历史 + tool state 接上。这背后就是每一步都 flush state 到 `~/.claude/projects/<hash>/`。这个设计跟 Fiber 的 time slicing checkpoint 是**同一件事的不同表达**：**任何长任务都必须能被打断、保存、恢复**。

**反例**：agent 里的 `while (True) { tool_call() }` 循环没有 checkpoint 输出、没有 shouldYield 检查 —— 一断电就丢所有进度。或者更常见的：进度只在内存里，agent 进程 crash 就消失。

## 原则 3：Lanes 优先级（31-bit bitmask）→ Agent 任务的 P0/P1 分层调度

### Fiber 是怎么做的

React Lanes 系统用**31-bit bitmask** 表示不同优先级的更新。核心 lane 定义：

- **SyncLane**：最高优先级，用户 discrete 事件（click、keypress）—— 必须立即响应
- **InputContinuousLane**：连续输入（scroll、mousemove）—— 高优先级但可以批处理
- **DefaultLane**：常规 state 更新
- **TransitionLane**：`useTransition` 标记的更新，用户容忍慢一点（页面跳转等）
- **IdleLane**：最低优先级，等其他都空了才跑

调度器每次决定"接下来做什么"时，**读 bitmask 里最高位的 lane**，先处理它。低优先级 lane 上的 work 可以被高优先级中断（回到原则 2 的可打断性）。

关键属性：**不同 stakes 的工作被分到不同 lane 调度，避免"我按了个按钮但界面被后台数据加载卡住"**。

### AI Agent 应该抄的

大多数 agent 系统所有 tool call 是**平等**的——`Write` 一个 config file 和 `Bash` 一个 `rm -rf` 走同一个执行栈，同样 confirm、同样重试策略、同样 timeout。这是错的。

**Ponytail 的 A/B/C 三类代码分层**（[blog197 vibe coding 维护期](/posts/blog197_vibe-coding-maintenance-real-test/)）+ **loop debt 里对 verifier 层级的划分**（[blog195](/posts/blog195_loop-engineering-three-debts-playbook/)）就是在往这个方向走，但还没到 Lanes 那么精细。

具体 agent 应该抄 lanes 的三件事：

- **tool call 应该按 blast radius 分 lane** —— 低风险（read file、grep）走 IdleLane 免确认；中风险（write to project scratch dir）走 DefaultLane 记录日志；高风险（git push、prod deploy、send email、rm）走 SyncLane 强制人 confirm。**跟 Fiber 一样，不同 lane 的 work 走不同 pipeline**
- **user-facing 操作（编辑代码、发消息）优先级 > 后台批处理（memory 整理、log 归档）** —— 就像 SyncLane 优先于 IdleLane。agent 正在等用户读它上一个 message 时可以后台跑 IdleLane 上的 memory 清理
- **优先级不是数字大小，是分类** —— React 用 bitmask 而不是数字优先级，因为**同时有多个 lane 里的 work 需要一起处理**（bitmask OR）。agent 类似：一个任务可能同时是"高 blast radius"（需要 confirm）+ "user-facing"（响应要快）—— 两类属性都得标记，调度策略要能同时读取。**不必强求 bitmask 位运算**，agent 场景 tag 组合就够（反向边界节会展开）

**Claude Code 的对应**：`PreToolUse` hook 加 `Bash` tool 的白名单/黑名单 —— 白名单 tool（`git status`、`ls`、`grep`）自动允许，黑名单（`rm -rf`、`git push --force`）强制拦截 + confirm。这就是**tool 按 blast radius 分 lane** 的一个粗糙实现。真正 Lanes 级别的实现应该是**每个 tool call site 静态可分类 + runtime 动态调度**。

**反例**：把所有 tool call 都走 "always confirm" 或 "never confirm" 二选一——前者用户会疲劳到直接全按 Yes（呼应 [blog195](/posts/blog195_loop-engineering-three-debts-playbook/) 引 Stack Overflow 那篇 "decision fatigue 决策疲劳"），后者高风险动作零防护。**两个极端都是没有 lanes 系统的产物**。

## Fiber 教不了的：React 是有限树，Agent 是无限 loop

写到这里必须给反向边界，否则类比就变成套模板。**Fiber 有些设计前提在 agent 领域不成立**：

1. **React 每次 commit 都是一个收敛点**（这次 render 已完成、UI 稳定，即便下一轮 update 又会打回），agent 的 loop 是**开放式的**——没有"这次任务完成"的天然时点，只有"user 说停"或"budget 耗尽"。所以 double buffering 在 agent 里的"commit 时机"没有 React 那么清晰，需要额外的**收敛检查**（这一步之后目标状态是否已达到？）
2. **React 的 lanes 有 31 个静态定义**（编译时确定），agent 的 tool 数量和风险级别是**动态的**——用户自定义的 MCP tool、runtime 加载的 skill 都可能引入新分类。所以 lanes 在 agent 里更像 tag 系统而不是固定 bitmask
3. **React 的 fiber node 是不可变数据结构** + immutable pattern（每次更新新建 alternate），agent 的 state（memory、context、file state）多数是**mutable**——因为持久化 immutable state 到 disk 成本太高。这意味着 agent 抄 Fiber 时**不能 100% 抄 immutable，只能选关键路径 immutable**

第 3 点是 R 到 A 类比中最深的差异 —— **Fiber 用不可变换取可预测，agent 用可变换取效率**，这是两个不同的工程 tradeoff。所以本文标题说"3 条原则"，不说"照抄 Fiber 架构"——**原则是可迁移的抽象，架构是 domain-specific 的实现**。

## 收尾：跨领域类比的元规律

Fiber 三条原则 → AI Agent 状态存储：

| Fiber 机制 | Agent 对应 | 我 dogfooding 过的落地 |
|---|---|---|
| 双缓冲（current/WIP） | maker/verifier 分离 + stage/commit 写入 | blog195 verifier sub-agent 独立 context / blog194 memory 分类基础 + 本文提出的 draft→commit 增强 |
| Time slicing（5ms yield） | 长任务 checkpoint / resume + shouldYield 合作中断 | Claude Code `--resume` / blog195 avoid $4,200 runaway |
| Lanes（bitmask 优先级） | tool call 按 blast radius 分层调度 | Claude Code PreToolUse hook / blog197 A/B/C 代码分层 |

我个人写这篇的最大收获不是"agent 应该抄 Fiber"，是**"任何一个已经跑 10 年的成熟系统，它踩过的坑一定被新兴领域重踩一遍"**。React 2013 到 2017 花 4 年从 stack reconciler 走到 Fiber，agent 领域完全可以**在时间成本 1/10 的位置就把这几个坑跳过去**。

如果你正在做 agent 系统（LangChain / OpenAI Assistants / 自己 wire 的 loop），下次决定 state 存哪、tool 怎么调、任务能不能中断时，可以问自己：**这一步 Fiber 是怎么做的？我这里能不能抄？**

Fiber 掘金 6012 热度那篇文章本身值得读——但读完之后**去想类比、去抄原则**，比再多背几遍数据结构定义有价值 10 倍。

---

**延伸阅读**：

- [acdlite/react-fiber-architecture](https://github.com/acdlite/react-fiber-architecture) - Fiber 原始设计文档（Andrew Clark 2016 写的，到 2026 仍是最好入门材料）
- [React Lanes 深度解读](https://dev.to/playfulprogramming/react-lanes-the-internal-engine-powering-modern-concurrent-rendering-1o5c) - 2026 lanes 系统的 31-bit bitmask 拆解
- [blog194 - AGENTS.md + CLAUDE.md + memory 项目护照](/posts/blog194_project-passport-agents-md-claude-md-memory/) - 原则 1 里 memory draft→commit 的实操
- [blog195 - Loop Engineering 三条债 playbook](/posts/blog195_loop-engineering-three-debts-playbook/) - 原则 2 里 verifier context 分离 + 原则 3 里 PreToolUse hook 的详细论证
- [blog202 - Ponytail 三周 73k star + 实测](/posts/blog202_ponytail-73k-stars-three-weeks-lazy-senior-dev/) - 原则 1 里 ponytail 7 步 ladder 的实测记录
