---
author: 陈广亮
pubDatetime: 2026-05-15T15:00:00+08:00
title: AI 大模型对比 2026 年中版：blog080 写完两个多月，模型层换了一轮
slug: blog166_ai-models-mid-2026-update
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI
  - LLM
  - 开发效率
  - 开源
description: blog080 写于 2026 年 3 月初。两个多月过去，GPT-5.5、Claude Opus 4.7、Gemini 3.1 Pro 全部发布，开源旗舰 GLM-5.1/Qwen 3 Coder 缩到闭源 5-15 分。这是 5 月升级版：变了什么、3 月选型怎么换。
---

3 月初我写过一篇 [2026 AI 大模型全景对比](/posts/blog080_ai-models-comparison-2026/)，当时测的是 GPT-4 Turbo / GPT-4o / Claude 3 Opus / Claude 3.5 / Gemini 2.0 Pro / Qwen 2.5 Max / Kimi 等 12 款模型。那篇成了我博客流量最大的文章——但两个多月过去，**我自己的选型已经改过两次**，原文里的结论几乎全部失效。

这篇是我自己跑完一遍迁移后的二次复盘。

## 我的实测背景

为了避免又成一篇"benchmark 罗列文"，先交代我自己在这两个多月里的真实使用情况：

- **3 月**：日常 ChatGPT Plus（GPT-4o）+ Claude Pro（3.5 Sonnet）双订阅，月费 $40
- **4 月**：Claude Opus 4.6 发布当周切了主力，加 Cursor 订阅，月费跳到 $80
- **5 月（现在）**：Claude Code（Opus 4.7 + Sonnet 4.6）+ 自托管 Qwen 3 Coder 处理批量任务，月费回到 $35

跑过的项目：博客本身（Astro 5→6 迁移、URL 重构、JSON-LD 修复）、一个工具集合站点（50 多个前端工具持续迭代）、内部 blog-preflight Subagent（[blog158 详细写过](/posts/blog158_claude-code-skills-practical-guide/)）。**总 token 消耗在两个多月里大约 8M+**，足够让我对每款模型的真实手感形成判断，不是单看 benchmark 的"纸面分析"。

下面这篇就是基于这些实际跑过的项目和踩坑，回答一件事：**3 月看过 blog080 做了选型的读者，现在该怎么调整**？不重复讲基础（什么是 GPT/Claude/Gemini），只讲变了什么、为什么变、该不该跟着换。

## 核心变化总览

| 维度 | 3 月（blog080）| 5 月（现在） | 变化幅度 |
|---|---|---|---|
| OpenAI 主力 | GPT-4 Turbo / GPT-4o | **GPT-5.5**（4 月发布）| 跨代升级，编程任务质变 |
| Anthropic 主力 | Claude 3 Opus / Claude 3.5 Sonnet | **Claude Opus 4.7**（6/15 完全取代 4.6）| SWE-bench Pro 大跨度 |
| Google 主力 | Gemini 2.0 Pro / Flash | **Gemini 3.1 Pro** | 科学推理新王 |
| xAI 主力 | 未覆盖 | **Grok 4 / 4.3** | 新加入第一阵营 |
| 阿里 Qwen | Qwen 2.5 Max | **Qwen 3 Coder 32B**（开源可自托管）| 编程能力大幅追赶 |
| 国产开源新军 | 未覆盖 | **GLM-5.1 / DeepSeek V4** | 缩到闭源 5-15 分内 |
| 月之暗面 Kimi | Kimi（无明确版本号）| **K2.6** | 长文本 + 性价比 |
| 整体价格 | — | **OpenAI / DeepSeek 腰斩；Anthropic 持平；Google 微涨 10%** | 头部 API 经济门槛降一档 |

## 变化 1：编程能力新格局

blog080 写时，"哪个模型编程最强"还是 Claude vs GPT 二选一。现在的真实格局：

