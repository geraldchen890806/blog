---
author: 陈广亮
pubDatetime: 2026-06-12T12:38:58+08:00
title: Loop Engineering：从写 prompt 转向"设计让 agent 自己跑的循环"
slug: blog191_loop-engineering-design-loops-prompt-agents
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI Agent
  - Claude Code
  - AI
  - 自动化
description: Addy Osmani 6 月推火的 Loop Engineering 不是替代 prompt 工程，而是把你从"按回车的人"换成"设计循环的人"。讲清五个组件 + 一个 state，以及 Osmani 真正最该被记住的三条债（verification debt / comprehension debt / cognitive surrender）——顺便说说我为什么不同意他把 loop 放在 harness 之上。
---

6 月 7 日 Addy Osmani 在自己博客挂了一篇《Loop Engineering》，引用 Anthropic Claude Code 负责人 Boris Cherny 一句话："我已经不再 prompt Claude 了，我让循环去 prompt Claude，循环自己决定下一步要干什么。我的工作是写循环。" 这句话被 Peter Steinberger 转译成更口号化的版本：**"你不该再 prompt agent，你该设计让 agent 自己跑的循环。"** 之后几天，X 和 Substack 上同主题文章扎堆冒出来，"loop engineering"作为术语稳定下来。

我前两天刚写过一篇 [blog186](/posts/blog186_prompt-context-harness-agentic-layers/)，把 LLM 应用拆成 prompt → context → harness → agentic 四层嵌套。Loop Engineering 这词出来之后，怎么挂到那张图里？**Osmani 自己原文给的答案是"sits one floor above the harness"——他把 Loop Engineering 放在 harness 工程之上，作为更高层抽象**。但读完原文我不同意这个定位，更准确的说法是：**Loop Engineering 是 harness 工程里最重要的一个子集**——专门讲"循环本身怎么设计"。它不否定 prompt 工程，也不等同于 agentic 工程，它是 harness 大筐里被独立命名的工程子学科。

这篇文章想讲清楚四件事：Loop Engineering 在 Osmani 原文里到底指什么、为什么我不同意他把它摆在 harness 之上、我自己博客 agent 上跑通的循环长什么样、以及循环搭好之后会怎么害你。

## 一、术语怎么来的：从"按回车的人"到"写循环的人"

把时间线拉一下：

- **3 月**：Anthropic 发布 Claude Code 后，Boris Cherny 多次公开讲过 "agent loop" 这个词，但当时大家都把它理解成 Claude Code 内部那个 ReAct-style 循环（模型 → 工具 → 结果回喂 → 模型），是一个**实现细节**。
- **早些时候**：Peter Steinberger 在 X 发了一条推："You shouldn't be prompting coding agents anymore. You should be designing loops that prompt your agents."（具体时间 Osmani 原文没标注，链接到他 X 上的某条 status）
- **6 月 7 日**：Addy Osmani 写了《Loop Engineering》长文，把概念系统化，列出五个组件 + 一个共享 state。这一篇是后续讨论的锚点。
- **接下来几天**：Substack、Medium、Lushbinary、explainx.ai 一堆同主题文章涌出，大部分是 Osmani 那篇的二次解读。

为什么这词突然有共鸣？两个变化叠加：

**变化一：单次 prompt 的杠杆在塌缩。** Claude Code、Cursor Composer、Cline 这类工具把"一个 prompt → 一段可观测的工作"从十几秒拉长到几十分钟甚至几小时。当一次对话能交付一个 feature，"我多花 30 秒打磨 prompt"的边际收益就被稀释了——你打磨 prompt 节省的可能是 agent 30 分钟工作里的 2 分钟。

**变化二：agent 能 24 小时跑了。** GitHub Actions、cron、Claude Code 的 `/loop` 命令、自定义 harness 都能让 agent 在没人看着的时候继续工作。一旦 agent 能脱离会话存在，"谁来按回车"就变成新瓶颈。如果还是人手按，agent 大部分时间在等指令；如果有循环按，agent 才能把硬件利用率拉满。

Osmani 的原话是：**"Loop engineering is replacing yourself as the person who prompts the agent."** 直译"用循环替代你这个按回车的人"，意思非常具体——不是替代你思考，而是替代你那双每天按 100 次回车的手。

