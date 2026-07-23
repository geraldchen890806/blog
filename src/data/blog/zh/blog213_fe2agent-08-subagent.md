---
author: 陈广亮
pubDatetime: 2026-08-05T09:00:00+08:00
title: "Subagent 就是 Web Worker：说不清需求，别怪外包干得烂"
slug: blog213_fe2agent-08-subagent
featured: true
draft: true
reviewed: false
approved: false
tags:
  - AI Agent
  - 前端
  - 开发效率
  - Claude Code
description: 你以为 spawn 一个 subagent 是开线程，其实是雇临时工：它看不见父 agent 的任何历史，brief 里没写的假设一律靠脑补——任务描述是一次有损且无 schema 的序列化。这是 fe2agent 系列第 8 篇，配 tiny-agent v0.8（spawnSubagent + delegate_task 委托工具 + 子循环记账）。
---

## 1. 坑

写这个系列的工作流，本身就是一对父子 agent：主流程起草，再 spawn 一个审查 agent 独立挑刺。上个月有一天我图省事，给审查 agent 的 brief 只写了一句："审查这篇文章的引号问题。"

它跑得很快，回来一份报告，密密麻麻 42 条：第 12 行弯引号、第 15 行弯引号、第 23 行弯引号……我点开一看，全是中文语境里的全角双引号——正文里正经的中文标点。我们的家规写得很清楚：系列正文用半角直引号，禁的是英文弯引号；中文全角引号是正常标点，不算违规。42 条，全是假阳性。

blog04 我讲过这个事故的另一半：最后的修法是再加一条规则去修前一条规则，那是级联的角度。但当时我没讲病根——病根是，"中文全角引号不算弯引号"这条家规，活在我和主流程的对话历史里、活在我脑子里，唯独不在我发给审查 agent 的那句 brief 里。它是一个全新的循环，看不到我的任何历史。**它不蠢，它只是只知道我 brief 里写的那句话。**

postMessage 传不过去的东西，prompt 一样传不过去。

这是《从 useEffect 到 Agent Loop》系列第 8 篇。blog07 管住了一个 agent 的手，这一篇讲活多了怎么办：context 会满（blog02 那条账单曲线还在爬）、职责会混（blog06 的翻车段已经证明过验收要隔离上下文）——你要开分身了。而开分身这件事，前端有一个精确到令人发笑的对应物：Web Worker。

## 2. 桥

一句话：

> **Subagent 就是 Web Worker：独立线程、独立内存、摸不到你的 DOM；你 postMessage 过去什么，它就只知道什么——说不清需求，别怪外包干得烂。**

```
React:                          Agent:

  主线程                           父 agent (messages_A)
    │ postMessage(data)              │ delegate_task(brief)
    ▼                                ▼
  Worker (独立线程)               subagent (全新 messages_B)
    │ 摸不到 DOM                     │ 看不见 messages_A
    │ 算完 postMessage 回来          │ 跑完只回最终文本
    ▼                                ▼
  主线程 onmessage 合并           父 agent 验收、合并
```

左边的隔离是浏览器给的：Worker 天生没有 window、没有 document。右边的隔离是结构给的：子 agent 就是一次全新的 API 循环，父的 messages 数组它一个 byte 都看不见。隔离是好事，但隔离的代价——序列化——两边也是同一个。

## 3. 真

### 3.1 为什么拆：三个动机

前端你什么时候开 Worker？主线程卡了（重计算把 UI 冻住）、逻辑要隔离（一段不该碰 DOM 的纯计算）、想吃多核（并行跑几份）。agent 拆 subagent，三个动机一一对应：

**一，context 满了。** blog02 那条账单曲线还记得吧——全量重放，每一轮都在重付之前所有的账。一个长任务跑 30 轮，把探索、试错、工具输出全攒在同一个 messages 数组里，又贵又慢又 "lost in the middle"。拆出去之后，子 agent 自己跑十几轮工具调用，中间过程全部留在它自己的循环里，父只收到一条最终结论——**中间态用完即弃，不进父的账本**。这跟压缩（blog02）是同一个问题的两个出口：压缩是把历史缩小，拆分是让历史根本不发生在你这里。

