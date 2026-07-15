---
author: 陈广亮
pubDatetime: 2026-07-15T23:04:47+08:00
title: "Agent 就是个 while 循环？——从 UI = f(state) 到 action = LLM(context)"
slug: blog206_fe2agent-01-agent-loop
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI Agent
  - 前端
  - 开发效率
  - Claude Code
description: 前端人第一次看 AI Agent 满墙术语懵，其实核心就是个 while 循环——但循环里那个函数不纯、会撒谎、每次返回都不一样。这是系列首篇，从 UI=f(state) 到 action=LLM(context)，配一个 32 行可跑的 tiny-agent（Anthropic SDK + 1 个工具），把 agent vs chatbot vs workflow 三分法讲清楚。
---

## 1. 坑

上周三下午，老板走过来拍了下我肩膀，说"下个季度我们要上一个 agent"。

我点头，回到工位，打开 LangChain 文档。一小时后，我面前平铺着七个标签页：AgentExecutor、Tool、Toolkit、Runnable、LangGraph、Plan-and-Execute、ReAct。每个名词都在解释另一个名词，每个例子都在包装另一个例子。我甚至没搞清楚"一个 agent"到底是一个类、一个函数、还是一个进程。

翻到第二页更热闹：Callback、Memory、Retriever、output_parser、structured_chat_agent——一整墙术语砸脸。我像所有前端本能一样，先 `cd` 到新项目里 `npm i` 了八个包，装完盯着 `node_modules` 发呆——我到底该 `import` 哪个类起手？打开 quickstart，第一段用的是 OpenAI functions，第二段又切到 LangChain tools，两套写法在同一页里互相矛盾，示例注释还标着 "deprecated in 0.2"。我关掉浏览器出去抽了根烟——那根烟里我在想的不是 agent，是"我是不是漏了一门课"。

一周之后我才反应过来：agent 的核心，就是个 while 循环。

——但循环里那个函数，不是我熟悉的纯函数。它会撒谎、会绕路、每次调用返回都不一样，甚至连什么时候停都是它自己决定的。

这一篇是《从 useEffect 到 Agent Loop》系列的第一篇。我们不谈框架，先把这只循环拆到最裸。写完你会发现，你手上做前端的那一套心智模型，八成还能用；只是有一小撮东西，得重新学——而恰恰是那一小撮，决定了你到底是在"调 API"还是在"做 agent"。

顺便说明一下这个系列的取向：**我不打算教你 LangChain 有多少个 class**。我会用一个从头写、每篇长几个器官的 tiny-agent 贯穿全程；每一篇解决一个具体问题、加一小段代码、留一个下一篇的钩。这是我一年多来在生产里踩坑之后自己想要的那种教程——如果你也是从前端过来的，欢迎坐稳。

## 2. 桥

一句话：

> **Agent 就是把 `UI = render(state)` 换成 `action = LLM(context)`，放进 while 循环，直到它自己说停。**

前端你写惯了这个：

```
React:                        Agent:
                              
   state                         context
     │                              │
     ▼                              ▼
  render()  ──►  UI              LLM()   ──►  action
     ▲                              │
     │                              ▼
  setState  ◄── event           tool 执行
                              （结果并回 context，下一轮）
```

左边是同步、纯函数、你控制何时 setState；右边是异步、概率函数、模型自己决定要不要再来一轮。骨架一模一样，脾气完全不同。

## 3. 真

### 3.1 agent loop 最小骨架

不用任何框架，一段伪代码讲透：

```
context = [用户的问题]
while (还没结束) {
  response = 调用 LLM(context)
  if (response 是纯文本) → 打印，收工
  if (response 说要调工具) → 执行工具，把结果塞回 context，进入下一轮
}
```

没了。LangChain、AutoGen、CrewAI 所有那些框架，剥到最里面都是这个循环。它们添的是"工具怎么注册""上下文怎么裁""多个 agent 怎么协作"这些外围事，不是循环本身。

