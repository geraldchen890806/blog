---
author: 陈广亮
pubDatetime: 2026-06-11T16:30:00+08:00
title: Claude Fable 5 上手两天：API 集成方真正要改的 5 件事
slug: blog190_claude-fable-5-integration-guide
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI
  - LLM
  - Claude Code
  - JavaScript
description: Anthropic 6/9 发布的 Fable 5 把命名从 Opus/Sonnet/Haiku 换成 Fable/Mythos，但真正让所有 Claude API 集成方都得动代码的不是名字——是新增的 stop_reason refusal、强制 adaptive thinking、和"必须配 fallback 模型"这套机制。我在 Claude Code 上跑了两天后，把集成方该改的细节拆给你看。
---

6 月 9 日 Anthropic 发布 Claude Fable 5 时，社交媒体上最热的话题是命名——为什么放弃用了两年多的 Opus/Sonnet/Haiku 三档体系，转去用 "Fable 5" 和 "Mythos 5" 这种新词？这是个值得讨论的产品策略问题，但**对于真正在调 Claude API 的开发者来说，名字根本不是关键变化**。

我把 Claude Code 的默认模型切到 `claude-fable-5` 跑了两天，又翻了一遍官方文档，发现这次升级在**集成层**埋了 5 个会让现有代码翻车的细节。如果你已经在产品里集成 Claude API，下面这些是你绕不开的。

