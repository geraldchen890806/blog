---
author: 陈广亮
pubDatetime: 2026-06-23T11:21:58+08:00
title: Loop 跑起来之后：Verification / Comprehension / Cognitive Surrender 三条债的实战治理 playbook
slug: blog195_loop-engineering-three-debts-playbook
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI Agent
  - Claude Code
  - 开发效率
  - 自动化
description: blog191 讲完 Loop Engineering 五个组件之后只点了三条债——验证债、理解债、认知投降——没给治理方案。这一篇专门补这块：Wharton 1372 人实验、Anthropic 52 工程师 17% 理解落差、$4,200 一晚烧光的真实账单、Claude Code 的 PreToolUse 拒绝 hook + 三种 checkpoint 设计——把 playbook 一次性摆出来。
---

[blog191](https://chenguangliang.com/posts/blog191_loop-engineering-design-loops-prompt-agents/) 那篇把 Loop Engineering 拆成五个组件 + 一个 state，结尾提了 Addy Osmani 原文里的三条债：**verification debt（验证债）/ comprehension debt（理解债）/ cognitive surrender（认知投降）**。但当时只是点出问题，没给治理方案——大人后台留言里被问得最多的就是这块。

这篇就专门补。基础事实先列清，再给具体 playbook，最后讲一个真实数字提醒：**Loop 跑得越顺，三条债越快累积**。

## 三条债不是抽象隐喻，是有数据的工程问题

Osmani 的原文用词偏哲学化，容易被误读成"提醒别太依赖 AI"的鸡汤。但 2026 上半年陆续出来的研究数据，让这三条债有了硬实体——它们不是态度问题，是可量化、可治理的工程问题。

**关于理解债的硬数据**：Anthropic 2026 的一项 [skill formation 研究](https://arxiv.org/abs/2601.20245)（52 名工程师学习陌生的异步编程库）发现，AI 协助组和对照组**完成任务用时几乎一样**，但跟进的理解测验，**AI 协助组得分低 17%**。换句话说——AI 把人带过了任务终点，却没把人带过理解终点。

**关于认知投降的硬数据**：Wharton 一项 1,372 人参与的实验，面对 AI 建议（其中 AI 答案有相当比例是错的）。即使在 AI 错误的情况下，参与者**大约 73% 仍然采纳了 AI 的答案**（Addy Osmani 在 [Cognitive Surrender](https://addyosmani.com/blog/cognitive-surrender/) 一文中引用的数字）。这意味着错误的 AI 输出在大多数情况下不会被识破。

**关于验证债的真实账单**：LeanOps 公开的一个案例——某团队一名开发者周末跑了一次 autonomous refactor loop，**单人单次烧掉 $4,200 API 费**，而那块代码业务侧根本还没确认需求。loop 跑出"完成"信号、PR 自动开好、CI 都绿，但 review 时发现整个改动方向是错的。验证债的代价是真金白银。

把三条债的数据基线钉死：**17% 理解落差、~73% 错误跟随率、$4,200 单次烧光案例**。下面治理方案围绕这三组数字反推回去。

## Verification Debt：把"agent 说完成"换成"系统说完成"

验证债的核心是：**loop 自己判断"done"是不可信的**。模型 + 它自己 grader → 它会给自己打高分；agent 跑了 50 个 tool call 没报错 ≠ 改动是对的。

治理方案三条，按落地难度从低到高：

**1. 强制证据制（最低成本，效果最大）**
每个 loop 任务终点必须产出**对外可验证的人造物**，否则一律视为未完成。具体清单是我在自己 loop 上跑了几个月后收敛出的（[Margaret Storey 2026/2 cognitive debt](https://margaretstorey.com/blog/2026/02/09/cognitive-debt/) 给了"定期 checkpoint 重建共享理解"的更宏观建议，证据具体形态由你自己定）：

- **测试**：新功能必须有失败→通过的可重跑测试
- **截图/录屏**：UI 类改动有视觉证据
- **运行日志**：服务类改动附 happy path log + 异常 log
- **runtime trace**：性能类改动附前后 trace 对比
- **第三方 signoff**：sub-agent 或人类 reviewer 显式批准

只允许 loop 在产出至少**两类**证据后宣告完成。一类太容易被模型刷分（测试可以"自己写自己过"），两类有交叉验证。

**2. Verifier sub-agent 与 Maker 解耦**
blog191 第三节讲过这个分工，这里再强调一遍——**maker 和 verifier 不能是同一个 agent context**。它们必须：

- 分别 spawn 独立的 sub-agent
- 不共享 system prompt（verifier 的 prompt 偏 skeptical：默认怀疑 maker 的产出）
- verifier 拿到的只有"任务原始描述 + maker 产出的证据"，**看不到 maker 的推理过程**——否则它会被 maker 的链式思考"催眠"

**3. Claude Code 的 PreToolUse hook 做硬拦截**
Claude Code 支持 PreToolUse hook：在 tool 调用前执行回调，**回调里 exit 2（不是 exit 1）才会阻止 tool 执行**——这是新手最常踩的坑，exit 1 是非阻塞的，工具照样跑。也可以用 JSON 输出 `{"decision":"block","reason":"..."}` 显式拒绝。Claude 看到拒绝消息后会调整策略。把 hook 用在三种场景上：

- `bash` tool 调用前——拒绝任何包含 `rm -rf`、`git push --force`、`DROP TABLE` 等的命令
- `Write` tool 在 `.env*`、`config/secrets/**` 等敏感路径上——直接拒绝
- 单次 loop 累计调用次数超过 N 次——硬停，要求人为介入

PreToolUse hook 是**对 loop 最便宜的护栏**——不需要改 agent 本身、不需要修改 prompt、不依赖模型自觉，是 OS 级别的拦截。一段 50 行的 shell 脚本就能阻止 80% 的 runaway 模式。

## Comprehension Debt：把"读一遍 PR"换成"重建理解"

理解债的核心是：**code review 不足以恢复理解**。读 PR 是"局部检查这段代码对不对"，但 loop 一周可能产出 30 个 PR，每个 PR 单独看都没问题，**整体什么样子**没人知道。

治理方案三条，按时间维度从短到长：

**1. 每次 PR 强制"why 而不是 what" review checkpoint**
PR 模板里把 `## What changed` 砍掉，换成 `## Why this change` + `## What it replaces` + `## Risk`。让 reviewer 把精力从"逐行核对"转到"为什么这条路径胜过其他路径"。模型生成的 diff 在 `## What` 上几乎不会出错——出错的是它没意识到的 tradeoff。

工具层面：用 GitHub PR template 强制；CI 加一个 lint check，如果 description 字段为空就 fail。

**2. 每周 30 分钟的 "loop diff review" 仪式**
loop 跑了一周后，开一个 30 分钟会议，做一件事：**让一个人快速过一遍 loop 这周开的所有 PR 标题 + 主要文件**，问三个问题：

- 这周 loop 改了哪几块代码？
- 哪些改动是我们**没预料到**的？（这是最重要的）
- 现在如果让你给新人讲这些模块的现状，你能讲出来吗？

第三个问题答不上来就是理解债余额。这个仪式的目标不是 review 代码——是**让团队定期重建对自己系统的 mental model**。

**3. 每月 "auto-debrief" 让 loop 自己写架构变化报告**
让 loop 自己再开一个 task：扫过去一个月的 git history、PR description、CI metrics，**写一份"过去一个月架构 / 模块 / 数据流变化总结"**。这份报告给团队人手一份，半小时同步消化。

这听起来像让 loop 自己评价自己——但**生成结构化总结**比**做对的工程决策**容易得多，所以这步可信度高。它的价值是把分布在 30 个 PR 里的隐含变化拎到一个文档里，让人有抓手去问"等等，第二节那段我们什么时候同意了？"

## Cognitive Surrender：把"是否跟随 AI"变成"显式决策"

认知投降是三条债里最难治理的——它不是技术问题，是**心理 + 习惯**。loop 越好用、答得越自信，人就越倾向于不假思索接受。Wharton 约 73% 的错误跟随率，发生在受过训练的实验环境里——日常工作中只会更高。

治理方案三条，按介入强度从低到高：

**1. 强制"理由分离"提示**
在 loop 产出结果时，要求它**显式列出三件事**：

- **结论**：我推荐 X
- **理由**：因为 A、B、C
- **未考虑**：D、E 这两点我没充分考虑

第三项是关键。让 AI 自己承认未考虑的维度，相当于把"未知风险"摆到桌面上。人看到"我没充分考虑性能影响"会下意识停一下；看不到就会默认 AI 考虑过。

实现层面：写进 loop 的 system prompt + 让 verifier sub-agent 检查"未考虑"字段是否非空，空则打回。

**2. 反事实检查（"如果你是错的，会怎样？"）**
对高 stakes 任务，在 maker 产出后强制加一轮 "devil's advocate" sub-agent。它的唯一职责是：**假设 maker 的方案是错的，列出 3 个最可能错的原因**。

这一步不是为了一定推翻 maker——是为了**让人在采纳前看到反方论据**。看完三条反方论据，人对"这真的对吗"的注意力会显著回归。

**3. 强 stakes 任务强制 cooling-off**
deployment 类、不可逆类（如 prod 数据库迁移、外部 API 灰度切换）loop 即使产出"完成"信号，也**强制延迟 1 小时**才能进入下一步。这一小时不是给 loop 用——是给人留一个**"不被催"的窗口**去想是否真的要按下回车。

Claude Code 的 SessionEnd hook 或自定义 schedule 都能实现。

## 三层联防：把 Verification / Comprehension / Cognitive Surrender 焊在一起

把上面九条治理方案画成一张图——三类债 × 三类介入点：

| | 实时层（loop 跑的瞬间） | 短期层（PR / 一周内） | 长期层（一个月以上） |
|---|---|---|---|
| **Verification** | PreToolUse hook 拦截 | verifier sub-agent + 双类证据 | 月度 runaway 账单 review |
| **Comprehension** | "理由分离"提示 | "why 不是 what" PR template + 每周 diff 仪式 | 月度 auto-debrief 架构变化报告 |
| **Cognitive Surrender** | 反事实检查 sub-agent | 强 stakes 任务 1 小时 cooling-off | 季度"AI 关掉一天"演练 |

最后一格"AI 关掉一天"是我自己跑过半年 loop 后给团队提的反向实验（[Stack Overflow 2026/5/21 那篇决策疲劳文](https://stackoverflow.blog/2026/05/21/coding-agents-are-giving-everyone-decision-fatigue/) 在更宏观层面讨论了 SDLC 怎么应对决策疲劳，本节是我把它落到一个具体仪式上）——每季度选一天，全公司停用所有 AI 编码工具，让大家用最古老的方式写代码、读代码、解决问题。这一天的作用不是怀旧，是**重新校准**：检查团队是否还会自己写出能跑的代码、是否还记得这些系统怎么工作。如果连续两次"AI 关掉一天"上集体崩溃，说明认知投降已经发生且不可逆。

## 真实账单：三条债怎么烧掉 $4,200

回到开头那个 $4,200 一晚烧光的案例。事后复盘，把它拆到三条债上：

- **Verification debt**：loop 没有强制证据制——它跑完 refactor 觉得"完成"是因为它自己写的测试自己过了，但**没有任何外部信号**说改动方向对（业务侧根本没确认要做）
- **Comprehension debt**：开发者周一进办公室看到 PR 是 8000 行 diff，扫了一眼觉得"看起来 loop 跑得挺顺"——他**没有 mental model** 判断这 8000 行到底是不是该走的路
- **Cognitive Surrender**：loop 的 PR description 写得非常自信（"This refactor improves maintainability..."），开发者**没有 instinct 去质疑**——直到看 API 账单的时候才意识到 64 小时不间断 loop 的代价

如果当时有过任意一道护栏，账单就会被掐死：

- PreToolUse hook 在累计 tool 调用超过 N 次时硬停 → 几小时内停掉
- 强制证据制 + 业务 signoff → 第一个 PR 就过不了
- 单日 API 预算 $50 soft cap + $100 hard cutoff → 第一天就触发警告

LeanOps 那篇的建议很简单也很有效：**$50/day soft cap with email alert + $100/day hard cutoff**——能拦掉 95% 的 runaway 模式。这是 loop engineering 第零步该做的事，比研究 prompt 重要 100 倍。

## 一句话总结：loop 越好用，治理债越要前置

blog191 最后一句话是"循环换了你的工作内容，没换掉你"。这篇的版本是：

**循环把你的工作从"按回车"换成"设计护栏"。护栏没设计好之前，loop 跑得越顺，三条债涨得越快。**

如果你正在搭 loop，建议这个顺序：

1. **先**：API 预算 + PreToolUse hook（成本最低、风险最高的两件事）
2. **再**：verifier sub-agent + "why 不是 what" PR template
3. **然后**：每周 diff 仪式 + 强 stakes 1 小时 cooling-off
4. **最后**：月度 auto-debrief + 季度 AI 关掉一天

跳过任何一步都不致命，跳过第 1 步会出账单。

---

**延伸阅读**：

- [Addy Osmani: Cognitive Surrender](https://addyosmani.com/blog/cognitive-surrender/) - Loop Engineering 之外，Addy 单独写过的认知投降文
- [Margaret Storey: Cognitive Debt](https://margaretstorey.com/blog/2026/02/09/cognitive-debt/) - mitigation 实践的原始来源
- [Stack Overflow: Coding agents are giving everyone decision fatigue](https://stackoverflow.blog/2026/05/21/coding-agents-are-giving-everyone-decision-fatigue/) - 决策疲劳的行业承认
- [LeanOps: AI Agents Burn 50x More Tokens Than Chats](https://leanopstech.com/blog/agentic-ai-cost-runaway-token-budget-2026/) - $4,200 案例 + budget 实践
- [本博客 blog191 - Loop Engineering 概念与组件](https://chenguangliang.com/posts/blog191_loop-engineering-design-loops-prompt-agents/) - 本文前传
