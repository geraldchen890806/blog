---
author: 陈广亮
pubDatetime: 2026-04-20T09:00:00+08:00
title: Claude Code 两个你可能没用过的环境变量：EFFORT_LEVEL 和 ADDITIONAL_DIRECTORIES_CLAUDE_MD
slug: blog134_claude-code-env-vars-guide
featured: true
draft: false
reviewed: true
approved: true
tags:
  - Claude Code
  - 开发效率
  - AI
description: 深度解析 Claude Code 两个被低估的环境变量：CLAUDE_CODE_EFFORT_LEVEL 控制推理档位，CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD 实现跨项目共享规则，附完整配置示例和使用场景。
---

用 Claude Code 一段时间后，你会发现它的行为有时"时好时坏"：有时写出的代码令人惊叹，有时却犯一些低级错误。实际上这背后有一个很多人没注意到的控制机制——**推理档位（effort level）**。

与此同时，如果你同时维护多个项目，可能也遇到过这个问题：每个项目都要写一份差不多的 CLAUDE.md，重复配置团队规范、编码风格……有没有办法共享这些规则？

这篇文章介绍两个被严重低估的 Claude Code 环境变量。

## 第一个：CLAUDE_CODE_EFFORT_LEVEL

### 推理档位是什么

Claude Code 在每次响应时，会分配一定的"推理预算"——思考多深、考虑多少方案、验证多少边界情况。这个预算就是 effort level。

**支持的档位**：

| 档位 | 说明 | 适用场景 |
|------|------|----------|
| `low` | 最小推理预算，响应最快 | 简单重命名、格式化、单行修改 |
| `medium` | 中等预算，均衡成本与质量 | 日常开发任务、写函数、改 bug |
| `high` | 大预算，追踪复杂逻辑 | 复杂重构、多文件改动、难以定位的 bug |
| `xhigh` | 超高预算（Opus 4.7 独有）| 长时间 agent 任务、复杂架构设计 |
| `max` | 无上限，全力推理 | 最复杂的任务，慎用 |

注意：`xhigh` 是 2026 年随 Opus 4.7 引入的新档位。**Opus 4.7 的默认 effort level 已经是 `xhigh`**，无需手动设置。如果你用的是 Opus 4.6 或 Sonnet 4.6，设置 `xhigh` 会自动降级到 `high`。

### 为什么需要手动设置

**2026 年 3 月，Anthropic 把 Pro/Max 订阅用户的默认档位从 `high` 降到了 `medium`**（针对 Opus 4.6/Sonnet 4.6）。

如果你最近觉得 Claude Code 质量下滑，很可能不是模型变差了，而是推理预算被调低。这个变化没有明显的 changelog，很多用户完全不知道。

更复杂的是，在 medium 档位下，adaptive thinking 有时会在某些轮次分配零推理 token，导致模型开始"编造"——捏造不存在的 commit SHA、引用不存在的包。社区验证的临时修复方案：

```bash
export CLAUDE_CODE_EFFORT_LEVEL=high
# 如果问题严重，可以加上：
export CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1
```

### 四种设置方式

**方式一：环境变量（推荐，跨会话持久化）**

```bash
# 加到 ~/.zshrc 或 ~/.bashrc
export CLAUDE_CODE_EFFORT_LEVEL=high

# 单次覆盖
CLAUDE_CODE_EFFORT_LEVEL=low claude --model sonnet
```

**方式二：settings.json（项目级配置）**

```json
{
  "effortLevel": "high"
}
```

**方式三：启动参数（单次会话）**

```bash
claude --effort high
```

**方式四：会话内动态切换**

```
/effort high
/effort low
/effort auto   # 重置为默认值
```

**优先级**：环境变量 > 会话配置（/effort）> 模型默认值

### 一个重要细节：max 档位的特殊性

`max` 档位（全力推理，无 token 上限）只有通过**环境变量**设置才能跨会话持久化。用 `/effort max` 或 `--effort max` 只对当前会话有效，下次启动就恢复了。

但 Anthropic 官方建议：**先用 eval 验证 max 是否比 xhigh 有明显效果提升，再决定是否采用**。max 存在"过度思考"的风险——推理预算越大，模型越可能钻牛角尖，反而输出更差的结果。

### 与 think 触发词的区别

很多人以为在 prompt 里写关键词和设置 effort level 是一回事，其实完全不同：

- **`/effort` / `CLAUDE_CODE_EFFORT_LEVEL`**：通过 API 参数控制推理档位，是**系统级的持久设置**
- **`think` / `think hard` / `think harder`**：在 prompt 中插入的文字触发词，是**上下文内的一次性指令**，不改变发送给 API 的 effort level

触发词对应的大概 token 预算（供参考，以官方最新文档为准）：
- `think`：~4,000 tokens
- `think hard`：~10,000 tokens
- `think harder`：~31,999 tokens（从 Claude 4 起，思考模式已默认启用，触发词主要起调节预算的作用）