之所以要先把这个骨架抠出来单看，是因为一旦你上了框架，"循环在哪里"这个问题会被藏得很深——你写的是"注册一个 chain"、"起一个 executor"，循环变成了 SDK 内部的实现细节。这对熟手是加速，对新手是灾难：因为你一遇到问题，第一反应是去查文档、追 issue，而不是回头问"这一轮 LLM 收到了什么、又返回了什么"。等你自己手写过一遍这个 while，之后不管上哪个框架，你的 debug 直觉都会是对的——**先假设是循环里的 context 出了事，再去看框架有没有帮倒忙。**

### 3.2 agent vs chatbot vs workflow：三分法

我见过太多人把这三个词混着用。分清楚它们，你就分清楚了 90% 的场景。

| 属性 | Chatbot | Workflow | Agent |
|---|---|---|---|
| 循环 | 无（单次问答） | 有 | 有 |
| 工具调用 | 无 | 有（你写死顺序） | 有（模型自选） |
| 下一步谁决定 | 用户 | 你的代码 | 模型 |
| 停止条件 | 用户不说话了 | 步骤走完 | 模型说 end_turn |
| 典型例子 | 网页客服问答 | n8n 一条 pipeline | Claude Code、Cursor Agent |
| 出问题时你查 | prompt | 代码里的分支 | context + 工具设计 |

一个真实反例，我在几个技术群里都见过：

> "我用 GPT-4 写了个自动生成周报的脚本：抓 Jira、抓 GitHub、拼 prompt、写飞书。这算 agent 吧？"

不算。这是 workflow。你把每一步写死了：先抓 Jira、再抓 GitHub、再拼、再写。GPT 只在"拼"那一步被调用一次，它没有权力说"我觉得这周的 Jira 太少不值得写，我建议先看看 Slack"。**下一步做什么如果不是模型自己决定的，就不是 agent。**

这个划分不是学术洁癖，是工程含义完全不同：workflow 的 bug 你在自己代码里查——某一步的 SQL 写错了、某个 API 换 endpoint 了、时区差了八小时；agent 的 bug 你得去 context 和工具描述里查——工具的 description 写得让模型误解了、system prompt 里少了一句"如果找不到就直接说没有"、上一轮的 tool_result 里塞了段乱码把模型带偏了。完全两套 debug 手艺。

再打个比方：workflow 是你亲手写好乐谱、指挥每个音符什么时候响；agent 是你给乐队一段主题、让它自己即兴——你能做的是选乐队、写主题、听他们跑调时该在哪儿把手一抬。前端同学初上手最常见的错误，就是拿指挥乐谱的心智去调即兴——每次翻车都想"我再多加一段 prompt 把这个 case 堵死"，堵到最后 prompt 五千字，模型反而更迷惑。这条弯路系列里会反复提。

### 3.3 停止条件是模型说了算——最陌生的一点

如果你只从上一节记走一句话，请记这个：

**在 React 里，什么时候不 render 由你决定；在 agent 里，什么时候不再循环由模型决定。**

具体到 Anthropic 的 API 上，就是每次 `messages.create` 返回一个 `stop_reason`：
- `end_turn`：模型觉得话说完了，你的循环该 break 了
- `tool_use`：模型想调工具，你去执行、把结果塞回去、再来一轮
- `max_tokens`：模型话没说完就被截了，你要不要接着 continue？（本篇不展开，实操里通常直接 continue 拼接，第 06 篇会讲何时该 break）

关键在第一个。**是模型决定它自己够了没有**——你把控制权交给了一个概率函数。这在前端世界几乎没有对应物。你写 React 从来不会问"这个组件觉得自己该不该 render"，因为组件是死的。

这一点会连带引发三个下游工程问题，本系列后面会一一处理，这里先埋钩子：

