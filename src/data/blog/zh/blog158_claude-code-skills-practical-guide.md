---
author: 陈广亮
pubDatetime: 2026-05-01T10:00:00+08:00
title: Claude Code Skills 实战：从 0 到 1 写一个能在多项目复用的 Skill
slug: blog158_claude-code-skills-practical-guide
featured: true
draft: false
reviewed: true
approved: true
tags:
  - Claude Code
  - AI Agent
  - 自动化
  - 开发效率
description: 把重复的 playbook、检查清单、多步流程从 CLAUDE.md 抽出来变成 Skill。本文以"博客发布前自检"为案例，覆盖 SKILL.md 结构、frontmatter 全字段、context fork 隔离、与 Slash Command/Sub Agent 的边界、以及调试和共享。
---

把同一段"先做这个，再做那个"的指令重复粘贴到 Claude Code 里超过三次，就该写成 Skill 了。Claude Code 4 月把 Skills 升级成主推荐的扩展机制：原本散落在 CLAUDE.md、`.claude/commands/`、各种 Agent 配置里的工作流，现在有了一个统一入口。

这篇文章不讲 Skills 是什么，而是把一个真实需求——"博客发布前自检"——从 0 到 1 落地成可在所有项目复用的 Skill，途中拆解 SKILL.md 的所有结构、`context: fork` 的具体作用、和 Slash Command 与 Sub Agent 的边界。

## 为什么用 Skill 而不是 CLAUDE.md

CLAUDE.md 一直在做两件混在一起的事：**事实**（项目用 Astro / 部署到 Vercel）和**流程**（发布前要 build、要 push dist、要发推）。事实留在那里没问题，每次会话都需要；流程不一样，多数时候用不到，但一旦塞进 CLAUDE.md 就常驻上下文。

Skills 解决的就是这个问题：**Skill 的正文按需加载，不调用就不进上下文**。Anthropic 文档原话："Unlike CLAUDE.md content, a skill's body loads only when it's used, so long reference material costs almost nothing until you need it."

判断一段内容该放 CLAUDE.md 还是 Skill，有个简单标准：**如果是"知道就行"的事实，放 CLAUDE.md；如果是"做这个动作要按这步骤"的流程，放 Skill**。

## 三个相关概念的边界

Skills、Slash Command、Sub Agent 经常被混用，但定位完全不同：

| 机制 | 触发方 | 上下文 | 典型用途 |
|---|---|---|---|
| **Skill** | 用户 + 模型自动触发 | 主对话 / 可选 fork | 可复用的多步流程，模型也能根据描述自己用 |
| **Slash Command** | 仅用户 | 主对话 | 固定逻辑的快捷入口（已被 Skills 兼容） |
| **Sub Agent** | 模型委派 | 独立 | 大量读文件 / 专项研究 / 需要隔离的任务 |

4 月之后两点变化值得注意：

1. **Custom Slash Commands 已并入 Skills**——`.claude/commands/deploy.md` 和 `.claude/skills/deploy/SKILL.md` 都生成 `/deploy`。老的 commands 文件还能用，但新写直接用 Skills，因为支持子目录和 frontmatter 字段控制。
2. **Skill 修改即生效**——保存文件就能用，无需重启 Claude Code。`~/.claude/skills/`、`.claude/skills/`、`--add-dir` 中的目录都会被 watch。**但**如果会话启动时这个 skills 目录还不存在，新建后必须重启才会监听。

## Skills 文件存放的四个层级

存放位置决定了谁能用：

| 层级 | 路径 | 适用范围 |
|---|---|---|
| Enterprise | managed settings 配置 | 组织所有用户 |
| Personal | `~/.claude/skills/<name>/SKILL.md` | 你自己所有项目 |
| Project | `.claude/skills/<name>/SKILL.md` | 当前项目 |
| Plugin | `<plugin>/skills/<name>/SKILL.md` | 启用插件的地方 |

**同名时优先级**：Enterprise > Personal > Project。Plugin 用 `plugin-name:skill-name` 命名空间，不会冲突。

判断标准很直接：**只在一个项目里用就放 project；多个项目复用就放 personal**。我接下来要写的"博客发布前自检"会在 `~/.claude/skills/blog-preflight/` 下，因为我有博客、tools 站、Agent 项目三个仓库都在用同一套 frontmatter 校验。

## 实战：写"博客发布前自检"Skill

每次发文章前，我都要手动检查：

