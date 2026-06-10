---
author: 陈广亮
pubDatetime: 2026-04-14T20:00:00+08:00
title: Hermes Agent 开发实战：把 AI 助手嵌进项目开发流程
slug: blog122_hermes-agent-dev-workflow
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI Agent
  - 开发效率
description: 不是再介绍 Hermes 有哪些功能，而是记录把它真正用进项目开发流程之后的体验：代码 review、需求拆解、文档生成、定时监控，哪些场景真的有用，哪些会坑你。
---

上一篇[介绍 Hermes Agent](https://chenguangliang.com/posts/blog117_hermes-agent-guide/) 的时候，我主要在讲它有什么功能、跟 OpenClaw 怎么对比。用了几周之后，有了更具体的感受——Hermes 在某些开发场景下确实省事，但也有几个地方容易踩坑。这篇记录实际的使用经验。

## 基础配置：给项目建一个专属 Agent

Hermes 支持多个 Agent 实例并行运行，每个 Agent 有独立的角色设定和记忆。我的做法是给每个主要项目建一个 Agent，而不是用一个通用 Agent 处理所有事情。

```bash
# 新建一个项目专属 Agent
hermes agent create --name "blog-dev" --workspace ~/ai/blog
```

然后写一份简短的 SOUL.md 放进 workspace，告诉 Agent 这个项目是什么：

```markdown
# Blog Dev Agent

你是这个 Astro 博客项目的开发助手。

## 项目概况
- 框架：Astro 5 + Tailwind CSS
- 部署：Cloudflare Pages
- 内容目录：src/data/blog/
- 组件目录：src/components/

## 工作原则
- 修改组件前先读取现有文件，了解命名风格
- 涉及样式修改时，优先复用已有的 Tailwind class
- 提交代码前确认 npm run build 通过
```

角色设定不需要很长，关键是让 Agent 知道项目的目录结构和基本约束。Hermes 的自学习循环会在后续对话中自动补充更多上下文。

## 场景一：代码 Review

这是我用得最频繁的场景。写完一段功能，直接让 Hermes 来 review，比自己盯着屏幕有效。

把 Agent 绑定到 Telegram Bot 之后，workflow 很自然：

```
我：刚写完文章排序功能，帮我 review 一下
    [粘贴代码或说文件路径]

Hermes：读取文件... 分析...
         发现 3 个问题：
         1. sortByDate 函数没处理 pubDatetime 为空的情况
         2. 用了 new Date() 而不是 Date.parse()，边界情况下有差异
         3. 排序后没有 slice，数据量大时会影响首屏性能

         建议修改方案：...
```

几个使用技巧：

**给 review 加约束条件。** 直接说"帮我 review 代码"太宽泛，容易拿到一堆无关紧要的格式建议。更有用的方式是指定关注点：

```
帮我 review src/utils/sort.ts，重点关注边界情况和性能，忽略命名风格问题
```

**跨文件 review。** Hermes 的文件工具可以读取整个目录，适合 review 涉及多个文件的改动：

```
review 我今天对 src/components/ 下的改动，主要关注有没有影响到其他组件的改动
```

**让它对比 PR 前后的差异。** 结合 Git 工具：

```
用 git diff main..feature/sort-fix 看一下这次改动，有没有引入新问题
```

## 场景二：需求拆解和技术方案

接到一个模糊的需求，让 Hermes 帮你把它拆成可执行的任务列表，比自己想要快。

```
需求：给博客加一个"相关文章"推荐功能，基于标签相似度，
      显示在文章底部，最多 3 篇

帮我拆解实现方案，考虑现有的 Astro 项目结构
```

它会读取项目结构，结合你的技术栈给出方案，比直接问 ChatGPT 更贴近实际情况。

输出通常包括：
- 实现思路（比较不同方案的优劣）
- 文件改动清单（新建/修改哪些文件）
- 实现步骤（可以直接照着做）
- 潜在风险（容易踩坑的地方）

如果方案不满意，可以继续追问细节，上下文会保留。

## 场景三：文档生成

写文档是开发中最容易拖的事情。Hermes 在这里能省不少力气。

**生成 README：**

```
读取 src/config/tools.ts 和 src/components/ 目录，
帮我生成一份 README，包括项目结构说明和主要配置项
```

**生成函数注释：**

```
给 src/utils/rss.ts 里的所有导出函数加 JSDoc 注释，
风格参考 src/utils/sort.ts 里已有的注释
```

**生成 CHANGELOG：**

```
读取最近 10 条 git commit，整理成 CHANGELOG 格式，
按 feat/fix/refactor 分类
```

这类任务的特点是：结果不需要完美，能生成 70% 的内容已经够用，剩下的人工微调。Hermes 在这里的价值是把"从零写文档"变成"改草稿"。

## 场景四：定时监控和自动化

Hermes 内置的 Cron 调度器在这里很实用。我设置了几个定时任务：

**每天早上检查构建状态：**

通过对话设置定时任务（不需要编辑配置文件）：

```
每天上午 9 点，在项目目录下运行 npm run build，
如果失败就把错误日志发给我的 Telegram
```

**每周汇总 Git 提交：**

```
每周一上午 10 点，读取上周的 git log，
整理成本周完成了什么、有哪些遗留问题，发到 Telegram
```

**监控依赖更新：**

```
每周五下午检查 package.json 里有没有需要更新的依赖，
列出有 breaking change 的包
```

这类定时任务原来要写独立的 shell 脚本或 Node 脚本，现在直接用自然语言描述。任务执行的结果会推送到 Telegram，不用主动去查。

## 场景五：调试辅助

遇到 bug 的时候，Hermes 可以当第二双眼睛。

把报错信息发给它：

```
运行 npm run build 报这个错误：
[粘贴报错信息]

帮我找原因，需要的话读取相关文件
```

它会自己读取报错涉及的文件，定位问题。通常不如直接问 Claude.ai 精准，但好处是它能直接读你的项目文件，不需要你手动复制粘贴上下文。

对于前端的 hydration 错误、CSS 层叠问题这类"只有看到实际代码才能判断"的 bug，这个能力特别有价值。

## 踩过的坑

**自学习技能干扰正常对话。** Hermes 的自学习循环有时会把偶然的操作固化成"技能"，导致后续出现奇怪的行为——比如你某次让它用特定格式写文档，它就把这个格式记下来，之后每次写文档都用这个格式，即使你没有要求。

解决方法：定期检查已有技能列表，删除不需要的：

```bash
hermes skills list
hermes skills delete <skill-id>
```

**文件操作要明确路径。** Hermes 有时会猜测文件路径，猜错了会读到错误的文件。养成习惯：涉及文件操作时，明确说完整路径，不要说"那个配置文件"。

**长对话后上下文混乱。** 一次对话里做太多不相关的事情，Hermes 的上下文会变得混乱。最好的做法是按任务类型开新会话：`/new` 重置上下文，新任务从干净状态开始。

**并发任务要小心。** 同时发起多个涉及文件写入的任务，可能产生冲突。Hermes 的并发控制目前不够完善，尽量串行处理有文件改动的任务。

## 哪些场景不适合用 Hermes

**需要精确控制每一步的任务。** Hermes 的自主性意味着它会自己决定怎么实现，如果你需要完全掌控每一行代码的逻辑，用 Claude Code 直接操作更合适。

**需要调试 Agent 本身行为的场景。** 当 Hermes 做了不符合预期的事情，追踪原因比较困难——它的日志没有 Claude Code 清晰，自学习产生的行为更难复现和排查。

**团队项目。** Hermes 目前的记忆和技能是单用户的，没有团队共享机制，在多人协作项目里价值有限。

---

总结下来：Hermes 在个人项目开发中，最有价值的场景是那些"重复性高、不需要精确控制、但有一定上下文要求"的任务——code review、文档生成、定时监控、需求拆解。这些事情用通用 AI 助手做效果也不差，但 Hermes 能直接读你的项目文件、记住你的偏好，省去了大量"提供背景信息"的成本。

如果你已经在用 Claude Code 做深度开发，Hermes 更适合做"外围助理"——处理那些你不想花时间、但又不得不做的周边工作。

**延伸阅读**：
- [Hermes Agent 评测：OpenClaw 的继任者](https://chenguangliang.com/posts/blog117_hermes-agent-guide/) - Hermes 核心功能介绍、适用场景及与 OpenClaw 的对比
- [Claude Code Hooks 深度指南](https://chenguangliang.com/posts/blog119_claude-code-hooks-guide/) - 用 Hooks 让 Claude Code 自动化处理代码质量和危险操作拦截
- [用 Claude Code CLI 构建多 Agent 自动化系统](https://chenguangliang.com/posts/blog115_openclaw-to-claude-code-migration/) - 自建方案的完整实现，与 Hermes 方案形成对比
