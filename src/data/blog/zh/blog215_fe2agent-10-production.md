---
author: 陈广亮
pubDatetime: 2026-08-11T09:00:00+08:00
title: "从抠 bundle 到抠 token：把 Agent 送上生产，再给它一张脸"
slug: blog215_fe2agent-10-production
featured: true
draft: true
reviewed: false
approved: false
tags:
  - AI Agent
  - 前端
  - 开发效率
  - Claude Code
description: 前端上线抠 bundle 体积，agent 上线抠 token 账单——手艺是同一门：给看不见的增长装一个看得见的闸。这是 fe2agent 系列第 10 篇（收官），讲 tracing、三层预算熔断、checkpoint 与分布漂移体检，配 tiny-agent v1.0（trace.js 成本三列记账 + 美元熔断 + checkpoint/--resume），并用三把闸复盘那晚 $4200。
---

## 1. 坑

上个月我把自己的博客自动发布 agent 正式挂上 cron。上线前最后一个 commit 不是加功能，是加了两行配置：单次任务预算上限 8 美元，超时 15 分钟。

不是因为它经常失控——恰恰相反，它一个月里二十九天都规规矩矩。是因为它**只要失控一次**就够我喝一壶：一个 while 循环、一把没有上限的 API key、一整晚没人看着，这三样凑齐能长出什么样的账单，[blog195](/posts/blog195_loop-engineering-three-debts-playbook/) 那晚 $4200 的案例已经演示过了，我不想亲自复现。

写下 `const BUDGET_USD = 8` 那一刻，我愣了几秒——这个手感太熟了。多年前第一次在 webpack.config.js 里写 `performance: { maxAssetSize: 250000 }`，也是同一个动作：不是因为 bundle 每天都超标，是因为没有这条线，超了你根本不会知道。

手艺是同一门：**给看不见的增长，装一个看得见的闸。**

这是《从 useEffect 到 Agent Loop》系列第 10 篇，收官。前九篇把 agent 从一个 32 行的 while 循环，养到了会管上下文、会用工具、会记忆、会自检、会分身、能被评测的地步；这一篇走最后一段路：把它送上生产——tracing、成本熔断、checkpoint，以及生产环境里那种"没有报错，只是慢慢变笨"的新型事故。

## 2. 桥

一句话：

> **前端上线你抠 bundle，agent 上线你抠 token——预算的心法原样迁移；只是 bundle 是编译期的一个数，token 是运行时的一条流量，闸得从 build 脚本挪进主循环。**

```
React 上线:                    Agent 上线:

  bundle(编译期资产)             token(运行时流量)
    │                              │
    ▼                              ▼
  maxAssetSize ──► build 报警    BUDGET_USD ──► 熔断+checkpoint
    │                              │
  超标死在 CI 里                  超标死在账单上
  （上线前拦一次就够）           （每一轮都得看着）
```

左边的闸是一次性验收，build 过了就永远过了；右边的闸每一轮都在值班，因为钱是每一轮都在流的。

## 3. 真

### 3.1 tracing：network 面板的 agent 版

前端查线上问题，第一反应是打开 network 面板：哪个请求慢、哪个 4xx、瀑布图里谁在阻塞谁。agent 上了生产你需要一模一样的东西，只是没人给你现成的面板——你得自己记。

最小单位是 span：每一次 LLM 调用记一条（耗时、输入输出 token、成本），每一次工具调用记一条（耗时、成功还是失败）。一个任务跑完，把 span 按时间摊开，就是这个任务的瀑布图：哪一轮在等模型 prefill、哪个工具吃掉了 80% 的延迟、模型是从第几轮开始在同一个坑里打转——全都摆在时间轴上。

没有 tracing 的 agent，生产事故是没法查的。用户说"它昨晚跑了四十分钟什么都没产出"——没有 trace，你连它是卡在一个慢工具上、陷在重试循环里、还是第 12 轮就开始跑歪，都分不出来；有 trace，一眼看穿：第 9 轮起，同一个工具、相似的参数，反复调了 11 次。前端你不会部署一个没接监控的站点，agent 同理，只是要监控的东西从"请求"变成了"轮次"。

span 里记什么，一条经验：除了耗时和 token，把任务 id 和轮次号也焊进去，让 blog07 的审计日志（谁放行了哪次写盘）和这里的 span 落在同一条时间线上——查事故要的是"第 14 轮模型申请 write_file、确认门放行、写完之后 build 挂了"这样一句完整的话，三份日志各说各话是拼不出这句话的。