1. frontmatter 字段是否齐全（author、pubDatetime、title、slug、featured、draft、reviewed、approved、tags、description）
2. featured 字段是否符合规则（工具指南为 false，其他技术文为 true）
3. 标签是否在标准集合内
4. 文章里有没有真实 IP、密码、密钥等隐私信息
5. 是否有占位符链接（`yourusername`、`example.com`）
6. 标题是否含禁用词（"标志着"、"革命性"、"未来已来"等）

人工每次都要做一遍，Claude 也会忘。写成 Skill 后，`/blog-preflight` 一行命令解决。

### 第一步：建目录

```bash
mkdir -p ~/.claude/skills/blog-preflight/scripts
```

### 第二步：SKILL.md

```yaml
---
name: blog-preflight
description: 博客发布前的自检清单。在我说"准备发布"、"发布前检查"或者要部署博客文章前主动调用。会扫描 frontmatter、隐私关键词、占位符链接、AI 味词汇。
disable-model-invocation: false
allowed-tools: Read Grep Bash(grep:*) Bash(node:*)
context: fork
agent: Explore
argument-hint: [文章路径]
---

# 博客发布前自检

对 $ARGUMENTS 这篇文章执行完整的发布前检查。如果没有传文章路径，扫描 `src/data/blog/` 中所有 `draft: true` 但 `reviewed: true` 的文章。

## 检查清单

### 1. frontmatter 完整性

必须包含以下字段：
- author（应为"陈广亮"）
- pubDatetime（ISO 8601 格式 + 时区）
- title（不带外层引号）
- slug（应与文件名前缀一致）
- featured（boolean）
- draft / reviewed / approved（三个状态位）
- tags（数组，1-4 个元素）
- description（50-150 字中文）

### 2. featured 字段规则

- 标题以"工具指南"开头 → featured: false
- 其他技术文章 → featured: true
- 不符合就报告"❌ featured 字段错误"

### 3. tags 合规性

只能从标准集合中选：
工具指南 / 工具 / AI / AI Agent / 前端 / 安全 / 自动化 / 开发效率 / 开源 / CSS / JavaScript / TypeScript / LLM / MCP / Claude Code / Claude

超出范围的 tag 报错并提示替代选项。

### 4. 隐私扫描

执行以下 grep（用 `bash` 工具）：

```!
grep -nE "(45\.63\.22\.102|datayes@123|sk-[A-Za-z0-9]{20,}|geraldchen890806@|13[0-9]{9})" $ARGUMENTS || echo "✅ 无隐私泄露"
```

任何匹配都报告 🔴 严重错误，列出具体行号。

### 5. 占位符链接

```!
grep -nE "(github\.com/yourusername|example\.com/api|your-api-key|TODO|FIXME)" $ARGUMENTS || echo "✅ 无占位符"
```

### 6. AI 味词汇

扫描以下禁用词：标志着、见证了、划时代、革命性、激动人心、未来已来、春天来了、赋能、助力。每出现一次报告 🟡 警告。

### 7. 引号检查

中文弯引号会让 AI 检测器报警，扫描：

```!
node ${CLAUDE_SKILL_DIR}/scripts/check-quotes.js $ARGUMENTS
```

## 输出格式

总结报告分三段：

- **🔴 必须修改**（隐私、占位符、frontmatter 缺失）
- **🟡 建议修改**（AI 味词、tags 接近上限、description 过短/过长）
- **✅ 通过的检查**（简短列出）

最后给出一句结论：可以发布 / 需要修改 N 处 / 不能发布。
```

### 第三步：辅助脚本

`~/.claude/skills/blog-preflight/scripts/check-quotes.js`：

```javascript
#!/usr/bin/env node
const fs = require("fs");
const path = process.argv[2];
if (!path) {
  console.error("用法：check-quotes.js <文件路径>");
  process.exit(1);
}
const content = fs.readFileSync(path, "utf8");
const curly = content.match(/[“”‘’]/g);
if (!curly) {
  console.log("✅ 引号检查通过（仅含直引号）");
  process.exit(0);
}
const lines = content.split("\n");
const found = [];
lines.forEach((line, i) => {
  if (/[“”‘’]/.test(line)) {
    found.push(`${i + 1}: ${line.trim().slice(0, 80)}`);
  }
});
console.log(`🟡 发现 ${curly.length} 个弯引号：`);
found.forEach(l => console.log("  " + l));
process.exit(1);
```

把脚本设为可执行：

```bash
chmod +x ~/.claude/skills/blog-preflight/scripts/check-quotes.js
```

### 第四步：调用

```text
/blog-preflight src/data/blog/blog158_claude-code-skills-practical-guide.md
```

或者让 Claude 自动触发——下次说"准备发布这篇"时，它会根据 description 自己调用。

## frontmatter 字段全解

