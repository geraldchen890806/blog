---
author: 陈广亮
pubDatetime: 2026-03-19T10:00:00+08:00
title: Karpathy 的 AutoResearch：让 AI Agent 自主跑完 700 个 ML 实验
slug: blog091_karpathy-autoresearch-autonomous-ml
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI
  - AI Agent
  - 机器学习
  - 自动化
  - 开源
description: 解读 Karpathy 开源的 AutoResearch 项目：一个 630 行的 Python 脚本如何让 AI agent 在单 GPU 上自主进行 ML 实验，两天累计完成 700 个实验并找到 20 个有效优化。从架构设计到实际应用，分析这个"Karpathy Loop"模式为什么值得每个开发者关注。
---

3 月初，Andrej Karpathy 在 X 上发了一条帖子，说他让一个 AI coding agent 在单 GPU 上自主跑 ML 实验。一夜之间，agent 完成了几十个实验，模型的验证指标有了可测量的提升。

这条帖子直接炸了。一周内，对应的 GitHub 仓库 autoresearch 拿到了 3 万+ star，成为 GitHub 历史上增长最快的仓库之一。Shopify CEO Tobias Lütke 拿去跑了一下，一夜 37 个实验，性能提升 19%。Fortune 和 The New Stack 跟进报道，有人把这个模式叫做 "The Karpathy Loop"。

但抛开热度不谈，这个项目真正有趣的地方在于它的极简设计。整个系统只有 3 个文件，核心逻辑 630 行 Python。它展示了一种新的 agent 工作模式——不是让 AI 写一段代码然后人来检查，而是让 AI 自主进行完整的"假设-实验-评估-迭代"循环。

## 三个文件，一个循环

autoresearch 的文件结构简单到几乎不需要解释：

- `prepare.py` — 数据准备、tokenizer 训练、评估函数。**不可修改**，是实验的固定基础设施。
- `train.py` — 模型定义、优化器、训练循环。**agent 唯一可以修改的文件**。
- `program.md` — 给 agent 的自然语言指令。**人类唯一需要写的东西**。

工作流程也很直接：

1. agent 读取 `program.md` 了解实验规则
2. 先跑一次 `train.py` 建立 baseline
3. 修改 `train.py`（架构、超参、优化器，什么都能改）
4. 跑 5 分钟训练，记录验证指标 `val_bpb`
5. 如果比 baseline 好，保留改动；如果更差，git reset 回滚
6. 重复步骤 3-5

就这样。没有复杂的调度器，没有分布式框架，没有 dashboard。一个 agent，一个 GPU，一个 metric，一个循环。

## program.md：用英文写的"研究组织代码"

这个项目最值得琢磨的部分不是 Python 代码，而是 `program.md`。Karpathy 把它叫做"research org code written in English"——用自然语言写的研究组织代码。

看一下它的核心结构：

**能做什么**：修改 `train.py`，包括模型架构、优化器、超参数、batch size、模型大小——一切都可以改。

**不能做什么**：不能改 `prepare.py`，不能装新依赖包，不能修改评估函数。

**优化目标**：`val_bpb`（验证集 bits per byte），越低越好。

**简洁性原则**：同等效果下更简单的方案优先。0.001 的提升但引入 20 行 hack 代码？不值。删代码还能维持或提升效果？值。

这份指令的精妙在于它定义了一个严格约束的实验环境：

- **单一可编辑文件**：scope 可控，diff 可审查
- **固定时间预算**：每次实验恒定 5 分钟，跨实验可比
- **单一评估指标**：避免多目标优化的模糊地带
- **自动回滚机制**：失败实验不会污染后续实验

这套约束不是限制，而是让自主循环能够稳定运转的前提条件。没有明确的边界，agent 会发散到无意义的探索空间里去。

## 三层编程：一种新范式

autoresearch 展示了一种有趣的三层编程模型：

**第一层**：`prepare.py` 定义了实验环境和评估标准——传统代码，人写的，不可变。

**第二层**：`train.py` 包含模型和训练逻辑——Python 代码，agent 在实验过程中持续修改。

**第三层**：`program.md` 描述 agent 的行为准则——自然语言，人写的，指导 agent 如何做研究。

信息流的方向是：人类用英文写 program.md → LLM 把指令转化为对 train.py 的修改 → Python 代码训练神经网络。

人不直接改模型代码了。人改的是"改模型代码的规则"。这是一个元编程的思路——你在编程的不是模型本身，而是研究这个模型的过程。

## 实际效果：数字说话

Karpathy 在 X 上分享了多次运行的数据。其中一次约 12 小时的运行：

| 指标 | 数值 |
|:-----|:-----|
| 运行时长 | 约 12 小时 |
| 完成实验数 | 110 个 |
| val_bpb 起点 | 0.862415 |
| val_bpb 终点 | 0.858039 |

后续他让系统持续跑了两天，累计完成约 700 个实验，从中筛选出 20 个有效优化。把这 20 个优化应用到一个更大的语言模型上，训练速度提升了 11%（据 Fortune 报道）。

Shopify CEO Lütke 在内部数据上跑了一夜：37 个实验，性能提升 19%。