## 二、为什么我把 Osmani 的"sits above harness"挪回 harness 里

[blog186](/posts/blog186_prompt-context-harness-agentic-layers/) 那篇我画过嵌套关系：

```text
agentic ⊃ harness ⊃ context ⊃ prompt
```

Loop Engineering 应该挂在哪？Osmani 在原文里给的答案很明确——**"Loop engineering sits one floor above the harness."** 他把它放在 harness 工程**之上**作为更高层抽象，理由是 harness 是"一个 agent 单跑时的环境"，而循环关心的是"让 agent 自己驱动起来"，后者比前者更宏观。

我读完不同意。三种可能的摆放方式我都过了一遍，最后选了和 Osmani 不一样的那种：

**说法一：Loop 是 prompt → context → loop → harness → agentic 之间新插一层。**
不成立。Osmani 文里列的 5 个组件（automation、worktree、skills、plugins、sub-agent + state）每一个都是 harness 范畴的事——schedule 是 harness 的运行时控制流、worktree 是 harness 的隔离机制、skill 是 harness 装配 context 的复用单元。它们没有定义新的层。

**说法二：Loop Engineering = agentic engineering 的别名，或者 Osmani 说的"sits above harness"。**
我觉得这两个都偏高了。agentic engineering 关心的是"这个系统能不能可靠端到端完成一个目标"，包括评估体系、多 agent 协作、记忆架构、模型路由这些更宏观的事。Loop Engineering 只讲循环本身——一个 agent 怎么自己驱动起来、跑、停、记。Osmani 之所以把 Loop 放在 harness 之上，是因为他原话定义 harness 为"the environment one single agent runs inside"——这个定义把 harness 砍得很窄（只是单 agent 的运行壳），自然 loop 就被挤到上层。但我在 blog186 里把 harness 定义成"模型外面那台机器"——包括 agent loop、工具回喂、错误重试、可观测性。在我的定义下，loop 本来就是 harness 的一部分。

**说法三：Loop Engineering 是 harness 工程里被独立拎出来的子集（我的立场）。**
原来 harness 是个大筐：工具定义、IPC、错误重试、可观测性、agent loop、guardrail 都丢里面。Osmani 这词的价值在于把其中"循环本身"独立出来作为研究对象——因为这部分**最容易被忽略，又最难做对**。错误重试有重试库、工具定义有 MCP、可观测性有 Langfuse，但"什么时候触发循环、循环里 agent 看到什么、什么时候停"，这块工程实践一直很碎。Osmani 把它命名出来这件事我完全认可，分歧只在"挂在 harness 之上还是 harness 里面"——这取决于你对 harness 的边界定义有多宽。

所以更准确的画法是：

```text
agentic 工程
└── harness 工程
    ├── 工具调用与回喂
    ├── 错误处理与重试
    ├── 可观测性
    └── Loop Engineering  ← 循环本身
        ├── automation（什么时候触发）
        ├── worktree（并行隔离）
        ├── skill（复用 context 装配）
        ├── plugin（接现有工具）
        ├── sub-agent（验证与分工）
        └── state（跨循环记忆）
    context 装配 ⊂ harness
    prompt 设计 ⊂ context
```

在我这个画法下，Loop Engineering 不是新层，是 harness 工程里被独立命名的子学科。它直接对应"你早上起床看到 agent 自己干完一堆活"这种最直接的体验，所以值得被单独命名。和 DevOps 里"SRE"对"运维"的关系类似——SRE 不是运维之外的新东西，是运维里"用工程手段保 SLA"这一支被独立命名。

要不要同意我这个挪法、还是保留 Osmani 的"在 harness 之上"，看你怎么定义 harness 的边界——这是个分类学层面的分歧，对工程实践本身影响不大。下面进入更实操的部分：五个组件具体怎么用。

## 三、五个组件 + 一个 state：Osmani 的清单和我的注解

Osmani 把一个能跑的 loop 拆成五个组件 + 一个共享 state。我按重要性从高到低排（和 Osmani 原文顺序不一样，他是按字母序列的），并且每个都标注"如果省略会怎样"：