| 任务类型 | 当前领先者 | 数据 |
|---|---|---|
| SWE-bench Pro（真实 GitHub Issue）| **Claude Opus 4.7** | 64.3% |
| Terminal-Bench 2.0（Agentic 终端任务）| **GPT-5.5** | 82.7% |
| GPQA Diamond（科学推理）| **Gemini 3.1 Pro** | 94.3% |
| 开源 SWE-bench Pro | **GLM-5.1** | 58.4%（接近闭源前沿）|

**4 月之前**：默认 Claude / GPT 二选一。
**5 月之后**：要按**任务类型**选——这是 blog080 时代不存在的精细化分工。

**我的实际感受**：我同时跑过 blog 项目的多文件重构（Opus 4.7）和工具站的一次性脚本（GPT-5.5）。Opus 4.7 在跨文件理解上明显更好——它能记住 5 个文件之前我做了什么，GPT-5.5 在 file 3 之后就开始"健忘"。但 GPT-5.5 在"打开终端跑一串命令、看输出、决定下一步"这种 Agentic 工作流上更顺，跟它 Terminal-Bench 2.0 拿 82.7% 的数字对得上。SWE-bench Pro 这种"读完整个 repo 修一个 issue"的活，Opus 4.7 仍是最佳——这跟它 64.3% 的领先一致。

我个人的结论：**单看一个 benchmark 数字是没用的**，得把"你日常实际跑什么"和"哪个 benchmark 测什么"对上号。

[blog156](/posts/blog156_gpt5-claude-gemini-coding-comparison-2026/) 我写过 GPT-5.5 vs Claude Opus 4.6 vs Gemini 2.5 Pro 的编程对比——那篇是 4 月数据，Claude 4.6 / Gemini 2.5 数字已经过期。**5 月的对比建议看本文表格**。

## 变化 2：价格分化——头部腰斩，Anthropic 持平，Google 上涨

这是两个多月里最重要的变化之一。但**不是全行业降价**——是分化：OpenAI 和 DeepSeek 大幅降价，Anthropic 维持原价（在别人降价背景下相对变贵），Google 反而涨价。

| 模型族 | 3 月时（blog080 测试时主力价格）| 5 月时（最新版本价格）| 变化 |
|---|---|---|---|
| OpenAI（旗舰）| GPT-4 Turbo $10 / $30 | **GPT-5.5 $1.75 / $14** | 跨代 + 实际成本腰斩 |
| Anthropic（旗舰）| Claude 3 Opus $15 / $75 | **Opus 4.7 $5 / $25** | 跨代 + 成本降 2/3 |
| Google（旗舰）| Gemini 2.0 Pro 付费 $1.25 / $5 | **Gemini 3.1 Pro $1.50 / $12** | input +20% / output +140%，能力大升但成本明显增加 |
| DeepSeek | V3 / V3-Flash | **V4-Flash $0.14 / $0.56** | 价格腰斩 + 推理质变 |
| Kimi | 国内订阅制 | **K2.6 $0.95 / M（综合）** | 新增国际 API |
| Qwen 3 Coder | Qwen 2.5 Max（云 API）| **$0.30 / $1.50（可自托管）** | 开源 + 自部署降本 |

整体趋势：**OpenAI 大跨度降价**（GPT-4 Turbo → GPT-5.5：input -82.5% / output -53%），**DeepSeek 价格腰斩**，**Anthropic 持平**（Opus 4.7 仍 $5/$25，相对变贵），**Google 反而上涨**（Gemini 3.1 Pro 输出价 +140%）。

**对独立开发者的真实意义**：4 月前"跑一个完整 Agent 工作流" 月费约 $80-100，现在用 DeepSeek V4-Flash + Qwen 3 Coder 组合可以降到 **$15-20**。这是用户行为的拐点——不是"AI 工具便宜了"，是"独立开发者用得起完整工具链了"。

## 变化 3：开源旗舰追上来了

blog080 写时，开源模型和闭源前沿的差距是 25-40 分（SWE-bench / MMLU 任意基准）。**现在缩小到 5-15 分**。

最值得关注的开源候选：

- **GLM-5.1**：SWE-bench Pro 58.4%，距 Claude Opus 4.7 的 64.3% 仅 5.9 分。完全开源 + 商业可用
- **Qwen 3 Coder 32B**：单卡 H100 或 2×4090 即可跑，API 价 $0.30/$1.50（比 GPT-5.5 便宜 6-9 倍，按 input/output 不同维度）
- **DeepSeek V4-Pro**：长上下文 + Agentic 推理专项优化，性价比惊人

