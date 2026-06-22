---
author: 陈广亮
pubDatetime: 2026-06-22T09:50:00+08:00
title: 跨会话不再重新介绍项目：把 AGENTS.md / CLAUDE.md / memory 拼成 AI 编码工作流的「项目护照」
slug: blog194_project-passport-agents-md-claude-md-memory
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI Agent
  - 开发效率
  - Claude Code
  - 自动化
description: AGENTS.md 已经是 2026 事实标准，CLAUDE.md 仍是 Claude Code 的 richer 格式，project memory 沉淀的是另一类信息。把三者拼成「项目护照」——每次新会话开局都让 AI 在边境检查站快速验明项目身份和规则，告别每天反复贴上下文。
---

每天新开一个 Claude Code 或 Cursor 会话时有没有这种感觉：要么 AI 把项目当陌生人，一切从零摸索；要么我得反复粘贴"这个项目是干嘛的、用什么栈、谁负责什么"。

去年我也这么过。今年我换了一套做法：**把 AGENTS.md / CLAUDE.md / project memory 当成项目的"护照"来管理**。AI 每次进入项目就像旅客过海关，护照上写清楚身份、规则、不许做的事——三秒检查完，正经干活。

这篇就把这个框架讲清楚，附我自己 7 个真实仓库 + 14 条 memory 的 dogfooding 经验。

## 先消歧：这不是"Agent Passport"

2026 年 "Passport" 这个词在 AI 圈被几家用走了：

- **Workday Agent Passport**（2026/6）——给企业级 AI Agent 做合规测试和持续监控，对标 OWASP LLM Top 10、NIST AI RMF
- **Vercel Passport**——用 OpenID Connect 把团队的 app 和 agent 放在统一身份后面
- **APort Agent Passport**——给 agent 颁发"通行证"，执行前授权工具调用

它们都是给 **agent 本身** 发身份证。我说的"**项目护照**"是反过来——**给项目发护照、让 agent 在边境验明项目规则**。两件事不冲突，但场景完全不同。本文不讨论企业治理，专心讲个人/小团队的"如何让 AI 不再每次从零认识项目"。

## 三件套各管什么

很多人把 AGENTS.md、CLAUDE.md、memory 当作"同一类东西的不同实现"，因此要么只用一个，要么把三个塞同样内容。这是误解。它们覆盖的信息维度根本不同：

| 文件 | 在哪 | 谁读 | 装什么 | 生命周期 |
|---|---|---|---|---|
| **AGENTS.md** | 项目根目录 + 各子目录 | OpenAI Codex / Cursor / Windsurf / Aider / 30+ 工具（**Claude Code 当前不原生读**，需用下文 symlink 或 `@import` 方案） | **项目级别共识**：技术栈、命令、约定、目录边界 | 跟代码同寿，进 git |
| **CLAUDE.md** | 项目根 / `~/.claude/` | Claude Code 专属 | **Claude 特化指令**：触发器、skill 调用、harness hook | 跟代码同寿，进 git |
| **memory（项目级）** | `~/.claude/projects/<slug>/memory/` | 当前用户的 Claude Code 实例 | **个人沉淀**：用户角色、反馈、踩过的坑、外部资源 | 持续累积，**不进 git** |

关键差别在最后一列。AGENTS.md 和 CLAUDE.md 是**项目所有协作者共享**的；memory 是**单个用户跨会话沉淀**的。把个人偏好写进 AGENTS.md 会污染团队上下文；把项目命令写进 memory 别人 clone 仓库就丢了。

## 为什么三个都要存在

可能有人问：能不能合并？AGENTS.md 已经是事实标准，干嘛还留 CLAUDE.md 和 memory？