**二，职责要隔离。** blog06 的翻车段我埋过一句"验收要隔离上下文"：第一版 verifier 我把整个对话历史都传给了它，它看到干活模型一路的挣扎，共情了，判了 PASS。审查者不该看到起草者的自我辩护——它一旦看到，就不再是审查者，是队友了。隔离不只是省钱，是让角色成立。

**三，并行。** 三个文件要改，三个 agent 同时开；单次 LLM 调用的延迟你压不下来，但你可以让三份延迟重叠在同一段墙钟时间里。这是最像多核的一条，也是最不需要解释的一条。

### 3.2 隔离的语义：brief 是一次有损序列化

Worker 为什么摸不到 DOM？因为它不在主线程，内存不共享，你只能 postMessage 传数据。而 postMessage 有个著名的边界：structured clone——能克隆的传得过去（对象、数组、TypedArray），不能克隆的当场抛 DataCloneError（函数、DOM 节点、闭包里的引用）。

subagent 的隔离语义几乎一模一样，只是"传不过去"的形态更隐蔽。子 agent 是一次全新的 messages.create 循环，它的 messages 数组从你的 brief 那一行开始。它没有你的对话历史、没有你和主流程磨合出的默契、没有你脑子里"这还用说吗"的默认假设。**brief 是一次有损序列化：structured clone 传不过去函数，brief 传不过去你没写下来的一切。**

而且比 postMessage 更糟——postMessage 遇到传不了的东西会立刻报 DataCloneError，你当场知道；brief 丢了信息，没有任何报错，子 agent 拿着残缺的需求照样干得热火朝天。开头那 40 多个假阳性就是这么来的："中文全角引号不算弯引号"这条家规，就是那个传不过去的"闭包引用"——它活在我的历史里，序列化成 brief 的时候丢了，而丢的那一刻没有任何提示。

所以给 subagent 写 brief，和给外包写需求文档是同一门手艺：**对方的全部世界，就是你文档里的那几行字**。外包干得烂，八成不是对方蠢，是需求文档里默认了太多"我以为你知道"。有个土办法自查：写完 brief，别急着 spawn，先问自己一句——一个今天刚入职、没参加过任何会议的新人，只拿这几行字，能不能把活干对？答案是不能的话，缺的那部分就是你还没序列化出来的隐性假设。

### 3.3 结果回收：约定结构，父来裁决

Worker 算完，postMessage 回来一个 data，主线程在 onmessage 里消费。subagent 跑完，回给父的是它最后那段文本。这里有两条工程纪律：

**一，回传要约定结构。** 别让子 agent 用散文汇报——"我检查了一下，总体写得不错，有几个小问题……"这种结果父没法程序化消费。在 brief 里写死期望输出格式：回 JSON、回固定字段的列表、每条带行号和原文。我现在给审查 agent 的格式要求就一句话："每条问题一行，格式为 `行号 | 原文 | 问题类型`，没有问题就只回 NONE。"这等于给 postMessage 回来的 data 定 schema——前端你不会让 Worker 回一段自然语言让主线程猜。

**二，父负责合并与裁决。** 多个子 agent 回来的结果可能重复、可能互相矛盾，合并、去重、最终拍板是父的活，不能再委托出去——委托出去就是又一层同样的问题。你从司机变成了调度台，但调度台不能对着一堆报文说"你们自己商量"。

还有一条反向纪律：**什么时候不该拆**。任务本身需要连续上下文的——改一个函数，前面二十轮的探索就是必要背景，拆出去等于让新人裸上；子任务之间强耦合的——A 的输出是 B 的输入，拆成并行只会让两边互相等。为拆而拆，得到的不是并行，是两份 brief 税。

## 4. 干：tiny-agent v0.8

### 4.1 v0.8 长出什么

从 v0.7 到 v0.8 的 diff：

- 新文件 `src/subagent.js`：`spawnSubagent(brief, tools, { maxSteps })`——起一个独立 messages 数组 + 独立循环，跑完只把最终文本返回给父
- `src/tools.js` 注册新工具 `delegate_task`：模型自己决定何时外包（blog01 三分法又落地一次：下一步谁决定——模型）
- 每次子 agent 收工，stderr 打一行 `[subagent · steps=… in=… out=…]`——子 agent 的 token 也是钱，记账不能因为它是临时工就免了

### 4.2 核心代码