写完上面这个 Skill 后，把所有 frontmatter 字段都用上了，逐个解释一下：

### 控制谁能调用

| 字段 | 默认 | 含义 |
|---|---|---|
| `disable-model-invocation` | `false` | 设为 `true` 后只能用户手动 `/name` 调用，模型不能自动用——适合带副作用的命令（部署、删除、发消息） |
| `user-invocable` | `true` | 设为 `false` 从 `/` 菜单隐藏，只能模型用——适合背景知识（如"老系统说明"） |

### 控制工具权限

```yaml
allowed-tools: Read Grep Bash(grep:*) Bash(node:*)
```

`allowed-tools` 是**预批准**——这些工具在 Skill 激活时无需每次询问。但它**不限制**工具范围，其他工具仍能用，只是要走正常 permission 流程。语法上工具用空格分隔，多 Bash 子模式各自单独写一条。

`Bash(grep:*)` 这种语法是细粒度权限：冒号前是命令名，冒号后是参数 glob，所以这条只批准 `grep` 开头的 bash 命令，不批准其他。

### 上下文隔离

```yaml
context: fork
agent: Explore
```

`context: fork` 是这次最有用的新特性。开启后 Skill 在独立 sub-agent 上下文里跑，主对话的累积历史不会被这次 Skill 看到——sub-agent 拿到的是"以 SKILL.md 内容为 prompt + CLAUDE.md 作为常驻参考"的干净起点，不是完全空白会话。三个具体好处：

1. **不污染主对话**——执行检查、读 50 个文件、生成报告，主对话只看到最终结论
2. **Token 预算独立**——主对话已经很长时，Skill 不挤占预算
3. **可以指定专项 Agent**——`agent: Explore` 用只读优化的 Agent；`agent: Plan` 适合规划类任务

但有个 **gotcha**：`context: fork` 只对**有明确任务**的 Skill 有意义。如果 Skill 内容是"使用以下 API 规范"这种 reference 内容，fork 出来的 Sub Agent 拿到一堆约束但没活干，会立刻返回。

### 模型和 effort

```yaml
model: claude-opus-4-7
effort: high
```

`model` 用于这个 Skill 跑期间临时切换模型（比如简单 Skill 用 Haiku 省钱、复杂分析用 Opus），**不会保存**到 settings，下个 prompt 自动切回。

`effort` 控制模型的"思考深度"，配合 `${CLAUDE_EFFORT}` 字符串替换在 SKILL.md 里能动态调整指令。

### 字符串替换

| 变量 | 含义 |
|---|---|
| `$ARGUMENTS` | 调用时的全部参数 |
| `$0`, `$1`... | 第 N 个参数（带 shell 风格分词，多词参数要加引号） |
| `${CLAUDE_SESSION_ID}` | 当前会话 ID |
| `${CLAUDE_EFFORT}` | 当前 effort 等级 |
| `${CLAUDE_SKILL_DIR}` | Skill 自己的目录（执行脚本时必用） |

`${CLAUDE_SKILL_DIR}` 解决了脚本路径问题——cwd 经常变，硬写 `~/.claude/skills/...` 在 plugin 场景会失效。

### 路径过滤

```yaml
paths: src/data/blog/*.md, src/pages/*.md
```

`paths` 让 Skill 只在编辑匹配文件时才被自动加载到上下文。能省描述符预算，特别是 Skill 多了之后。

## context: fork 的实战收益

之前我没用 `context: fork`，把检查逻辑直接写在主对话。结果就是每次 `/blog-preflight` 后，主对话里多 200 行扫描输出，到第二篇的时候上下文已经被检查报告塞满了。

加上下面这两个 frontmatter 字段后：

```yaml
context: fork
agent: Explore
```

行为变成：

```
主对话：你 → /blog-preflight blog158.md
        ↓ 派出 Sub Agent
        ↓ Sub Agent：跑完 7 项检查（200 行输出，但留在子上下文）
        ↓ 总结报告（30 行）
主对话：拿到 30 行报告，原长度不变
```

**这是 Skills + Sub Agent 协作最适合的场景**：执行细节多但用户只关心结论。

## 调试技巧

### Skill 没被自动触发

最常见原因是 `description` 不够具体。模型靠 description 判断"现在该不该用这个 Skill"。改写时遵循三原则：

- **包含触发短语**：用户会怎么说？"发布前检查"、"准备部署"——把这些短语写进去
- **写明使用时机**：不只是"做什么"，还要"什么时候做"
- **前置关键词**：description 在 listing 中按 1536 字符截断，重要的放前面

差对比：

