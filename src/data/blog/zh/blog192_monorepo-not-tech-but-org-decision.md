---
author: 陈广亮
pubDatetime: 2026-06-15T21:30:00+08:00
title: Monorepo 选型不是技术问题，是组织问题：从 Babel、Lerna、Mercari 三个真实案例看清边界
slug: blog192_monorepo-not-tech-but-org-decision
featured: true
draft: false
reviewed: true
approved: true
tags:
  - 前端
  - 开发效率
  - 开源
  - 工具
description: Monorepo 不是 yes/no 的技术选型，Babel 进入又部分回退、Lerna 一度无人维护、Mercari 跨地域 CI 一年烧出真金白银——三个案例都指向同一件事：决定 monorepo 成败的不是 Turborepo 还是 Nx，是你的团队和组织结构。
---

## 一个被反复忽略的判断

打开任何一个"2026 monorepo 选型指南"，话题都集中在三件事：Turborepo 还是 Nx，pnpm workspace 怎么配，远程缓存怎么搭。仿佛只要把这三件工具选对，团队效率就自动起飞。

我自己维护过 polyrepo、用过 Lerna、迁移到 pnpm workspaces、目前博客和 trade 项目都跑在不同形态的仓库里。三年下来，看法变了：**monorepo 的成败几乎不取决于工具，取决于团队规模、所有权边界、和 CI 预算这三个组织变量**。

工具差异在小项目上无足轻重，在大项目上又被组织问题完全淹没。这篇文章用三个真实案例——Babel 的进退、Lerna 的治理失败、Mercari 2026 的 CI 账单——把这层判断说清楚。

## 案例一：Babel 进入 monorepo 之后，悄悄换了一半

Babel 2017 把 `babel-preset-env`、`babylon`（后改名 `@babel/parser`）等仓库合并进主仓库，当时 Lerna 还是事实标准。这个迁移在那个时间点是对的——Babel 跨包改动太频繁，分仓时一个 PR 要拆成 5 个 review、5 个 release。

但很少有人注意到后续：**Babel 主仓库现在的 packageManager 是 yarn@4.x，devDependencies 里已经没有 Lerna**——保留 monorepo 形态，但放弃了 Lerna 的 versioning 和 publishing 抽象。这背后的判断很微妙——Babel 团队发现：

- 跨包代码共享和原子改动这两件事，单靠 workspaces 就够了
- Lerna 的 `lerna version` 和 `lerna publish` 在 Babel 这种"几乎所有包都同步发版"的项目里反而成了负担
- 维护 Lerna 配置本身要消耗精力，但项目收益没有跟上

Babel 这一手是典型的"monorepo 没问题，但 monorepo 工具链问题大"。它告诉我们一件事：你需要的可能不是一整套 monorepo 框架，而是底层的 workspace 协议加上少量自定义脚本。

## 案例二：Lerna 半死与 Nrwl 接管

Lerna 在 2020 年就有 issue 指出"几乎没人维护"，2022 年 4 月一个 PR 把"unmaintained"状态写进 README 顶部。同年 5 月 Nrwl（Nx 团队）接手，做了一轮重做——依赖升级、文档重写、把任务调度委托给 Nx 引擎，2022 年底发布 Lerna 6。

这件事的真正信号不是"Lerna 死了"，而是**最广泛使用的 monorepo 工具，曾经一度无人接手**。

为什么？Lerna 的核心抽象（版本管理、跨包发布）不是技术难题，是社区治理难题：

- 用户群覆盖从初创公司到 Fortune 500，需求差异巨大
- 大公司用户多数 fork 之后内部维护，不向上游回馈
- 维护者要承担兼容性压力（任何破坏性更改都炸掉成千上万的 CI）
- 没有商业模式支撑，全靠志愿者

这套问题在所有"基础设施类开源项目"上反复重演。**当你选择某个 monorepo 工具时，等于把团队的核心 CI 路径押注到这个项目的治理质量上**。Nx 之所以现在被广泛推荐，部分原因是它背后有 Nrwl 这家公司明确的商业模式，治理风险相对小。Turborepo 同理（Vercel）。

对应到选型判断：**选 monorepo 工具时，治理可持续性的权重应该高于性能 benchmark**。一个慢 10% 但有公司全职维护的方案，比快 30% 但靠业余维护的方案更值得长期信任。

## 案例三：Mercari 跨地域 CI 实战

Mercari 工程团队在 2026 年 2 月发布了一篇 Turborepo 远程缓存博客（文章原文写于 2025 年，实施时间可以追溯到更早）。最值得注意的不是性能数字，是**他们为什么必须搭远程缓存**：

- CI 集群在美国
- 主 GKE 集群在日本
- 数据传输费 $0.08/GiB
- monorepo 规模大，每次 CI 不缓存就要重跑全部任务

这个组合下，远程缓存不是"锦上添花"，是"否则成本失控"。他们公布的数据：Turbo 任务时长降约 50%、整体 job 时长降约 30%。