**意义**：blog080 时代"开源模型只能做 demo"的认知**已经过期**。5 月之后，"严肃项目用开源主力 + 闭源补强"是真实可执行的方案。

**我自己的实测**：我把工具站里的"重复批量任务"（修旧文章 frontmatter、批量改 tag、扫描隐私关键词）全部切到了自托管 Qwen 3 Coder 32B。开销几乎归零——服务器本来就在跑，模型推理用空闲算力。Claude Code 主力仍是 Opus 4.7（处理新功能、架构变更），但**70% 的"机械活"已经不用上 Claude**。3 月时这是不可能的——Qwen 2.5 在那种任务上经常乱来。

唯一注意：自托管 Qwen 3 Coder 32B 在中文长上下文（超过 50k tokens）下还是不如 Claude 稳，重要文档不要全压在它身上。

## 变化 4：Anthropic 内部更新节奏

Claude 这边变化非常密集，单独一节讲：

- **Opus 4.7**（2026-04-16 发布）—— 4.6 → 4.7 主要提升：编程任务 +5%、长上下文一致性显著改善
- **Opus 4.6 退役时间**：**2026-06-15**——6 月中后 API 仍指 opus alias 会自动切到 4.7
- **定价不变**：$5/$25，4.7 没涨价（在 GPT-5.5 大幅降价的背景下，相当于变贵）
- **Sonnet 4.6 仍是性价比之选**：$3/$15，多数日常编程任务用 Sonnet 完全够

**给 blog080 读者的实操**：如果你当时选的是 Claude 3.5 Sonnet 作为日常默认，**升到 Sonnet 4.6（$3/$15）即可**——同价位但编程能力大幅提升。如果选的是 Claude 3 Opus 处理复杂任务，应该直接升到 Opus 4.7（$5/$25）——成本仅 1/3 而且能力跨代。

**我自己怎么用**：90% 任务用 Sonnet 4.6（性价比之选），关键的架构决策 / 复杂多文件重构切到 Opus 4.7。我专门测过同一个任务 Sonnet vs Opus 的差异——多数日常 CRUD 完全感受不到差距，但写涉及"分布式状态、跨模块依赖、数据迁移"这种"想错就废一天"的活，Opus 多花的几倍 token 是值得的。

一个反直觉的观点：**4.7 没涨价不是好消息**。GPT-5.5 大幅降价、Gemini 实质涨价、Anthropic 维持原价——表面看 Anthropic 在稳定，实际是它在 GPT-5.5 性价比攻势下被动失去成本竞争力。如果你完全只看价格，5 月开始 Anthropic 已经不是最优选了。

## 变化 5：基础设施层的并购

4 个月里两个影响深远的并购：

- **2025-12 Anthropic 收购 Bun**——Claude Code 底层运行时从 Node.js 切到 Bun，启动速度提升 ~28%
- **2025-Q4 Cloudflare 收购 Astro**——Astro 6 把 Cloudflare Workers 作为一等部署目标

**对模型选型的影响**：

- 如果你在 Vercel 或 Cloudflare 部署，模型 + 基础设施的整合度比"哪个模型分数高"更重要
- 选 Claude 系列时，配合 Bun 生态有意外收益
- 选 Vercel v0（5 月转型成 Agentic 工作流）需要重新评估它和 Claude Code 的边界

## 变化 6：开发者经济门槛降一档

这是综合变化的结果——不是单一事件。

| 角色 | 3 月可用月预算 | 5 月可用月预算 |
|---|---|---|
| 独立开发者基础版 | $50（Claude Pro 一个）| $20（DeepSeek + Qwen + Claude Sonnet）|
| 中级（多模型混合）| $200 | $80 |
| Pro 全功能（Claude Code + Cursor + 多模型）| $400+ | $200 |

HN 5 月最热 thread 是 "我用 < $20 月费跑完整 AI 工作流"——这是这一变化的直接反映。