### 1. State（共享记忆）—— 最容易省、省了最痛

**做什么**：一个能跨循环读写的地方。可以是 markdown 文件、Linear 看板、SQLite、TODO.md，载体不重要，**单一事实源**才重要。

**省了会怎样**：循环之间互相不认识，agent 每次都从零开始判断"哪些事做过了"，然后大概率重做或漏做。我自己博客 agent 早期版本就是这毛病——每天的"博客提案"cron 不去看昨天提了什么，结果连续三天提了同一篇"AI agent 安全"。后来加了一个 `memory/topic-ideas.md`，每次提案 cron 跑之前先 `grep` 一遍去重，问题立刻消失。

**Osmani 强调的反模式**：把 state 塞进对话历史里。"上次我们聊到哪了"这种依赖会话上下文的循环活不过一次 context window 满。state 必须在循环外面。

### 2. Sub-agent（验证 / 分工）—— 防止自我打分

**做什么**：用第二个 agent 验证第一个 agent 的输出。Maker-Checker 模式。

**省了会怎样**：agent 给自己打分约等于不打分。我博客的写作流程踩过这坑——早期是一个 agent 写完自己 review，结果每次"通过"。后来强制改成 spawn 独立子 agent 用 Opus 审查（哪怕主 session 是 Sonnet），第一轮审查就能挑出 5-10 个问题。这是质的差别。

**关键细节**：审查 agent 必须**独立 context**。如果是同一个 session 里"再 think 一下有没有问题"，模型会倾向 confirm 自己。物理上分开两个 process / 两个 conversation 才有效。

### 3. Automation（schedule + trigger）—— 把"按回车的手"换成"事件"

**做什么**：循环什么时候触发。可以是 cron、可以是 webhook、可以是 git push、可以是上一个循环跑完。

**省了会怎样**：你又变回了那个按回车的人。Automation 才是把循环从"我手动重启"升级到"它自己起来"的关键。

**两种典型**：
- **schedule-driven**：固定时间跑（早 8 点检查热点、每周一 review last 7 days）
- **event-driven**：被某个事件触发（PR 提交、issue 创建、上一个 agent 完成）

混用更常见。我博客 agent 的 cron 文件夹（`crons/*.md`）就是 schedule-driven，但每个 cron 内部又会触发 event-driven 的子流程（比如"如果提案池 > 5 条，触发整理 cron"）。

**还有第三种被 Osmani 单拎出来强调的：goal-driven 自动收敛**。Claude Code 里对应 `/goal` 命令，你给一个**可验证的目标条件**（"测试全绿"、"lint 无 warning"、"PR 已 merge"），循环自己跑、自己判断到没到、到了就停。这是最容易被低估的一种 automation——schedule 和 event 都是外部驱动循环，goal 是循环**自己驱动自己**直到收敛。没有 goal，循环要么跑到 max-iteration 强停（浪费），要么靠人来按停止键（又把你拉回按回车的人）。后文第四章我博客 agent 的翻译收敛就是 goal-driven 的实例，到那里再展开。

### 4. Skill（复用 context 装配）—— 让循环不必每次重新告诉 agent 项目长什么样

**做什么**：把"如何在这个项目里做 X 类事"打包成可复用单元。Claude Code 里是 `SKILL.md`，Cursor 里是 `.cursorrules`，自定义 harness 可以是任何东西。

**省了会怎样**：每次循环都得在 prompt 里重申一遍项目约定，token 浪费 + 不一致。

**和 prompt 工程的区别**：prompt 工程关心一段话怎么写，skill 关心"这段话怎么沉淀成可复用的资产"。skill 是 prompt 的工程化版本——从"写得好的一段提示"升级到"项目里所有人都用的、版本化的、可被多个循环引用的"提示。

### 5. Worktree（并行隔离）—— 让多个循环不打架

**做什么**：每个并行跑的 agent 拿独立的 git worktree，互不污染。

**省了会怎样**：两个 agent 同时改同一个文件，最后变成手动 resolve conflict。