blog02 里 v0.2 那行 `[turn · in=… out=… cache_read=…]` 的 stderr 日志，当时我说"先建观测，再谈优化"——它在 v1.0 长成完整体：落盘 JSONL、带耗时、带成本折算、任务结束打汇总表。日志是给人扫一眼的，trace 是给事故留证据的。这也是这个系列反复出现的一种长法：很多器官不是哪一篇凭空造出来的，是早期一行不起眼的日志、一个刻意留着不修的 crash，顺着生产的方向慢慢长成的。

### 3.2 成本工程：三层预算，和最后一口气

生产上的预算不是一个数，是三层闸，各拦一种失控：

- **token 预算（单轮）**：`max_tokens`，拦"单次回复失控"——这是最早从 v0.1 就有的那把；
- **步数预算（总轮）**：`max_steps`，blog06 装上的那把硬闸，拦"循环不出来"——步数债的生产意义在这里兑现；
- **美元预算（每任务）**：`BUDGET_USD`，拦"每一步都合法，加起来破产"。前两层都不越界、每一轮都规矩，三十轮全量重放摞起来照样烧掉两位数——blog02 那条复利曲线，只有钱这一层能看见。

还有一层容易被忘：**时间预算**。我那个 15 分钟超时，拦的不是钱，是"一个卡死的任务占着队列，后面的活全堵着"。四层闸各管一个维度，谁也替不了谁。还有一笔容易漏的账：blog08 的子 agent 在自己的循环里烧钱——美元预算如果只盯主循环，分身的账单就在闸外裸奔；子 agent 收工时把 in/out 回传进主 trace 一并累计，熔断才管得住整支车队。

熔断线怎么设？blog01 埋过一句话，这里正式兑现：**临界前主动早停，留最后一口气写 checkpoint**。我的熔断线设在预算的 90%——$7.2 就停。剩下那 10% 不是浪费，是留给体面退场的：把 messages 数组序列化到磁盘、把 trace 汇总表打出来、告诉调用方"我花到哪了、停在哪了、怎么接着跑"。烧到 100% 才断电的熔断，保住了钱、丢了活；90% 早停加 checkpoint，钱和活都留下。

顺带交代 $8 这个数怎么来的——不是拍脑袋。上线前我拿两周的 trace 把任务成本摊开看分布：大多数任务 $0.5 上下，最贵的一次 $3.1。熔断线设在最贵那次的两倍还多，意味着触发即异常，不会误伤正常任务；要是图省钱设 $4，迟早有一天一个合法的大任务被拦腰砍断，你就会开始怀疑熔断本身——闸门被狼来了几次，就没人信闸门了。

最后一条，前端同学最容易轻敌：**限流和鉴权**。你的 agent 端点是全网单价最高的一类 HTTP 端点——普通接口被脚本刷，损失的是带宽；agent 接口被刷，等于别人拿你的 API key 挖矿。我见过最冤的一张账单不是 agent 失控，是一个没鉴权的 demo 端点被扫段的脚本摸到，替陌生人认认真真跑了一整晚任务。鉴权、按用户限流、单日总额熔断，上生产前一样都不能少。

### 3.3 部署与观测：最吓人的事故没有报错

部署形态两条路。长驻进程：响应快，但 messages 数组和内存状态的生命周期要自己管；按次拉起（cron / serverless）：每次干净出生、跑完即死，状态全靠磁盘上的 checkpoint 和记忆文件。我自己的发布 agent 走按次拉起——因为 blog06 讲过的那条纪律在这种形态下最容易守住：**要么走完，要么干净回滚**，任何一步失败先把已改的东西全部还原再退出，不留残局。长驻进程要做到"不留残局"，难度翻倍。按次拉起还有个隐藏福利：每个任务出生时 context 是干净的，上一个任务的残留不会把下一个带偏——blog08 讲 subagent 隔离时的那个道理，在部署形态上再现了一次。

但生产观测里最要命的，不是报错。报错好办：重试、回滚、告警，blog06 全套都讲过。最要命的是**分布漂移**：没有异常、没有红字，agent 只是慢慢变笨。模型供应商悄悄升了个小版本，你的 prompt 在新版本上语义漂了一截；依赖的某个工具悄悄变慢，agent 开始在超时边缘反复重试；用户的问题分布悄悄变了，你的用例覆盖不到新长尾。每一件单看都不算事故，叠三周，任务通过率从 92% 滑到 71%，而监控大盘上一片绿。

