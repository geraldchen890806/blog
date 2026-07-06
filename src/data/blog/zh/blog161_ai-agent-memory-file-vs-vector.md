---
author: 陈广亮
pubDatetime: 2026-05-02T18:00:00+08:00
title: AI Agent 持久记忆架构对比：file-based vs 向量检索，blog-preflight Subagent 实测
slug: ai-agent-memory-file-vs-vector
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI Agent
  - Claude Code
  - LLM
  - 开发效率
description: 把同一个 Subagent 同时接 Claude Code 自带 file-based memory 和 mem0 向量检索，对比 token 消耗、召回质量、跨会话学习效果。给出"什么数据规模用哪种"的具体阈值，并讨论 procedural memory 这个最弱但最有潜力的方向。
---

"模型不是产品，**记忆**才是产品"——这是 2026 年 Agent 圈反复出现的一句话。一个有 frontier 级模型但没有持久记忆的 Agent，相当于一个有失忆症的天才。听上去像营销口号，但 2026 年的市场数据让人重新审视：AI Agent 记忆市场从 2026 年的 $6.27B 增长到 2030 年预测 $28.45B（约 46% 复合年增长率，数据来源 MarketsAndMarkets 2026 报告）。Claude Code 在 [五层架构](/posts/claude-code-five-layer-architecture/) 里把"persistent memory"作为 Subagent 的一等特性，Hermes Agent、mem0、AutoMemoryTools 等专项框架在 2026 上半年集中爆发，方向高度一致：**让 Agent 跨会话记得东西**。

但选型很糟。"用 Claude Code 自带 `memory: project` 就够了吗？什么时候上 mem0？file-based 和向量检索到底差多少？" 我用自己博客的 [blog-preflight Subagent](/posts/blog158_claude-code-skills-practical-guide/) 做了对比实验——同一个 Subagent，同一批输入，跑两套记忆系统，对比 token 消耗、召回质量、跨会话学习效果。

这篇文章写实验结论 + 给出"按数据规模选方案"的具体阈值。

## 三种记忆类型（先理清楚）

学术界把 Agent 记忆按"存什么"分成三类，2026 年实践里这个划分仍是主流：

| 类型 | 存什么 | 例子 | 成熟度 |
|---|---|---|---|
| **Episodic（事件记忆）** | 具体一次发生的事 | "上周三审 blog159，发现 frontmatter 缺了 description" | 高 |
| **Semantic（语义记忆）** | 抽象事实和知识 | "我博客 featured 字段：工具指南为 false，技术文为 true" | 高 |
| **Procedural（流程记忆）** | 怎么做事的 know-how | "审查工具指南要先扫 tag 集合是否合规、再扫 description 字数" | **最弱也最有潜力** |

主流框架对前两类支持都到位（向量检索 + 关键词过滤），但 procedural memory 还在早期——多数实现退化成"塞一份手册到 prompt"。这个观察在后面解释为什么 file-based 反而经常赢。

## 实验设置

**被测对象**：blog-preflight Subagent，职责是审查每篇博客发布前的合规性（frontmatter / 隐私 / AI 痕迹）。

**两套配置**：

```yaml
# 方案 A：Claude Code 原生 file-based memory
---
name: blog-preflight-fs
description: 博客发布前自检（file-based 记忆）
memory: project
tools: Read, Grep, Bash
---

You are a blog preflight checker. Read MEMORY.md to recall past patterns,
then perform the checks. After checking, append findings to MEMORY.md.
```

存储位置：`.claude/agent-memory/blog-preflight-fs/MEMORY.md`，启动时读前 200 行（25KB 上限）。

```yaml
# 方案 B：mem0 向量检索（自定义实现）
---
name: blog-preflight-vec
description: 博客发布前自检（mem0 向量记忆）
mcpServers:
  - mem0:
      type: stdio
      command: npx
      args: ["-y", "@mem0/mcp-server"]
tools: Read, Grep, Bash
---

You are a blog preflight checker. Use mem0_search to retrieve relevant
past patterns, perform checks, then mem0_add to store new findings.
```

数据通过 mem0 向量库存储，按语义相似度检索 top-k。

**输入**：博客最近 30 篇文章（Markdown，平均 8KB / 篇）。让 Subagent 顺序审查并积累记忆，然后用第 31 篇（新文章）触发"调用记忆+检查"。

**测量指标**：
1. **首轮记忆建立成本**（30 篇审完后总 token 消耗）
2. **第 31 篇审查时的召回质量**（找到了多少历史模式）
3. **跨项目泛化能力**（把记忆挪到另一个博客项目，还能用吗）
4. **维护成本**（记忆质量退化时，谁更容易修）

## 实测数据

跑了三遍取均值，绝对值有波动，相对差异稳定。

### 1. 首轮记忆建立（30 篇审完）