1. **万一它不停呢？** ——需要循环上限。模型可能陷在"我再试一次这个工具，说不定这次不一样"的自我说服里，`while(true)` 头顶没盖，一路跑到你信用卡告警。见 [blog195《Loop Engineering 三笔债》](/posts/blog195_loop-engineering-three-debts-playbook/)，我把它称为"步数债"。答案是 `max_steps` 硬闸——不信任模型的自控力，你替它数数。第 06 篇会展开。
2. **停错了怎么办？** ——需要 verifier。模型有时会自信满满 `end_turn`，但活其实没干完：写了半个文件、跑通了 lint 但没跑测试、把 mock 数据当真数据交付。你不能只信它那一句"完成了"，得让另一个模型或一套规则再判一遍——这是 agent 版的"code review"。第 06 篇跟步数债一起讲。
3. **烧钱失控？** ——需要成本熔断。每一步都是真金白银的 API 调用，长任务能一晚上烧上千美刀（[blog195](/posts/blog195_loop-engineering-three-debts-playbook/) 里 LeanOps 那个 $4200 的案例就是原型）。你得同时管两把闸：token 预算（单轮别爆）+ 步长预算（总轮数别爆），并在临界前主动早停、留最后一口气写 checkpoint。第 10 篇专门讲。

现在你只需要把这句话刻在脑子里：

> 把控制权交给一个概率函数，才是这门手艺的起点。

后面十来篇讲的所有招式——上下文压缩、工具设计、多轮 verifier、成本熔断、多 agent 编排——本质都是在这句话周围打补丁。每一层补丁都在解决同一个问题的不同侧面：**我把方向盘交出去了，还得让车不撞墙。** 前端时代你不会碰到这种矛盾，因为你的车没有方向盘——是你在推着走。做 agent 这一年多下来，我个人最深的一层适应，就是接受这件事：**很多时候，你不再是那个每一步都拍板的人，你是那个设计规则、划红线、准备兜底的人。** 这个身份切换，比学 API 难。

## 4. 干：tiny-agent v0.1

光讲概念没意思。我们直接看一个 32 行的 agent，能跑，能调工具，能返回结果。仓库放这里了：[github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent)。

### 4.1 32 行代码

```javascript
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";

const client = new Anthropic();
const MODEL = "claude-opus-4-7";
const tools = [{
  name: "read_file",
  description: "Read a file from the local filesystem and return its content as a string.",
  input_schema: {
    type: "object",
    properties: { path: { type: "string", description: "absolute or relative path" } },
    required: ["path"],
  },
}];

function runTool(name, input) {
  if (name === "read_file") return readFileSync(input.path, "utf-8");
  return `unknown tool: ${name}`;
}

async function main(userInput) {
  const messages = [{ role: "user", content: userInput }];
  while (true) {
    const res = await client.messages.create({ model: MODEL, max_tokens: 1024, tools, messages });
    messages.push({ role: "assistant", content: res.content });
    if (res.stop_reason === "end_turn") { console.log(res.content.find(b => b.type === "text")?.text ?? ""); return; }
    if (res.stop_reason === "tool_use") {
      const toolResults = res.content.filter(b => b.type === "tool_use").map(b => ({
        type: "tool_result", tool_use_id: b.id, content: runTool(b.name, b.input),
      }));
      messages.push({ role: "user", content: toolResults });
    }
  }
}

main(process.argv[2] ?? "hi, who are you?");
```

就这些。没框架、没状态机、没 Runnable、没 Executor。一个 `while (true)`、一个 `messages.create`、一个 `switch` 意味的 if-else。

### 4.2 逐行拆

**第一步：起 client + 定义 1 个工具。** Anthropic SDK 的 tool 定义是三件套：`name`（模型看这个决定调不调）、`description`（模型看这个决定什么时候调）、`input_schema`（JSON Schema，模型按这个凑参数）。`description` 是最容易被前端同学低估的字段——它不是文档，是给模型的 prompt。这里我只放了一句话，够简单场景用；复杂工具的 `description` 你得像写 API 文档一样认真写，第 04 篇会展开。

**第二步：`while (true)`。** 显性循环，一点魔法都没有。看到这里能会心一笑的，是那些被 LangChain 的隐式 executor 折磨过的朋友——那个"到底循环在哪儿"的问题，答案是"就在这里，你自己写"。

**第三步：`messages.create`。** 每次把整个 messages 数组全量传上去。是的，全量。模型没有你想象中的记忆，只有你这次给它的 context。这一点第 02 篇会重锤，先埋着。

**第四步：分支。** `end_turn` 打印文本、return 出循环；`tool_use` 就把每个工具的 `input` 交给 `runTool` 跑一下，收集结果，塞回 messages，进入下一轮。