```javascript
// src/subagent.js
import Anthropic from "@anthropic-ai/sdk";
import { runTool } from "./tools.js";

const client = new Anthropic();
const MODEL = "claude-opus-4-7";

export async function spawnSubagent(brief, tools, { maxSteps = 10 } = {}) {
  const childTools = tools.filter(t => !["delegate_task", "write_file", "save_memory"].includes(t.name)); // 分身不再开分身，也不带写盘工具
  const messages = [{ role: "user", content: brief }];
  let steps = 0, inTok = 0, outTok = 0;

  while (steps < maxSteps) {
    steps++;
    const res = await client.messages.create({ model: MODEL, max_tokens: 1024, tools: childTools, messages });
    inTok += res.usage.input_tokens;
    outTok += res.usage.output_tokens;
    messages.push({ role: "assistant", content: res.content });

    if (res.stop_reason === "end_turn") {
      process.stderr.write(`[subagent · steps=${steps} in=${inTok} out=${outTok}]\n`);
      return res.content.find(b => b.type === "text")?.text ?? "";
    }
    if (res.stop_reason === "tool_use") {
      const toolResults = [];
      for (const b of res.content.filter(b => b.type === "tool_use")) {
        const result = await runTool(b.name, b.input);
        toolResults.push({
          type: "tool_result", tool_use_id: b.id,
          content: result.error ?? result.content, is_error: !!result.error,
        });
      }
      messages.push({ role: "user", content: toolResults });
    }
  }
  return `[subagent aborted: hit maxSteps=${maxSteps}]`;
}
```

注册进 `tools.js` 的委托工具：

```javascript
{
  name: "delegate_task",
  description: "Delegate a self-contained subtask to a fresh subagent. It sees ONLY your brief—no conversation history. Write the brief in three parts: task, constraints, expected output format.",
  input_schema: {
    type: "object",
    properties: {
      brief: { type: "string", description: "Complete instructions. The subagent knows nothing you don't write here." },
    },
    required: ["brief"],
  },
}
```

四点讲透：

**一，隔离不是开关，是"数组根本不是同一个"。** spawnSubagent 第一行 `const messages = [{ role: "user", content: brief }]`——子 agent 的世界从这一行开始。没有任何"关掉共享"的配置，因为从来就没有共享：两个数组、两段循环、两份账单。blog02 讲过"两个 session 的 messages 各自过各自的一生"——这次是你**故意**让它们各过各的。

**二，delegate_task 是个工具，意味着"何时外包"也交给了模型。** 你完全可以在自己代码里手动调 spawnSubagent——那是 workflow 式的拆分，拆什么你写死。包成工具注册进去，模型读着 description 自己判断"这个子任务够独立，值得开个分身"——这才是 agent 式的拆分。blog01 那张三分法表格里"下一步谁决定"那一行，在这里又画了一遍。

**三，子 agent 也要 maxSteps。** blog06 给主循环上的硬闸，子循环一个都不能少——临时工也会陷进"我再试一次"的自我说服。而且子 agent 失控比主循环更隐蔽：它在自己的循环里空转，父这边只看到一次 delegate_task 迟迟不返回，像一个 pending 住的 Promise，你连进度条都没有。

**四，那行 stderr 是账本，也是体检报告。** steps 多少、in/out 多少，一眼看出这次外包值不值：一个 3 步 3k token 的子任务，包出去纯赚；一个 2 步就回来的呢？可能这活根本不用拆——你付了整份"新人入职成本"（brief 里的背景交代），让它干了五分钟的活。

三个实现细节顺带交代：一，runTool 这一版从同步变成 async（delegate_task 的执行要 await），所以不光 subagent.js，agent.js 主循环里塞结果那段也从 `.map` 改成了 `for...of`，gate 放行后的 `runTool` 前面补上了 `await`。二，spawnSubagent 第一行那个 `childTools` 过滤摘掉了两类东西：delegate_task——**分身不许再开分身**，不然你收获的不是并行，是一棵失控的进程树和一张失控的账单；还有 write 类工具——子循环里没有 blog07 那道确认门，与其让分身无人值守地闯写盘路口，不如出门就只发只读工具箱。三，tools.js 和 subagent.js 互相 import 形成了环，ESM 扛得住——前提是谁都别在模块顶层调用对方，都收在函数体里，安全。

### 4.3 跑一下

