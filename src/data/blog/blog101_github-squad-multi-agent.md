---
author: 陈广亮
pubDatetime: 2026-03-26T10:00:00+08:00
title: GitHub Squad：把 AI 开发团队直接塞进你的仓库
slug: blog101_github-squad-multi-agent
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI
  - Agent
  - GitHub Copilot
  - 多Agent
  - 开发效率
description: 开源项目 Squad 让你用两条命令在仓库里初始化一支 AI 开发团队——架构师、前端、后端、测试各司其职，基于 Copilot 协作开发。聊聊它的架构设计、实际体验和背后的多 Agent 协作模式。
---

用 AI 写代码，大多数人的体验是这样的：打开 Copilot 或 Cursor，输入 prompt，模型理解错了，改 prompt，再来一次。项目小的时候还行，项目大了之后问题就来了——一个对话窗口里，你让它写后端 API，接着又让它写前端组件，上下文开始混乱，后端的决策在前端对话里被"遗忘"了。

Squad 想解决的就是这个问题。它是 GitHub 官方博客介绍的一个开源项目（作者 Brady Gaster，微软 CoreAI 团队），核心思路很简单：**不要让一个 AI 扮演所有角色，而是给你一支 AI 团队**。

两条命令就能跑起来：

```bash
npm install -g @bradygaster/squad-cli
squad init
```

然后你的仓库里就多了一个 `.squad/` 目录，里面住着一支预配置的 AI 团队：Lead（架构师）、Frontend（前端开发）、Backend（后端开发）、Tester（测试）、Scribe（静默记忆管理者，负责知识持久化）。每个 agent 都有自己的身份定义、项目记忆和独立的上下文窗口。

## 和单 Agent 编程有什么不同

传统的 AI 辅助编程是"一个人干所有活"。你在 Copilot Chat 里说"帮我加个 JWT 认证"，模型在一个上下文里同时思考路由设计、数据库 schema、中间件实现、前端登录页、测试用例。上下文越来越长，前面的决策在后面被覆盖或遗忘。

Squad 的做法是把工作分派给不同的 agent。你说"Team, I need JWT auth—refresh tokens, bcrypt, the works"，然后：

1. 协调器（coordinator）解析你的需求，决定派谁去做
2. Backend agent 负责写认证逻辑和 API
3. Frontend agent 负责写登录页
4. Tester 开始写测试用例
5. 这些 agent **并行运行**，各自在独立的上下文窗口里工作

关键区别：每个 agent 有自己独立的上下文窗口（在支持的模型上最多 200K token）。不是把一个窗口的空间分成四份，而是每个人都有完整的空间。这意味着后端 agent 可以专注加载和理解后端相关的代码，不用被前端 CSS 塞满脑子。

更有意思的是审查机制：Squad 的 reviewer 协议可以**阻止原作者修改自己被拒绝的代码**。如果 Backend agent 写的代码没通过测试，Tester 会拒绝它，修复的任务会交给另一个 agent 接手。这强制了真正的独立审查——不同的上下文窗口、不同的"视角"。

## 三个核心架构模式

Squad 的设计里有三个模式值得深挖，不管你用不用 Squad，这些模式对理解多 Agent 系统都有价值。

### 1. Drop-box 模式：用文件做共享记忆

大多数多 Agent 框架用实时消息传递或向量数据库来同步状态。Squad 不这么做。它用一个 `decisions.md` 文件。

每次团队做了一个架构决策——比如选用 PostgreSQL 而不是 MongoDB、用 camelCase 而不是 snake_case——决策会被追加到 `decisions.md` 里。所有 agent 下次启动时都会读这个文件。

```text
.squad/                        # 核心文件（完整结构包含更多目录）
├── agents/
│   ├── lead/
│   │   ├── charter.md         # 角色定义
│   │   └── history.md         # 项目经验
│   ├── backend/
│   │   ├── charter.md
│   │   └── history.md
│   └── ...
├── casting/                   # Agent 命名主题配置
├── decisions.md               # 团队共享决策
└── team.md                    # 团队配置
```

这个设计有几个好处：
- **可审计**：每个决策都有记录，你可以 `git blame` 看谁在什么时候做了什么决定
- **可恢复**：断线重连后，agent 读文件就能恢复上下文，不依赖实时会话
- **可版本化**：`.squad/` 目录跟代码一起提交，clone 仓库就得到了一支"已入职"的 AI 团队

这比实时同步要粗糙，但也更可靠。异步写文件不会因为网络抖动丢数据。

### 2. 上下文复制而非上下文分割

一个常见的误解：多 agent 系统是把一个大上下文切成几块分给不同的 agent。Squad 不是这样。每个 agent 都有自己完整的上下文窗口（在支持的模型上最多 200K token），它们各自加载仓库中与自己职责相关的代码。

