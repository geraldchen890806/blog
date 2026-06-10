---
author: 陈广亮
pubDatetime: 2026-04-20T11:00:00+08:00
title: obra/superpowers：让 AI 编程 Agent 先思考再动手的方法论框架
slug: blog138_superpowers-agentic-skills-framework
featured: true
draft: true
reviewed: false
approved: false
tags:
  - AI Agent
  - 开发效率
  - Claude Code
  - 自动化
description: 深度介绍 obra/superpowers，一个通过可组合"技能"文件强制 AI 编程 Agent 遵循结构化工作流的开源框架，拆解其技术原理、14个核心技能体系和在 Claude Code 中的实际用法。
---

AI 编程 Agent 最常见的失败模式不是能力不够，而是太急于动手。你描述一个需求，它立刻开始写代码——跳过设计、跳过测试、跳过验证，最终交付一堆能跑但难以维护的代码。

[obra/superpowers](https://github.com/obra/superpowers) 是一个专门解决这个问题的框架。它不增加新能力，而是通过一套可组合的 Markdown "技能"文件，强制 Agent 在每个关键决策点先停下来思考，再采取行动。

截至 2026 年 4 月，项目已有 16 万+ stars，是 GitHub 上增长最快的 AI 工具方法论项目之一。

## 核心思路：工作流约束而非能力增强

Superpowers 的 README 开头就说明了它不是什么：

> "It doesn't just jump into trying to write code. Instead, it steps back and asks you what you're really trying to do."

这个框架的理念是：Agent 的问题不在于不够聪明，而在于没有被约束在正确的工作流中。就像一个优秀但急躁的工程师，需要团队流程（设计评审、代码审查、TDD）来确保质量，而不仅仅是更强的个人能力。

### 技术实现：零依赖的上下文注入

Superpowers 的实现很简单：

- **全部由 Markdown 文件 + Shell 脚本构成**
- **无运行时依赖，无外部服务，无构建步骤**
- 通过 Hook 机制在会话启动时注入核心技能到 Agent 上下文

```
superpowers/
├── skills/
│   ├── using-superpowers/
│   │   └── SKILL.md              ← 元技能，网关
│   ├── brainstorming/
│   │   └── SKILL.md
│   ├── writing-plans/
│   │   └── SKILL.md
│   ├── test-driven-development/
│   │   └── SKILL.md
│   ├── subagent-driven-development/
│   │   └── SKILL.md
│   └── ...（共 14 个技能目录）
├── hooks/
│   ├── session-start             ← 注入脚本
│   ├── hooks.json                ← Claude Code hook 配置
│   └── hooks-cursor.json         ← Cursor hook 配置
├── CLAUDE.md                     ← Claude Code 集成入口
├── GEMINI.md                     ← Gemini CLI 集成入口
├── AGENTS.md                     ← 通用 Agent 集成入口
└── docs/
    ├── superpowers/specs/         ← 设计规范存储
    └── superpowers/plans/         ← 执行计划存储
```

会话启动时，`session-start.sh` 把 `using-superpowers.md` 注入到 Agent 上下文，格式根据平台不同有差异：

- **Claude Code**：`hookSpecificOutput.additionalContext`
- **Cursor**：`additional_context`
- **Gemini CLI**：原生格式

`using-superpowers.md` 作为网关（Gateway），告诉 Agent：收到任何任务时，先检查是否有适用的技能，如果有，**必须使用**。技能文件用 `<EXTREMELY_IMPORTANT>` 标签包裹关键约束，格式化为 JSON 嵌入上下文。

## 14 个核心技能

### 1. brainstorming（头脑风暴）

在动手之前，通过 Socratic 问答精炼需求：

- 提出 3-5 个澄清问题，不是一次全问
- 提供 2-3 个实现方案，标注各自取舍
- 分段展示设计，获得批准后才继续

这个技能专门对抗 Agent 的"我知道你要什么"假设——即使任务描述很清楚，也可能和你真实的意图有偏差。

### 2. writing-plans（计划编写）

把工作分解为具体可执行的任务列表：

- 每个任务预估 2-5 分钟完成
- 包含完整文件路径（不允许用"等文件"这种模糊描述）
- 每个任务附带验证步骤（如何确认这一步做完了）
- 计划保存到 `docs/superpowers/plans/`，可追溯

### 3. test-driven-development（TDD）

强制执行 RED-GREEN-REFACTOR 循环：

```
RED:     先写失败的测试，确认测试能检测到问题
GREEN:   写最小实现代码，让测试通过
REFACTOR: 重构代码，确保测试仍然通过
```

技能文件里列出了 Agent 常见的规避策略（"测试通过了！"——但没有运行完整测试套件），并提供计数器应对。

### 4. subagent-driven-development（子代理驱动开发）

为每个计划任务派发独立子 Agent，两阶段审查：

1. **规范合规性审查**：实现是否符合计划和设计规范
2. **代码质量审查**：测试覆盖、边界情况、可维护性

子 Agent 只接收当前任务的必要上下文，防止上下文窗口污染。完成后返回状态：`DONE`、`DONE_WITH_CONCERNS`、`BLOCKED`、`NEEDS_CONTEXT`。

### 5. using-git-worktrees（Git 隔离工作区）

为每个功能创建独立的 Git 工作树：

```bash
# 创建隔离工作区
git worktree add ../feature-auth feature/auth

# 在隔离环境开发
cd ../feature-auth
# 做所有改动...

# 完成后清理
git worktree remove ../feature-auth
```

这样多个任务可以并行进行，互不干扰，也便于代码审查时对比差异。

### 6. systematic-debugging（系统调试）

四阶段根本原因分析：

1. **再现**：确认能稳定复现问题
2. **隔离**：缩小问题范围
3. **假设**：列出可能的原因，按概率排序
4. **验证**：逐一验证，不跳步骤

对抗 Agent 的"试了几个方法没用就放弃"模式。

### 其他技能

| 技能 | 作用 |
|------|------|
| `requesting-code-review` | 启动同行评审，准备审查材料 |
| `receiving-code-review` | 处理审查反馈，逐条响应 |
| `dispatching-parallel-agents` | 协调多 Agent 并行执行独立任务 |
| `executing-plans` | 按计划实施，逐步跟踪进度 |
| `verification-before-completion` | 完成前的质量检查清单 |
| `finishing-a-development-branch` | 分支合并决策和工作区清理 |
| `writing-skills` | 编写自定义技能文档，扩展框架 |
| `using-superpowers` | 元技能，作为网关检测适用技能 |

## 完整开发工作流

这 15 个技能串联起来，构成一个完整的开发流程：

```
需求输入
  └─> brainstorming              精炼需求，确认方向
      └─> writing-plans          分解任务，制定计划
          └─> using-git-worktrees    创建隔离工作区
              └─> subagent-driven-development  逐任务派发子 Agent
                  └─> test-driven-development  TDD 实现
                      └─> requesting-code-review   提交代码审查
                          └─> receiving-code-review    处理审查反馈
                              └─> verification-before-completion  完成前检查
                                  └─> finishing-a-development-branch  合并收尾
```

遇到问题时，`systematic-debugging` 随时介入。

## 在 Claude Code 中使用

### 安装

Superpowers 已上架 Claude Code 官方插件市场，一条命令安装：

```bash
/plugin install superpowers@claude-plugins-official
```

或通过 Superpowers 自建市场安装：

```bash
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

安装完成后插件会自动注册 SessionStart Hook，无需手动配置 `settings.json`。

**其他平台安装**：

```bash
# Cursor：在 Agent Chat 中执行
/add-plugin superpowers

# OpenCode：在 opencode.json 中添加
{
  "plugin": ["superpowers@git+https://github.com/obra/superpowers.git"]
}
```

GitHub Copilot CLI、OpenAI Codex CLI 也已支持，参考仓库 README 对应章节。

### 验证安装

启动新会话，描述一个功能需求（如"帮我加一个用户登录功能"）。如果正常工作，Agent 应该先触发 `brainstorming` 技能，开始提出澄清问题，而不是直接写代码。

### 按需触发技能

也可以手动指定使用某个技能：

```
# 触发头脑风暴
开始头脑风暴：我想给 API 加限流功能

# 触发计划编写
为以下需求编写实现计划：[需求描述]

# 触发 TDD
用 TDD 实现：[功能描述]
```

## 为什么有效：行为约束的原理

Superpowers 在技能文件的设计上借鉴了行为科学的方法：

**预期规避策略表格**：每个技能文档预先列出 Agent 可能找的借口，以及如何回应：

| Agent 可能的想法 | 技能的回应 |
|---------|---------|
| "这太简单了，不需要设计" | 简单的事情不需要长时间设计，但跳过设计会累积技术债 |
| "测试通过了！" | 是否运行了完整测试套件？还是只运行了新写的测试？ |
| "我只需要快速修复" | 快速修复可能引入新的 bug，计划步骤只需要 2 分钟 |

**强制选择而非默认**：技能文件使用了 "YOU DO NOT HAVE A CHOICE. YOU MUST USE IT." 这样的明确指令，防止 Agent 自行判断"这次可以跳过"。

这种设计让工作流约束在心理层面也成立，而不仅仅是形式上的流程。

## 适用场景和局限

**适合**：
- 复杂功能开发，需求可能随推进而变化
- 团队协作场景，需要可追溯的计划和审查记录
- 对代码质量要求高的项目（测试覆盖、可维护性）
- 习惯 TDD 的开发者

**不太适合**：
- 快速原型验证，不需要生产质量
- 简单的一次性脚本
- 对话式探索（"帮我解释这段代码"）

**局限**：
- 增加了每个任务的前置开销（头脑风暴、计划编写需要额外交互轮次）
- 依赖 Hook 机制，不同平台的集成体验有差异
- 技能文件占用上下文 token，对短上下文窗口的模型有影响

---

obra/superpowers 的价值不在于给 Agent 加新功能，而在于把工程师熟悉的工作流（设计评审、TDD、代码审查）编码成 Agent 可以遵循的约束。16 万 stars 的方法论项目，核心是 Markdown 文件，说明这个问题——让 Agent 行为可预测、可审计——确实困扰着很多开发者。

项目地址：[https://github.com/obra/superpowers](https://github.com/obra/superpowers)
