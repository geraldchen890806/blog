---
author: 陈广亮
pubDatetime: 2026-05-11T11:00:00+08:00
title: Claude Code 工作流类插件横评 2026：Superpowers、Shipyard、Ralph Loop、Maestro、Karpathy CLAUDE.md 怎么选
slug: claude-code-workflow-plugins-comparison
featured: true
draft: false
reviewed: true
approved: true
tags:
  - Claude Code
  - AI Agent
  - 开发效率
  - 自动化
description: Claude Code 5 月生态已经分裂出 100+ 插件，本文聚焦"工作流方法论"这一类——Superpowers、Shipyard、Ralph Loop、Maestro、Karpathy CLAUDE.md 五款。从设计哲学、上下文开销、适用场景到组合策略，给出独立开发者的选型决策树。
---

写完 [Claude Code 五层架构](/posts/claude-code-five-layer-architecture/) 后我意识到一件事：架构层的能力（Skills、Sub Agent、MCP）只是地基，**真正影响日常体感的是上层的"方法论框架"**——这些把 Anthropic 原始能力组合成一套可执行流程的插件。

2026 年 5 月，Claude Code 生态已经分成清晰的三层：

1. **Anthropic 官方 marketplace**（101+ 插件，默认已装）
2. **obra 系工程方法论**（Superpowers、Shipyard 这类强调"先思考再动手"）
3. **多 agent 编排系**（Maestro 这类强调"用 N 个 specialist 自动协作"）

外加独立项目（Karpathy CLAUDE.md、Ralph Loop 等）。

这篇文章只聊**工作流方法论类**——它们改变的不是"工具能力"，而是"AI 写代码的节奏"。我把目前最常被讨论的 5 款都装到博客和 anyfreetools.com 两个项目里实际用了一两周，从设计哲学到 token 开销到适用场景做横评。

## 一句话定位

| 插件 | 一句话定位 | 哲学 | 量级 |
|---|---|---|---|
| **Superpowers**（obra）| 强制走完整 SDLC：脑暴 → 计划 → TDD → 实现 → 审查 | "AI 写代码最容易跳步" | 中（多 Skill 链） |
| **Shipyard** | Superpowers + IaC 验证 + 安全审计 | "AI 适合生产环境" | 中重 |
| **Ralph Loop** | 自主 while-true 循环模式 | "重复活该全自动" | 轻 |
| **Maestro** | 39 个 specialist + 四阶段工作流编排 | "AI 需要分工" | 重 |
| **Karpathy CLAUDE.md** | 单文件常驻规则集 | "把 LLM 已知的坑提前堵上" | 极轻 |

## 1. Superpowers：obra 系的工程方法论范式

