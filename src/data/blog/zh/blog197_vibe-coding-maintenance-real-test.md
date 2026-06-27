---
author: 陈广亮
pubDatetime: 2026-06-27T11:21:19+08:00
title: 接手 AI 写的代码后我心态崩了——维护期才是 Vibe Coding 真正的考场
slug: blog197_vibe-coding-maintenance-real-test
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI Agent
  - Claude Code
  - 开发效率
  - 自动化
description: Karpathy 2025/2 提出 Vibe Coding 时只讲写得有多爽，但 GitClear 211M 行代码研究和 2026 业界 rescue 案例都把"爽"映射到了"第二年维护成本 4 倍"。本文拆 Vibe Coding 在 90 天 Spaghetti Point 崩盘的 3 个机制，以及怎么在写完即弃和不可维护之间找平衡。
---

## 现象：从"AI 帮我两天上线一个 SaaS"到"我每天调试 AI 留下的烂摊子"

2025 年 2 月，Karpathy 在 X 发了那条把 vibe coding 推火的推文，原话里有几句被反复引用："我现在永远点 'Accept All'，diff 不读了，遇到错误就把报错粘回去，通常它就修好了"。这条推文导致 vibe coding 被 Collins 选为 2025 年度词汇，到 2025 年底已经成了创业圈、独立开发者、甚至大厂内部 hackathon 的默认动词。

但 2026 上半年，剧本翻面。

我自己接手过两个 vibe coding 写的项目——一个是朋友独立做的 SaaS、一个是公司内 hackathon 留下的小工具。两个都有同一个症状：**头两个月加新功能极快、第三个月开始诡异 bug 越修越多、第四个月每个小改动都要回归测试半天**。我把它们各重构掉一遍以后，整体投入比"如果一开始就正常写"还要多。

这不是个例。Autonoma 2026/4 那篇文章里有个直观的词叫 **"Spaghetti Point"**——vibe coding 第一周明显比正常写快，但**曲线在第 3 个月左右交叉**，之后每加一个 feature 都会撞坏现有的。GitClear 对 2.11 亿行代码的纵向研究给出了硬数据：被 refactor 过的代码占比从 2020 年的 **24.1% 降到 2024 年的 9.5%**，同期重复代码块的出现频率上涨 **8 倍**。第二年的维护成本，多份独立来源都得出 **4 倍**于传统写法。

这篇就是写这个落差——**Vibe Coding 在写的时候是产品问题，在维护的时候才暴露成工程问题**。下面拆三个 90 天 Spaghetti Point 的机制，最后给一套我现在用的折中工作流。

## 机制一：LLM 单次 prompt 看不到系统整体

第一个、也是最根本的机制：**LLM 每次只看到当前 prompt + 它能塞进 context 的那部分代码，但看不到系统的全貌**。

它每次回答都在做一件事——"在你给我看的这段局部里，怎么改最合理"。这个**局部最优**在单 prompt 内是高质量的：函数签名漂亮、变量名清楚、注释写得有水平。但 100 个 prompt 累计下来，**全局结构没人在管**。

你会看到这种典型症状：
- **同一个数据模型有 3 个略不同的定义**——一个 prompt 让 AI 在 `api/user.ts` 定义了 `User`，另一个 prompt 在 `services/profile.ts` 又重新定义了 `UserProfile`，第三个 prompt 在 `db/queries.ts` 自己造了 `UserRecord`，三个长得很像但字段不完全一致
- **错误处理风格混乱**——上一次让 AI 写的模块用 throw + try/catch，下一次让它写的模块用 Result<T, Error>，再下一次它又用了回调里塞 error 字段，**每一段单看都对，合起来一团乱**
- **没有模块边界**——AI 不知道你的项目里 "auth 子系统不应该直接 import billing 子系统"，因为这条边界**只在你脑子里**，没在代码里物理表达过

GitClear 数据里"重复代码 8 倍"和"refactor 比例腰斩"对应的就是这个机制：AI 不重构、AI 重复、AI 单点决策。每个单点都对，整体却没人在画图。

**这一点和人写代码的最大区别在于：人写多了同一个系统会自然形成 mental model，下次再改时会下意识维护一致性；AI 永远是第一天上班，每次都问"我现在该改什么"，没有"我之前还做过哪些类似决策"的连续性**。

## 机制二："Accept All + 不读 diff" 让默认习惯从 reviewer 退化成 typist

Karpathy 原文里那句 "我永远点 Accept All、不读 diff 了" 是 vibe coding 美学的核心。但这个习惯的真正代价不是当下——是**半年后**。

