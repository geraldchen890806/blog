---
author: 陈广亮
pubDatetime: 2026-04-21T09:00:00+08:00
title: 一个 CLAUDE.md 文件，一周涨了 44K Star：Karpathy 的 AI 编程四原则
slug: blog139_karpathy-skills-claude-md-guide
featured: true
draft: false
reviewed: true
approved: true
tags:
  - Claude Code
  - AI
  - 开发效率
  - AI Agent
description: 拆解 forrestchang/andrej-karpathy-skills 仓库一周暴涨 44K star 的背后：Karpathy 总结的 AI 编程四原则（编码前思考、简洁第一、手术式修改、目标驱动执行），以及如何在 Claude Code 中直接使用。
---

2026 年 1 月 27 日，一个只有一个 Markdown 文件的 GitHub 仓库悄悄上线。到 4 月，它突然在社区扩散，单日新增数千 stars，一周内暴涨 44K，总 star 数达到 67K+。

这个仓库叫 [forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills)，核心内容是一份 `CLAUDE.md`——把 Andrej Karpathy 关于 LLM 编程失败模式的观察，提炼成四条 AI 助手应遵循的原则。

## 为什么 Karpathy 的观点值得关注

Karpathy 是前 Tesla 人工智能总监、OpenAI 早期研究科学家（创始成员），也是对 LLM 编程行为观察最有影响力的工程师之一。2025 年 2 月他提出"Vibe Coding"（氛围编程，指完全依赖 LLM 生成代码、不关心代码细节）概念，随后被广泛讨论；2026 年他补充：对于真正在乎的代码，需要更多的结构和纪律，而不是完全放手。

他对 LLM 编程工具的核心批评是（原文）：

> "Models make wrong assumptions on your behalf and just run with them without checking. They don't manage confusion, don't seek clarification, don't surface inconsistencies, don't present tradeoffs, don't push back when they should."

这个诊断精准击中了很多开发者的真实体验——AI 助手太急于动手，宁可写出一堆代码也不愿停下来问一个问题。

## 四条原则

### 1. Think Before Coding（编码前思考）

**核心要求**：浮出假设，不要默默地做决定。

具体行为：
- 明确陈述你的假设，而不是悄悄选一种解释
- 如果任务有多种理解方式，把它们都列出来
- 遇到不确定时，**停下来提问**，而不是猜测并继续
- 当有更简单的方案时，说出来
- 该推回时推回

这条原则解决的是 AI 的"隐式决策"问题。你让它"修复这个 bug"，它可能修了，但用的方式和你预期完全不同，而它从头到尾没问过你一次。

### 2. Simplicity First（简洁第一）

**核心要求**：用最少的代码解决问题，没有多余的东西。

具体规则：
- 不写超出需求的功能（no speculative features）
- 不为单次使用的逻辑创建抽象
- 不加没被要求的"灵活性"或"可配置性"
- **如果 200 行代码可以是 50 行，就重写它**

AI 有一种天然的倾向——用更"完整"、更"通用"的方案，而不是最简单的方案。这个原则是直接的反制。

### 3. Surgical Changes（手术式修改）

**核心要求**：只改需要改的，不动其他任何东西。

具体规则：
- 不重构你没被要求重构的代码
- 不改动无关的格式
- 不删除预先存在的死代码（除非被明确要求）
- 保持现有代码风格
- **每一行改动都应该能直接追溯到用户的请求**

这条原则解决的是"附带更改"问题。你让 AI 加一个函数，它顺手把整个文件的缩进都改了，把你的 git diff 变成了一团乱麻。

### 4. Goal-Driven Execution（目标驱动执行）

**核心要求**：把模糊任务转化为可验证的成功标准。

具体做法：
- 不是"修复这个 bug"，而是"写一个能复现这个 bug 的测试，然后让它通过"
- 不是"实现这个功能"，而是"完成后 X、Y、Z 应该成立"
- 定义清晰的验证步骤，让 AI 能进入自我纠正的循环

Karpathy 的核心观察（原文）：

> "LLMs are very good at looping until a specific goal is met... Don't tell it what to do, give it success criteria and watch it go."

这是四条原则里技术含量最高的一条，本质上是把"命令式"改成"声明式"——你不再描述步骤，而是描述结果。

## 如何在 Claude Code 中使用

### 方式一：Claude Code 插件（推荐）

```bash
# 先添加仓库到插件市场
/plugin marketplace add forrestchang/andrej-karpathy-skills

# 再安装
/plugin install andrej-karpathy-skills@karpathy-skills
```

安装后自动生效，无需额外配置。

### 方式二：复制到项目 CLAUDE.md

把仓库里的 `CLAUDE.md` 内容复制到你项目根目录的 `CLAUDE.md` 文件里。这样只对当前项目生效，适合需要定制的场景。

### 方式三：添加到全局 CLAUDE.md

```bash
# 先克隆仓库
git clone https://github.com/forrestchang/andrej-karpathy-skills.git /tmp/karpathy-skills

# 追加到全局配置
cat /tmp/karpathy-skills/CLAUDE.md >> ~/.claude/CLAUDE.md
```

全局生效，所有项目都受约束。

### Cursor 用户

仓库已内置 Cursor 适配文件，直接使用：

```bash
# 复制到项目的 Cursor 规则目录
cp /tmp/karpathy-skills/.cursor/rules/karpathy-guidelines.mdc .cursor/rules/
```

或参考仓库根目录的 `CURSOR.md` 文档。

## 实际效果

采用这套规则后，据社区使用者的非正式反馈，在复杂度高、需求模糊的任务上效果最明显——AI 开始会先问问题，而不是直接动手。

直观的变化体现在：
- AI 开始会在动手前问问题，而不是直接写代码
- PR 里不再出现无关的格式改动
- 遇到多种实现方案时会列出来让你选，而不是默默选一种

## 为什么一个 Markdown 文件会有这么大影响

这件事本身说明了一件事：当前 AI 编程工具的最大瓶颈不是模型能力，而是**行为约束**。

模型已经足够聪明，能读懂复杂需求、生成高质量代码。但没有约束的情况下，它会用最"显而易见"的路径，而不是最适合你情况的路径。

`CLAUDE.md` 这类机制的本质，是把工程师的工作习惯（先问清楚、改最少、以测试为准）编码成 AI 可以遵循的规则。Karpathy 的版本恰好把这几条规则表达得清晰、简洁、可操作——这是它爆红的原因。

---

仓库地址：[forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills)

如果你在用 Claude Code，这是目前性价比最高的配置之一：一个文件，没有依赖，立竿见影。
