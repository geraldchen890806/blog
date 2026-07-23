---
author: 陈广亮
pubDatetime: 2026-07-27T09:00:00+08:00
title: "Context 是内存，记忆是硬盘：给 Agent 上 lazy loading"
slug: blog210_fe2agent-05-memory
featured: true
draft: true
reviewed: false
approved: false
tags:
  - AI Agent
  - 前端
  - 开发效率
  - Claude Code
description: 你以为 agent 记住了你的规则，其实那句话活在昨天 session 的 messages 数组里，今天它醒来就是全新的。Context 是内存，记忆是硬盘："写下来"才是唯一的持久化，检索-回填就是 agent 界的 lazy loading。这是 fe2agent 系列第 5 篇，配 tiny-agent v0.5（markdown 记忆文件 + 朴素关键词检索 + save_memory/search_memory 两个新工具）。
---

## 1. 坑

上上周二晚上，我跟自己的博客自动化 agent 交代了一条规矩："记住，博客每周最多发 4 篇，质量优先，别刷量。"它答得非常漂亮，复述了一遍规则，还顺手给了我一份执行方案。

第二天早上九点，它排了一份一周 6 篇的发布计划给我。

我第一反应是它抽风了。第二反应才是对的：它没抽风，它是**全新的**。昨晚那句"记住"活在昨天那个 session 的 messages 数组里——今早 cron 拉起来的是一个新进程、一个空数组，那句话对它来说从来没有发生过。blog02 里我写过"两个 session 的 messages 数组各自过各自的一生"，这回轮到我自己被这句话上课。

修法土得掉渣：我把这条规则写进一个 MEMORY.md，让 agent 每个 session 启动先读它。就一行字的事，从那天起它再没排超过 4 篇。这个土办法，就是"长期记忆"最朴素的形态——不是向量库，不是 embedding，是一个 markdown 文件。

这是《从 useEffect 到 Agent Loop》系列第 5 篇。blog04 结尾留了个问题：prompt 和 context 挤在同一扇窗户里，塞不下的东西怎么办？更早，blog02 §3.3 埋过一个元招："别塞进 context，需要的时候再检索。"这一篇同时兑现这两个钩：**塞不下的，落盘；要用的，再捞。**

## 2. 桥

一句话：

> **Context 是内存，记忆是硬盘。塞不下的别硬塞——落盘，建个索引，用的时候 lazy load 回来。**

```
React:                          Agent:

  state（内存）                    context (messages[])
    │ 贵、小、刷新即失               │ 贵、小、session 结束即失
    ▼                              ▼
  localStorage / IndexedDB       memory/notes.md
    │ 便宜、大、要序列化             │ 便宜、大、要检索
    ▼                              ▼
  import() 按需加载              recall() 按需回填
```

左边这套你闭着眼睛都会：内存里放热数据，磁盘上放冷数据，路由命中了再动态加载。右边是同一套心法，只是"加载"那一步从模块解析变成了文本检索。骨架同构，精度不同构——这个"不同构"留到 §5 说满。

## 3. 真

### 3.1 短期 vs 长期：RAM 和磁盘

先把两个词钉死。

**Context 是 RAM。** 贵——blog02 算过账，Claude Opus $5/1M input，而全量重放让你每一轮把之前的账单重付一遍；小——窗口再大也是有限的，而且塞太长还有 lost in the middle 伺候；易失——进程一退，messages 数组没了，session 结束即断电。

**记忆是磁盘。** 便宜——磁盘上一个 markdown 文件不按 token 计费；大——想写多少写多少；但要 IO——读和写都是显式操作，而且"读进来"那一步（回填进 context）才开始花钱。

前端对照一下：state 活在内存里，刷新页面归零；所以你把需要跨会话活着的东西放进 localStorage 或 IndexedDB——写的时候序列化，读的时候反序列化，没有任何东西是"自动"存下来的。agent 世界是同一条铁律，blog02 界第一条说过：**context 没有默认持久化**。模型不会替你记，SDK 不会替你存。"写下来"不是备忘习惯，是唯一的持久化。我那句"每周最多 4 篇"之所以人间蒸发，不是模型忘性大，是我根本没写过盘，却以为自己存过。