## 3 月做的选型现在该不该换

按 blog080 几个典型场景给"换不换"建议：

| 3 月你选的 | 5 月该不该换 | 理由 |
|---|---|---|
| Claude 3 Opus（高质量编程）| 直接升 Claude Opus 4.7 | 跨代提升 + 成本仅 1/3 |
| Claude 3.5 Sonnet（日常）| 升 Claude Sonnet 4.6（性价比之选）| 同价位 + 编程能力大幅提升 |
| GPT-4 Turbo / GPT-4o | 直接升 GPT-5.5 | 成本腰斩 + Terminal-Bench 跨代 |
| Gemini 2.0 Pro / Flash | 升 Gemini 3.1 Pro | 科学推理新王 + 长上下文稳定 |
| Qwen 2.5 Max（中文）| 升 Qwen 3 Coder（编程）或保留 Qwen 3.x（中文）| 阿里 Qwen 3 系列全面更新 |
| 没用过开源（觉得不行）| 至少试 GLM-5.1 或 Qwen 3 Coder | 开源差距缩到 5-15 分 |
| 全用单家模型（成本焦虑）| 加 DeepSeek V4-Flash 处理简单任务 | 成本可以降 80% |
| Cursor 订阅独大 | 重新评估 Claude Code + 多模型组合 | 5 月生态分化明显 |

## 总结

blog080 的核心结论"没有绝对最好的模型，只有最适合的模型"——**这条没变**。

变的是**判断标准**。3 月时是"GPT vs Claude vs Gemini"三家闭源模型三选一，5 月是 6+ 维度精细化决策（含开源旗舰）：

- 编程任务深度 → Claude Opus 4.7 / GPT-5.5
- Agentic / 终端任务 → GPT-5.5
- 科学推理 → Gemini 3.1 Pro
- 成本敏感 → DeepSeek V4-Flash / Qwen 3 Coder
- 自托管 / 合规 → GLM-5.1
- 长上下文 → Gemini 3.1 Pro / Kimi K2.6

**核心判断**：如果你 3 月以后没重新审视过模型选型，**现在花 1 小时按上面这个表格重审一次**。多数人能找到 30%+ 的成本节省或能力提升。

## 我的观点：5 月之后选型方法论的根本变化

写完这篇我有三个比"换哪个模型"更核心的认知变化：

**1. "选一个最强模型"是一种过时的思路**——我 3 月用 ChatGPT Plus 一个订阅干所有事，那时候这是合理的。但 5 月的最优解一定是"组合"：Sonnet 4.6 + Opus 4.7（关键任务）+ Qwen 3 Coder（批量机械活）+ Gemini（科学推理偶发任务）。**不再有"全能冠军"——任何相信单一模型能做所有事的人都在多花钱**。

**2. 自托管开源不再是"穷人方案"，而是"专业方案"**——我之前对自托管的偏见是"质量差、麻烦多、不值"。Qwen 3 Coder 32B 改变了这个判断：跑机械活的成本降到接近零，质量足够。**关键不是"开源能不能跟得上闭源"，而是"机械活根本不需要顶级模型"**。

**3. 关注模型公司的"姿态"而不只是"性能"**——5 月的格局变化里，最大的输家是 Google（涨价）和 Anthropic（被动）。表面上 Anthropic 模型能力仍是 SWE-bench 第一，但它在性价比维度的相对位置已经下滑。**模型公司的定价策略和产品节奏，是 6-12 个月后能力地位的领先指标**。这一条独立开发者尤其要看——你换模型的成本比企业小，对价格变化更敏感。

这三点是 blog080 时代根本不存在的判断维度。如果你只记住一句话：**5 月之后，AI 模型选型不再是"产品选型"，而是"组合策略"**。

---

**延伸阅读**：
- [Vellum LLM Leaderboard](https://www.vellum.ai/llm-leaderboard) - 实时模型排行
- [LM Council Benchmarks](https://lmcouncil.ai/benchmarks) - 多维度基准对比
- [LLM Stats - 300+ 模型对比](https://llm-stats.com/) - 含价格 / 速度 / 智能度三维