**第五步：Anthropic 特有的一个 shape。** 先说一件容易踩的事：Anthropic 的 `content` 是**一个 block 数组**，一轮返回里可能同时含 `text` block 和 `tool_use` block（比如模型一边说"我来读一下这个文件"一边发起 `read_file` 调用），所以上面代码里得按 `type` 去 `find` / `filter` 拣，不能当字符串直接用。回到 shape 本身：注意 `toolResults` 是塞进 `{ role: "user", content: ... }` 的，不是 `role: "tool"`。这跟 OpenAI 风格不一样——OpenAI 把工具结果放在 `role: "tool"` 的单独消息里。Anthropic 的心智是"工具结果是用户视角下一轮的输入"，所以走 user role。第一次写会踩，写多了会习惯，但你得知道两家 shape 不同。这类差异不是"哪家做得对"，而是背后模型训练时用的对话模板不同——你把结构搞错，模型不会崩，但会开始"表演"：假装看到了什么、假装知道结果、假装完成了任务。查这种 bug 最难受，因为一切看起来都在跑，只是慢慢跑歪。

### 4.3 跑一下，然后翻车

正常路径先跑通：

```
$ node src/agent.js "帮我读一下 README.md 说了什么"
```

3 到 8 秒，模型返回一段摘要。你能在终端里看到它先说"我来读一下"，然后触发 `read_file`，然后念出内容大意。**你手上的这只 32 行程序，就是 Cursor Agent 和 Claude Code 的最内核**——没有夸张。

接着我干了件蠢事：

```
$ node src/agent.js "读一下 /tmp/does-not-exist.md"
```

进程直接 die 了，栈里 ENOENT 好几行躺着。第一次我以为自己写错了，看了半天才反应过来——**是 v0.1 就没写 try/catch**。`readFileSync` 一炸，异常直接冒出循环，Node 进程走人。不是 agent 蠢，是我裸得太狠。

这里有两条岔路：
- **直接 crash**（v0.1 现在的样子）——最小实现、错误最响、看得最清楚
- **catch 后把 error 塞回 tool_result**——让模型自己看到"你调的这个路径不存在"，然后它可能会换个路径、可能会问用户、可能会道歉

第二条才是生产做法。但我在 v0.1 里刻意留了第一条——因为你得先看清"没写异常处理会怎样"，才能理解 blog06 讲 verifier / retry 的时候在解决什么。

留个作业：你可以自己给 `runTool` 加个 try/catch，试试模型拿到 error 之后会怎么办。你会发现它比你预想的靠谱——但也没有你希望的那么靠谱。

### 4.4 这只 32 行的引擎，就是 Claude Code

这个骨架不是玩具。它跟我在 [blog194 项目护照](/posts/blog194_project-passport-agents-md-claude-md-memory/) 里日常用的 Claude Code，是**同构的**——Claude Code 本质就是这个 loop 外面套了 UI、memory（AGENTS.md / CLAUDE.md）、hook 系统、权限门、cost tracker。剥掉这些外壳，最里面还是一个 `while (true) { create → 分支 → 塞结果 }`。

具体到映射上，几乎每一层外壳都能在你这 32 行里找到对应位：

- **`CLAUDE.md` / `AGENTS.md`**（项目护照那套） → 每轮循环把项目上下文 prepend 到 `messages[0]` 的 system prompt 层——不是玄学，就是拼接
- **Claude Code 的 `PreToolUse` / `PostToolUse` hook** → `if (res.stop_reason === "tool_use")` 分支里、执行前后各插一个中间件（比如"这个工具要不要人工确认""结果要不要脱敏"）。这条会成为第 07 篇的骨头
- **Claude Code 的 `--resume`** → 把 messages 数组序列化到磁盘、下次进程起来读回来接着 `while`——就这么朴素。这也是第 02 篇 context 管理会碰到的第一件事

一句话收：**Claude Code = 这 32 行 loop + hook + memory + UI + 权限门**。外壳可以再复杂十倍，核心引擎跟你今天写的一模一样。你今天写的这 32 行，就是缩微版 Claude Code 的引擎。剩下的这个系列，其实就是在这只引擎外面一层一层长器官——直到它长成你敢在生产里用的样子。