**真实场景**：我曾经同时让一个 agent 翻译 blog186，另一个 agent 修 i18n 路由 bug。两个都改了 `src/pages/posts/[slug].astro`，结果第二个 agent 跑完发现第一个的改动消失了——它从 git HEAD 重新读了一遍文件。后来用 worktree 隔开，两个跑在不同分支，merge 由人决定。

### 6. Plugin / Connector（接外部工具）—— 让循环能影响真实世界

**做什么**：MCP server、API connector、CLI wrapper，让 agent 不只是输出文字，而是真的能改数据库、发 commit、推 PR、发推。

**省了会怎样**：循环只能跑"思考型"任务（写报告、做分析），不能跑"执行型"任务（部署、清库存、发消息）。

这是最显眼的组件，反而最容易被高估。**没有 state 和 sub-agent，光接一堆 plugin 是给自己埋雷**——一个能发推的 agent 没有 state 会重发同一条推文，没有 sub-agent 会发出去才发现内容有错。先把内部循环做稳，再接外部接口。

### 落地工具对照：Codex 和 Claude Code 都齐了

Osmani 原文同时讲了 OpenAI Codex 和 Anthropic Claude Code 两套实现，他的结论是"五个组件 + state 两边都有，名字不同而已"。我把对照表列出来，方便从一边切到另一边的时候直接查：

| 组件 | OpenAI Codex 实现 | Anthropic Claude Code 实现 |
|------|------|------|
| Automation | Automations 选项卡（选项目 / 提示 / 频率 / 本地 vs 后台 worktree） | `/loop` 命令 + `/goal` 自动收敛 + scheduled cron + GitHub Actions |
| Worktree | 内置后台 worktree | 调用系统 `git worktree` 加 hooks |
| Skill | `SKILL.md` | `SKILL.md`（同名同格式） |
| Plugin | MCP connectors | MCP connectors |
| Sub-agent | TOML 子代理配置 | sub-agent 命令 + 模型分别选 |
| State | 自己写 markdown / Linear | 自己写 markdown / Linear |

两边都把 5 个原语做齐了，区别更多在工程审美——Codex 把 automation 做成了图形选项卡（更适合"配一次就走"），Claude Code 走命令行加 hooks 路线（更适合"循环本身也是代码"）。选哪个看团队习惯，不影响 loop engineering 这套思路本身。

## 四、我博客 Agent 上的真实循环：能跑、能停、能让我睡觉

抽象讲完了讲具体的。下面是我自己博客 agent 上已经跑了一段时间的循环架构——这套循环我搭起来比 Osmani 命名"loop engineering"还早，但事后回头看，正好对应他列的五个组件，所以拿出来当例子合适。每个组件标注用什么实现：

```text
每天 00:01 cron 触发"博客提案"循环（automation: cron）
   ↓
读 memory/topic-ideas.md（state: markdown 文件）
   ↓
读 src/data/blog/zh/ 列表，去重已有标题
   ↓
跑 WebSearch 找 3 个候选话题
   ↓
spawn 子 agent 用 Opus 审查"有没有重复 / 有没有价值"（sub-agent）
   ↓
通过 → 追加到 topic-ideas.md
失败 → 重生成（最多 2 轮）
   ↓
通知大人（plugin: Telegram bot）
```

大人确认选题之后，写作循环：

```text
"写 blog191" 触发写作循环（automation: 人触发，event-driven）
   ↓
读 SKILL.md (skill: WRITE_RULES.md / REVIEW_RULES.md / PUBLISH_RULES.md)
   ↓
跑 date 命令拿当前时间（这条是 feedback 沉淀来的强制规则）
   ↓
写中文版 markdown
   ↓
spawn 审查子 agent（sub-agent + Opus + 独立 context）
   ↓
有问题 → 直接改 → 第二轮审查（最多 3 轮）
   ↓
通过 → spawn 翻译子 agent（sub-agent）→ 翻译审查子 agent（sub-agent）——这两步内部是一个迷你 goal loop，目标条件是"中英双版 reviewed: true"，没达到就 review-fix-translate 再转一圈
   ↓
更新 .last-deploy-commit（state）
   ↓
等大人批准 → 部署到生产（plugin: ssh + git）
```

这套循环里能识别出五个组件全齐：