解法是 blog09 那套评测集在生产换了个角色：**不是上线前的准入考试，是上线后的定期体检**。每周跑一遍固定的评测集，盯的不是"过没过"，是通过率的变化趋势——体检报告单次看没意义，跟上个月的对比才是信号。

## 4. 干：tiny-agent v1.0

### 4.1 v1.0 长出什么

`git checkout v1.0` 就能看到收官版：[github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent)。相对 v0.9 的 diff：

- 新文件 `src/trace.js`：`Trace` 类，把每次 LLM 调用 / 工具调用包一层 span，JSONL 落盘，成本按 input / output / cache 三列分开折算
- `src/agent.js` 加 `BUDGET_USD` 熔断：花到 90% 主动早停，messages 序列化成 checkpoint，`--resume` 接着跑——blog02 讲 Claude Code `--resume` 时埋的那条线，在这里收口
- README 加"上生产 checklist"10 条：预算、超时、限流、鉴权、trace 落盘、checkpoint、回滚纪律、评测体检、告警阈值、密钥管理

### 4.2 核心代码

```javascript
// src/trace.js
import { appendFileSync, mkdirSync } from "node:fs";

const PRICE_PER_M = { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 };

export class Trace {
  constructor(taskId) {
    mkdirSync("traces", { recursive: true });
    this.file = `traces/${taskId}.jsonl`;
    this.cost = { input: 0, output: 0, cache: 0 };
    this.steps = 0;
  }

  async span(type, meta, fn) {
    const t0 = Date.now();
    const result = await fn();
    const span = { ts: t0, type, duration: Date.now() - t0, ...meta };
    if (type === "llm") {
      const u = result.usage;
      span.in = u.input_tokens; span.out = u.output_tokens;
      span.cacheRead = u.cache_read_input_tokens ?? 0;
      span.cacheWrite = u.cache_creation_input_tokens ?? 0;
      this.cost.input += span.in * PRICE_PER_M.input / 1e6;
      this.cost.output += span.out * PRICE_PER_M.output / 1e6;
      this.cost.cache += span.cacheRead * PRICE_PER_M.cacheRead / 1e6
                       + span.cacheWrite * PRICE_PER_M.cacheWrite / 1e6;
    }
    this.steps += 1;
    appendFileSync(this.file, JSON.stringify(span) + "\n");
    return result;
  }

  get totalUSD() { return this.cost.input + this.cost.output + this.cost.cache; }

  summary() {
    const f = n => `$${n.toFixed(2)}`;
    console.error(`[trace · steps=${this.steps} · input=${f(this.cost.input)}` +
      ` output=${f(this.cost.output)} cache=${f(this.cost.cache)}` +
      ` · total=${f(this.totalUSD)}]`);
  }
}
```

agent.js 主循环里，熔断只有一小段：

```javascript
const BUDGET_USD = 8;

// 每轮 messages.create 之后、下一轮开始之前：
if (trace.totalUSD >= BUDGET_USD * 0.9) {
  const file = ctx.checkpoint();   // messages 数组序列化到磁盘
  trace.summary();
  throw new BudgetExceeded(
    `spent $${trace.totalUSD.toFixed(2)}, checkpoint at ${file}, rerun with --resume`
  );
}
```

三点讲透：

**一，成本三列分开算，是这版最重要的设计。** PRICE 表四个价：input $5 / output $25（Opus 牌价，blog02 的口径），cache 命中按 0.1 倍、写入按 1.25 倍折算——所以 cacheRead 是 0.5、cacheWrite 是 6.25。三列分开，汇总表一出来谁在烧钱一目了然。这个设计不是我想出来的，是被一张账单打出来的，翻车段见 4.3。两笔容易漏的账顺带钉死：blog02 压缩历史那次 mini-call 也是真实计费的 create，同样要包进 span——不然长任务里熔断线最需要准的时候恰恰虚低；span 包在 withRetry 外面，只记成功那次的 usage——重试失败的请求没有 usage 可记。

**二，熔断检查放在 create 之后、下一轮之前，位置有讲究。** usage 在 response 里——钱花掉了你才知道花了多少，所以你永远拦不住"这一轮超了"，只能拦住"下一轮别开始"。这也是熔断线设在 90% 而不是 100% 的原因：真正的上限之前，必须留出至少一轮的余量，不然"早停"就变成了"追认"。