两者可以叠加使用，但不能互相替代。

### 实际推荐配置

```bash
# ~/.zshrc
# 日常编码任务，均衡成本和质量
export CLAUDE_CODE_EFFORT_LEVEL=high

# 如果用 Opus 4.7 做重型 agent 任务，改为：
# export CLAUDE_CODE_EFFORT_LEVEL=xhigh

# 子 agent 用更便宜的模型（节省成本）
export CLAUDE_CODE_SUBAGENT_MODEL=claude-sonnet-4-6
```

---

## 第二个：CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD

### 问题场景

假设你在维护一个 monorepo，结构如下：

```
my-company/
├── CLAUDE.md          ← 团队规范（编码风格、安全要求、API 接口约定）
├── packages/
│   ├── frontend/
│   │   └── CLAUDE.md  ← 前端特定规则（React 组件规范、CSS 约定）
│   └── backend/
│       └── CLAUDE.md  ← 后端特定规则（数据库约定、接口设计）
```

当你在 `packages/frontend` 目录启动 Claude Code 时，它只会读取 `packages/frontend/CLAUDE.md`，**不会**自动读取根目录的团队规范。

要让 Claude 同时了解根目录规范，需要用 `--add-dir ../..`：

```bash
cd packages/frontend
claude --add-dir ../..
```

但这里有个问题：**`--add-dir` 默认只给 Claude 访问目录的权限，不会加载目标目录的 CLAUDE.md**。这是出于向后兼容的考虑，避免意外加载不相关的规则文件。

### 解决方案：CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD

设置这个环境变量后，`--add-dir` 指向的目录也会加载其中的 CLAUDE.md 系列文件：

```bash
export CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1

# 现在启动时，根目录的 CLAUDE.md 也会被加载
cd packages/frontend
claude --add-dir ../..
```

加载范围包括目标目录中的：
- `CLAUDE.md`
- `.claude/CLAUDE.md`
- `.claude/rules/*.md`
- `CLAUDE.local.md`

### 实际使用场景

**场景一：Monorepo 多包开发**

在子包目录启动 Claude，同时加载根目录团队规范：

```json
{
  "env": {
    "CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD": "1"
  },
  "additionalDirectories": ["../.."]
}
```

根目录 CLAUDE.md（团队规范）和子目录 CLAUDE.md（模块规则）会叠加生效，Claude 同时了解两套规则。

**场景二：微服务跨仓库开发**

前端需要了解后端 API 规范，后端 CLAUDE.md 里写了接口格式、错误码约定：

```bash
alias claude-fs="CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1 claude --add-dir ../backend"
```

**场景三：公司级共享规范**

维护一个独立的规范目录，所有项目都引用：

```
~/company-rules/
└── CLAUDE.md   ← 安全规范、合规要求、技术栈约定
```

```bash
# ~/.zshrc
export CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1
# 在每个项目的 settings.json 中添加
# "additionalDirectories": ["~/company-rules"]
```

### 搭配 claudeMdExcludes 精细控制

有时 `--add-dir` 会引入你不想要的规则（比如某个团队的特定约定和你的项目冲突），可以用 `claudeMdExcludes` 过滤：

```json
{
  "claudeMdExcludes": [
    "**/other-team/.claude/rules/**",
    "**/irrelevant-package/CLAUDE.md"
  ]
}
```

---

## 附：其他值得了解的环境变量

研究这两个变量的过程中，发现了几个同样有用的配置：

```bash
# 关闭 adaptive thinking（中等档位下出现幻觉时的临时修复）
export CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1

# 触发自动压缩的上下文阈值（默认约 83%，只能降低不能升高）
export CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=70

# 子 agent 使用更便宜的模型
export CLAUDE_CODE_SUBAGENT_MODEL=claude-sonnet-4-6

# 日志审计：所有 bash 命令都通过包装脚本执行
export CLAUDE_CODE_SHELL_PREFIX=/path/to/audit.sh

# 多账户场景：指定不同的配置目录
export CLAUDE_CONFIG_DIR=~/.claude-work
```

---

## 小结

这两个变量解决的问题不同，但都值得根据实际情况配置：

- **`CLAUDE_CODE_EFFORT_LEVEL`**：如果你发现 Claude Code 质量不稳定，先检查这个。默认 medium 档位在某些情况下会导致幻觉，设置为 `high` 是大多数开发者的合理选择。
- **`CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD`**：如果你在做 monorepo 开发或需要跨项目共享规范，这个变量可以避免大量重复配置。

两个变量都写入 `~/.zshrc` 就能永久生效，成本几乎为零。

---

**相关阅读**：
- [Claude Code 插件生态全解析：Skills、Hooks、MCP Server 如何组合](https://chenguangliang.com/posts/blog088_mcp-roadmap/) - 了解 Claude Code 的整体架构