- **automation**：cron 文件 + 大人手动触发
- **state**：`memory/topic-ideas.md` + `.last-deploy-commit` + `MEMORY.md` 索引
- **sub-agent**：写完审、翻完审，强制独立 context + 强制 Opus
- **skill**：WRITE/REVIEW/PUBLISH 三个 RULES.md
- **plugin**：Telegram bot 通知、X 发推、ssh 部署
- **worktree**：博客这个项目其实没用，因为不并行；但 trade 项目里跑过

这套循环跑下来最深的两个教训：

**教训一：sub-agent 比 prompt 调优重要 10 倍。** 我曾经花两小时调写作 agent 的 system prompt 想让它"少出 AI 痕迹"，效果不如花十分钟加一个审查子 agent。原因是写作模型在生成时总会有惯性，审查模型有"批评者偏向"反而能识别出来。这就是 maker-checker 比独立 maker 强的根本原因。

**教训二：state 要长在循环外面，不能长在 prompt 里。** 我有一次把"已有文章列表"硬塞进写作 agent 的 system prompt，结果第二天文章数变了 prompt 没更新，agent 写了重复主题。后来改成 agent 主动去 `ls src/data/blog/zh/` 当场读，问题再没出现过。这条对应 Osmani 原文那句**"state must live outside the loop"**。

但这两条教训只是循环跑顺之后的小坑。Osmani 原文里真正狠的，是他指出循环跑得越顺、你越可能在塌——他给 loop 列了三条债。

## 五、Osmani 原文里最该被记住的，是他给 loop 列的三条债

前面四章讲的都是"怎么搭循环"。但读完 Osmani 原文我必须说一句：他原文里写得最重、也最容易被读者跳过的部分，是"**搭出来会不会害你**"。他给 loop 列了三条债，每一条都对应一种"循环跑得很顺、但你已经在塌了"的状态：

### 1. Verification debt（验证债）—— loop 说"done"不等于真的 done

循环跑完会输出"任务完成"四个字，但这四个字只是 agent 的**声称**，不是**证明**。CI 绿了不代表逻辑对，PR 提了不代表代码能维护，commit 推了不代表语义没改坏。每跑一次循环你都在累积一笔"没人真的复核过"的债，哪天利息来了就是线上事故。

Osmani 的原话很狠：**"Your job is to ship code you confirmed works."**——你的工作不是接收循环的 done，而是确认它真的 done。这条债的还法只有一个：把人工 verify 步骤写进循环里，不是写进 prompt 里靠模型自己检查，而是物理上让循环停下来等人或等可执行的测试。我博客 agent 的部署循环就是这样——审查全过了不会自动 deploy，必须等大人在 Telegram 上敲一声确认。这个"等人"看起来减速，其实是在还 verification debt 的本金。

### 2. Comprehension debt（理解债）—— 代码产生速度超过你理解速度

循环让你一晚上能 merge 10 个 PR，但你真的理解了那 10 个 PR 改了什么吗？6 个月后线上出 bug，你站在自己仓库面前像看陌生代码——因为它本来就是陌生的，你只是 reviewer 的 reviewer，没真正读过。这就是理解债。

理解债不会立刻爆炸，它**累积着等一次重构、一次 bug、一次新人 onboarding**。哪天你想动那块代码，发现你不知道为什么这么写、不敢删任何一行，循环就从帮手变成债主。还法是**减速读**——重要模块循环写完别合，自己读一遍，标注一两句"为什么这么写"。我自己博客这种低风险场景敢放手让循环跑，但 trade 那个项目我每个 PR 都得自己读一遍才合，慢但不留债。

### 3. Cognitive surrender（认知投降）—— 舒适感才是最大的危险

这条最隐蔽。循环跑得越顺，你就越想让它跑——因为"按下去就有结果"的体验太爽了。然后某天你发现自己不再思考"这事该不该做"，只在思考"该让哪个循环去做"。**思考的入口被循环吞掉了**。

Osmani 原话是 **"the comfortable posture is the dangerous one"**——你觉得舒服的姿势就是最危险的姿势。这条没法用工具还，只能靠自觉——定期问自己"如果今天没有任何循环、所有 agent 都关掉，我还知道下一步该写什么吗？"如果答案模糊，说明你已经把判断力外包了，得收回来。

