---
author: 陈广亮
pubDatetime: 2026-06-25T16:03:52+08:00
title: AI 时代 CLI 第二春：Claude Code / Codex / Charm / Ink 同期爆发背后的 3 个结构性原因
slug: blog196_cli-second-spring-ai-era-three-structural-reasons
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI Agent
  - Claude Code
  - 工具
  - 开发效率
description: 2025 起 Claude Code、Codex CLI、Charm Bubble Tea、Ink 一起爆发，CLI 在 GUI 主导 30 年后突然又成了 AI 工具的默认形态——连 Claude Code 自身都 ship 为 Bun 二进制。这不是怀旧，是 LLM I/O、长任务可控、跨工具协作三个结构性约束把工程师推回终端。附 Claude Agent SDK 30 行 CLI agent 实操样本。
---

## 现象：CLI 在 2025-2026 突然集体复活

如果你 2020 年问"未来十年 CLI 会怎样"，大概率回答是"被 GUI 和 web 进一步边缘化"。但 2025-2026 上半年发生的事完全反过来——

- **2025 年 2 月 24 日**，Anthropic 把 Claude Code 作为研究预览发布，三个月后（5 月 22 日）和 Claude 4 一起 GA。值得一提的是 Claude Code 本身 **ship 为 Bun 二进制**（Anthropic 后来收购了 Bun）
- **2025 年 4 月**，OpenAI 把 Codex CLI 开源放出（初版 Node/TypeScript），**6 月宣布用 Rust 重写**。截至 2026 年 6 月已经累积约 **93k GitHub stars / 月下载 4180 万次 / 周活 500 万**，是 OpenAI 历史上最成功的开发者产品
- **Charm 公司的 Bubble Tea**（Go TUI 框架）2026 年 6 月最新版发布，仓库 **40k+ stars**，社区里超过 18,000 个项目用它构建 TUI
- **Vadim Demedes 的 Ink**（React for CLI）成了 AI 编码工具的默认 UI 层——Claude Code、Gemini CLI、Qwen Code **三家都基于 Ink + Yoga 渲染**
- **2026 年 3 月 31 日**，Claude Code 完整 TypeScript 源码因 npm `.npmignore` 缺失导致 source map 暴露，约 59.8 MB / 51 万行 / 1900 个文件意外公开。业界第一次完整看到生产级 AI CLI 的内部架构：自定义 React reconciler、纯 TypeScript Yoga 移植、完整 ANSI/CSI/DEC/ESC/OSC parser stack——比绝大多数 web 应用复杂

中文圈这两天榜单上 JacksonChen 那篇 "CLI 复兴叙事" 上了 6 月 23 日榜 22，但叙事层面"CLI 又回来了"远远不够——值得拆的是**为什么 AI 时代偏偏选了 CLI 作为默认形态**。

不是怀旧，是三个**结构性原因**把工程师推回了终端。

## 原因 A：LLM I/O 本质是文本流，CLI 天然契合

LLM 的输入是 token 序列、输出是 token 序列，中间任何转换层都是不必要的损耗。CLI 和这个事实有三个深层匹配：

**第一，无歧义输入。** GUI 的本质是"把用户意图压缩到有限按钮和表单字段"——这是 30 年前对人友好的设计假设：人不擅长精确描述，所以系统帮你把语义降维到可点击的选项。但 LLM 反过来——它最擅长处理的就是**自然语言精确描述**，最不擅长的反而是"猜你按这个按钮想表达什么"。CLI 的 stdin 是一段任意文本，正好是 LLM 的天然食物。

**第二，可组合 pipe。** Unix pipe（`|`）是 1973 年 Ken Thompson 设计的，本质是"一个程序的输出无脑接给下一个程序的输入"，要求**输入输出是文本流**。这套四十年没大变的协议碰到 LLM 时居然完美——`cat file.md | claude "summarize" | bat` 这种写法对人对模型对工具都自然。任何想做 LLM agent 的工具，把自己接成 pipe 节点是最便宜的接入方式。GUI 工具想接 pipe 几乎不可能。

**第三，状态可序列化。** CLI 的 session 状态本质就是文本（cwd、env、history），可以 dump 成 JSON、可以 diff、可以版本化、可以拿给另一个 LLM 接着跑。GUI 的状态分散在内存、DOM、IndexedDB、各种 controller 里，**根本无法被 LLM 完整看到**。Claude Code 能"恢复你昨天的 session"，靠的是它的 state 全是文本；Cursor 能让另一个 agent 接管，靠的也是 IDE 上下文能序列化成 text snapshot。

这三条加起来就是：**LLM 是文本机器，CLI 是文本系统，二者匹配度高到几乎不需要适配层**。所有想做 agentic 工具的团队，从工程量的角度都会发现 CLI 是阻力最小的路径。

## 原因 B：Agent 长任务需要可监视/中断/重放，TUI 比 GUI 成本低