先说一个反直觉的现状——**Claude Code 截至 2026 年 6 月仍不原生读 AGENTS.md**（[anthropics/claude-code#6235](https://github.com/anthropics/claude-code/issues/6235) 这个 issue 累计了上千 upvote，Anthropic 尚未给时间表）。这反而是 CLAUDE.md 必须独立存在的现实原因之一——你要么用下文讲的 symlink / `@import` 方案让 Claude Code 间接读到 AGENTS.md，要么就保留独立 CLAUDE.md。

但即使把 Claude Code 这层不便排除掉，答案仍然是同一个词——**信息分层**。这三个文件不是冗余，是**三种生命周期不同的知识**：

1. **项目共识（AGENTS.md）**——所有 AI 工具、所有协作者都看，进 git 跟代码走
2. **工具特化（CLAUDE.md）**——只有 Claude Code 看的额外指令（比如 `@import` 引入其他文件、触发特定 skill）
3. **个人轨迹（memory）**——你这台机器、你这个账号、你的工作模式沉淀，跟仓库无关

举个具体例子：
- "本项目用 pnpm + Turborepo 2.x"——这是项目共识，写 AGENTS.md
- "Claude Code 启动时自动加载 `@~/.claude/agents/playwright-runner.md`"——这是 Claude 特化，写 CLAUDE.md
- "用户更倾向先写测试再写实现"——这是你个人的工作习惯，写 memory

强行合并会发生：
- 把 memory 写进 AGENTS.md → 同事看到一脸懵
- 把 Claude 特化指令写进 AGENTS.md → 其他工具读了报错或行为异常
- 把项目共识写进 memory → 换台机器或换用户全丢

## 「项目护照」的隐喻

把项目想象成一个国家。每天开新会话 = 一架飞机降落。AI Agent 是旅客。

护照上要回答**海关官员三件事**：

1. **你是谁？**（项目身份）— 这个仓库是什么、有什么 package、入口在哪
2. **你来干嘛？**（行为规则）— 跑测试用什么命令、提交 PR 之前必须做什么、禁止改动哪些文件
3. **你不能做什么？**（红线）— 不要 commit 到 main、不要 push 到 prod、不要删 .env

这三组信息分别对应：

| 海关问题 | 主要承载 | 备注 |
|---|---|---|
| 你是谁 | **AGENTS.md** | 项目级共识，可分子目录 nested |
| 你来干嘛 | **AGENTS.md + CLAUDE.md** | 共识写 AGENTS.md，Claude 特化（如 skill 触发）写 CLAUDE.md |
| 你不能做什么 | **AGENTS.md + memory（feedback 类）** | 团队红线写 AGENTS.md，个人吃过的亏写 memory |

护照不是越长越好——研究表明 AGENTS.md 超过 **150 行** 后推理成本会涨 20-23%。过厚的护照反而让海关检查变慢。

## 实操：三件套的最小可行配置

### AGENTS.md 怎么写

按 2026 共识，AGENTS.md 没有强制 schema，但有套行之有效的模板。我自己 7 个仓库都用这个结构：

```markdown
# Project Name

简短一句话定位（30 字内）。

## Tech stack
- 语言/Runtime（含版本）
- 包管理器
- 主要框架
- 测试工具

## Commands
- `pnpm dev` — 启动开发服务器
- `pnpm test` — 跑测试（默认 watch 关闭）
- `pnpm build` — 生产构建
- `pnpm lint` — ESLint

## Project layout
- `apps/` — 可部署产物
- `packages/` — 共享库
- `tools/` — 内部脚本

## Conventions
- 提交信息中文，subject < 50 字符
- 任何新依赖必须先讨论
- 测试覆盖率不下降

## Don'ts
- 不要 commit 到 main，PR only
- 不要碰 `legacy/` 目录（待删除）
- 不要修改 lockfile 之外的版本号
```

**关键原则**：每一节都是 AI 一眼就能定位的硬信息。**不要**写"本项目致力于打造卓越的用户体验"这种正确但无用的话——浪费 token、降推理质量。

### CLAUDE.md 怎么写

CLAUDE.md 在 AGENTS.md 已经存在的前提下，**只放 Claude 特化的部分**，剩下的用 `@import` 引入：

```markdown
@AGENTS.md

## Claude-specific

启动时自动加载这些 skills：
- @~/.claude/skills/playwright-runner.md
- @~/.claude/skills/security-review.md

## Hooks

提交前必须跑 `bash scripts/claude-precheck.sh`。

## 触发器

当用户说"部署"——按 `~/.claude/agents/deploy-playbook.md` 步骤执行。
```

如果你的项目只用 Claude Code，**直接走 symlink 模式更干净**：

```bash
ln -s CLAUDE.md AGENTS.md
```

这样 Claude Code 读 CLAUDE.md、其他工具读 AGENTS.md，单一来源不会漂移。这是 2026 多工具仓库的最佳实践。

### memory 该写什么、不该写什么

memory 是最容易被滥用的地方。我吃过的亏总结成一条原则：**memory 应该装无法从当前 git 仓库状态推断出来的事实**。

具体分四类（我自己 14 条 memory 全在这四类里）：

1. **user 类**——用户角色、知识背景、偏好。例："用户是后端工程师，对前端不熟悉，要求把前端解释类比成后端概念"
2. **feedback 类**——被纠正过/被认可过的工作方式。例："i18n 项目查中文 UI 字段时，必须 locals 反查 key → grep key → 追数据源，不许直接 grep 中文"
3. **project 类**——动态状态、决策、deadline。例："2026-06-15 之后 mobile 团队进入封版，非紧急 PR 后置"
4. **reference 类**——外部资源位置。例："某后台 routine 的 cron job ID 是 trig_XXXXXXXX，09:00 北京时间触发"

**绝对不该写进 memory 的内容**：代码模式、文件路径、架构、git 历史、recent bug fix——这些 grep / git log / Read 都能拿到，写 memory 是冗余且会过时。

我现在的 memory 目录 14 个条目：0 user / 8 feedback / 2 project / 4 reference。**比例失衡是坏信号**——feedback 类占了一半以上，说明我经常被纠正同一类事，下一步要把高频出现的那几条升级到 AGENTS.md 里固化，让团队/其他工具也吃到这份共识。

## dogfooding：我自己的 7 个仓库怎么分

我的 `~/ai/agents/` 是个 mono-style 工作目录，里面 7 个子项目各有 AGENTS.md：

```
ai/agents/
├── blog/AGENTS.md          # 博客发布流程
├── service-a/AGENTS.md     # 内部后端服务
├── translation/AGENTS.md
├── tools/AGENTS.md
├── novel/AGENTS.md
├── service-b/AGENTS.md
└── main/AGENTS.md
```

每个 AGENTS.md 写自己项目的本地共识。当我在某个子目录工作时，AGENTS.md 的 nested 模型（"最近文件优先"）保证 AI 拿到的是这个子项目的规则，不会把博客发布命令应用到后端服务上去。

跨项目的共性（比如"提交前必须先跑 lint"）放在 `~/ai/agents/AGENTS.md` 根文件，子目录通过 nested 自动继承。

**Claude Code 视角的额外配置**在 `~/.claude/projects/-Users-<username>-ai-agents/`：

- `memory/` 目录沉淀我的工作偏好（例如"在 agents 上下文里，无主语提到'后端服务'时默认指向 service-a"这种个人化默认值）
- `settings.json` 配置 hooks（"每次写完 blog md 后自动跑 reviewer agent"）

这套结构跑了 4 个月，最大的感受是 **AI 接手新任务的"启动成本"几乎降到 0**——以前每次都要花 5-10 分钟铺垫，现在它打开就知道"啊这个项目是 X、我应该按 Y 流程做、绝对不要碰 Z"。

## 五个最常见的踩坑

实践中我和身边几个朋友踩过的真坑，**写出来比读 10 篇官方文档管用**：

**坑 1：把 memory 写进 AGENTS.md，污染了同事的 AI 上下文**
某次我把"用户偏好提前问而不是默认决策"写进 AGENTS.md，结果同事用 Cursor 拉代码后他的 AI 也开始反复问问题，被同事吐槽。这种个人偏好属于 memory，不该跨用户共享。

**坑 2：AGENTS.md 写了 300 行，AI 反而表现变差**
2026 年 ETH Zurich 的一项研究（[arXiv 2601.20404](https://arxiv.org/abs/2601.20404)）覆盖 2,500+ 真实 repo，显示 AGENTS.md 超过约 150 行后推理成本涨 20-23%，且 AI 抓不住重点。我把自己一个 280 行的 AGENTS.md 砍到 120 行后，Claude Code 跑同一个任务的准确度反而提升。**护照不是简历，要简洁**。

**坑 3：CLAUDE.md 和 AGENTS.md 内容重复、不同步**
开始我两边都写一份命令列表，3 个月后发现两份漂移了——其中一份的 `pnpm test` 命令早就改了但另一份没更新。**单一来源**——CLAUDE.md 用 `@AGENTS.md` 引入，或直接 symlink。

**坑 4：Cursor 还在用 `.cursorrules` 单文件**
Cursor 已经把 `.cursorrules` 标记 deprecated，迁移到 `.cursor/rules/*.mdc` 目录格式（带 frontmatter、支持 glob 自动激活）。新项目直接用新格式 + AGENTS.md 双轨——AGENTS.md 给所有工具看，`.cursor/rules/` 装 Cursor 特化的 IDE-only 规则（比如"修改 .tsx 文件时自动应用 React 规则"）。

**坑 5：memory 越攒越多，从来不清理**
memory 跟代码一样会腐烂。我每个月会扫一遍——已经写进 AGENTS.md 固化的 feedback 可以删掉、已经过期的 project（比如那个"封版到 6/15"的 memo）该清就清。**memory 不是日记本，是工作上下文，要随当前现实更新**。

## 进阶：让护照"自动更新"

最理想的状态是这套护照能跟着工作自动演化。我现在的做法：

1. **写 hook 自动提示**——Claude Code 的 settings.json 里挂一个 PostToolUse hook，每次大改动后弹"是否更新 AGENTS.md"
2. **memory 写入策略前移**——我的 system prompt 里有一段 "auto memory" 指令，告诉 AI 什么时候自动 save、什么时候不要问
3. **半月度 review**——每两周让 Claude 自己读一遍 AGENTS.md + memory，挑出"过时/矛盾/可合并"的条目让我决策

第 3 点是最有意思的——AI 比我更擅长发现自己上下文里的不一致。让它定期审视自己的护照，整套系统就活了。

## 结尾

回到最开始那个画面：每天早上开新会话，AI 要么把项目当陌生人、要么我反复粘贴上下文。

"项目护照"这套框架不是什么新发明——AGENTS.md / CLAUDE.md / memory 都已经存在。它的价值在于**把三个本来零散的机制拼成一个有机整体**：项目共识、工具特化、个人沉淀各居其位，让 AI 在每次会话开局就知道"这个项目是什么、我能做什么、不能做什么"。

如果你现在的 AI 编码体验还停留在"反复贴上下文"，从最简单的一步开始：在项目根目录建一个 100 行的 AGENTS.md，写清楚技术栈、命令、3 条 Don'ts。明天的 AI 会因此变得不一样。

---

**延伸阅读**：
- [AGENTS.md 官方规范](https://agents.md/) - OpenAI 提出、Linux Foundation 维护的 vendor-neutral 标准
- [Claude Code Memory Best Practices](https://docs.claude.com/en/docs/claude-code/memory) - CLAUDE.md 与 import 语法
- [Cursor Rules Migration](https://docs.cursor.com/context/rules) - 从 `.cursorrules` 到 `.cursor/rules/*.mdc`
- [本博客旧文 blog186 - Prompt Context 三层 harness](https://chenguangliang.com/posts/blog186_prompt-context-harness-agentic-layers/) - 更底层的上下文工程视角
