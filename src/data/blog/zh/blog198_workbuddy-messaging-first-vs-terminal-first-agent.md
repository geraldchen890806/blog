---
author: 陈广亮
pubDatetime: 2026-06-28T14:22:53+08:00
title: 腾讯 WorkBuddy 三个月做到中国生产力 Agent 第一：messaging-first 路线对 Claude Code/Codex terminal-first 的差异化启示
slug: blog198_workbuddy-messaging-first-vs-terminal-first-agent
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI Agent
  - 工具
  - 开发效率
  - 自动化
description: 腾讯 WorkBuddy 2026-03-09 上线，3 月月访问 8.85M、环比 +831%，DAU 是第 2 名的 3-4 倍。它选了和 Claude Code/Codex 相反的 messaging-first 路线。本文拆增长背后 4 个结构性决策与国内创业者能学的差异化路径。
---

## 现象：同期爆发的两种 agent

[blog196](https://chenguangliang.com/posts/blog196_cli-second-spring-ai-era-three-structural-reasons/) 那篇我讲过 2025-2026 上半年 AI CLI 的集体爆发——Claude Code、OpenAI Codex CLI、Charm Bubble Tea、Ink 同期起飞，把"AI 工具就该是 CLI"几乎写成业界共识。

但同一时间窗口，国内有一个完全不同形态的 agent 在悄悄成长：

- **2026 年 3 月 9 日**，腾讯云上线 WorkBuddy
- **2026 年 3 月**，月访问 8.85M，**环比 +831%**，是中国第 2 名生产力 agent 的 **2 倍以上**
- **DAU 比第 2 名高 3-4 倍**
- **2026 年 5 月 29 日**全球版上线，对接 Slack/Discord/Telegram 等海外 IM
- 产品原型出自腾讯 CodeBuddy 团队约 10 人，**汪晟杰（腾讯云 CodeBuddy 首席产品经理）带一个运营在 2026 年 1 月中的某个周末熬了两个通宵搭出来的**（钛媒体、36氪 均报道过这段经过）

如果你完全在 Claude Code / Cursor 的英文圈里，你大概率没听过 WorkBuddy；如果你在腾讯生态/中国市场里，它三个月内已经成了你的同事可能在用的工具。

更值得拆的不是"中国出了个新 agent"——是 **WorkBuddy 选了一条跟 Claude Code / Codex CLI 完全相反的路线**：**messaging-first** 而非 terminal-first。这条路线选择对应了一组结构性的产品哲学差异，对国内做 agent 产品的人有直接启示。

这篇基于公开资料 + Tencent 官方文档 + 我对 Claude Code / Codex CLI 长期 dogfooding 经验做对比，拆 4 个 WorkBuddy 增长背后的结构性决策。

## 决策一：messaging-first vs terminal-first，受众根本不同

这是最大的分叉。

Claude Code 的默认形态是 `claude` 在终端跑、Codex CLI 同理——它们假设用户是**坐在 IDE 旁边的工程师**，回车-看输出-继续指令的反馈环节奏是亚秒到分钟级。

WorkBuddy 的默认形态完全相反——**用户在 Slack / Discord / Telegram / WeChat 里发一句话，WorkBuddy 在后台跑完任务、把成品（PPT / 表格 / 研究简报）通过同一个 IM 频道发回来**。用户全程不切上下文，连 web 都不用打开。

这个差异不是 UI 偏好，**是受众分层**：

| | Claude Code / Codex | WorkBuddy |
|---|---|---|
| 主要用户 | 工程师 | 产品经理、运营、销售、PM、行政 |
| 默认场景 | 写代码 / 改代码 / 跑测试 | 做 PPT / 整理数据 / 写周报 / 竞品调研 |
| 反馈节奏 | 秒-分钟 | 分钟-小时 |
| 用户技能假设 | 会用 shell | 会用聊天软件 |
| 设备假设 | 桌面 + 终端 | 手机 / 桌面均可 |

把"agent 跑在 IM 里"这件事讲清楚后会发现：**WorkBuddy 不是在跟 Claude Code 竞争**，它在跟"我开个微信问同事帮我做个 PPT"竞争。这是个**数量级更大**的市场——办公人员的体量本身就比工程师群体大得多。

腾讯选这条路有先天优势——微信、企业微信、QQ 是国内 IM 基础设施；Anthropic 很难复制这个位置，它不拥有任何一个 IM 的入口，Claude 接 Slack 也只是在别人地盘上做一个 bot，分发、账号体系、支付全都不在自己手里。

**这个分层我自己每天都在验证**：我的博客 agent 集群就是 messaging-first 的——选题简报、审核报告、发布确认全部通过 Telegram 收发，agent 在后台跑完把结果推回来，我经常在手机上完成整个决策链；但写代码、改博客工程，我一定回到终端开 Claude Code。同一个人、两类任务，自然分成两条形态——**form factor 跟着任务的反馈节奏走，不跟工具信仰走**。WorkBuddy 赌的就是"办公任务的反馈节奏天然属于 IM"这个判断。

## 决策二：Scenario encapsulation 而非 capability exposure

第二个结构性差异更细，但影响更深。

Claude Code 和 Codex CLI 暴露的是**能力**——`bash`、`edit`、`grep`、MCP tool，让用户用自然语言**组合**它们达到目的。这是经典的工程师产品哲学："给你一组原子能力，你自己组合"。能力强、灵活、上限高，但需要用户**会想清楚要怎么组合**。

WorkBuddy 暴露的是**场景**——它的 Skills Gallery 内置了 **100+ 个 Expert Skills**（官方也叫"内置专家"），覆盖发票处理、文档归档、竞品调研、内容创作、舆情分析、销售洞察、数据处理等高频场景。每一个都是一个完整 workflow，用户**选场景、塞素材、等结果**，不需要拼命想"我该让 AI 做什么、按什么顺序、用哪些工具"。

这是一个**产品哲学的根本分叉**：

- **Claude Code / Codex 的哲学**："工程师懂自己要什么，给他原子能力 + 文档就行"
- **WorkBuddy 的哲学**："非工程师用户不知道自己要什么，给他打包好的场景模板，他选一个就用"

这背后是对**用户基线能力**的不同判断。前者假设用户能 prompt engineering、能调试、能读 log、能从错误里学；后者假设用户连"我需要哪些步骤"都不想想，**就要一个能跑完的封装**。

**两个哲学没有对错，只对应不同市场**。但要注意：**国内 to C / to SMB 市场的真实用户构成与硅谷工程师社区差异显著**（前者非工程师占比高得多），所以 WorkBuddy 的 scenario encapsulation 在国内是对的；同样的产品在 Claude Code 用户群里发布，可能反而被嫌"太傻瓜、不够灵活"。

## 决策三：Expert Teams 不是噱头，是 sub-agent 工程化的产品包装

WorkBuddy 一个被反复宣传的功能叫 **Expert Teams**——多个 sub-agent 并行干不同子任务，1 个 lead agent 协调最终产出。

熟悉 [blog195](https://chenguangliang.com/posts/blog195_loop-engineering-three-debts-playbook/) 里讲 loop engineering 的人会立刻识别——这就是 **maker/verifier 分工 + 并行 sub-agent** 的产品化包装。Claude Code 也支持 sub-agent，但它把这能力**留给用户自己 wire 起来**；WorkBuddy 把它**包成默认行为**——你提一个复杂任务，它自动决定要不要拆、拆几个、谁验证谁。

这个差异体现的是工程化心智 vs 产品化心智：

- **工程师心智**："你想要 parallel sub-agent？自己 spawn 啊，我把 SDK 给你"
- **产品化心智**："你不需要知道有 sub-agent，你只要看见 PPT 三分钟就好了"

**WorkBuddy 把工程概念藏起来这件事是它增速 +831% 的关键之一**——非工程师用户不需要被教育 "loop engineering"、"verification debt"、"maker/verifier 解耦"，他们只需要看见**任务在后台跑、最后产出一份能用的文件**。

但反过来——这种封装的代价是**透明度低**。出了问题用户没法 debug、没法看中间状态、没法干预。Claude Code 用户能在终端看见每一步 tool call、能 Ctrl+C 中断、能改 prompt 重跑；WorkBuddy 用户大部分情况下能做的只有"等"和"重新发一次"。这是封装的天然代价，对它的目标受众不致命，对工程师用户会逼疯。

## 决策四：MCP 接入广度先于深度

WorkBuddy 通过 MCP 接 GitHub、Jira、Notion、Gmail、Google Drive、Slack，覆盖典型办公人员一天会用到的多数 SaaS。

它的做法是**接入数量先于单个深度**——每个 connector 先把"能读、能写、能触发"做出来，**不追求功能完整覆盖**。这又是一个产品取舍：

| 哲学 | Claude Code 路线 | WorkBuddy 路线 |
|---|---|---|
| 接入策略 | 用户自己装 MCP，按需扩 | 平台预装一批主流 connector |
| 单个深度 | 用户自己写 prompt / skill 调用 | 平台预先封装常用动作 |
| 用户成本 | 高（要会配） | 低（开箱即用） |
| 长尾覆盖 | 强（任何 MCP 都能装） | 弱（只支持官方列表） |

WorkBuddy 这个策略的实质是：**对 80% 的用户来说，他们一辈子都不会用到自己写的 MCP，他们要的是"主流 SaaS 都能接、点点鼠标就能跑"**。Claude Code 那种 "MCP 即插即用 + 用户自己组合" 在这群用户里**不是 feature 是负担**。

MCP 这条标准协议本身没有 winner，但**两种打包方式对应两种用户群**——一种偏 power user 的灵活组合，一种偏普通用户的预设场景。WorkBuddy 选了后者，这是它能在三个月里把月活拉到 8.85M 的关键之一。

## 国内创业者能学到什么

把 4 个决策合起来看，WorkBuddy 的增长不是因为大模型好（它本身是个 routing 层，可以接多种模型），不是因为腾讯有钱（早期就 10 个人 + 一个周末），是因为**产品决策清晰对齐了"非工程师用户能直接用"这个目标**：

| WorkBuddy 决策 | 对应了什么 |
|---|---|
| messaging-first | 用户已在 IM，不要让他换上下文 |
| scenario encapsulation | 用户不知道要哪些步骤，给他打包工作流 |
| Expert Teams 默认行为 | 复杂能力藏在产品里，不要求用户理解 |
| MCP 广度先于深度 | 主流 SaaS 覆盖率 > 长尾 connector 灵活性 |

对国内 agent 产品创业者，这套打法的启示**不在于抄 WorkBuddy**，而在于**别再做 Claude Code 的中文翻版**。国内 to C / to SMB 的真实需求**不是"给我一个超强 agent SDK 让我自己拼"**，而是"我已经在用微信/钉钉，能不能帮我把这份 Excel 整理成 PPT"。

具体可借鉴的几条：

1. **先选 messaging 入口**：微信小程序、企业微信、钉钉、飞书都比独立 web app 摩擦小一个量级
2. **先封场景，再开能力**：选 3-5 个**高频办公场景**做深，比开放 200 个 MCP tool 给用户自己拼更容易做出 retention
3. **复杂工程概念藏在 UI 之后**：sub-agent、verifier、loop—用户不需要懂，但你的工程团队必须懂
4. **MCP 选主流大件**：先把 Notion / Lark / GitHub / Google Drive 接出来，比追开源长尾值得

## WorkBuddy 不是没有问题

为了不变成腾讯软文，必须给反向边界。WorkBuddy 路线的代价我能想到的至少有：

**1. 透明度低，调试痛苦**
非工程师用户不需要看见中间状态，但**真出错时也没法 debug**。Expert Teams 哪个 sub-agent 出问题、为什么、能不能跳过——用户基本没办法干预。这是 messaging-first 形态的天然代价。

**2. 长尾任务不擅长**
100+ 个 Expert Skills 覆盖了高频 80% 场景，但一旦你的任务**不在场景列表里**，效果可能反而比直接用 ChatGPT 还差——因为 WorkBuddy 整套系统是为"封装工作流"设计的，自由对话不是它的优势。

**3. 强依赖 MCP 接入方的 API 政策**
WorkBuddy 整套体验依赖 GitHub / Jira / Notion / Gmail 等保持开放 MCP 接入。一旦某家收紧（比如 Notion 限流），WorkBuddy 的 connector 体验直接降级。

**4. messaging 的隐私边界**
通过 Slack/Discord/Telegram 远程发任务意味着**任务描述、产出文件都经过 IM 中转**。企业敏感数据上 WorkBuddy 用户必须明确知道这一点。

这些问题对它的核心受众（非工程师 + 高频办公场景）影响有限，但任何想抄它的人需要提前评估这些代价是否能接受。

## 收尾

WorkBuddy 三个月 +831% 不是奇迹，是**产品决策清晰对齐目标用户**的结果。它跟 Claude Code / Codex CLI 不是替代关系，是平行宇宙——分别为"工程师用户"和"办公人员用户"两个不同市场服务。

国内 agent 创业最容易踩的坑是**把硅谷工程师工具的形态直接搬来卖给中国办公人员**。WorkBuddy 做了相反的事——拿全球最先进的 agent 工程化能力（sub-agent / MCP / multi-model routing）**包装成办公人员熟悉的 IM 形态**。这种打包能力本身是稀缺的，是腾讯 + CodeBuddy 团队在 AI agent 工程化上多年积累的体现。

如果你正在做国内 agent 产品，建议从下面这个问题开始：**你的用户已经在用什么 IM / 协作工具，你能不能把他要的产出从那里推给他，而不是让他打开第 11 个 web app？**

回答这一个问题，可能就决定了你 6 个月后的留存曲线长什么样。

---

**延伸阅读**：

- [Tencent WorkBuddy 官方页](https://www.tencentcloud.com/act/pro/workbuddy) - 产品官方介绍
- [TechNode: Tencent launches WorkBuddy globally](https://technode.com/2026/05/29/tencent-launches-workbuddy-productivity-ai-agent-for-global-users/) - 全球版 launch 报道
- [PANews: WorkBuddy DAU 3-4x 第 2 名拆解](https://www.panewslab.com/en/articles/019ed38e-887d-76c8-a0eb-2726bcc3b9cd) - 中文圈对 WorkBuddy 增长的产品复盘
- [钛媒体: 10 人小团队，如何跑出日活第一 Agent?](https://www.tmtpost.com/7992670.html) - 汪晟杰团队与周末原型故事的一手报道
- [PR Newswire: WorkBuddy 海外 launch](https://www.prnewswire.com/apac/news-releases/tencent-cloud-unveils-new-ai-agents-workbuddy-and-miora-driving-innovation-and-real-business-outcomes-across-southeast-asia-302797910.html) - 官方海外发布稿
- [本博客 blog196 - AI 时代 CLI 第二春](https://chenguangliang.com/posts/blog196_cli-second-spring-ai-era-three-structural-reasons/) - terminal-first 路线那一侧
- [本博客 blog195 - Loop Engineering 三条债 playbook](https://chenguangliang.com/posts/blog195_loop-engineering-three-debts-playbook/) - sub-agent / verifier 工程化基础