### 一句话：循环换了你的工作内容，没换掉你

Osmani 原文里还有一句被我反复想起的话：**"Two people can build the exact same loop and get completely opposite results."** 同一套循环——同样的 automation、同样的 sub-agent、同样的 skill——到了不同人手上，一个会用它把自己变成更深的工程师（因为他用循环省下的时间去理解更难的部分），另一个会用它把自己变成"按 go 键的人"（因为他用循环省下的时间去逃避理解）。

这三条债加起来就是一句话：**循环改变的是你的工作内容，不是把你删除掉**（"The loop changes the work, it does not delete you from it."）。Verification debt 要你确认、comprehension debt 要你读、cognitive surrender 要你想。三条都还了，loop engineering 才是杠杆；任意一条没还，它就是慢性毒药。

我前面四章讲"五个组件 + state"是术，这一章讲的是道——前者教你**怎么搭一个能跑的循环**，后者提醒你**搭好之后怎么不被它害**。Osmani 这篇火，不只因为他列了清单，更因为他在清单后面摆了一面镜子。

## 六、Prompt 工程不会死，但杠杆点真的换了

社区里有种声音说"Loop Engineering 出来了，prompt 工程过时了"。Osmani 原文里**没有**这个意思，他只是说杠杆点转移了。我的看法和他一致：

- 写好一段 prompt 仍然有用，**但单次 prompt 的 ROI 在变低**。同样 30 分钟，调一次 prompt 可能多 5% 准确率，设计一个新循环可能让你睡觉时多产出 3 篇博客。
- 写好一段 context 仍然有用，**但 context 装配越来越要"循环里的此刻"而不是"对话开头一次性给到"**。skill 和 RAG 这类技术本质上是在动态装配 context。
- harness 不是新东西，**但 loop 把它撕了一个最痛的子问题出来独立处理**。

回到 blog186 那个嵌套图，按我这套画法更新一下（Osmani 的画法会把 Loop 提到 harness 之上、和 agentic 同层，分歧在前文第二章讲过）：

```text
agentic 工程：这个系统能不能可靠完成一个目标
└── harness 工程：发动机外面那台机器
    ├── Loop Engineering：循环本身怎么设计 ★ Osmani 命名
    ├── 其他 harness 子项：工具调用、可观测性、guardrail
    └── context 工程：窗口里塞什么
        └── prompt 工程：怎么写好那一段话
```

四层框架没变。在我的画法里 Loop Engineering 不是第五层，是 harness 层里被独立命名的一个工程子学科。

如果你今天在写 LLM 应用，**先问自己卡在哪一层**：

- prompt 调到死准确率上不去 → 大概率不是 prompt 问题，去看 context（窗口里是不是塞错了）
- context 装得对但 agent 跑两步就跑偏 → 看 harness 里的循环（什么时候停、什么时候验证、state 在哪）
- 循环跑得稳但一个系统协作不起来 → 才去考虑 agentic 那层（拆 sub-agent、设计 eval）

明确自己卡在哪一层比纠结术语重要得多。Loop Engineering 这词的价值，就在于让"循环本身"成为一个值得单独琢磨的工程对象——以前它被埋在 "harness" 这个大筐里，没人专门研究。现在被拎出来，有了五个组件 + 一个 state 的工作清单，至少可以拿这张清单去 audit 一遍自己手上的系统：state 在外面吗？sub-agent 独立吗？automation 由事件驱动还是我手动？skill 沉淀了吗？worktree 隔离了吗？plugin 接对了吗？

清单走完，循环就能跑了。剩下的事，就是去睡觉。

---

**延伸阅读**：
- [Addy Osmani - Loop Engineering](https://addyosmani.com/blog/loop-engineering/) - 原始术语来源，五组件清单的锚点文章
- [Cobus Greyling - Loop Engineering Playbook](https://cobusgreyling.substack.com/p/loop-engineering-playbook) - 配套 GitHub 仓库 [cobusgreyling/loop-engineering](https://github.com/cobusgreyling/loop-engineering) 收录可直接复用的循环模板