写代码时不读 diff 意味着：
1. 你对**这段代码为什么这样写**没记忆
2. 你对**当初有哪些方案 AI 没选**没认知
3. 你对**这段代码隐含了哪些假设**完全不知道

这三件事在写的时候都不重要——反正能跑。但**维护期它们是全部**——你想加一个 feature，需要先回答"现在这块逻辑为什么这样设计"，但你答不上来。**你成了自己代码的陌生人**。

Wharton 那个 1372 人研究我在 [blog195](https://chenguangliang.com/posts/blog195_loop-engineering-three-debts-playbook/) 引用过——AI 答错时人类 73% 仍然采纳；这里的延伸效应是：**73% 采纳是写时**的，维护时这 73% 里有相当一部分会被发现是错的，但**到那时谁也想不起来当初为什么会选 A 不选 B**。理解债（comprehension debt）按"先享受后还款"的方式累积，正是 vibe coding 让它达到峰值。

GitClear 数字里有个特别能说明这点的：**移动行数（refactored lines）占比从 24.1% 降到 9.5%**。refactor 是"理解了原代码 → 看出更好的写法 → 改写"，refactor 的下降意味着**没人在真正理解代码**——大家在不断**追加**而不是**重构**。重构需要 mental model，但 vibe coding 把 mental model 这条链路砍掉了。

业界里也有个直接对应的数据：**67% 的开发者反映自从用 AI 助手后 debug 的时间反而变多了**（Stack Overflow 2025 给出的另一个口径是 45.2%，取决于问法）。debug 之所以慢，正是因为你在 debug 一段自己没真正写过的代码。

## 机制三：测试也是 AI 写的——双层 hallucination

第三个机制最隐蔽：vibe coding 项目里，**测试也通常是 AI 写的**。开发者会让 AI 帮自己生成测试，AI 也很乐意——它会写得很标致、覆盖率指标也漂亮。

问题是 **AI 写的测试，几乎只测了 AI 当时写代码时考虑到的那些 case**。它不会测：
- 真实业务上**昨天用户反馈的那个边界**（AI 不知道这个反馈存在）
- 你**口头讨论过但没写进 PRD 的隐式需求**（AI 没看到）
- 跨模块组合时**只有人才能想到的诡异交互**（AI 一次只看一个模块）

更糟糕的是这是**双层 hallucination**：业务代码有它的 hallucination，测试代码有它的 hallucination，**两层 hallucination 互相对齐**——业务代码假设输入 X 是这样，测试也用同样的假设造 mock，**结果测试全绿、prod 一炸**。

OWASP 那个常被引用的数字——**45% AI 生成代码含 CWE 级别漏洞**——里面相当一部分是测试覆盖率高但实际漏洞 wide open。"测过了"在 vibe coding 项目里已经不能再被当作"这是对的"的等价证据，因为 maker 和 verifier **没有真正独立**（呼应 blog195 里讲的 verifier sub-agent 必须 prompt 独立、context 独立的原则）。

最终结果是 mid-2026 的一个公开现象：**大量 vibe-coded SaaS 项目进入 rescue engineering 阶段**，市面上 rescue 报价普遍在 **$50,000 - $500,000** 区间。这些钱很多人当初省的就是 AI 提速的时间——本质是把成本从"研发阶段"挪到了"补救阶段"，**总账反而是赔的**。

## 三个机制叠加：90 天 Spaghetti Point 的复利

把三个机制合起来看：

| 月份 | 表象 | 真实状态 |
|---|---|---|
| 1 月 | "我两天就上线了 MVP" | 局部最优、重复定义、未读 diff、测试全绿 |
| 2 月 | "再加 3 个 feature，AI 还能帮我" | 全局结构开始漂移，模块边界已模糊 |
| 3 月（**Spaghetti Point**） | "诡异 bug 越修越多" | 修 A 撞 B，因为 A B 共享了一个 AI 几个月前隐式假设的状态 |
| 4 月 | "每次改动都要全量回归" | 测试不可信、文档不存在、设计没人记得 |
| 6 月 | "要不重写一遍？" | rescue 成本进场 |

这条曲线的形状是**复利**——三个机制不是独立加起来，是**互相放大**：
- 局部决策的不一致 → 让"读 diff 重建理解"成本极高
- "不读 diff" → 让维护时无法快速识别哪些决策有问题
- AI 写的测试 → 让"全绿 = 安全" 这条传统信号失效

这三件事相互抵消了正常工程里的所有制衡机制——code review、测试、架构连续性。**没有制衡的系统在 90 天后必然 spaghetti**。

## 折中工作流：怎么用 AI 又不让自己 6 个月后崩

Karpathy 自己后来在 **YC AI Startup School** 演讲里把这套范式叫 "**Software 3.0**"（Software 1.0=code、2.0=weights、3.0=prompts），并提出从纯 vibe coding 往 "**agentic engineering**" 升级——把 AI 当协作伙伴而不是黑盒生成器，**人保留方向决策权**。我自己跑了几个项目下来收敛出来的折中流程，跟这个方向一致。

给三类不同 stake 的代码，不同对待：

**类型 A：写完即弃 / 一次性脚本 / hackathon / spike**
照样 vibe coding，**全程 Accept All**。这类代码寿命不超过两周，理解债不会复利。
- 唯一约束：**写完就标 deprecated**，禁止任何人把这段代码"借鉴"到生产
- 实操：仓库根放一个 `.experimental` 标记 + AGENTS.md 写明"此目录代码不进 main"

**类型 B：MVP / 早期产品 / 可能但不确定要长期维护**
**写 vibe + 第一次重大改动前重读所有 diff**。前期享受 AI 的速度，但在"第 2 个 feature 之前"做一轮强制 review。
- 实操：让 AI 自己写一份 `ARCHITECTURE.md` 总结当前模块边界 + 数据流 + 显式决策，**人在白纸前对照代码读一遍**
- 这一步通常会发现 30%-50% 的隐式不一致，比 3 个月后再发现便宜 10 倍

**类型 C：生产代码 / 长期维护 / 团队多人协作**
**禁用 vibe coding**，回到 AI-assisted 但人在每个 diff 上做决策：
- AI 提方案，人选一个，人写关键路径，AI 填充骨架（不是 AI 决方向）
- 强制 code review 必读 diff（呼应 blog195 里的 "why-not-what" PR template）
- 测试由 verifier sub-agent 独立 spawn，跟 maker 不共享 prompt
- **任何"接手 AI 写的旧代码"都按 "代码考古" 模式对待**——先花半天读完 + 写出 mental model，再动手

这三类的核心区别：**理解债**是会复利的，**复利前要么早还、要么承诺它永远不还（写完即弃）**。最坏的是"我以为是 A 类，结果半年后它进了生产"——所有 rescue 案例都长这样。

## 最后

Karpathy 那条原始推文还在 X 上挂着，2025 年 2 月发的。一年半后回头看，他说的"forget that the code even exists" 和 "embrace exponentials" 是真的——只是 exponential 不止有上行，也有下行。**写得有多爽，维护就有多崩**，这是 vibe coding 留下的、最不被讨论但最贵的账单。

如果你正在用 vibe coding 写东西，先回答自己一个问题：**这代码三个月后是你接手、还是别人接手、还是直接删掉？**

- 三个月后删 → 继续 vibe
- 自己接手 → 现在就开始写 mental model
- 别人接手 → 别 vibe，按生产代码标准来

回答这一个问题，能省下你未来六个月一半的痛苦。Spaghetti Point 是真的，但它**只在你自己看不到它的时候才会到达**。

---

**延伸阅读**：

- [Karpathy 原始 vibe coding 推文](https://x.com/karpathy/status/1886192184808149383) - 2025/2/3 那条引爆全网的原帖
- [Vibe coding - Wikipedia](https://en.wikipedia.org/wiki/Vibe_coding) - 概念起源 + Collins 2025 年度词汇背景
- [GitClear AI Code Quality 2025 Research](https://www.gitclear.com/ai_assistant_code_quality_2025_research) - 211M 行代码纵向研究，refactor 比例 / 重复代码 / churn 全量数据
- [Debt Behind the AI Boom - arXiv 2603.28592](https://arxiv.org/abs/2603.28592) - 学术级 AI 代码债务大规模实证研究
- [Autonoma: Vibe Coding Technical Debt - The 90-Day Reckoning](https://getautonoma.com/blog/vibe-coding-technical-debt) - "Spaghetti Point" 概念原始提出文
- [Vibe Coding's 90-Day Reckoning（buildthisnow 综述）](https://www.buildthisnow.com/blog/guide/mechanics/vibe-coding-technical-debt) - 汇总 Spaghetti Point 现象的综述
- [本博客 blog195 - Loop Engineering 三条债 playbook](https://chenguangliang.com/posts/blog195_loop-engineering-three-debts-playbook/) - 治理 verification/comprehension/cognitive surrender 的具体方案，跟本文互补