再往下捅一层：很多人对"agent 记忆"的想象，是模型内部有哪个神经元被这次对话改写了——没有。推理时模型权重是只读的，你每一次调用面对的都是同一个出厂状态的模型。所谓记忆，从头到尾都是工程：你存、你检索、你塞回 context。这跟"服务端不记得你，是 cookie 在维持会话"是同一件事。把这层想明白，市面上所有 memory 方案在你眼里都会退魅成三个问题：存在哪、怎么索引、什么时候塞回去。

反过来这也解释了为什么"全塞 context"是一条死路。有人不服："窗口够大，我把所有历史都带着不就有记忆了？"blog02 的账单曲线已经回答过：全量重放之下，context 每长一分，每一轮都要为它重新付费——[blog195《Loop Engineering 三笔债》](/posts/blog195_loop-engineering-three-debts-playbook/) 里的"token 债"就是这么滚起来的。RAM 当硬盘用，不是不行，是每小时结一次账的不行。

### 3.2 检索-回填：RAG 就是按需 import()

长期记忆的最小闭环，四步：**存 → 索引 → 检索 → 回填**。

- **存**：把值得记的写进文件（`remember`）
- **索引**：让"找"这件事不用全文扫——哪怕索引朴素到只是"日期 + 段落"
- **检索**：按 query 捞相关段落（`recall`）
- **回填**：把捞到的塞进这一轮 context，模型这才"看见"

第四步最容易被忽略，但它才是点睛：检索回来的东西不进 context，等于没检索——blog02 讲过，模型每一轮只看得见 messages 数组里有什么。一个记忆系统折腾到最后，全部产出就是 context 里多出来的那几段文本。

前端类比一步到位：**RAG 就是按需 import()**。首屏 bundle 塞不下所有路由，你做 code splitting，路由命中了再 `import()` 那个 chunk；context 塞不下所有知识，你落盘，query 命中了再把那几段 load 回来。名字唬人（Retrieval-Augmented Generation），动作朴素：先查资料，再回答。

那 embedding 呢？一句话原理：把一段文本变成一个高维向量，让"意思相近"的文本在向量空间里离得近——这样"下周排几篇"能命中"每周最多发 4 篇"，哪怕两句话一个共同词都没有。这是检索的语义升级。但我要先泼一盆冷水：**小语料上，朴素关键词检索完全够用**。一个 agent 的记忆通常几十到几百条，关键词打分的召回不丢人，还白送三样东西：零依赖、可 grep、召回错了你一眼能看懂为什么。向量库是语料上万条之后的事，别一上来就给自行车装涡轮。

### 3.3 什么常驻、什么检索、什么别存

不是所有东西都该走检索，也不是所有东西都值得存。三分决策：

| 特征 | 去处 | 例子 |
|---|---|---|
| 高频用、体积小 | 常驻 system | "每周最多 4 篇"、代码风格约定 |
| 低频用、体积大 | 落盘 + 检索 | 历史事故复盘、某次调研的结论 |
| 一次性 | 用完即弃 | 中间草稿、这一轮的工具输出 |

判断口诀：每一轮都可能用到的，常驻 system——它体积小，常驻成本是每轮几十上百 token，买个"永远在场"很划算；偶尔用但用时很关键的，落盘走检索——常驻太贵，丢了可惜；过了这一轮就没用的，别存——**存进去的每一条都在稀释检索质量**，垃圾记多了，捞回来的全是垃圾。

存什么，还有一条写入纪律：**记结论，不记过程；记"为什么"，不只记"是什么"**。"试了 A 方案失败、换 B 方案成功"是过程；"用 B 方案，因为 A 在 monorepo 下会打爆缓存"是结论加原因。前者三周后读起来是噪音，后者三周后还能救命。这跟写 git commit message 是同一块肌肉：未来那个读者——可能是模型，也可能是你自己——手上只有这几行字，没有当时的上下文。

## 4. 干：tiny-agent v0.5

### 4.1 v0.5 长出什么

`git checkout v0.5` 就能看到这一版：[github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent)。相比 v0.4，长出来三件事：

- 新文件 `src/memory.js`：`remember` / `recall` / `recentNotes` 三个导出函数，一个 markdown 文件当存储
- `src/tools.js` 注册两个新工具 `save_memory` / `search_memory`——blog03 说过"工具会越来越多"，这是兑现的第一波
- `Context.toRequest` 把最近 5 条记忆拼进 system 的第二个 block：稳定的 BASE_SYSTEM 在前、打 cache，变动的记忆在后、不打（agent.js 照常调 toRequest，一行不用改）