这意味着同一份代码可能被多个 agent 同时读取。看起来浪费 token，但效果比切分好得多——每个 agent 都有完整的"工作记忆"，不会因为其他 agent 的信息污染自己的推理。

### 3. 显式记忆：一切写在文件里

Squad 的 agent 不靠模型权重里的"隐式记忆"工作。它们的身份来自 `charter.md`（角色定义），经验来自 `history.md`（项目历史），团队知识来自 `decisions.md`（共享决策）。全是纯文本文件。

你可以直接打开这些文件看 agent "知道"什么。不用猜、不用试探性提问。想改变 agent 的行为？编辑 `charter.md`。想让 agent 忘掉某个过时的决策？从 `decisions.md` 里删掉那条记录。

这和我们在 OpenClaw 中用 `SOUL.md`、`MEMORY.md` 管理 agent 身份和记忆的思路完全一致——agent 的状态应该是可读、可编辑、可版本化的文件，不是黑盒。

## 实际使用的感受

说几个实际体验的点：

**初始化体验好**。`squad init` 之后不是直接生成一堆 agent 文件，而是先和你对话，了解项目在做什么，然后根据项目特点提议团队组成。如果你的项目不需要前端，它不会强塞一个 Frontend agent 给你。

**agent 命名有主题**。Squad 不用无聊的 "backend-agent" 命名，而是用主题化的名字（像电影角色、神话人物之类的）。你可以说"让 Ripley 审查一下测试覆盖率"。这是个小细节，但确实让交互更自然。

**不是自动驾驶**。agent 会问你问题，会做出合理但错误的假设。每个 PR 你还是要审查和合并。Squad 定位是"协作编排"，不是"自主执行"。

**截至 2026 年 3 月版本为 v0.8.25，明确标注 alpha**。API、命令格式、文件结构都可能变。不适合现在就在生产项目里重度依赖，但作为实验和学习多 Agent 模式的工具很有价值。

## Squad vs 其他多 Agent 方案

和目前主流的多 Agent 框架比较一下：

| 维度 | Squad | CrewAI | LangGraph | AutoGen |
|:-----|:------|:-------|:----------|:--------|
| 定位 | 代码仓库内的 AI 团队 | 通用多 Agent 框架 | Agent 工作流引擎 | 多 Agent 对话框架 |
| 设置成本 | 两条命令 | 需要写 Python 编排代码 | 需要定义状态图 | 需要配置 Agent 和 GroupChat |
| 状态管理 | 文件（Markdown） | 内存 + 可选持久化 | 状态图 | 对话历史 |
| 可审计性 | 天然可审计（Git 版本化） | 需要额外日志 | 需要额外日志 | 需要额外日志 |
| 与代码库集成 | 原生（住在仓库里） | 外部编排 | 外部编排 | 外部编排 |
| 适用场景 | 软件开发 | 通用任务 | 复杂工作流 | 对话式协作 |

Squad 的最大差异化是**仓库原生**（repository-native）。其他框架都是在代码库"外面"编排 agent，Squad 的 agent 直接住在代码库里。这意味着 agent 的身份、记忆、决策和代码一起版本化、一起迁移、一起分享。

但它的局限也很明显：只支持 GitHub Copilot 作为后端，不能自由选择模型；只适合软件开发场景；alpha 阶段功能还不稳定。

## 对 AI 辅助开发的启示

不管 Squad 最终能不能成为主流工具，它验证了几个重要的设计方向：

**1. 多 Agent > 单 Agent（对复杂任务而言）**

单个 AI 在小任务上表现很好，但当任务涉及多个领域（前端+后端+测试+文档），独立上下文的多 Agent 协作比一个臃肿的超长对话更可靠。

**2. 文件是最好的 Agent 记忆载体**

不是 Redis，不是向量数据库，就是纯文本文件。可读、可编辑、可 Git、可 diff。Squad 的 decisions.md 和 OpenClaw 的 MEMORY.md 殊途同归。

**3. 低仪式感（low ceremony）很重要**

两条命令就能启动一支 AI 团队。不需要学框架、不需要写编排代码、不需要配置向量数据库。降低门槛是让更多人实际用上多 Agent 的关键。

Squad 目前在 GitHub 上开源：[github.com/bradygaster/squad](https://github.com/bradygaster/squad)，v0.8.25 alpha。有兴趣可以在一个实验项目里试试，感受一下"和一支 AI 团队协作"是什么体验。

---

**相关阅读**：
- [AI Agent 开发者工具全景 2026](https://chenguangliang.com/posts/ai-agent-tools-landscape-2026/) - 更宏观的 Agent 工具生态分析
- [多 Agent 协作的教训](https://chenguangliang.com/posts/multi-agent-lessons/) - 我在多 Agent 系统上踩过的坑
