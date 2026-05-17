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

[2026 AI 大模型全景对比](/posts/blog080_ai-models-comparison-2026/) 是我博客流量最大的文章之一。它写于 2026 年 3 月初，当时测的是 GPT-4 Turbo / GPT-4o / Claude 3 Opus / Claude 3.5 / Gemini 2.0 Pro / Qwen 2.5 Max / Kimi 等 12 款模型。

两个多月过去——这个领域两个月相当于其他行业两年——模型层、价格层、能力层都发生了根本变化。GPT-5.5 / Claude Opus 4.7 / Gemini 3.1 Pro 接管前沿，原文里没出现过的开源旗舰 GLM-5.1 / DeepSeek V4 已经追到闭源 5-15 分内。如果你 3 月看过 blog080 并基于它做了选型，**现在很多结论已经不成立**。

这篇是 blog080 的 5 月升级版。**不重复讲基础信息**（什么是 GPT / Claude / Gemini）——只讲：两个多月里**变了什么、没变什么、3 月做的选型现在该不该换**。

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

## 变化 4：Anthropic 内部更新节奏

Claude 这边变化非常密集，单独一节讲：

- **Opus 4.7**（2026-04-16 发布）—— 4.6 → 4.7 主要提升：编程任务 +5%、长上下文一致性显著改善
- **Opus 4.6 退役时间**：**2026-06-15**——6 月中后 API 仍指 opus alias 会自动切到 4.7
- **定价不变**：$5/$25，4.7 没涨价（在 GPT-5.5 大幅降价的背景下，相当于变贵）
- **Sonnet 4.6 仍是性价比之选**：$3/$15，多数日常编程任务用 Sonnet 完全够

**给 blog080 读者的实操**：如果你当时选的是 Claude 3.5 Sonnet 作为日常默认，**升到 Sonnet 4.6（$3/$15）即可**——同价位但编程能力大幅提升。如果选的是 Claude 3 Opus 处理复杂任务，应该直接升到 Opus 4.7（$5/$25）——成本仅 1/3 而且能力跨代。

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

---

**延伸阅读**：
- [Vellum LLM Leaderboard](https://www.vellum.ai/llm-leaderboard) - 实时模型排行
- [LM Council Benchmarks](https://lmcouncil.ai/benchmarks) - 多维度基准对比
- [LLM Stats - 300+ 模型对比](https://llm-stats.com/) - 含价格 / 速度 / 智能度三维