**三，checkpoint 没有魔法。** 就是把 messages 数组 JSON 序列化落盘，`--resume` 时读回来接着 while——blog02 讲过，Claude Code 的 `--resume` 同样朴素。要紧的是语义：`BudgetExceeded` 不是失败，是暂停。人看一眼 trace，没跑歪就加预算继续；跑歪了，checkpoint 也保住了前面所有轮的活，改完再续。

### 4.3 跑一下

```
$ node src/agent.js "把 traces/ 里最近三份 JSONL 读一遍，步数和成本汇总写进 report.md"
[turn · in=5120 out=204 cache_read=0]
[tool · list_dir · 0.1s · ok]
[turn · in=5610 out=185 cache_read=4600]
[tool · read_file · 0.1s · ok]
...
[trace · steps=23 · input=$0.71 output=$0.13 cache=$0.05 · total=$0.89]
done. report.md 已生成
```

任务结束一张汇总表，三列成本加总价。$0.89，离 $8 的熔断线远得很——大多数日子它就是这么无聊，这正是你想要的。

顺手养成一个习惯：每天扫一眼 traces/ 目录的总成本和步数分布。它无聊的时候是你的成本模型，不无聊的时候是你的第一报警器——凡是步数突然翻倍、cache 列突然归零的任务，点开 JSONL 看两眼，十有八九能提前逮住一个正在成型的坏习惯：prompt 被谁改了、cache 前缀被弄脏了、某个工具开始变慢了。

**翻车段（必备）**：trace.js 第一版的成本公式，我只算了 output token。直觉非常顺："生成才花钱，读入能花几个钱"——何况 output 单价还是 input 的 5 倍，更坐实了这个直觉。跑了一周，我按汇总表心算这周大约 11 美元；对账单来了，74。

多出来的 63 美元全是 input，占总成本的 85%。原因 blog02 早就写过，只是我一直没把那条曲线和账单连起来：**全量重放是复利**。output 每轮只产一次，几百 token 到头；input 是把之前所有轮的历史每一轮重付一遍——一个 20 轮的任务，到第 20 轮，单轮要重放的历史比全任务的 output 加起来还多。这周 output 总共 44 万 token，input 是 1260 万：单价 5 倍的劣势，被体量将近 30 倍的优势碾平。

修法就是现在这版：input / output 两边都算，cache_read 的折扣也如实入账，汇总表三列分开。从那以后我看一眼表就知道该修哪：input 列肥，去查压缩阈值和 cache 命中率；output 列肥，去查是不是让它写了不该写的长回复。**成本观测的意义不是知道花了多少，是知道花在了哪。**

### 4.4 一处映射：那晚的 $4200，用三把闸重放一遍

[blog195《Loop Engineering 三笔债》](/posts/blog195_loop-engineering-three-debts-playbook/)里 LeanOps 那晚 $4200 的事故，这个系列从 blog01 就开始引用，今天用 v1.0 的三把闸正式复盘收尾：

- **预算熔断**：单任务 $8 的熔断线会在事故的前几十轮就把它按停——$4200 和 $8 之间隔的不是模型能力，是有没有那条线；
- **tracing**：span 序列会指出它是从哪一轮开始陷进"重试—失败—换个姿势再重试"的循环——事后复盘不用猜，证据按时间戳躺在 JSONL 里；
- **checkpoint**：熔断触发那一刻，前面二十多轮的有效工作被序列化保住，第二天修完 bug `--resume`，活不用重头干。

三把闸没有一把是高科技，合起来的效果是：这种事故从此进不了生产。Claude Code 状态栏里那个实时跳动的 cost 数字，就是同一套东西的产品化形态——你每天瞟到的那个小数字，背后是一个 Trace 类。区别只在于：它把表画进了状态栏，你把表打在了 stderr。

### 4.5 Moonshot 注脚

> 国内模型跑 v1.0，trace.js 只改两处：PRICE 表换成对应模型的牌价；usage 字段名从 Anthropic 的 `input_tokens` / `output_tokens` 换成 OpenAI 风格的 `prompt_tokens` / `completion_tokens`。cache 那列注意：Moonshot / DeepSeek 的 context caching 是服务端自动命中的（blog02 注脚讲过），命中量在 usage 里有对应字段（如 `cached_tokens`），折扣同样要如实入账——不然你会高估成本、低估 cache 的价值。熔断、checkpoint、体检一行都不用改：这三样跟模型没关系，跟生产有关系。