但反过来想：**如果你的团队没在跨地域跑 CI、月构建任务量也没到 Mercari 这个量级，远程缓存的复杂度收益比是负的**。我自己博客项目就是反例——一个 Astro 站点的 build 本身只要 20 秒，搭远程缓存的运维成本远超过收益。

这个案例和之前两个串起来，能看出 monorepo 的一个隐藏代价：**越大越要工程化，工程化又把维护成本叠加上去**。Mercari 这种公司能消化，小团队往往低估这一项。

## AI Agent 时代，monorepo 的成本结构变了

这一节是我 dogfooding 出来的观察。

过去 monorepo 的一项重要收益是"代码可发现性"——所有代码在一个仓库里，开发者用 IDE 全文搜索就能找到任何函数定义。这条收益对人是真实的，但对 AI Agent 来说**意义在下降**：

- Claude Code、Cursor 这类工具靠 grep / glob 搜索代码，搜索效率不依赖仓库形态——只要工具能并行访问多个工作区，polyrepo 和 monorepo 在 AI 视角下差异不大
- 真正影响 AI Agent 效率的是**单次 context 里能塞下多少相关代码**，而不是仓库是否合并

更值得注意的：monorepo 在 AI 时代多出一个反向成本——**context 污染**。当你让 AI Agent 在一个 30 万行代码的 monorepo 里改 bug，它扫描时会读到大量无关的 package 代码，挤占 context 窗口、增加 hallucination 概率。polyrepo 反而天然提供了 context 边界。

这个变化不是说 AI 时代要全面回归 polyrepo，而是说**"代码可发现性"这条传统 monorepo 论据需要被打折**。如果你正在用是否上 monorepo 来推动团队决策，需要重新评估这一项的权重。

## 真正决定 monorepo 成败的三个组织变量

把三个案例和 AI 视角合并，我现在给团队做 monorepo 评估时只问三个问题：

**第一，跨包原子改动的频率有多高？**
如果你的项目里"修一个 bug 需要同步改 3 个 package"是常态，monorepo 收益巨大；如果各 package 演化节奏完全独立，monorepo 的协调成本反而是负担。Babel 是前者，所以即使换工具也保留 monorepo 形态；很多"为了 monorepo 而 monorepo"的中小项目是后者，最后被 CI 复杂度拖死。

**第二，团队规模能不能承担 CI 工程化？**
Mercari 那种远程缓存方案需要专门的工程师设计、维护、监控。如果你团队没有 1-2 个能持续投入 CI 优化的人，不要碰大 monorepo——构建时间会随项目增长爆炸，团队体验会快速崩坏。pnpm workspaces + 简单 CI 是更现实的起点。

**第三，所有权边界能不能在仓库里清晰表达？**
monorepo 在小团队里运转良好，因为所有权边界靠"全员都熟"维持。团队到 50+ 工程师时，必须用 CODEOWNERS、package 边界、CI 拦截来强制所有权，否则会出现"谁都能改谁都不负责"的状态。Outbrain 公开过他们规模化后的痛点——clone 慢、build 慢、flaky test、IDE 索引拖累——这些表象之下都是同一类问题：组织规模超过了仓库形态的承载力。所有权机制不齐全的团队，monorepo 会放大这种组织失效。

## 工具选型的现实建议

回到工具层面，把判断收敛成一句话：**别从工具选型开始，从前面三个问题的答案倒推**。

- 三个问题都倾向 monorepo：选 Turborepo 或 Nx 都行，看团队对配置复杂度的偏好（Turborepo 简单上手，Nx 功能全但学习曲线陡）
- 答案模糊不清：pnpm workspaces 起步，先享受最基础的 workspace 红利，等真有跨包复杂度再上 Turborepo
- 答案偏向 polyrepo：保持现状，把精力投到 polyrepo 的痛点上——发布工具、依赖同步、契约测试，这些有现成方案

至于"Lerna 还能不能用"——Nx 接管后 Lerna 6/7 质量没问题，但既然你都用 Nx 体系了，直接用 Nx 主线方案更顺；新项目没必要再从 Lerna 起步。

## 结尾

每次有人问我"我们要不要上 monorepo"，我现在都会反问：你的跨包改动频率、CI 工程化能力、所有权机制，准备好了吗？三个答案都清楚之后，工具选什么基本是细节。

monorepo 不是技术潮流，是组织能力的镜子。Babel、Lerna、Mercari 三个案例从不同角度都在说同一件事：你团队能撑住什么样的工程化复杂度，决定了 monorepo 对你是加速器还是定时炸弹。

---

**延伸阅读**：
- [Mercari Engineering: Turborepo Remote Cache](https://engineering.mercari.com/en/blog/entry/20260216-turborepo-remote-cache-accelerating-ci-to-move-fast/) - 2026 年 2 月的跨地域 CI 实战
- [Lerna and Nx](https://lerna.js.org/docs/lerna-and-nx) - Nrwl 团队接管 Lerna 后的官方说明
- [Babel monorepo design doc](https://github.com/babel/babel/blob/main/doc/design/monorepo.md) - Babel 自己写的 monorepo 设计文档