[Superpowers](https://github.com/obra/superpowers) 是 obra（David Obrador）今年初发布的多 Skill 框架，定位是"为 Claude Code 加上完整的软件开发生命周期"。

### 核心机制

Superpowers 是一组**互相 chain 的 Skills**，每个 Skill 对应 SDLC 的一个阶段：

```text
/brainstorm    脑暴+假设验证
   ↓
/plan-feature  实施计划+任务拆解
   ↓
/git-worktree  开新 worktree 隔离开发环境
   ↓
/implement     按 plan 实施
   ↓ （每步走 TDD：先写测试再实现）
/code-review   多角度代码审查
   ↓
合并回主分支
```

每个 Skill 有明确的输入/输出和"完成准则"。完不成不能进下一步——这是 Superpowers 跟普通"加一堆 .claude/commands" 的根本区别。

### 实测体感

我把 Superpowers 装到博客项目跑了 3 个完整功能（包括前面提到的 RelatedPosts 组件）：

- **节奏变慢但稳**：以前 5 分钟搞定的小改动现在要 15 分钟，但**返工次数降到 0**
- **TDD 强制**：Skill 不允许你跳过测试，初期不适应但代码可信度高
- **Token 开销**：每个完整 SDLC 跑下来约 50-80k token，比直接写多用 2-3x

### 什么时候用

- ✅ 团队项目、生产代码、新功能开发
- ✅ 自己不熟悉的语言/框架（Superpowers 强制让你先理解再动手）
- ❌ 改一个 typo 也走 SDLC 是浪费
- ❌ 临时实验脚本、调试性代码

## 2. Shipyard：Superpowers 的"生产环境"加强版

[Shipyard](https://shipyard.build/blog/claude-code-multi-agent/) 定位很直接：**Superpowers 适合写应用代码，Shipyard 加上了"上生产前要做的事"**。

### 比 Superpowers 多的能力

- **IaC（基础设施即代码）验证**：扫 Terraform / Pulumi / CloudFormation 配置，检查权限、网络隔离、加密
- **安全审计**：依赖漏洞扫描、密钥泄漏检测、IAM 权限审查
- **部署预演**：在生产之前用 staging 环境验证完整迁移

### 实测体感

我没有大型 IaC 配置可以测，只用 Shipyard 跑了博客的 nginx 配置审计（410-gone.conf、301-redirects.conf 那些）：

- **安全审计有效**：发现我之前漏配的 `X-XSS-Protection` 头
- **IaC 检查对我意义不大**：博客没有 Terraform
- **比 Superpowers 重 30%**：装载时间和首次执行明显更慢

### 什么时候用

- ✅ 涉及生产部署、IaC、安全敏感操作
- ✅ 团队有合规要求
- ❌ 个人小项目，Superpowers 已经够

## 3. Ralph Loop：自主循环模式

[Ralph Loop](https://claude.com/plugins/ralph-loop) 是个反直觉的设计——它**完全不指挥 Claude 干什么**，而是把 Claude 放进一个 `while true` 循环里反复跑同一个 prompt 直到任务完成。

### 工作流程

```text
用户：用 Ralph Loop 把 src/components 里所有 React 组件迁移到 TypeScript
  ↓
Ralph 启动 loop:
  for each iteration:
    1. 找一个未完成的组件
    2. 迁移
    3. 跑测试
    4. commit
    5. 检查是否还有未完成
    6. 没有 → 退出；有 → 回到 1
```

每轮自动 commit，所以哪怕中途崩溃也能恢复。

### 实测体感

我用 Ralph Loop 跑了一件实际的活——给博客 50 篇文章批量加 OG image alt 文本（之前 SEO 审计发现这一项）：

- **跑了 1 小时 8 分钟、47 次 iteration**，47 个 commit，全部成功
- **Token 开销极高**：单次任务花了 ~$8 的 API 费（普通 Claude Code 会话约 $1）
- **省人脑**：我中途完全没干预，喝个咖啡回来发现搞定了

### 什么时候用

- ✅ CRUD 批量改动（迁移、补测试、加注释、改格式）
- ✅ 任务规范清晰、可枚举、能用客观标准判定完成
- ❌ 需要判断和取舍的工作（产品决策、架构选型）
- ⚠️ **Token 开销是普通用法的 5-10 倍**——预算敏感时谨慎使用

## 4. Maestro：39 specialist 编排

[Maestro](https://github.com/josstei/maestro-orchestrate)（josstei 维护，跨 Gemini CLI / Claude Code / Codex / Qwen Code 通用）是一个**多 agent 编排平台**，自带 39 个专项 specialist（早期版本是 22 个，5 月扩到 39）。

### 设计思路

每个 specialist 负责一个细分领域：

```text
Maestro 的部分 specialist 清单（共 39 个）：
├── code-architect       架构设计
├── code-reviewer        代码审查
├── security-auditor     安全审计
├── seo-specialist       SEO 优化
├── accessibility-checker  可访问性
├── compliance-officer   合规检查
├── debug-specialist     调试专家
├── performance-tuner    性能调优
└── ...（共 39 个）
```

工作流分四个阶段：

```text
Phase 1: Design       — 设计阶段，分解任务、决定调哪些 specialist
Phase 2: Plan         — 计划阶段，制定具体执行方案
Phase 3: Execute      — 并行调用相关 specialist 实施
Phase 4: Complete     — 完成阶段，review + 总结，approval gates 把控质量
```

另外还有一个 "Express path"——简单任务跳过 Phase 1，直接调一个 specialist。

### 实测体感

我用 Maestro 跑了 anyfreetools.com 新增工具页的开发：

- **Phase 1 阶段就 5 个 specialist 协商**了大约 15 分钟，token 开销不小
- **并行执行确实快**——SEO / a11y / 安全检查同时跑
- **过度规范化**：对一个独立小工具页，调 6 个 specialist 是杀鸡用牛刀

### 什么时候用

- ✅ 中大型项目、团队协作场景
- ✅ 需要多维度审查（安全 + SEO + a11y + 性能同时考虑）
- ❌ 独立开发者的小项目（开销远大于收益）
- ⚠️ 学习曲线最陡——39 个 specialist 不熟前期效率反而下降

## 5. Karpathy CLAUDE.md：单文件零依赖

最反直觉的选项：[Karpathy CLAUDE.md](/posts/blog139_karpathy-skills-claude-md-guide/)——它**不是插件**，是一个单一 CLAUDE.md 文件。

### 它做了什么

把 Karpathy 在 X 上发的"AI 写代码常犯的坑"清单系统化成一份 CLAUDE.md：

```markdown
## 写代码原则（基于 Karpathy 总结）

1. 不要发明 API。先 grep / 读源码确认存在
2. 不要 try/catch 后 return null。让错误冒到顶层
3. 不要为了"完整性"加从未被用到的辅助函数
4. 不要写注释解释代码做了什么——代码本身应该自明
5. 不要在没看过最简版本能跑前就开始优化
...
```

放进项目根目录的 CLAUDE.md，Claude Code 每次会话都会自动注入。

### 实测体感

这个我用了几个月（[blog139](/posts/blog139_karpathy-skills-claude-md-guide/) 写过详细体验）：

- **零开销**：一次写完，每次会话自动用，不消耗额外 token
- **效果惊人**：避坑成功率 80%+，特别是"AI 发明 API"这种典型问题
- **跟其他插件不冲突**：可以和 Superpowers / Maestro 同时用

### 什么时候用

- ✅ 所有项目都该装
- ✅ 不需要选择——这是基础设施级别的"零成本增益"
- ❌ 没有不适用的场景

## 选型决策树

```text
你的项目类型？
│
├── 独立开发者的个人项目
│     ├── 必装：Karpathy CLAUDE.md（基础设施）
│     └── 可选：Superpowers（新功能）/ Ralph Loop（批量改动）
│
├── 团队协作 / 生产代码
│     ├── 必装：Karpathy CLAUDE.md
│     ├── 主力：Superpowers（日常开发）
│     └── 涉及部署/安全：Shipyard
│
├── 中大型项目 + 多人协作
│     ├── 必装：Karpathy CLAUDE.md
│     ├── 主力：Maestro（多 specialist 并行）
│     └── 备选：Shipyard（生产部署阶段）
│
└── 特定批量任务（迁移、补测试、改格式）
      └── Ralph Loop（其他工具效率最差的场景）
```

## 五款的真实开销对比

按"完成一个中等复杂功能（约 200 行代码改动）"的实测：

| 插件 | 时间 | Token | 适配难度 |
|---|---|---|---|
| 无插件（裸 Claude Code） | 5 分钟 | 20k | 0 |
| Karpathy CLAUDE.md | 5 分钟 | 21k（多 1KB CLAUDE.md） | 0 |
| Superpowers | 15 分钟 | 60k | 中（适应 TDD 节奏需 1-2 周） |
| Shipyard | 18 分钟 | 75k | 中 |
| Ralph Loop | 25 分钟（自动）| 200k+ | 低（描述清晰任务即可） |
| Maestro | 22 分钟 | 120k | 高（39 specialist 需要学习） |

**结论**：**不存在"最好"的插件，只有"最适合当前场景"的组合**。

## 我的实际配置（独立博客 + 工具站）

公开一下我两个项目的当前配置，给类似规模的开发者参考：

### chenguangliang.com（Astro 博客）

```text
~/.claude/skills/blog-preflight/     ← 我自己写的 Skill（blog158 实战那个）
项目根 CLAUDE.md                       ← Karpathy 原则
偶尔用 Ralph Loop                       ← 批量处理 410/301 配置那类活
```

不用 Superpowers / Shipyard / Maestro——博客太小，开销不值。

### anyfreetools.com（工具站）

```text
项目根 CLAUDE.md                       ← Karpathy 原则
Superpowers                            ← 加新工具时强制走 SDLC
特定情况切到 Shipyard                   ← nginx 改动、生产部署
```

工具站每个新功能要走 audit，Superpowers 的 TDD 强制对积累测试覆盖率有用。

### 不会用的

**Maestro 对我太重**——独立开发者用不到 39 个 specialist。它适合 5+ 人团队的中大型项目。

## 几个常见误解

### "插件越多越好"

错。我装过 8 个插件同时启用，结果上下文预算被 Skill description 占了一半，Claude 反应明显变慢。**3-4 个核心插件 + 1 个 Karpathy CLAUDE.md 是甜蜜区**。

### "Superpowers 和 Maestro 二选一"

不一定。两者解决的是不同问题：

- Superpowers = **流程**问题（怎么按 SDLC 走）
- Maestro = **分工**问题（谁来做哪部分）

如果团队大、项目复杂，两个一起用也行——Superpowers 定流程，Maestro 在 implement 阶段调专家。

### "Ralph Loop 让一切自动化"

⚠️ Ralph Loop 的"自主性"是双刃剑——它会执行任何你描述的任务，包括误删文件。每次开 Ralph Loop 前**必须**确认 git 是干净状态、有最近备份。

### "Karpathy CLAUDE.md 就是个清单，没什么神奇"

恰恰相反——它的价值是**抑制 AI 的过度发挥**。AI 默认会"完整地、漂亮地"做事，但很多场景下你只需要"简单、能跑、不犯典型错误"。Karpathy 清单做的就是抑制那些不必要的"完整性"。

## 落地建议

如果你刚开始尝试 Claude Code 工作流插件：

1. **先装 Karpathy CLAUDE.md**：零成本、立即生效、永不出错
2. **观察一周**：感受裸 Claude Code 在你项目里的痛点
3. **按痛点选第二个插件**：
   - 经常返工 → Superpowers
   - 经常忘记测试 → Superpowers
   - 经常被生产 bug 咬 → Shipyard
   - 有大批量重复活 → Ralph Loop
   - 多人协作复杂项目 → Maestro
4. **绝不要一次装 3 个以上**：上下文预算撑不住

工作流类插件的核心价值不是"让 AI 更聪明"，而是"让 AI 的输出更可预期"——预期性是从单人小作坊走向严肃工程的最关键能力。

---

**延伸阅读**：
- [Superpowers Marketplace](https://github.com/obra/superpowers-marketplace) - obra 系工作流插件集合
- [Maestro Orchestrate](https://github.com/josstei/maestro-orchestrate) - 多 agent 编排平台
- [Ralph Loop on Anthropic](https://claude.com/plugins/ralph-loop) - 自主循环插件官方页
- [10 Top Claude Code Plugins 2026 - Composio](https://composio.dev/content/top-claude-code-plugins) - 完整插件生态总览