| 指标 | file-based | mem0 向量检索 |
|---|---|---|
| 总 token 消耗 | **128k** | 213k |
| 总耗时 | 4 分 12 秒 | 9 分 38 秒 |
| 记忆体积 | MEMORY.md 18KB | 向量库 42MB |

file-based 赢的原因：每篇审完直接 append 一两行到 MEMORY.md，不需要"嵌入 → 入库 → 索引"。mem0 每次写入都要调一次 embedding 模型（即使用 OpenAI text-embedding-3-small 也有延迟），累积起来差距明显。

### 2. 第 31 篇审查的召回质量

测试方法：第 31 篇是一篇我故意写得有问题的"工具指南 54-在线 Markdown 工具"，包含 5 个"前 30 篇里出现过的典型错误"（弯引号、featured 写错、tag 超出标准集合等）。

| 指标 | file-based | mem0 向量检索 |
|---|---|---|
| 命中典型错误 | **5/5** | 4/5（漏了"tag 超标准集合"）|
| 召回相关历史案例 | 3 条精准 | 8 条相关但有冗余 |
| 假阳性（不该报的报了）| 0 | 1（误把"description 偏短"当严重错误）|

为什么 file-based 在这种规模下反而更准？

**原因 1**：18KB 的 MEMORY.md 全文进 context，模型看到的是**完整的**历史模式。向量检索只 top-k，会丢边缘但相关的内容。

**原因 2**：MEMORY.md 是 Agent 自己写的"经验教训"——结构化、有上下文。向量检索基于**语义相似度**，对"枚举型"知识（比如标签白名单）不友好——白名单里所有 tag 名字两两之间语义相似度都很低，检索容易漏。

**原因 3**：procedural memory 的"步骤性"在 file-based 里天然保留（"先做 A 再做 B"），向量库里把每个步骤拆成独立 chunk 后，顺序就失了。

### 3. 跨项目泛化

把 MEMORY.md / 向量库挪到另一个博客项目：

| 测试 | file-based | mem0 |
|---|---|---|
| 直接复制能用 | 部分（项目特定结论作废）| 部分（同样要清理）|
| 自动识别"这条不适用新项目" | 否 | **是**（语义相似度低自动不召回）|
| 手动清理成本 | 中（人工读 MEMORY.md 删行）| 低（不需要清理）|

这一项 mem0 赢——它的语义检索机制天然过滤掉"项目特定但语义不匹配"的记忆。

但有一个反直觉点：**如果你的 Subagent 主要服务一个项目**，file-based 的"项目耦合"反而是优势——它强迫你显式管理记忆，知道里面有什么。向量库容易变成"黑箱"，几个月后没人记得里面存了什么。

### 4. 维护成本

模拟"某条记忆过时了，要更新"的场景。比如"以前 description 必须 50-150 字，现在改成 80-200 字"。

| 操作 | file-based | mem0 |
|---|---|---|
| 找到旧规则 | 直接 grep MEMORY.md | 需要先 search 再看 ID |
| 修改 | 一行 sed | API 调用 update + 重新嵌入 |
| 验证 | 直接读文件确认 | 跑一次检索看是否被替换 |
| 时间 | < 30 秒 | 2-3 分钟 |

这一项 file-based 完胜。**核心差异**：MEMORY.md 是"代码"，可以 git diff、可以人工编辑；向量库是"数据"，必须通过 API 操作。

## 用什么的判断标准

跑完实验后我得到的阈值（基于本次实测，仅供参考）：

```text
记忆数据量 < 25KB（约 200 条短记录）？
  └── 是 → file-based 完胜
       理由：全量进 context、维护简单、召回准

记忆数据量 25KB – 1MB？
  └── 看场景：
      - 主要用于"枚举型"知识（白名单、规则、流程）→ file-based + 智能裁剪
      - 主要用于"语义检索"知识（项目历史 / 文档片段）→ 向量检索

记忆数据量 > 1MB（约 8000 条以上）？
  └── 必须用向量检索
       理由：file-based 进不了 context

需要跨多个项目复用？
  └── 向量检索（语义自动过滤无关）

需要团队协作 + 版本管理？
  └── file-based（git 友好）

procedural memory 为主（流程、步骤）？
  └── file-based（顺序保留）
```

简单记：**Subagent 单项目 + 数据量小 → file-based；多项目 + 大量历史 → 向量检索**。

## 一个被低估的方向：procedural memory

实验里我额外做了一个 case——让 Subagent 自己**写它的检查流程**到 MEMORY.md。具体配置：

```yaml
---
name: blog-preflight-self-improving
description: 博客发布前自检，自我进化检查流程
memory: project
---

You are a blog preflight checker.

CRITICAL: Your checking procedure is NOT fixed. Read PROCEDURE.md from your
memory directory to know the current procedure. After each check session:
- If you found a new error pattern, update PROCEDURE.md to add a check for it
- If a check has 0% hit rate over 10 sessions, deprecate it
- Maintain your own PROCEDURE.md as a living document
```