```
$ node src/agent.js "把 docs/ 下三个 md 各写一份 100 字摘要，汇总到 SUMMARY.md"
[turn · tool_use=list_dir]
[turn · tool_use=delegate_task]
[subagent · steps=3 in=3400 out=290]
[turn · tool_use=delegate_task]
[subagent · steps=3 in=3100 out=270]
[turn · tool_use=delegate_task]
[subagent · steps=4 in=4200 out=310]
[turn · tool_use=write_file]
done. SUMMARY.md 已创建，三段摘要
```

父 agent 自己只跑了五轮：一次 list_dir、三次 delegate_task、一次 write_file。三份文档的原文、子 agent 读文件的中间过程，全都没进父的 messages——**父的 context 里只有三段摘要**。这就是 §3.1 说的"中间态用完即弃"长在屏幕上的样子。

顺手算笔账：三个子循环加起来 in 一万出头，各自跑完即销毁；如果不拆，三份文档原文和读文件的往返全部进主 messages，而主 messages 是要被后面每一轮全量重放的（blog02 的复利），越到后面拖得越重。同一个任务，拆与不拆，差的不是一次性的量，是**后面每一轮的底数**。

**翻车段（必备）**：第一版 spawnSubagent 我写了个"贴心"功能：把父的整个 messages 数组序列化了拼在 brief 前面，美其名曰"给子 agent 完整背景"。你可能已经闻到味了——这和 blog06 里 verifier 拿到全历史那次是同一个病根，我在两个器官上各摔了一遍。跑了两天，两个恶果一起到账。

一是钱。父当时已经跑到第 14 轮，messages 有 20k 多 token，每次 delegate，子 agent 第一轮 input 就 20k 起步——一次外包的账单比主循环三轮加起来还贵；而且子 agent 自己每多跑一轮，这 20k 还要再全量重放一遍，blog02 那条曲线在子循环里又爬了一遍，等于我给账单开了个分身。

二是歪。历史里有一段我和主流程关于"要不要重构 tools.js"的讨论，最后决定不动。子 agent 读到了讨论，没读懂"最后决定不动"，干完摘要顺手把 tools.js 改了。**它不是没听话，它是听了太多话。**

修法是把 brief 砍成三段：任务（做什么）、约束（红线和家规）、期望输出格式（回什么结构）。总共 300 token 上下。子 agent 反而又快又准——**给得多不等于说得清**。blog02 那句"少给一点，它反而干得更准"在多 agent 这里原样成立，而且加倍成立：你多给的每一个 token，既是账单，又是干扰项。

### 4.4 一处映射：blog205 的 worktree，和这里的分身

Claude Code 里这套机制叫 Task（subagent）：主 agent 把一次全库检索、一次独立审查外包出去，子 agent 在自己的 context 里跑完，只把结论带回来。你平时让 Claude Code "搜一下代码库里哪里定义了 X"，它转头 spawn 一个搜索 agent，背后就是这个动作——中间翻过的几十个文件不进主对话的 context。

还有一个细节值得注意：Claude Code 的子 agent 一样会读 [blog194 项目护照](/posts/blog194_project-passport-agents-md-claude-md-memory/) 里讲的 CLAUDE.md。这正是开头那 40 多个假阳性的正解——家规不该活在某一段对话历史里，指望每次 brief 都手抄一遍；家规该活在一个所有分身启动时都会读的文件里。**把隐性假设从"历史"提升为"配置"**，序列化就不再依赖你临场的记性。

再往深一层：多个子 agent 同时改文件怎么办？[blog205 Fiber 三原则](/posts/blog205_fiber-teaches-ai-agent-state-design-three-principles/) 里讲过 git worktree 隔离——每个子 agent 在自己的 worktree 里改，那是它的 workInProgress 树：改烂了整棵丢弃，不污染 current 树；改好了父验收，验收通过才 merge。stage/commit 心法在多 agent 世界的再现。context 隔离管"想法不互相污染"，worktree 隔离管"文件不互相踩"——两层隔离叠起来，车队才敢同时上路。

### 4.5 Moonshot 注脚