```yaml
# 弱
description: 检查博客文章

# 强
description: 博客发布前的自检清单。在我说"准备发布"、"发布前检查"或者要部署博客文章前主动调用。会扫描 frontmatter、隐私关键词、占位符链接、AI 味词汇。
```

### Skill 触发太频繁

加 `disable-model-invocation: true`，让它只能手动调用。

### 描述被截断

会话内所有 Skills 的 description 共享一个字符预算（默认 8000 字符或 1% 上下文）。Skills 多了之后描述会被裁短，导致触发不准确。

两个解法：
- 设环境变量 `SLASH_COMMAND_TOOL_CHAR_BUDGET=20000` 提高预算
- 给每个 Skill 的 description 重写：第一句就讲清楚做什么，后面是 nice-to-have

### Skill 写完不生效

如果会话启动时 `~/.claude/skills/` 目录**不存在**，新建后会话不会自动监听。重启一次 Claude Code 即可。已存在的目录里增删 SKILL.md 是即时生效的。

## 让 Skill 跨项目共享

Skill 的三种分发方式：

1. **Project Skill**：`.claude/skills/` 提交到 git，团队所有人都能用
2. **Plugin**：把多个 Skills 打包成插件，发布到 plugin 仓库
3. **Personal**：放在 `~/.claude/skills/`，自己所有项目都能用，但只对自己生效

我现在的 `blog-preflight` 是 Personal——博客只我一个人维护。如果是团队博客，应该挪到项目 `.claude/skills/blog-preflight/` 提交到仓库，新人 clone 下来直接能用。

## 进阶：动态注入上下文

SKILL.md 里 `` !`<command>` `` 语法能在 Skill 内容发到模型**之前**执行 shell 命令，把输出替换到那个位置。这是预处理，不是模型执行。

实战例子，"PR 总结"Skill：

```yaml
---
name: pr-summary
description: Summarize changes in a pull request
context: fork
agent: Explore
allowed-tools: Bash(gh:*)
---

## Pull request context
- PR diff: !`gh pr diff`
- PR comments: !`gh pr view --comments`
- Changed files: !`gh pr diff --name-only`

## Your task
Summarize this pull request, focusing on...
```

调用 `/pr-summary` 时：

1. `gh pr diff` 等命令立刻在本地跑
2. 输出**替换**到 SKILL.md 里那几个反引号占位符
3. 模型收到的 prompt 已经是带真实 PR 数据的完整文本

模型完全感知不到这是动态生成的——这就是"看起来在线请求 GitHub API 但实际是预处理"的效果。

多行命令用代码块加 `!` 标记的官方语法（在三个反引号后直接接 `!`）：

````markdown
## Environment
```!
node --version
npm --version
git status --short
```
````

这跟普通 ```bash``` 代码块不同——`!` 是预处理执行标记，会先在本地执行三行命令，把输出替换到这段位置。注意三个反引号紧接 `!` 之间不能有空格。

注意：`disableSkillShellExecution: true` 在 settings 中可以关闭这个特性，managed settings 经常这么干（防止用户 Skill 偷跑命令）。

## 一些踩坑总结

写了几个 Skill 后总结的经验：

1. **写 task 类的 Skill 比 reference 类的更值**——reference 内容塞 CLAUDE.md 也行，task 类的"5 步部署"才是 Skills 的甜蜜区
2. **`description` 不要超 200 字**——太长会被截断，模型按截断版判断触发
3. **副作用 Skill 一律加 `disable-model-invocation: true`**——`/deploy`、`/commit`、`/send-email` 这种，不能让模型自己决定时机
4. **`context: fork` 默认开**——除非明确需要主对话历史，不然永远 fork。主对话越短越聪明
5. **脚本统一用 `${CLAUDE_SKILL_DIR}` 引用**——硬写 `~/.claude/skills/...` 路径在 plugin 化后会废
6. **写完先 `/skill-name --help` 测一下**——Claude Code 会读 SKILL.md 给你看渲染后的内容

## 什么不该写成 Skill

写多了会有把所有事情都做成 Skill 的冲动。但有几类不适合：

- **一次性的探索性工作** → 直接对话，写成 Skill 反而绕
- **强依赖项目特定上下文** → 用 CLAUDE.md，让事实常驻
- **每次都不一样的任务** → Skill 的价值在重复，每次都要改 prompt 还不如手敲
- **需要用户决策的工作流** → Skill 适合"按步骤跑"，需要中途分叉判断的更适合让模型自由发挥

---

**延伸阅读**：
- [Claude Code Skills 官方文档](https://code.claude.com/docs/en/skills) - 全字段说明和最新特性
- [Agent Skills 开放标准](https://agentskills.io/) - 跨 AI 工具的 Skill 规范