## 5. 界：类比的边界

bundle 类比这一篇撑住了大半：performance budget、上线 checklist、先建观测再谈优化，前端的生产纪律几乎原样平移。但有三条撑不住的，得说满。

**第一条：Sentry 抓的是异常事件，agent 观测要命的是分布漂移。** 前端监控的世界观是"出事必有信号"：JS error、白屏、接口 5xx，总有一条红线可以告警。agent 生产事故的常态是安静的——没有异常、没有堆栈，只有通过率在三周里从 92% 滑到 71%。告警系统得从"抓事件"升级成"抓趋势"，而趋势只有定期跑评测集才量得出来。

**第二条：bundle 是编译期资产，token 是运行时流量。** maxAssetSize 是一个数，build 时验一次，过了就永远过了；token 消耗随任务难度和用户输入的长尾波动，同一个 agent 今天 $0.4、明天 $6 都属正常。所以预算不能是一个数，得是**一个分布加一条熔断线**——p50 拿来算成本模型，p99 拿来设熔断，两个都要，谁也替不了谁。

**第三条：前端上线后代码不会变，agent 上线后"代码"会变。** 你部署的 bundle，hash 定了就是定了，三年后跑起来还是那个行为。agent 不是——模型供应商一次静默升级，等于有人半夜替你换了运行时：语法全兼容，语义在漂移。你什么都没改，行为变了。这就是为什么 blog09 的 eval 不是上线前的一次性验收，是上线后的日常体检——你以为你在维护一个静态产物，其实你在维护**一段和活的模型之间的关系**。

一句话收尾：**前端的生产是"上线那一刻定型"，agent 的生产是"上线那一刻才开始变"。**

方向盘那条线，十篇下来该收了。blog01 把方向盘交给概率函数，blog02 攥住 context 这半把，blog03 数清方向盘上 tool 那根辐条……到今天，方向盘交出去快两年，我学会的不是把它抢回来——是修路、装灯、划线：tracing 是路灯，预算是护栏，checkpoint 是应急车道。车还是它开，但这条路，已经是为概率司机设计过的路了。

## 6. 钩：收官

十篇走完，把骨架最后收拢一遍：

```
loop(01)     ← 渲染循环          容错(06)     ← Error Boundary
context(02)  ← state             权限(07)     ← 路由守卫
tools(03)    ← action/reducer    subagent(08) ← Web Worker
prompt(04)   ← CSS               eval(09)     ← 测试
memory(05)   ← localStorage      生产(10)     ← 上线
```

从第一篇（[blog206《Agent 就是个 while 循环？》](/posts/blog206_fe2agent-01-agent-loop/)）那个 32 行的 while 循环，到今天这个能被追踪、能被熔断、能从 checkpoint 里爬起来的 v1.0——**手艺没变，换了个甲方**。状态管理、组件隔离、错误边界、测试、监控，你在前端攒下的每一块肌肉都还在用，只是防御对象从"用户的瞎点"换成了"模型的瞎说"。十篇里没有一篇教你新框架——因为你缺的从来不是框架，是把旧手艺对准新对象的那一下校准。spine 最后复读一遍：**Agent 工程 = 在一个不确定的函数之上，建立工程确定性。**

tiny-agent 打上 v1.0 的 tag 了：[github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent)。从 32 行长到十来个文件，每个器官对应系列里的一篇，`git log --oneline` 就是这个系列的目录。

主线到此为止，番外有两篇在路上：一篇讲 MCP——Agent 界的 npm，工具从"你手写"变成"装包"，装包的所有老问题（版本、信任、供应链）也会跟着回来；另一篇讲 Agent 的 UI——因为 agent 总得有张脸：聊天窗、流式输出、工具调用的加载态、blog07 那道确认门总得有个按钮能点。兜兜转转，最后还是要写前端——你的主场优势，到那时候才真正亮出来。

最后一段给你。现在你可以徒手写出一个能干活、能自检、能上生产的 agent 了。去翻 Claude Agent SDK 或 LangChain 的源码——你会发现每一个曾经吓退你的设计，你都叫得出它防的是什么：这个 executor 是 blog01 的循环，那个 memory 是 blog05 的检索，这个 callback 埋的是 blog10 的 span。术语墙还立在那，但你已经站在墙的这一边了。这是本系列开篇许下的承诺，现在可以验收。
