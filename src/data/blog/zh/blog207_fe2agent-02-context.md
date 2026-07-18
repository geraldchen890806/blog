---
author: 陈广亮
pubDatetime: 2026-07-18T09:00:00+08:00
title: "模型没有记忆：Context 就是 state，而且每次全量重渲染"
slug: blog207_fe2agent-02-context
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI Agent
  - 前端
  - 开发效率
  - Claude Code
description: 你以为 agent 记得你，其实每轮它都在把整个 messages 数组全量重发——LLM 调用是无状态的，"对话" 是客户端造出来的幻觉。React 有 diff/memo/Fiber 帮你把重渲染压便宜，agent 没有，全量是真的全量。这是 fe2agent 系列第 2 篇，配 tiny-agent v0.2（Context 类 + 历史压缩 + prompt caching）。
---

## 1. 坑

上周三凌晨两点半，我在跟 agent 调一个 monorepo 里的构建脚本。有一个路径 `apps/service-a/scripts/dev.mjs`，是入口——只能改配置、别去动它。这句话我讲了第一遍，它点头；讲第二遍，它复述得比我还工整；第三遍它跟我保证"绝对不会碰这个文件"，下一轮又把这个文件重写了一遍。

我以为是模型菜。骂了两句，打开抓包——看见自己那一轮发过去的 messages 数组的时候，我人愣住了：数组里前面九轮聊天历史都在，就是没有那句"别改 dev.mjs"。因为那句我是在 agent 一次工具报错之后，跟它另开了一段对话里讲的，那段话我没塞回主循环的 messages。它每一轮拿到的 context 里，根本就没有这条禁令。

它不是记不住，是它每一轮都在从零看整个对话——**而"整个对话"里有什么，是我塞的，不是它记的**。

这是《从 useEffect 到 Agent Loop》系列第 2 篇。上一篇讲了 agent 就是个 while 循环，那循环里那个函数是概率的、不纯的、连什么时候停都是它自己决定的。这一篇拆循环里那条最粗的血管：**context**。你会看到 LLM 调用是无状态的、"对话"是客户端造出来的幻觉、以及一旦你把这件事想明白，context 管理为什么突然从"性能优化"变成"你还剩下的那把方向盘"。

## 2. 桥

一句话：

> **Context 是 state，agent 每一轮跑一次"全量重渲染"——只是 React 有 diff 帮你剪，agent 没有，全量是真的全量。**

```
React:                        Agent:

  state                          context (messages[])
    │                              │
    ▼                              ▼
  render() ──► UI              LLM() ──► action
    │                              │
  diff/memo/Fiber              （无 diff）
  只提交最小变更                 每一轮全量重发
```

左边有 Reconciler 帮你剪出最小变更；右边你每一轮把 messages 数组的每一 byte 都重新塞回去。骨架同构，账单不同构。

## 3. 真

### 3.1 "对话"是幻觉：一次 LLM 调用的真相

先接受一件事：一次 `client.messages.create` 就是一次无状态的 HTTP 请求。服务端不记你上一轮说过啥；它认得的是 Authorization header 里那个 token——那是你的钱包，不是你的身份证。

你以为的"多轮对话"，是**客户端那个 messages 数组**在一轮一轮往里 push。上一篇 tiny-agent v0.1 里我写过这两行：

```javascript
messages.push({ role: "assistant", content: res.content });
// ...
messages.push({ role: "user", content: toolResults });
```

这两行 push，就是"记忆"的全部实现。删掉这两行，你的 agent 立刻就"失忆"——每一轮它只看得到最新那句 user input，前面聊了什么、调过什么工具、拿到过什么结果，一概不知。**"记忆" 是客户端负责的事**，不是模型负责的事。

看到这里前端同学最容易冒出的第一个问题：那 Anthropic Files API、OpenAI Assistants API 那种带 `session_id` 的接口呢？服务端不是替我存了吗？