### 4.2 memory.js 全文 35 行

```javascript
import { readFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";

const NOTES_PATH = "memory/notes.md";
const RECENT_N = 5;
const TOP_K = 3;

export function remember(text) {
  mkdirSync("memory", { recursive: true });
  const entry = `\n## ${new Date().toISOString().slice(0, 10)}\n${text.trim()}\n`;
  appendFileSync(NOTES_PATH, entry, "utf-8");
  return `remembered (${text.trim().length} chars)`;
}

function loadEntries() {
  if (!existsSync(NOTES_PATH)) return [];
  return readFileSync(NOTES_PATH, "utf-8").split(/\n(?=## )/).map(s => s.trim()).filter(Boolean);
}

export function recall(query) {
  const terms = query.toLowerCase().split(/[\s,，。、/]+/).filter(t => t.length > 1);
  if (!terms.length) return [];
  return loadEntries()
    .map(entry => ({
      entry,
      score: terms.reduce((n, t) => n + (entry.toLowerCase().includes(t) ? 1 : 0), 0),
    }))
    .filter(e => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K)
    .map(e => e.entry);
}

export function recentNotes(n = RECENT_N) {
  return loadEntries().slice(-n).join("\n\n");
}
```

工具注册进 `tools.js`（节选，`runTool` 里各加一个分支转发给 `remember` / `recall` 即可）：

```javascript
{
  name: "save_memory",
  description: "Persist a durable fact or rule for future sessions. Save conclusions and constraints, not process. One fact per call.",
  input_schema: { type: "object", properties: { text: { type: "string", description: "the fact to remember" } }, required: ["text"] },
},
{
  name: "search_memory",
  description: "Search long-term memory with space-separated keywords. Use when the task may depend on rules or facts from earlier sessions. Returns top 3 matching notes.",
  input_schema: { type: "object", properties: { query: { type: "string", description: "keywords, separated by spaces" } }, required: ["query"] },
},
```

`Context.toRequest` 吐出的 system 变成两个 block：

```javascript
system: [
  { type: "text", text: BASE_SYSTEM, cache_control: { type: "ephemeral" } },
  { type: "text", text: `## Recent memory\n${recentNotes()}` },
],
```

四点讲透：

**一，段落是记忆的最小单元。** 每条记忆以 `## 日期` 开头追加到文件尾，`loadEntries` 按 `## ` 切段，`recall` 按段召回。选 markdown 而不是 JSON 也是故意的：人能直接打开 review，agent 能 grep，git 能 diff——记忆文件和代码走同一套版本管理，出了问题 `git log memory/` 能查到"这条是哪天记的"。

**二，recall 朴素到寒酸，但寒酸得有底气。** 打分逻辑就一句：query 切出来的每个词，段落里 `includes` 命中一个记 1 分，按分排序取 top 3。连中文分词都没写——你注意 `search_memory` 的 description 里那句 "space-separated keywords"：我把切词这个活外包给了模型，让它调用时自己把 query 拆成关键词。description 是 prompt（blog03 的原话），在这里又多了一层用法：**工具的使用说明书，能替你省掉真实的代码**。

**三，常驻和按需的分界线，就在那两个 system block 之间。** 落点在 `Context.toRequest`：system 从单 block 变成双 block，BASE_SYSTEM 走构造入参、记忆块每一轮现拼——这样 session 中途新存的记忆，下一轮就能进场。最近 5 条走 `recentNotes` 常驻（新鲜的记忆大概率跟手头的事相关），更老的走 `search_memory` 按需捞——§3.3 的三分决策落成了两行代码。顺序也有讲究：blog02 讲过 cache 是前缀匹配的，稳定的 BASE_SYSTEM 放前面打 `cache_control`，天天变的记忆块放后面不打——变动的部分不会砸掉前面那块的缓存。

**四，`save_memory` 的 description 里写了纪律。** "Save conclusions and constraints, not process. One fact per call."——§3.3 那条写入纪律，不是写给读者看完就算的，是直接写进工具语义里让模型每次调用前都读一遍的。你不写，它会把"我先读了文件然后分析了内容"这种流水账也存进来，两周就把记忆文件灌成垃圾场。

### 4.3 跑一下

第一天，存规则：

```
$ node src/agent.js "记住:博客每周最多发 4 篇,这是硬规则"
[turn · tool_use=save_memory]
已存入长期记忆:博客每周最多发 4 篇(硬规则)。
```

第二天，新进程、新 session——这条还在"最近 5 条"里，`recentNotes` 直接把它带进了 system：

```
$ node src/agent.js "帮我排下周的发布计划,手上有 6 篇存稿"
排 4 篇:周一/周三/周五/周日,剩下 2 篇顺延到下下周——
你有一条硬规则:每周最多发 4 篇。
```

一个月后，这条被新记忆挤出了"最近 5 条"，就轮到检索出场：

```
$ node src/agent.js "下周能发几篇?"
[turn · tool_use=search_memory input={"query":"每周 发布 篇数 规则"}]
[turn · ...]
最多 4 篇——检索到一条 2026-07-14 的记忆:博客每周最多发 4 篇(硬规则)。
```

它自己决定先查记忆再回答——因为 `search_memory` 的 description 里写了"当任务可能依赖之前 session 的规则时使用"。注意这里的账：常驻的最近 5 条大约两三百 token，检索回填的三段又两三百 token，都是按需付的小钱；而 notes.md 本体不管长到多大，一个 token 都不占——**这就是 lazy loading 的全部回报：窗口里只放这一轮用得上的**。

顺手对比一下三个 session 的形态：第一天它靠工具写盘，第二天它靠常驻块免检索直读，一个月后它靠检索捞旧账——同一条规则，三种到场方式，对应 §3.3 表格里的前两行。哪条路都通向同一个终点：那句话进了这一轮的 context。

**翻车段（必备）**：v0.5 第一版我没写 `recentNotes`，偷了个懒，把**整个 notes.md 全量拼进了 BASE_SYSTEM**，还顺手打了 `cache_control`。两周后两笔账一起爆。第一笔是钱：我每天让它记两三条，notes.md 复利式长到 6k token；而这个文件天天变，cache 前缀天天变，`cache_read` 恒等于 0——6k token 每一轮裸付原价，等于把 blog02 那个"时间戳砸缓存"的翻车又演了一遍，只是这次砸得更大。第二笔是智商：某天我让它把一篇稿子扩到 4500 字，它引用一条三周前的记忆一本正经地反驳我——"你之前定过标准，系列每篇控制在 3000 字左右"。那条记忆确实是我存的，也确实过时了（标准早改成 4000+），但它就躺在 system 里，每一轮都在跟新指令打架。这个现象我称为**记忆漂移**：记下来的是"当时为真"，你不清理，它就永远以"现在为真"的姿态出现在 context 里。修法就是现在这版：只自动带最近 5 条，其余走 `search_memory` 按需捞，过时的条目要么删要么改。

### 4.4 一处映射：CLAUDE.md 的分层

系列内引一下：[blog194 项目护照](/posts/blog194_project-passport-agents-md-claude-md-memory/) 里讲过 Claude Code 的 CLAUDE.md 体系——项目级 `./CLAUDE.md`、用户级 `~/.claude/CLAUDE.md`，每个 session 启动自动拼进 system prompt。用本篇的话翻译：那就是"高频小体积 → 常驻 system"这条决策的产品化，跟 v0.5 的 `recentNotes` 同一个位置、同一个动机。而 Claude Code 的 auto-memory（MEMORY.md + 索引文件）就是 `notes.md` 的工业版：也是 markdown、也分"常驻的索引"和"按需读的正文"两层。

再补一条实战纪律：**记忆是点时观测，不是活状态**。我的 MEMORY.md 里记过"某项目还有 58 篇旧短文待删"——两个月后这个数字还是 58 吗？不知道，得 grep 一遍才算数。所以我给自己的 agent 立的规矩是：记忆里的"事实"用之前要复核，动手前拿 `ls` / `grep` 对一遍现场。记忆告诉你去哪看，现场告诉你是什么——别把备忘录当仪表盘。

### 4.5 Moonshot 注脚

> 好消息：memory 这一层 100% 活在客户端，跟模型供应商无关——换 Moonshot / DeepSeek，`memory.js` 一行都不用改。要动的只有两处老朋友：tools 定义外面包一层 `{ type: "function", function: {...} }`（blog03 注脚讲过）；OpenAI 风格的 system 是单条字符串消息，把 `recentNotes()` 拼在 system 字符串**尾部**即可——前缀稳定、尾部变动，服务端自动前缀缓存照样命中（blog02 注脚讲过）。另外 OpenAI 系有 file_search / retrieval 这类托管检索，等于把"索引 + 检索"外包给平台——方便，但你就看不见召回了什么、为什么召回，调试时两眼一抹黑。入门期我建议先玩明白自己这 35 行。

## 5. 界：类比的边界

localStorage、import()、缓存——这一篇的类比都很顺手，撑得住的部分我认：落盘才持久、按需才省钱、常驻要分层。但有三条撑不住的，得说满。

**第一条：localStorage 按 key 精确取，检索是模糊匹配。** `localStorage.getItem("rule")` 要么拿到那条、要么 null，边界清清楚楚。`recall("发布规则")` 不是查找，是**排序**——它返回的是"最像的前三名"，而"最像"不等于"相关"。关键词检索会把"发布会 PPT 的字体规则"和"每周发布篇数规则"打成一样的分；embedding 也只是把错得离谱变成错得体面。所以召回质量本身是一个要测的东西——precision、recall 这些信息检索的老词会回来找你，blog09 讲 eval 的时候会把它放进评测集里。

**第二条：import() 失败会 throw，检索"失败"不报错。** 动态 import 一个不存在的 chunk，你能拿到一个明晃晃的异常。检索捞回三条不相干的记忆，没有任何报错——它们安安静静躺进 context，模型把它们**当真**，基于它们推理。翻车段里那条"3000 字标准"就是这样干活的：它不是 bug，是一条被正常检索机制正常送达的过时事实。**捞错了比捞空了更糟**——捞空模型会说"我不知道"，捞错模型会自信地知道一个错的。这跟 blog03 那次"把 error 当内容读"是同族事故：模型对 context 里的东西没有怀疑机制，你塞什么它信什么。

**第三条：HTTP 缓存有失效协议，记忆没有 TTL。** 前端的缓存世界里有 Cache-Control、有 ETag、有 max-age——过期这件事是协议的一部分，浏览器替你执行。记忆文件没有这些：三周前写下的条目不会自己变灰、不会自己过期，除非你动手，它会以第一天的口气一直说下去。所以**遗忘是要设计的**：给每条记忆记上日期（v0.5 的 `## 日期` 不是装饰）、定期 review 一遍 notes.md、至少在用到旧记忆时复核一下现场（§4.4 那条纪律）。人脑的遗忘是免费功能，agent 的遗忘是你排期里的活。

一句话收尾：**前端的存储栈只要求你分层；agent 的记忆栈逼你多管一样东西——"信"这个动作本身。**

呼应系列 spine：控制权交给了概率函数（[blog01](/posts/blog206_fe2agent-01-agent-loop/)），context 是它每轮的输入（blog02），工具是它的手（blog03），prompt 是行车守则（blog04）——记忆贴在"输入"这块骨头上，是给输入加的那层沉淀：它决定不了模型这一轮想什么，但决定了三周前的教训这一轮还在不在场。方向盘交出去了，但**你还管着后备箱——它每趟只带得下一小包，带什么、什么时候递，是你的活**。

## 6. 钩：下集

下一篇《在 Agent 的世界，报错是排期内日常：从 Error Boundary 到 Verifier》。

类比引子：这一篇你已经见过失败的新形态了——检索会理直气壮地捞错，而且不报错。把镜头拉远：工具会挂（ENOENT、429）、模型会梦到不存在的函数、也会自信满满地说"完成了"但活只干了一半。在前端，报错是异常分支，try/catch 包住就好；在 agent 的世界，**失败不是异常分支，是主路径**——你要的不是"别出错"，是"错了系统还能往对的方向走"。

tiny-agent v0.6 会长出三块器官：**max_steps 硬闸**（兑现 blog01 埋了五篇的那个钩）、**重试 + 指数退避**（对付 429/5xx 这类机械故障）、**verifier**（对付"自信的半成品"这类语义故障——干活的模型和验收的模型分开）。`git checkout v0.6` 就能看到下一版：[github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent)。

在那之前给你留个作业：往 `memory/notes.md` 里手动塞 20 条记忆（真的假的都行），然后问 v0.5 十个问题，把每次 `search_memory` 捞回的三条记下来，数一数几条相关、几条不相关。这份表格就是你的第一份召回质量数据——blog09 讲 eval 的时候，你会发现你已经提前攒了手感。