---

**国内替代方案：Moonshot / DeepSeek 也能跑，改两处即可**

> 本系列主线走 Anthropic，因为 Claude 的 tool use 是原生一等公民、prompt caching 最成熟。但如果你要用国内模型，tiny-agent 的骨架完全同构，改两处就能跑：
>
> - **client 层换掉**：Moonshot / DeepSeek 的 tool-use API 兼容 OpenAI 风格，用 `openai` SDK、`baseURL` 指过去即可
> - **两个字段名对应**：`stop_reason: "end_turn"` ≈ OpenAI 系的 `finish_reason: "stop"`；Anthropic 的 `tool_use` block ≈ OpenAI 的 `tool_calls`；工具结果塞回时 Anthropic 走 `role: "user"` + `type: "tool_result"`，OpenAI 走 `role: "tool"`
>
> 结构不同，角色对应。看懂本文 Anthropic 版之后再切国内模型，你会一眼看出哪块是 shape 差异、哪块是能力差异——别混起来。tiny-agent 后续会加一个 moonshot 分支演示，欢迎在 issue 里点单。

## 5. 界：类比的边界

到这里我得停一下，把话说满：`UI = f(state)` 到 `action = LLM(context)` 这个类比，是入门用的脚手架，不是终点。我列三条反向自省，防止你（也防止我自己）被自己的类比骗了。

**第一条：render 是纯函数，agent loop 不是。** 同一个 state，render 一定返回同一个 UI；同一个 context，LLM 每次返回的 action 可能不一样（temperature 大于 0 就有随机性，temperature 等于 0 也不完全稳定——batch 调度 / 浮点误差都会让它抖，第 09 篇 eval 会展开）。React 允许你写 `useMemo` 是因为它相信函数纯——你不能对 LLM 用同一套心智。

**第二条：React 有 Reconciler / diff，agent loop 没有。** React 每次重渲染，diff 之后只提交最小变更到 DOM；agent 每一轮都是全新的 API 调用，把整个 messages 数组全量发上去。**没有 diff。** 这直接导致成本、延迟、context 长度都是线性长的——第 02 篇专治这个。顺带一提，[blog205 讲 Fiber 三原则教 agent 状态设计](/posts/blog205_fiber-teaches-ai-agent-state-design-three-principles/) 里聊过双缓冲—stage/commit 那一层——那是另一个方向的类比（状态提交），跟本文的循环骨架（控制流）各管一段，别混。

**第三条：render 幂等，agent 不幂等。** 同 state 必同 UI，是 React 的空气；同 context 可能返回不同 action，是 agent 的空气。你在前端调 bug 是"打开 devtools 找 state"，你在 agent 里调 bug 是"重跑十次看分布"——一个是查案，一个是做民调。这个差异会直接反映在你的测试策略上：前端你写单元测试断言"输入 A 出 B"，agent 你得写评测集断言"输入 A 出 B 的比例大于九成"。**测试从判断题变成了统计题**——这也是为什么后面第 09 篇会专门讲 eval，那不是"额外的仪式感"，是你写 agent 之后回不去的新地基。

三条加起来一句话：**类比帮你入门，边界让你别翻车。**

而且，请记住这条边界最深的那一层——

> 把控制权交给一个概率函数，才是这门手艺的起点。

## 6. 钩：下集

下一篇《模型没有记忆：Context 就是 state，而且每次全量重渲染》。

预告一个类比钩子：React 每次 state 变了会全量重渲染，但 React 有 diff、有 memo、有 Fiber 帮你把成本压下来；agent 每一轮也是全量，但没 diff——所以 context 管理、prompt caching、历史压缩，就成了 agent 工程的第一件真活。tiny-agent 会在 v0.2 长出**历史管理 + 上下文压缩**这两块器官，`git checkout v0.2` 就能看到下一版：[github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent)。

在那之前，你可以自己拿 v0.1 玩一下：给它加个 `write_file` 工具、加个 `list_dir`，看看模型自己会不会拼多步操作。你会开始感受到——**它比你想的会动脑，但也比你想的更需要栏杆。**