对，也不对。服务端是替你存了 messages，但它每一轮下发给模型的时候，还是**全量灌下去**。你以为把 session_id 传上去省了流量，其实只是把 messages 数组从"你的进程内存"搬到了"云上他家数据库"——**灌进模型上下文窗口那一步没省，只是搬家了**。这不是抠字眼，理解这一点，你才不会在下一节看到 token 账单时惊讶。

再往深一层：[blog194 项目护照](/posts/blog194_project-passport-agents-md-claude-md-memory/) 里我讲过 Claude Code 的 `--resume`（Claude Code CLI 的一个子命令，把之前那次对话的 messages 数组从磁盘读回来继续跑，细节看 blog194）是怎么工作的——它把 messages 序列化到磁盘里的一个 session 文件，你 `--resume <session-id>` 的时候它把那个数组读回来，塞回 while 循环，继续跑。这就是"记忆持久化"最朴素的样子：**你负责存，模型不负责记你**。所有花哨的 agent memory 方案，剥到最底，都是这套。

理解到这一层，很多平时觉得神秘的现象都会解释得通。为什么两个不同 session 的 agent 之间没法"分享"经验？因为它们的 messages 数组在两个进程里、两个文件里，各自过各自的一生。为什么"多轮对话"里模型突然引用了很久以前的一个细节，让你怀疑它有长期记忆？没有——是那条细节还在 messages 数组里没被压掉，它这一轮扫上下文正好扫到了。前端同学习惯了 store 是共享的、context provider 是自动往下渗的，agent 世界里这些默认都不存在，什么都得你手动接线。

### 3.2 全量重放的三个隐性成本

React 每一次 setState 都会触发 render，但因为有 diff / memo / Fiber，最后落到 DOM 的只是变化那一小块。agent 没有这层——每一轮 API 调用，整个 messages 数组一 byte 不差全部重发。这不是配置项、不是可以关的优化，是协议本身的语义。

代价三条，线性累积：

**Token（钱）**。假设 context 每轮长 5k token，第 1 轮发 5k、第 2 轮发 10k……第 10 轮单轮就要发 50k，10 轮下来累计发出 275k token。Claude Opus 按 $5/1M input token 算，光 input 就烧掉约 1.4 美刀——而且是平方级往上爬的。一次长任务里 agent 跑二三十轮很常见，30 轮累计 2.3M token，分分钟破 $10。[blog195《Loop Engineering 三笔债》](/posts/blog195_loop-engineering-three-debts-playbook/) 里 LeanOps 那个一晚 $4200 的翻车案，"token 债"就是这么线性攒起来的——不是模型贵，是你每一轮都在把之前所有账单重付一遍。

**延迟（体验）**。prefill 阶段——就是模型"读入"你 messages 数组那一段——是要时间的。100k token 的 prefill 在当前主流模型上通常要 5 到 10 秒。你在终端里看到光标闪、屏幕不动，多半是它在 prefill 你那份越滚越长的历史。用户不管，用户只知道"这个 AI 好慢"。