第二个结构性原因跟 agent 的**工作时长**有关。

普通 GUI 应用的交互节奏是亚秒级——你点一下、它响应一下、循环。但 agent 任务的节奏完全不同——一个 refactor agent 可能跑 30 分钟，一个 doc 生成 agent 可能跑 2 小时，一个长 loop 可能跑通宵。这种时长下用户需要的三件事，**TUI 都做得比 GUI 便宜得多**：

**1. 实时可监视。** 你不可能盯着一个进度条看两小时。你需要的是**滚动着的事件流**——agent 现在在调什么 tool、读什么文件、想什么、产出什么。这天然就是 streaming text 的形态，CLI/TUI 一行行打印就是了。GUI 想做出"看着舒服的实时事件流"得专门设计组件、做虚拟滚动、考虑性能——几百行代码起步；TUI 直接 `console.log` 就是合理 UI。

**2. 中断与重定向。** 长任务进行到一半你发现方向错了，想 Ctrl+C 停掉、改个指令、继续。Unix 信号机制（SIGINT / SIGTERM / SIGTSTP）和 fg/bg 这套四十年的 process control 协议完美适配这种"长任务的人为干预"。GUI 想做"停止 + 改提示 + 重启"得手工实现进程控制层、状态保存层、UI 流程跳转——而 CLI/TUI 用户按 Ctrl+C 就够了。

**3. 重放与审计。** agent 跑完之后，你想知道它具体做过什么、为什么走 A 不走 B、要不要回滚——你需要的是**完整的 transcript**。CLI 的 output 本身就是 transcript，存进文件、grep、tail -f 都是免费的。GUI 想生成可读的执行轨迹得专门设计日志面板、时间轴组件、过滤器——而 `tee session.log` 一行命令就能搞定 CLI 这边的全部需求。

Claude Code 2026/3/31 源码泄露揭示的内部架构里有大量 ANSI escape sequence 处理代码——这不是为了花哨，**是为了在长任务里精确控制每一行字符的位置和颜色**，做到滚动不闪烁、状态实时刷新。这种"重型 TUI"在 GUI 里要做到同样的精度成本是十倍以上——TUI 的字符栅格本身就是极简光栅。

## 原因 C：CLI 是跨工具协作的最大公约数

第三个结构性原因最容易被忽略，但实战影响最大。

你今天用 Claude Code 写代码、明天可能切到 Codex CLI、下周可能用 Cursor 的 Agent 模式。如果每个工具都做成 web app，**它们之间没法互相调用**——你不能让 Claude Code 启动一个 Cursor session 让 Cursor 帮它干个活。

但如果都是 CLI，**互相调用就是 shell 一行**：

```bash
# Claude Code 内部可以无脑调 Codex
codex --task "run the test suite and summarize failures"

# Codex 也能调 Claude Code
claude --skill review-pr 12345

# 甚至可以两个 agent 互相对话
claude "design the API" | tee design.md | codex "implement based on this design"
```

这种**互操作性**对 agent 生态是基础设施级的杠杆。三家 AI 公司的工具能拼起来用、不冲突、不需要 SDK 互相对接、不需要 OAuth、不需要订阅整合——只要都遵守"读 stdin、写 stdout、退出码 0/非 0"这个四十年的契约就行。

这也解释了为什么 **Cursor 这种本来是 IDE 形态的工具，2025 下半年也开始疯狂强化 CLI 接口**——他们意识到不接 shell 就被排除在 agent 生态外。GUI 形态的 AI 工具在多 agent 协同场景下天然孤立，**没人能从外部"调用"一个 GUI**。

CLI 是 LLM 时代的 USB——丑、老、限制多，但所有人都能接上去。

## 实操：Bun + Ink + Claude Agent SDK 写一个 30 行 CLI agent

讲完结构性原因，给一个最小可跑的实操样本。这是一个用 React (Ink) 渲染的 CLI agent，30 行内（不含 import）就能跑：

```tsx
#!/usr/bin/env bun
import React, { useEffect, useState } from "react";
import { render, Box, Text } from "ink";
import Spinner from "ink-spinner";
import { query } from "@anthropic-ai/claude-agent-sdk";

function Agent({ prompt }: { prompt: string }) {
  const [events, setEvents] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      for await (const msg of query({
        prompt,
        options: { model: "claude-opus-4-7" },
      })) {
        setEvents(prev => [...prev, JSON.stringify(msg)]);
      }
      setDone(true);
    })();
  }, []);

  return (
    <Box flexDirection="column">
      {events.map((e, i) => <Text key={i}>{e}</Text>)}
      {!done && <Text color="cyan"><Spinner /> thinking...</Text>}
    </Box>
  );
}

render(<Agent prompt={process.argv.slice(2).join(" ")} />);
```

跑：

```bash
bun add ink ink-spinner react @anthropic-ai/claude-agent-sdk
chmod +x agent.tsx
./agent.tsx "list the 5 biggest files under src/ and summarize each"
```