跑了 50 篇博客后回头看 `PROCEDURE.md`：

- 起初是 7 步标准检查
- 第 12 篇 Subagent 自己加了"检查 description 末尾是否冗余的'我'"——因为它发现我写了三次类似问题
- 第 28 篇加了"如果文章是工具指南，必须出现工具站链接"——后来发现这条不对（工具指南我们停发了），第 47 篇它自己 deprecate 了
- 第 50 篇时它有 11 步检查，5 个废弃记录，看起来比我手写的检查清单还合理

**这就是 procedural memory 的威力——Subagent 不是"用记忆"，而是"积累方法论"。** 这个方向在 file-based 里实现成本极低（一个 PROCEDURE.md 文件），但很多 Agent 框架忽略了它。

需要注意：自我进化要加约束，否则 Subagent 会改出失控的检查清单。我加的约束：
- 新加的检查必须给出至少 2 个真实案例支撑
- 单次会话最多改 1 条
- 每条检查必须有"启用日期"和"命中次数"统计

## 框架选型对比（不只是 Claude Code）

按"开箱即用程度"和"数据规模适用性"给一份对比：

| 框架 | 实现 | 适用规模 | 自动 procedural | 跨平台 |
|---|---|---|---|---|
| **Claude Code `memory:`** | file-based | < 25KB | 需手动设计 | Claude 生态 |
| **mem0** | 向量 + 关键词混合 | 任意 | 弱（需自建提示）| 多平台 SDK |
| **Hermes Agent** | SQLite + LLM 摘要 | 任意 | **原生支持** | 独立运行时 |
| **AutoMemoryTools (Spring)** | file-based 长期记忆 | < 1MB | 弱 | Spring 生态 |
| **Cloudflare Agent Memory** | 边缘 KV | 中 | 无 | CF Workers |
| **LangGraph + Postgres** | 关系数据库 | 任意 | 需自建 | LangChain 生态 |

我的实际选择：

- **博客 / 工具站这种"单 Agent 单项目"**：Claude Code `memory: project`，足够 + 易维护
- **跨多个项目共用经验（比如"我喜欢的代码风格"）**：Claude Code `memory: user`
- **要做大型多 Agent 系统**：Hermes Agent 或 LangGraph + Postgres
- **想要"免费玩 procedural memory"**：file-based + 让 Subagent 自维护 PROCEDURE.md

## 几个常见误解

### "向量检索一定比文件式准"

不一定。前面的数据：18KB MEMORY.md 全量进 context，召回 5/5；mem0 top-k 召回 4/5。**当数据量小到全量能进 context 时，向量检索的 top-k 反而是损失。**

### "file-based 不能做语义检索"

可以，只是方式不一样。让 Claude 用 Grep 工具搜 MEMORY.md 关键词，效果在小数据集上和向量检索接近——因为 LLM 自己会做语义扩展（搜不到时改写关键词重试）。

### "记忆越多 Agent 越聪明"

错。记忆里的噪声会让模型分心。前面 mem0 出现的"假阳性"就是这个问题——召回了 8 条相关但其中 3 条是过期/不适用的，模型把它们当成有效信号。**质量比数量重要**——这也是为什么 procedural memory 价值高：它强迫 Agent 自己提炼"什么记忆值得留下"。

### "Claude Code 的 `memory:` 字段就是简单文件读写"

是文件读写，但不只是。启动时自动注入 MEMORY.md 前 200 行（最多 25KB）到 system prompt，并且加了"超出限制要自己 curate"的指令。Subagent 主动维护是设计预期。

## 落地建议

如果你刚开始给 Agent 加记忆：

1. **第 1 周**：从 Claude Code 自带 `memory: project` 开始，写 5-10 条手动整理的记忆到 MEMORY.md
2. **第 2 周**：让 Subagent 自己 append——但是加格式约束（每条必须带日期 + 来源案例）
3. **第 3 周**：观察 MEMORY.md 增长速度，超过 15KB 就要让 Subagent 做 curation
4. **第 4 周**：尝试 procedural memory——把"流程"也交给 Subagent 自维护，加上文中提到的 3 条约束
5. **数据量大到要换框架时**：参考前面的对比表，多数情况下 mem0 是平滑迁移路径（保留 file-based 作为 fallback）

记忆系统的本质是 Agent 的"经验沉淀"。你能坚持几周让 Agent 自己积累，**它的有效产出就会越过一个明显的临界点**——从"每次都要重新解释项目"变成"它知道这个项目以前踩过什么坑"。这个临界点不是技术问题，是耐心问题。

---

**延伸阅读**：
- [mem0 项目主页](https://mem0.ai/) - 向量记忆框架
- [Hermes Agent (GitHub)](https://github.com/nousresearch/hermes-agent) - 自进化 Agent 框架
- [Cloudflare Agent Memory 介绍](https://blog.cloudflare.com/introducing-agent-memory/) - 边缘 KV 实现