> 先说破一件事：subagent 不是 API 特性，是应用层模式。Anthropic 的 API 里没有 spawn_subagent 这个端点，OpenAI / Moonshot / DeepSeek 也没有——所谓开分身，就是你在自己代码里再起一个对话循环，没有任何魔法。
>
> 所以 v0.8 的迁移成本几乎为零：spawnSubagent 里那次 messages.create 换成 chat.completions.create，delegate_task 照 blog03 注脚说的包一层 `function`，brief 三段式一个字不用改。隔离、有损序列化、结果回收——这些语义跟供应商无关，它们是"拆分"这件事本身的性质。

## 5. 界：类比的边界

Worker 这个类比撑得住的部分很扎实：独立执行环境、消息传递、序列化边界、主线程当协调者——中级前端一遍就懂。但有三条撑不住的，得说满。

**第一条：Worker 便宜到随手开，subagent 是按 token 雇的临时工。** `new Worker()` 的成本是几毫秒和一点内存，你开完就忘；spawnSubagent 每一步都在烧真钱——brief 是入职培训费，它的每一轮循环是时薪，你贴进去的每份背景材料都按字数计价。开 Worker 你不心疼，开 subagent 之前你得先想一件很不技术的事：**这活值不值一份工资**。一次工具调用能干完的事，别开分身。

**第二条：postMessage 的序列化是无损协议内的，brief 的序列化是有损且无 schema 的。** structured clone 在它支持的类型范围里保真——数字进去数字出来，不多不少；传不了的东西当场 DataCloneError。brief 两头都没有：没有 schema 告诉你哪些字段必填，没有 TypeError 提醒你哪个假设传丢了。更糟的是，丢掉的部分子 agent 会自己脑补一个"合理默认"填上——blog03 说过，它的"合理"经常不是你的"合理"。**报错是慈悲，脑补才是灾难。**

**第三条：Worker 和主线程共享同一个事实源，两个 agent 没有。** Worker 再隔离，它和主线程也在同一台机器上，看到的时间、文件、网络是同一份现实。两个 agent 不是——父看到的仓库和子看到的仓库，可能隔了一次 git pull；父记忆里"这个文件 200 行"，子读到的已经 350 行。多 agent 的"数据竞争"比多线程还难查，因为它不叫 race condition——**它的表现形式是两个都很自信**：各自拿着自己那份过时的事实，谁也不觉得需要再确认一遍。

一句话收尾：**Worker 的隔离拿序列化换，好歹有协议兜底；subagent 的隔离也拿序列化换，但这次没有协议——brief 里写丢的每一个假设，都会变成对面一个很自信的脑补。**

呼应 spine：[blog01](/posts/blog206_fe2agent-01-agent-loop/) 把方向盘交给概率函数，blog02 攥住 context，blog03 攥住执行，blog07 在关键路口装闸机——到这一篇，一辆车变成了车队，**你从司机变成调度台**：不再握任何一把方向盘，你写的是每辆车的任务条、验收单和对讲机频道。防御对象没变，还是"模型的瞎说"——只是现在，瞎说会在车与车之间传染，而调度台的活，就是让每条信道上跑的都是写下来的、可验收的话。

## 6. 钩：下集

下一篇《Flaky 不再是 bug，是本体：前端测试思维怎么迁移到 Eval》。

类比引子：一个 agent 干得对不对，blog06 的 verifier 能兜；一支车队呢？每辆车都是概率的，车队的质量你没法靠盯——你只能靠统计。而且 blog01 埋过一句话，拖了八篇，该兑现了：**temperature=0 也不完全稳定**——为什么一个号称确定性的采样还会抖，batch 调度和浮点的账怎么算，第 09 篇摊开讲。前端测试是判断题（这段代码对不对），eval 是统计题（这个系统这周有多对）——blog01 说的"测试从判断题变成统计题"，是时候兑现了。

tiny-agent v0.9 会长出 `evals/` 目录：用例集 + `node src/eval.js --runs=5`，同一个任务跑五次看通过率，让"它行不行"从感觉变成数字。`git checkout v0.9` 就能看到下一版：[github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent)。

在那之前给你留个作业：拿 v0.8 的 delegate_task，同一个子任务写两版 brief——一版一句话，一版任务 + 约束 + 期望输出格式三段——各跑五次，数子 agent 的 steps 和 token。你会亲眼看到"需求文档的质量"变成 stderr 里的数字。这个手感，比任何多 agent 框架的文档都管用——因为它是你自己写的 brief 上的数据。