**混乱（智能）**。学界有一个已经被反复复现的现象叫 "lost in the middle"（这术语来自 Stanford 2023 年那篇 [Lost in the Middle](https://arxiv.org/abs/2307.03172) paper）——模型对 context 头部和尾部的 recall 显著高于中段。你塞得越长，中间那段命中率越低。也就是说塞太多历史给它不是让它更懂你，是让它更迷惑：它可能会漏掉你在第 4 轮讲的一条硬约束，转而复述第 1 轮的一个模糊问题。

三句话总结：**agent 的 context 越长，不是越强，是越贵、越慢、越傻。**

这跟你写前端时那种"多传一个 prop 也没事，反正 React 会 diff 掉"的直觉是完全相反的。在前端世界里，state 变大很少有直接的钱和延迟惩罚——最多是一次 re-render 慢一点，DOM diff 少算几帧。但在 agent 世界里，每一 byte 上下文都在计费、都在拖延迟、都在稀释注意力。你在前端养成的"多塞点上下文保险"这个习惯，切到 agent 会立刻反噬——你越保险，它越迷、你越破产。第一次意识到"我应该少给它一点信息，它反而干得更准"的那天，是这门手艺的一个真正拐点。

### 3.3 治病三招：压缩 / 缓存 / 结构化

对付全量重放，主流有三招：

**招 1：压缩。** 到某个阈值（比如 12000 token），把最早那几轮聊天压成一段 summary，只保留最近 N 轮。summary 用同一个模型跑一次 mini-call 生成。tiny-agent v0.2 里那个 `maybeCompress()` 就是干这个的，下一节贴代码。

**招 2：prompt caching。** Anthropic 提供了 `cache_control: { type: "ephemeral" }` 标记，你把 system prompt / AGENTS.md / 工具描述这些稳定内容标上，5 分钟内命中的话，input token 按大约 1/10 计费（默认 5 分钟档，Anthropic API 也支持 `ttl: "1h"` 一小时档，本篇为简化只用默认）。前端类比一下就是 **HTTP ETag**——同样的资源第二次请求，只需要校验一下没变，就直接命中缓存。但这里有一个大坑我下一节血泪细讲：**cache 是前缀匹配的**，中间任何一个 block 变了，后面全部失效。所以稳定内容必须放前面，动的东西放后面。

**招 3：结构化 context。** 别把所有东西塞成自由文本一坨，用 XML 标签或 JSON 分段，让模型更好抓重点。这一招细讲要留到后面的 Prompt Engineering 篇（blog04），今天先埋钩。

最后一招是元招：**别塞进 context**。当你的历史/文档/知识库大到怎么压缩也塞不下时，答案不是继续压，是把它挪到 context 之外，需要的时候再检索（RAG）。这条留到 blog05 记忆篇。

## 4. 干：tiny-agent v0.2

### 4.1 v0.2 长出什么

`git checkout v0.2` 就能看到下一版：[github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent)。相比 v0.1，长出来三件事：

- 新文件 `src/context.js`：抽出一个 `Context` 类，包住 messages 数组 + token 会计 + `maybeCompress()`
- `src/agent.js` 主循环改成走 `ctx.toRequest(tools)`——system prompt 层加 `cache_control`
- 每一轮 stderr 打一行 `[turn · in=… out=… cache_read=…]`，肉眼看得见钱在哪儿花、在哪儿省

有前端同学会问：为啥要抽个类？一个数组不够用吗？——不够。v0.2 开始，除了 messages 本身，还有"累计 token 数""是否压缩过""cache 命中记录"这些字段需要一个属主。不是过度设计，是这些字段确实需要一个家。**当你开始给 messages 数组算账、算压缩、算 cache 命中，它就不再是一个数组，它变成了一个 state**——那给它加个类壳就是自然事，跟你在 React 里从 `useState` 挪到 reducer 是同一层动机。

### 4.2 Context 类核心

```javascript
export class Context {
  // constructor / addUser / addAssistant / addToolResults / recordUsage 略

  async maybeCompress() {
    if (this.totalTokens < COMPRESS_THRESHOLD_TOKENS) return false;
    if (this.messages.length <= KEEP_RECENT_TURNS * 2) return false;

    // 切点不能落在"带 tool_result 的 user 消息"上——它的 tool_use 一旦被压走，
    // 这条 tool_result 就是孤儿，服务端直接 400。往前走到安全边界再落刀。
    let cut = this.messages.length - KEEP_RECENT_TURNS * 2;
    const isToolResultUser = m => m.role === "user" && Array.isArray(m.content)
      && m.content.some(b => b?.type === "tool_result");
    while (cut > 0 && isToolResultUser(this.messages[cut])) cut--;
    if (cut <= 0) return false;

    const toCompress = this.messages.slice(0, cut);
    const recent = this.messages.slice(cut);

    const summaryRes = await this.client.messages.create({
      model: this.model,
      max_tokens: 512,
      system: "Summarize this conversation history into one paragraph. Keep tool calls, file paths, and any facts the next turn might need. No preamble.",
      messages: [{ role: "user", content: JSON.stringify(toCompress) }],
    });
    const summary = summaryRes.content.find(b => b.type === "text")?.text ?? "";

    this.messages = [
      { role: "user", content: `[Summary of earlier conversation]\n${summary}` },
      // recent 以 user 开头才垫这条 assistant——两个方向的交替违规都是 400
      ...(recent[0].role === "user"
        ? [{ role: "assistant", content: "Understood, continuing from here." }]
        : []),
      ...recent,
    ];
    return true;
  }

  toRequest(tools) {
    return {
      model: this.model,
      max_tokens: 1024,
      system: [{ type: "text", text: this.system, cache_control: { type: "ephemeral" } }],
      tools,
      messages: this.messages,
    };
  }
}
```

顺便一个生产坑：这里 `JSON.stringify(toCompress)` 图省事，但 tool_use / tool_result 嵌套 block 序列化后带一堆转义字符，token 数比人类可读文本膨胀 30%+，模型对 JSON 字面量的注意力也差。生产里通常写 `messagesToText()` 展平成半结构化文本；v0.2 为了短暂时省略，欢迎 PR。

四点讲透：

**一，阈值 12000 / 保留最近 4 轮，是经验值。** 不是最优、也不是通解，就是拍脑袋——但拍得有根据：12000 token 大约是"4600 的 system 打底，再装下五六轮有工具调用的对话"的量级，触发压缩后头顶留出一大段空间，够跑很多轮不用再压。生产环境里应该动态算（比如"离 context window 80% 时触发"），入门先写死更好读。

**二，压缩不能只留最新一轮。** 我第一版就试过只留最后一轮，模型立刻迷失——它不知道"刚才在干什么"，因为 summary 太抽象、只有一轮 recent 又太孤立。留最近 4 轮是一个经验的甜区：summary 撑起长历史，recent 撑起短期上下文。

**三，重建后的序列必须整体合法——伪造的 assistant 是条件性的，切点还要避开孤儿。** Anthropic API 有两条 400 级硬约束（这跟你在前端写 chat UI 想 push 就 push 不同）：messages 必须严格 user/assistant 交替；tool_result 必须紧跟它的 tool_use。所以重建时两头都要伺候：summary 是 user，recent 以 user 开头就垫一条 `Understood, continuing from here.` 的 assistant，以 assistant 开头就直接接——垫是条件性的，无脑垫反而制造连续 assistant；切点那边则要往前走，避开"带 tool_result 的 user"。我第一版是 `slice(-KEEP_RECENT_TURNS * 2)` 一刀硬切加无条件垫 ack，看着优雅，一触发压缩就 400——工具循环下消息严格交替，偶数刀口必然切在 assistant 上，ack 一贴上去就是连续两条 assistant。**尊重协议不是塞一条消息就完了，是让整个重建后的序列都合法。**

**四，`cache_control` 只加在 system。**（Anthropic API 里 `system` 既接受字符串也接受 block 数组；想加 `cache_control` 必须走 block 数组这个形式，我第一次写的时候也懵了一下。）system prompt 是全轮里最稳定的一块，最适合缓存。tools 定义一般也稳定，`cache_control` 也可以加在 tools 数组最后一个 tool 定义上；但如果你像我一样动态拼 tools，就别缓。user message 每轮变、summary 压缩后重写——这两个别缓。**只对稳定的东西加 cache，才有回报**。

### 4.3 跑一下

正常路径——看 cache 从冷到热：

```
$ node src/agent.js "读 README.md 然后告诉我 v0.2 加了什么"
[turn · in=4980 out=87 cache_read=0]
[turn · in=5520 out=142 cache_read=0]
...

# 5 分钟内再跑一次
$ node src/agent.js "读 package.json 告诉我依赖"
[turn · in=4980 out=64 cache_read=4600]    ← cache 命中
```

第二次跑的时候 `cache_read=4600`，意味着 system prompt 这 4600 token 从缓存里读到了，账单按大约 1/10 计费。第一次跑没命中很正常，那是在"写入"缓存。

顺带解释一下 v0.2 的 system prompt 为什么有 4600 token 这么大——我把整份项目说明拼了进去。这不是摆阔，是被门槛逼的：Anthropic 的 cache 有一个**最小可缓存长度**，Opus 系模型是 4096 token，前缀比这短会**静默不缓存**——不报错、不提示，账单照付原价（各模型档位不同，1024 到 4096 不等，官方文档有表）。又一笔只有账单才会告诉你的账，跟下面翻车段是同一族。

触发压缩看起来像这样——构造一段长对话让总量攒到 12000 token 以上，你会在 stderr 看到：

```
[compressed history · 10 messages left]
[turn · in=6400 out=210 cache_read=4600]
```

第一次触发压缩那天我盯着 stderr 出了一会神——原本 20 条 messages 被压成 10 条（summary + 伪造的 assistant + 最近 4 轮），单轮 input 从 12800 掉到 6400，其中 4600 还是缓存里打折读的，真正按原价付的只剩 1800 上下。agent 继续跑下去，任务完成度基本没差。**这一刻"context 是可以裁的"这句话第一次不再是概念，是一个屏幕上跳出来的数字**。

**翻车段（必备）**：我第一版 system prompt 是这么写的：

```javascript
const SYSTEM = `You are tiny-agent. Current time: ${new Date().toISOString()}`;
```

想让它知道现在几点——很合理对吧？跑了半个下午 stderr 里 `cache_read_input_tokens` 就是零零零零零。我以为是 5 分钟窗口过了、以为是 system 太短没到门槛、以为是 SDK 版本问题。查了半小时才反应过来：**Anthropic 的 cache 是前缀哈希匹配的，我这句话里塞了个每秒都变的时间戳，前缀天天不一样，命中率只能是 0**。

教训两条：

- 前端你在 React 里往 `key` 里塞 `Date.now()` 会被 code review 打回；agent 里往 system prompt 里塞 `new Date()`，没人拦你，只有账单会拦你
- **看不到 error 的 bug 最费时间**——cache 没命中不会抛异常，不会红字，只是账单不打折。你要是不打那行 `cache_read` 日志，可能几周都发现不了自己一直在裸付原价。所以 v0.2 那行 stderr 不是仪式感——是让"省了没省"从看不见变成看得见。

顺着这条经验往外推一层：agent 里很多优化不像前端那样有直观反馈。前端你 CSS 写错了，UI 立刻长歪；React 你 key 写错了，列表立刻乱跳；你有一整套肉眼可辨的信号。agent 不是——你 prompt 写歪了、cache 没命中、工具描述模糊，模型不会崩、界面不会花，它只是"表现得没那么好"，而"没那么好"这件事你在开发环境里几乎感觉不到，只有账单和评测集能诚实告诉你。这也是为什么我在 v0.2 就早早加日志——**先建观测，再谈优化**，前端时代的那套"F12 打开就看得见"的舒服在这里是没有的。

### 4.4 一处映射：blog205 的双缓冲，和这里的压缩

系列内引一下：[blog205 Fiber 三原则教 agent 状态设计](/posts/blog205_fiber-teaches-ai-agent-state-design-three-principles/) 里我讲过 Fiber 双缓冲——把"提议态"和"应用态"分开、允许中途丢弃提议。放到 context 管理这里，是同一套心法的另一个侧面：**长活的东西需要分层**。双缓冲是"提议态 vs 应用态"的分层；压缩是"活着的 state（recent 4 轮）vs 归档的 state（summary）"的分层。心法一样，问题不同——一个管状态提交、一个管状态老化。你如果 blog205 读过，这里应该有种"哦，是那件事的另一面"的爽感。

### 4.5 Moonshot 注脚

> Moonshot / DeepSeek 的 caching 语义**跟 Anthropic 不同**：它们走 context caching——服务端自动识别请求前缀是否命中，不需要你显式打 `cache_control` 标记。你只要保持前缀稳定，第二次请求就按缓存价计费。
>
> 但 Context 类的抽象是**完全同构**的：压缩、token 会计、"稳定内容放前面"这几条原则原样成立。切国内模型时，把 `cache_control` 那两处删掉、system prompt 保持前缀稳定、其他代码原样能跑。区别在打折规则上，不在架构上。

## 5. 界：类比的边界

类比撑得住的部分我承认：state 全量、re-render 思路、cache 类比 memo / ETag——都对，可以放心用。但有三条撑不住的，得说满。

**第一条：React state 是内存对象，agent context 是 messages 数组。** React 的 state 天然活在进程内存里，crash 归零、GC 到位、无所谓——重启就是重来，用户重新点一遍就是。agent context 不是——你 crash 一次，那个 messages 数组要是没序列化到磁盘，就丢了；agent"忘了"你俩聊到哪儿了，前面 20 轮的成本白烧。**你得主动持久化**，这也是 blog194 里我为什么把 `--resume` 讲得那么细——它不是便利功能，是补 messages 数组"没有默认持久化"这个缺口。

**第二条：React 的 diff 是自动的，agent 的"diff"是手动的。** Reconciler 帮你算最小变更、Fiber 帮你调度切片，你写 React 不用管这些。agent 里没有对应的组件——`maybeCompress()` 是你手写的，什么时候触发、留几轮、summary 怎么写，都是你的判断。**没有 Reconciler 替你想**——所有裁剪策略是你自己扛的活。

**第三条：React 的 memo 是幂等函数，agent 的 cache 是概率性命中。** memo 你可以信：同 props 必同结果，React 用引用相等判断、你脑子里能算清楚。cache 你不能这么信——前缀匹配、5 分钟窗口、block 边界要对齐、tool 定义顺序不能变，任何一个条件不齐就命中不了，且**不报错**。memo 是契约，cache 是运气好——你不能像信 memo 一样信 cache，你得每一轮打日志监控它。

三条加起来一句：**前端 state 管理是"让重渲染变便宜"，agent context 管理是"让重放变便宜"。心法一样，工具不同。**

呼应 blog01 那句 spine——控制权已经交给一个概率函数了。既然交出去了，context 是它每一轮读取的唯一输入——**context 管理不是锦上添花的性能优化，是你还剩下的那把方向盘**。你不能决定它这一轮想什么、要不要调工具、什么时候停，但你能决定它这一轮看得到什么。这已经是你在这门手艺里能握住的最粗的杆了。

## 6. 钩：下集

下一篇《Tool Call：让 AI dispatch，你来当 reducer》。

类比引子：blog02 讲模型每一轮**看**什么（context），blog03 讲模型每一轮**能干**什么（tools）。tool schema 就是你给模型的一张 dispatch table——它 dispatch，你当 reducer，reduce 完把结果塞回 context，进入下一轮。这个映射一旦看清楚，你之前在前端写过的一切 action / reducer 手感全都能迁过来。

tiny-agent v0.3 会在这只引擎上再长两块器官：**工具箱扩到 3 个**（`read_file` + `write_file` + `list_dir`），加上**入参 schema 校验**——因为模型是真的会瞎写 `path` 的，你得拦。`git checkout v0.3` 就能看到下一版：[github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent)。

在那之前，你可以自己给 v0.2 加个作业：把 `cache_read` 那行日志打到一个文件里，跑一天你日常的对话，回头看命中率——你会看到自己的 prompt 里哪些是稳定的、哪些一直在变。这份数据比任何"cache 最佳实践"文章都管用，因为它是你自己的。