> 本文不复述 benchmark（80% SWE-Bench Pro 的数字所有媒体都写了）；专注集成视角。想看能力对比的可以直接看 [Anthropic 官方发布](https://www.anthropic.com/news/claude-fable-5-mythos-5)。

## 1. 新增的 `stop_reason: "refusal"` 是一颗暗雷

Claude Fable 5 内置了 **safety classifiers**——一组分类器会在请求阶段判断要不要拒绝。被拒绝时，Messages API **返回的不是 4xx 错误**，而是一个状态码 200 的成功响应，但 `stop_reason` 字段值为 `"refusal"`。

```json
{
  "stop_reason": "refusal",
  "content": []
  // 响应中还会附带触发哪个 classifier 的元数据，具体字段名以实际响应为准
}
```

这意味着你之前的"接到 200 就算成功"的处理逻辑会**默默失败**——`content` 数组是空的，下游业务以为模型返回了空字符串，可能写进数据库、推送给用户、触发后续工作流。官方说这种拒绝触发率"平均小于 5% 的会话"——注意是**会话级别**（sessions），不是单次请求级别，多轮对话里只要触发一次就算一次。

**要改的地方**：

```typescript
// 旧逻辑
if (response.status === 200) {
  return response.content[0].text;  // ← Fable 5 下可能是 undefined
}

// 新逻辑
if (response.stop_reason === "refusal") {
  // 走 fallback 或返回友好提示
  return await fallbackToOtherModel(prompt);
}
return response.content[0].text;
```

之前 Opus/Sonnet/Haiku 系列都没这个返回值。如果你的代码库里有 N 个调用 Anthropic SDK 的地方，每一处都得 grep 一遍——这是个**纯整改工作量**，没有捷径。

## 2. Fallback 不再是"可选优化"，是默认架构

Fable 5 的 refusal 在会话层面"平均小于 5%"——单次会话内一旦触发就影响整段交互，对面向用户的产品而言，**5% 会话感受到拒绝的体验是不能接受的**。Anthropic 自己也承认这点，所以给了三种 fallback 路径：

| 方式 | 适用 | 一句话 |
|---|---|---|
| **服务端 fallback** | Claude API / AWS（beta） | 加 `fallbacks` 参数，API 自动帮你重试到指定模型 |
| **客户端 middleware** | TS / Python / Go / Java / C# SDK | SDK 层重试，任意平台都能用 |
| **手动重试** | 自建编排 | 自己写重试逻辑，最灵活但要自己处理 prompt-cache 切换成本 |

**关键认知**：以前用 Claude 一个模型号能跑完所有任务，现在必须设计"Fable 5 + 一个 fallback 模型（一般是 Opus 4.8）"的**双模型架构**。这改变了系统设计层面的预期——你的 prompt 必须在两个模型上都能跑出可接受的结果，否则 fallback 触发时用户感受到的就是质量断崖。

我个人在 Claude Code 里测的体验：开 Fable 5 写一段涉及生物学知识的代码注释，refusal 率明显高于纯代码场景。中文社区如果做医疗、安全、化学相关的内容产品，这个比例可能会高得多。

## 3. Adaptive Thinking 强制开启，无法关闭

之前 Sonnet 系列的 thinking 模式是可选的，你可以传 `thinking: {"type": "disabled"}` 跑无思考的快速响应。**Fable 5 上这个开关被移除了**，adaptive thinking 是唯一模式：

> `thinking: {"type": "disabled"}` is not supported.

只能通过 `effort` 参数控制思考的深度（low/medium/high），不能完全关掉。

**这对成本敏感的场景影响很大**：

- 简单分类、提取、改写这类任务，之前用 Sonnet 关掉 thinking 几乎是零开销
- 现在 Fable 5 至少会跑一遍 adaptive thinking，最少也会消耗一定 token
- 而且 Fable 5 定价是 `$10/$50 per M tokens`（输入/输出），属于 Opus 同档定价

如果你的产品里有大量"简单调用"，**不要无脑切到 Fable 5**——继续用 Sonnet 4.6 / Haiku 4.5 才是经济选择。这是 Anthropic 把 Fable 5 定位为"最强模型"而不是"主力模型"的真实含义。

## 4. Raw chain-of-thought 永远不返回了

之前调用 thinking 模式时，可以拿到模型完整的思考链原文用于审计、调试、prompt 优化。Fable 5 上这个能力**被完全收走**：

```typescript
// thinking.display 只能选这两个值
type ThinkingDisplay = "summarized" | "omitted";
// "summarized" → 返回可读的思考摘要
// "omitted"    → 默认值，thinking 字段为空
```

**对工程师的影响**：

- 想看模型"为什么这么答"，只能拿到 Anthropic 加工过的 summary，不再是原始 chain-of-thought
- 想抓 bug、想用思考链做下游 prompt-tuning 的工作流，现在拿不到原料
- 多轮对话中需要把 thinking blocks **原样传回**（不要修改内容），不然下一轮模型会丢失上下文

我猜 Anthropic 这么做有两个原因：一是保护模型 IP（避免被提取训练数据），二是避免用户看到 raw thinking 里那些"模型不确定"或"考虑过另一种回答"的内容引发误解。但对工程师来说，**可观测性确实降了一档**。

## 5. 1M Context + 128k 输出，但 30 天数据保留期是硬约束

Fable 5 / Mythos 5 共享的规格：

- Context window：**1M tokens**（百万级，相当于一本中等厚度的书）
- 单次输出：**up to 128k tokens**
- 数据保留期：**30 天**，且**不支持 zero data retention**

最后这条值得画重点。两个模型都被 Anthropic 标记为 **"Covered Models"**——意味着哪怕你是企业客户、想签 ZDR 协议，**也没办法立刻把数据保留期清零**。

对于：
- 医疗、金融、法律领域的产品（合规要求严格）
- 处理用户隐私数据的应用
- 自带数据合规边界的政府/企业内部使用

这条直接限制了 Fable 5 能不能进生产环境。要么改用 Opus 4.8 拿到 ZDR 选项，要么走 Project Glasswing 申请 Mythos 5 的特殊渠道（仅限 cyberdefenders 和经批准的研究机构）。

## 命名换轨：我的猜测

回到大家最热衷讨论的问题——为什么是 Fable / Mythos，不是 Opus 4.9？Anthropic 官方对这两个词的解释是：它们都源于"被讲述的故事"——Fable 来自拉丁词 *fabula*，Mythos 是希腊词，两个词本身是近亲；**真正区分两个模型的是 safeguards**，不是底层能力。

这里有官方原话兜底，但他们没公开讲为什么放弃 Opus/Sonnet/Haiku 这套大家已经熟悉的命名。我没有内部信息，但根据这次发布的所有细节推测，最合理的解释是：

**Anthropic 在重新定义模型层级，并把"对外可用"和"特殊用途"在产品名层面就切开。**

- Opus / Sonnet / Haiku 是"按能力分档"的命名——好的、中的、快的
- Fable / Mythos 是"按访问权限分档"的命名——公开可用的 / 限定渠道的

Mythos 5 不公开发布，但底层模型和 Fable 5 是同一个。**这是 Anthropic 第一次明确地把"能力"和"安全分类器"在产品命名层就剥离开**。下次他们再发模型，可能就是 "Saga 6 / Epic 6"——"故事/神话/史诗"这套词族留着位置呢。

这个命名也巧妙地回避了一个尴尬：他们刚在几天前公开警告 "AI 系统进展太快，可能很快实现递归自我改进"，转头就把"最强模型"放给公众用。**用 "Fable"（寓言、可阅读的故事）这个词，是把"已经驯化"的语义编进产品名里**——比起 "Opus 5"（更大更强的同类延续），"Fable 5" 在叙事上不那么具威胁性。

这就是为什么 [TechCrunch 那篇文章](https://techcrunch.com/2026/06/09/anthropic-released-claude-fable-5-its-most-powerful-model-publicly-days-after-warning-ai-is-getting-too-dangerous/)把矛盾感放在标题里——"几天前刚警告 AI 太危险，现在公开发了最强模型"。从安全叙事到产品叙事的中间过渡，命名担了一部分活。

## 我现在的做法

两天上手下来，对自己产品和 Claude Code 工作流的调整：

1. **Claude Code 默认模型暂不升级到 Fable 5**——我大量调用是写代码、跑工具调用，refusal 风险低，但 thinking 强制开启会让简单任务变贵。Sonnet 4.6 + Opus 4.8 仍是主力
2. **未来新接入 Anthropic API 的项目，从一开始就按"Fable + Opus 4.8 fallback"架构设计**——避免后面回头改
3. **不在生产代码里依赖 raw thinking**——这条算给未来自己提个醒，避免锁死在不可观测的依赖上
4. **30 天数据保留期**——产品如果有合规要求，这条直接进 ADR（架构决策记录）

最后说一句：**新模型的命名讨论容易上头条，但真正影响代码的从来都是 API 行为变化。** 这次升级我看到的最大变化不是 Fable 这个词，是 refusal + fallback 这套新的"双模型协作"范式——它把"用 Claude"从"调一个 API"变成了"运营一个由两个模型组成的系统"。这正好对应我在 [blog186 讲的四层嵌套](/posts/blog186_prompt-context-harness-agentic-layers/) 里 harness 层的工作——以前的 harness 只管"一个模型 + 工具调用"，现在要管"两个模型的协作 + 拒绝-fallback 路径"。这才是值得长期适应的东西。

---

**参考资料**：
- [Claude Fable 5 and Mythos 5 announcement](https://www.anthropic.com/news/claude-fable-5-mythos-5) — Anthropic 官方发布
- [Introducing Claude Fable 5 and Claude Mythos 5](https://platform.claude.com/docs/en/about-claude/models/introducing-claude-fable-5-and-claude-mythos-5) — 官方技术文档
- [Anthropic released Claude Fable 5...days after warning AI is getting too dangerous](https://techcrunch.com/2026/06/09/anthropic-released-claude-fable-5-its-most-powerful-model-publicly-days-after-warning-ai-is-getting-too-dangerous/) — TechCrunch 矛盾叙事
- [Refusals and fallback](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback) — fallback 三种实现细节