30 行代码做了什么？

- **流式输出**：`useState` + `for await` 让 agent 的每个事件实时出现在终端
- **React 组件化**：用 `<Box>` `<Text>` 组合视图，跟写 web 一样
- **Spinner 提示**：长任务时显示动画，让用户知道还在工作（呼应"长任务可监视"）
- **Pipe-ready**：因为是 CLI，输出可以直接接 `| bat`、`> log.txt`、`| codex ...`

这就是 2026 年写 AI CLI 的实际形态——**React 心智 + 终端目标 + agent SDK**。Ink + Yoga 把 React 的全部生态（hook、组件、Suspense）原样搬进 ANSI 字符栅格，写起来跟 web 没区别但跑在终端里。

如果用 Go，等价代码会是 Bubble Tea（也很优雅，但语法和模型不同）；用 Rust 会是 Ratatui。三家分别对应**三个语言阵营的事实标准**，背后是同一个判断：终端值得用现代工程做。

## CLI 不是银弹——什么时候该退回 GUI / Web UI

写到这里必须给个反向边界，否则就成了 CLI 原教旨主义。CLI 在以下三类场景下**仍然输给 GUI/Web UI**，硬上反而坑用户：

**1. 非线性视觉信息。** 看图、剪视频、调色、设计 UI、画流程图——这些任务的核心是**二维空间感知**，CLI 的字符栅格根本没法承载。即便 Charm 的 [Glow](https://github.com/charmbracelet/glow) 能在终端渲染 markdown，看个 PNG 还是得开图片查看器。任何任务里"我需要看到这张图"是核心步骤的，CLI 都是错误形态。

**2. 探索式数据交互。** 滚动一个 100 万行的数据库表、拖动地图缩放、在大型代码库里 navigate 调用图——这些场景需要的是**低延迟空间移动**，鼠标 + 触控 + 拖拽是最优 input。CLI 能 grep、能 jq、能 sql 查询，但"我想边滚边看哪里有 outlier"这种探索性动作 GUI 高一个数量级。

**3. 给非技术终端用户用的工具。** CLI 对非技术用户有真实的 cognitive cost，包括"不知道命令叫什么"、"忘记 flag 顺序"、"打错字看不出来"。给设计师、产品经理、运营用的工具，做成 web app 是对的。**给工程师做的工具**才适合 CLI——这一点必须明确，否则会把"CLI 第二春"理解成"所有人都该回去用终端"，那就完全错了。

CLI 复兴的实质是**给工程师做的工具回到了适合工程师的形态**，不是回到了 80 年代的人机交互范式。

## 收口

把三个结构性原因放在一起就是：

- **LLM I/O 是文本** → CLI 天然 stdin/stdout 适配
- **agent 长任务需要监视/中断/重放** → TUI 用四十年的 process control 协议白嫖
- **多 agent 协作需要互操作** → shell 是无授权、无协议、无 SDK 的最大公约数

任意一条都不会单独让 CLI 复活，但三条同时存在的环境下——也就是 2025-2026 的 AI 工具市场——CLI 不可能不复活。

接下来 1-2 年大概率会看到的演化：
- 更多 GUI/IDE 工具被迫加 CLI 接口（Cursor 已经开始）
- Bubble Tea、Ink、Ratatui 这三个 TUI 框架进一步细分（Go / TypeScript / Rust 三个 AI agent 主流语言一一对应不是巧合）
- 终端模拟器本身被重新设计——Warp、Wave、Ghostty 这些"AI 原生终端"会成为新基础设施

CLI 的第一春是 1970s-80s 的 Unix。它的第二春不是怀旧、不是 trend、不是审美——是 LLM 把工程协作的底层约束从"对人友好"重新拉回了"对系统友好"。这次的 CLI 比四十年前**更工程化**（Ink/Yoga/ANSI parser 都是 web 级复杂度），同时**更人性**（流式输出、动画、组件化），是个真实的进化。

---

**延伸阅读**：

- [Anthropic Claude Code GitHub Releases](https://github.com/anthropics/claude-code/releases) - 从 2025/2 research preview 到 2026/6 的完整 release 历史
- [OpenAI Codex CLI GitHub](https://github.com/openai/codex) - 初版 Node/TypeScript，2025/6 起 Rust 重写，2026/6 已 93k+ stars
- [Charm Bubble Tea](https://github.com/charmbracelet/bubbletea) - Go TUI 事实标准
- [Vadim Demedes Ink](https://github.com/vadimdemedes/ink) - React for CLI，Claude Code / Gemini CLI / Qwen Code 共同底座
- [Rich CLIs with React Ink: The Tech Behind ClaudeCode](https://zenn.dev/mizchi/articles/react-ink-renderer-for-ai-age?locale=en) - mizchi 关于 Ink 渲染原理的拆解（含 2026/3 源码泄露分析）