这些数字不大，但关键是它们是**零人工干预**的情况下产生的。你设定好规则，睡一觉，起来看结果。

## 和 AutoML 的区别

autoresearch 初看很像 AutoML——都是自动搜索更好的模型配置。但它们的搜索方式本质不同。

**AutoML**：在预定义的搜索空间（超参数范围、候选架构列表）中用算法（贝叶斯优化、进化策略等）搜索最优组合。

**autoresearch**：没有预定义搜索空间。LLM 直接阅读代码，理解当前实现，然后提出修改方案。它可以重构架构、换优化器、引入新技巧——搜索空间是"所有合法的 Python 代码修改"。

打个比方：AutoML 像是在一个固定的棋盘上搜索最优落子，autoresearch 像是允许 agent 重新设计棋盘。

当然也有代价。AutoML 的搜索是系统化的，能保证一定程度的覆盖。autoresearch 依赖 LLM 的"直觉"——它可能会反复在类似的方向上尝试，遗漏一些有潜力的探索路径。但对于当前 LLM 的能力水平，这种基于代码理解的探索往往能发现 AutoML 搜索空间定义之外的优化。

## 这个模式能用在什么地方

Karpathy 在 X 上说了一句很关键的话："任何你关心的、能高效评估的指标，都可以被 agent swarm 来 autoresearch。"

这句话的潜台词是：autoresearch 不只是一个 ML 实验工具，它是一种通用模式。只要你的问题满足三个条件，就能套用：

1. **有一个可量化的评估指标**——val_bpb、响应时间、测试通过率、压缩率，都行
2. **有一个 agent 可以修改的代码/配置文件**——不需要很大，越小越好
3. **单次实验的时间成本可控**——5 分钟、10 分钟，不能是跑一天的那种

已经有人在其他领域尝试了：

- **Autosearcher**：分布式版本，多个 agent 并行跑实验并共享发现。早期运行中，系统自主重新发现了 Kaiming 初始化和 RMSNorm 等技术
- **AutoVoiceEvals**：用同样的循环优化语音 agent 的 prompt，据开发者称经过多轮迭代后调度成功率大幅提升，而且最终 prompt 反而更短了

再往外推演一下：

- **前端性能优化**：agent 修改 webpack/vite 配置，跑 lighthouse 评分，保留提升的改动
- **API 响应时间优化**：agent 修改数据库查询或缓存策略，跑 benchmark，迭代
- **编译器优化 pass**：agent 修改优化 pass 的参数，跑编译+性能测试

核心思路都一样：把"人类工程师手动调参、跑测试、看结果、决定下一步"这个循环，交给 agent 自主运转。

## 局限性和风险

autoresearch 很有启发性，但也有明显的边界。

**只适合小规模实验**。Karpathy 的 train.py 是 630 行代码，模型在单 GPU 上 5 分钟就能跑完。真实的前沿模型训练代码可能有几十万行，训练一次几周起步。Karpathy 自己也承认"在规模化场景下复杂得多"。

**LLM 的探索是有偏的**。agent 的改动方向受限于 LLM 的训练数据和"认知"。如果某个优化技巧不在 LLM 的知识范围内，它大概率不会尝试。而且 LLM 可能会在某个方向上反复打转而不自知。

**安全性值得关注**。你让一个 agent 不受限制地修改代码并执行——这本身就有风险。autoresearch 通过限制可修改文件和禁止安装新依赖来缓解，但如果你把这个模式套到其他场景（比如修改服务器配置），需要更严格的沙箱。

**不适合需要人类判断的指标**。val_bpb 是纯客观指标，机器可以自动计算。但如果你的目标是"文本质量"或"用户体验"，就需要人参与评估，自主循环的优势就没了。

## "The Karpathy Loop" 给开发者的启示

即使你不做 ML 研究，autoresearch 的设计思路也值得借鉴。它本质上回答了一个问题：**怎么把一个需要人持续参与的迭代过程变成 agent 能自主运转的循环？**

答案是三个约束：

1. **单一可变量**：只给 agent 一个可以改的东西（一个文件、一份配置），其余锁死
2. **客观评估函数**：定义一个可自动计算、不需要人判断的指标
3. **固定时间窗口**：每轮实验时间恒定，保证可比性，也防止 agent 跑飞

加上一个回滚机制——改坏了就回滚——整个系统就能安全地自主运转。

Karpathy 展望未来时说，下一步是从单 agent 线性迭代变成多 agent 并行探索。"目标不是模拟一个博士生，而是模拟一个博士生社区。"

这话听起来有点科幻，但 autoresearch 已经证明了第一步是可行的。而且这第一步，只需要 630 行 Python 和一份写得好的 Markdown。

---

**相关阅读**：
- [AI Agent 驱动开发：从工具到工作流的范式转变](https://chenguangliang.com/posts/blog078_ai-agent-driven-development/) - 探讨 AI agent 在软件开发中的工作流变革，与 autoresearch 在 ML 研究中的范式转变互为补充
- [AutoResearch GitHub 仓库](https://github.com/karpathy/autoresearch) - Karpathy 的开源项目，630 行 Python + 一份 program.md
