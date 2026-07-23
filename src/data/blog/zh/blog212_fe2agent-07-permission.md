---
author: 陈广亮
pubDatetime: 2026-08-02T09:00:00+08:00
title: "给 AI 弹一个 window.confirm：权限、Hooks 与 human-in-the-loop"
slug: blog212_fe2agent-07-permission
featured: true
draft: true
reviewed: false
approved: false
tags:
  - AI Agent
  - 前端
  - 开发效率
  - Claude Code
description: blog06 管"错了怎么救"，这一篇管"对了也不能让它直接干"——rm -rf 重试三次都成功才是灾难。权限分级不是开关是光谱，确认要具体到后果，拒绝也是要回给模型的信息。这是 fe2agent 系列第 7 篇，配 tiny-agent v0.7（危险分级表 + 确认门 + JSONL 审计日志）。
---

## 1. 坑

有天夜里，我的一个自动化 agent 在做一次再普通不过的配置更新——往一份账号配置文件里加一个字段。它读了文件、改了内容、写了回去，每一步日志都干干净净。问题出在"写了回去"那一步：它写回去的不是改完的全量内容，是它理解里"需要的那部分"。一份维护了几个月的配置，被一份只剩新字段的半成品整个冲掉。几分钟之内，靠这份配置活着的所有 bot 同时掉线。

事后复盘最难受的地方在于：它每一步都"合理"。读了、改了、写了，没有一步报错，连 verifier 都挑不出毛病——文件确实写成功了。错不在某一步，错在这类操作根本就不该让它一个人拍板。

从那以后我给手上所有 agent 立了一条规矩：改配置、删文件、部署上线，必须过两次人工确认——"如果只说了一次确认，必须再问一次"。听起来官僚，但这条规矩后来拦下的事故，不止一次。

如果你读过 blog03，应该记得开头那位读者：他给 agent 加了个 `write_file`，agent 顺手把他 README 里的贡献指南覆盖成了一段"更好的措辞"，他留言说"这不是我签的合同"。当时我讲的是 dispatch 交出去了；现在可以把另一半说完——他真正缺的，是一道确认门。

这是《从 useEffect 到 Agent Loop》系列第 7 篇。blog06 讲的是"错了怎么救"：重试、退避、verifier。这一篇讲另一类事：**"对了也不能让它直接干"**。`rm -rf` 挂了你还能重试；重试三次都成功了，才是真正的灾难。

## 2. 桥

一句话：

> **给危险操作前面装一个 window.confirm——dispatch 还是它的，放行权收回你手里。**

```
React:                        Agent:

  用户点"删除"                   模型发 tool_use: write_file
    │                              │
    ▼                              ▼
  window.confirm(                gate(
    "确定删除这条记录?")           "即将覆盖 config.json")
    │                              │
  确定 → 真删                     yes → runTool 真跑
  取消 → 什么都没发生             no  → tool_result:
                                       "user denied"（is_error）
```

左边你拦的是用户的手滑，右边你拦的是模型的自信。还有一条差别藏在最后一行：用户点了取消，事情就结束了；模型收到拒绝，它还会想下一步——所以**拒绝之后怎么回话，本身就是设计的一部分**。后面翻车段专讲这个。

## 3. 真

### 3.1 权限不是开关，是光谱

很多人第一反应是做一个全局开关：放飞模式全放行，安全模式全都问。两头都没法用——全放行等于没有门；全都问等于把你变成人肉点击器，连 `read_file` 都要敲 yes，敲到第十次你已经不看内容了。

正经做法是分级。你写过路由守卫就有这个手感——路由从来不是"能进/不能进"两态，是三态：

- **公开页，直接进 → allow**：只读操作，`read_file`、`list_dir`。看一眼不改变世界，放行，连问都不问。
- **登录后进 → confirm**：会产生副作用的操作，`write_file`、删除、改配置。能做，但要出示"身份"——这里的身份是人类的一次点头。
- **永远 403 → deny**：这个 agent 职责边界之外的事，网络出站、`rm -rf`、生产部署。不是"问了再做"，是问都不用问。

分级之前先有一个更朴素的动作：**把工具挨个过一遍，给每个打上危险等级标签**。清单思维，先打标签再谈流程。这张表写出来可能就十几行，但它逼你把"哪些操作危险"从模糊的感觉变成明确的清单——我自己写到 `write_file` 那一行才第一次认真想：我到底愿不愿意让它不问我就写盘？

还有一层要想清楚：**等级属于场景，不属于工具本身**。同一个 `write_file`，在只读的代码分析 agent 里应该是 deny，在写作 agent 里是 confirm，在专门生成临时报告的 agent 里甚至可以是 allow。这张表其实是你给这个 agent 写的岗位说明书——职责之内放行，职责边缘问人，职责之外免谈。

### 3.2 PreToolUse：动作前的中间件

门装在哪？位置非常精确：**"模型说要调"和"你真的执行"之间**。

回看 blog01 那 32 行，这个位置一直都在——`if (stop_reason === "tool_use")` 分支里、`runTool` 之前的那个空隙。Claude Code 给这个位置起了名字：`PreToolUse` hook；执行完还有对称的 `PostToolUse`（[blog194 项目护照](/posts/blog194_project-passport-agents-md-claude-md-memory/)里讲过 hook 那套）。如果你写过 Express，这就是中间件：请求（模型的 tool_use）进来，一层一层过，任何一层都可以放行、改写，或者直接 403。

blog03 §4.4 有段原话，当时是这么埋的：`validateInput` 管**参数对不对**（数据层），`PreToolUse` 管**这事该不该做**（策略层），"blog07 会展开做危险确认门，到时候你会看到这两层怎么叠起来"。现在兑现，四层叠法：

```
tool_use 进来
  → validateInput    数据层：参数对不对（blog03 写好了）
  → gate / PreToolUse  策略层：这事该不该做，顺手记一笔审计（本篇）
  → runTool           执行层：真跑（blog03 写好了）
  → PostToolUse       善后层：结果脱敏、后处理（v0.7 未做，先占位）
```

顺序不能反：参数都不合法的调用，没资格进入"该不该做"的讨论——先数据后策略，跟前端先校验表单再谈提交权限是同一个因果。

顺便把"中间件"这个词的分量用足：策略层能做的不止"问人"。它可以改写（把相对路径规范成绝对路径再放行）、降级（把"删除"换成"移进回收站"）、演习（先跑一遍 dry-run 把 diff 摆出来再问）。问人只是策略层里最保守的一招——本篇先把这一招做扎实，其余几招你在 gate() 里都插得进去，位置是同一个。

### 3.3 human-in-the-loop 的三条工程细节

装一道门容易，装一道有用的门要抠三个细节。

**一，确认要具体到后果。** "要执行 write_file 吗？"是句废话——你根本不知道 yes 下去世界会怎么变。有用的问法是："要覆盖 README.md 吗？现有 214 字节将丢失。"前者复述动作，后者陈述后果。写 confirm 文案的功夫全在这一步：把 input 参数翻译成"世界会怎么变"。前端有现成的参照——GitHub 删仓库为什么逼你把仓库名抄一遍？就是逼你面对后果，而不是面对按钮。

**二，每次放行和拒绝都记一行。** 审计日志。出事之后你要回答的第一个问题是"这个文件是谁允许它写的？什么时候？"——没有日志，答案就只剩你的记忆，而你的记忆在连敲二十个 yes 之后是不可信的。JSONL 一行一条：哪个工具、什么后果、放行还是拒绝、几点几分。这份日志还有一个更长线的用处：它是你调整分级表的数据来源——哪类确认你从来没拒绝过，说明那道门可以考虑降成 allow；哪个工具反复被拒，说明它的 description 或 prompt 里缺一条说明。审计日志不只用来查案，还用来给门做体检。

**三，白名单放行，不是黑名单拦截。** blog03 界第一条讲过：模型会编造不存在的工具名。agent 的行动空间是开放的，黑名单永远列不全——你拦了 `rm -rf`，它换 `find -delete`。所以分级表的语义必须是"不在表里的一律 deny"：默认不信任，认识谁放行谁。

最后说一层容易被忽略的：**确认门保护的不只是你，也是模型**——它其实"不想"闯祸，它只是不知道哪一步算闯祸。在它的世界里，覆盖一份生产配置和新建一份草稿是同一个 `write_file`。你把红线写成机器可执行的规则，是替它把"闯祸"这个概念具体化。

## 4. 干：tiny-agent v0.7

### 4.1 v0.7 长出什么

从 v0.6 到 v0.7 的 diff：

- 新文件 `src/gate.js`：工具危险分级表 + `gate()` 确认门 + JSONL 审计日志
- `agent.js` 的 tool_use 分支里，`runTool` 之前插一道 `await gate(...)`
- 拒绝不再沉默：返回 `{ error: "user denied: ..." }`，走 blog03 那条 `is_error` 通道回给模型

### 4.2 核心代码

```javascript
// src/gate.js
import { createInterface } from "node:readline/promises";
import { appendFileSync, existsSync, statSync } from "node:fs";

const LEVELS = {
  read_file: "allow",
  list_dir: "allow",
  search_memory: "allow",   // v0.5 的检索，只读，放行
  write_file: "confirm",
  save_memory: "confirm",   // v0.5 的记忆写入，落盘，过门
};
// 不在表里的工具（包括模型现编的），一律按 deny 处理

function audit(entry) {
  appendFileSync("gate-audit.jsonl",
    JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n");
}

function consequence(name, input) {
  if (name === "write_file") {
    return existsSync(input.path)
      ? `覆盖 ${input.path}（现有 ${statSync(input.path).size} 字节将丢失）`
      : `新建 ${input.path}（写入 ${input.content.length} 字节）`;
  }
  return `执行 ${name}(${JSON.stringify(input)})`;
}

export async function gate(name, input) {
  const level = LEVELS[name] ?? "deny";
  if (level === "allow") {
    audit({ tool: name, level, decision: "auto-allow" });
    return { ok: true };
  }
  if (level === "deny") {
    audit({ tool: name, level, decision: "auto-deny" });
    return { ok: false, reason: `tool '${name}' is not permitted by policy` };
  }
  const what = consequence(name, input);
  // 无人值守（评测跑批、CI）用显式环境变量放行——审计里记 auto-allow(env)，
  // 谁批的写得清清楚楚；这不是后门，是把"自动放行"变成一条可查的决策。
  if (process.env.TINY_AGENT_AUTO_APPROVE === "1") {
    audit({ tool: name, level, what, decision: "auto-allow(env)" });
    return { ok: true };
  }
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  const answer = (await rl.question(`⚠ 即将${what}，输入 yes 继续: `)).trim();
  rl.close();
  const ok = answer === "yes";
  audit({ tool: name, level, what, decision: ok ? "allowed" : "denied" });
  return ok ? { ok: true } : { ok: false, reason: `user denied: ${what}` };
}
```

`agent.js` 那边只改一处（tool_use 分支里、`runTool` 之前）：

```javascript
import { runTool, validateInput, toolByName } from "./tools.js";

const spec = toolByName[b.name];
const errors = spec ? validateInput(spec.input_schema, b.input) : [];
const verdict = errors.length
  ? { ok: false, reason: `input validation failed: ${errors.join("; ")}` }  // 数据层先拦
  : await gate(b.name, b.input);                                            // 数据过关，再进策略层
const result = verdict.ok ? runTool(b.name, b.input) : { error: verdict.reason };
// 之后照旧拼 tool_result，error 走 is_error: true
// 模型现编的工具 spec 为空、校验为空数组，直接交给 gate 的 ?? "deny" 处理
```

注意校验挪到了 gate 前面——§3.2 那句"先数据后策略"不是嘴上说说：参数都不合法的调用，`consequence()` 根本没资格拿它的 input 取值。runTool 里那层校验照跑，双保险不亏。

四点讲透：

**一，`?? "deny"` 是全文件最重的一行。** 分级表是白名单：五个工具有明确等级，其余——包括模型哪天现编的 `search_file`、`git_commit`——全部落进 `?? "deny"` 自动 403。你不需要预测它会编出什么，你只需要声明你认识什么。白名单还有另一半代价要认：工具箱每长一个工具，这张表就得跟着记一笔——v0.5 那两个记忆工具要是漏了登记，不会报错，它们只是从此静默 403。§3.3 第三条落到代码上，就是这一个空值合并运算符。

**二，`consequence()` 把参数翻译成后果。** 注意它对 `write_file` 做了一次 `existsSync`——同一个工具调用，目标文件存在与否，后果完全是两个量级：新建是加法，覆盖是替换。这个函数产出的是文案，但它是这个文件里唯一值得反复打磨的文案。

**三，拒绝走 error 通道，不走沉默。** `user denied: 覆盖 README.md...` 会作为 `is_error: true` 的 tool_result 回给模型——它知道调用没成，也知道为什么没成：不是工具坏了，是人不让。这个信息差有多重要，翻车段马上讲。

**四，readline 挂在 stderr 上。** 还有那个 `TINY_AGENT_AUTO_APPROVE` 逃生口——blog09 的评测要无人值守地跑几十遍任务，不能每次 write 都等人敲 yes；显式设环境变量放行、审计里记一笔 auto-allow(env)，比"评测时偷偷绕过门"诚实得多。 stdout 是 agent 的产出，stderr 是给人看的操作台（v0.2 那行 token 日志也住在那）。确认交互要是混进 stdout，下游管道就毁了。小细节，生产里救命。

### 4.3 跑一下

正常路径：

```
$ node src/agent.js "把 README.md 第一行改成 '# tiny-agent v0.7'"
[turn · tool_use=read_file]                        ← allow，无感放行
[turn · tool_use=write_file]
⚠ 即将覆盖 README.md（现有 214 字节将丢失），输入 yes 继续: yes
[turn · in=6120 out=95]
done. README.md 第一行已更新
```

`read_file` 无感通过，`write_file` 停下来等你。敲下 yes 的同时，`gate-audit.jsonl` 里多了一行带时间戳的记录。

再试拒绝一次：

```
⚠ 即将覆盖 README.md（现有 214 字节将丢失），输入 yes 继续: no
tool_result: is_error=true, "user denied: 覆盖 README.md（现有 214 字节将丢失）"
[turn · in=6350 out=130]
好的，我先不动文件。这是我准备写入的新第一行，你确认后我再操作：# tiny-agent v0.7
```

它没崩、没道歉三连——它换了策略：先给你看内容，再申请动手。

还有一种拦法，你多半会在头几天撞见——模型现编工具：

```
[turn · tool_use=delete_file input={"path":"tmp.txt"}]
tool_result: is_error=true, "tool 'delete_file' is not permitted by policy"
```

我根本没有 `delete_file` 这个工具，是它自己编的（blog03 界第一条预言过这一幕）。`?? "deny"` 不吵不闹地拦下、记一行日志，模型收到明确拒绝后转头告诉我"当前工具集不支持删除，需要你手动处理"——比它假装删成功了好一万倍。

**翻车段（必备）**：第一版 gate 我把"用户拒绝"实现成了静默跳过。确切说：Anthropic 的协议要求每个 tool_use 必须回一个对应的 tool_result（不回，下一轮直接 400），我就回了个空字符串，心想"没执行就是没结果嘛"。跑起来看傻了：模型收到空结果，判断是工具抽风，把同一个 `write_file` 换着花样重试——先换相对路径、再换绝对路径、再把 content 拆短、第四次干脆先 `list_dir` 探路再写。四遍，一遍比一遍执着。因为在它看到的世界里，这是一个"应该能成但一直返回空"的工具，多试几次是它的美德。

修法就是那句 `user denied`。明说之后，它第一轮就改口："那我可以先把 diff 展示给你看吗？"同一个模型，前后判若两人——差的不是智力，是信息。

blog03 讲过"错误信息不标 is_error，模型会把报错当结果继续推理"；这里是同族的另一半：**拒绝也是信息，吞掉拒绝和吞掉报错一样害它**。你不告诉它"人不让"，它只能假设"天不遂"——而对付"天不遂"，它的本能是再试一次。

### 4.4 一处映射：Claude Code 的 permission mode，和我的发布保护清单

你在 Claude Code 里每天敲的那个"Allow this command?"，就是这套东西的完全体：默认模式下写盘要确认、危险命令要确认；几种 permission mode 对应的其实就是几张不同预设的分级表；`PreToolUse` hook 则允许你把自己的策略脚本插进那个空隙（[blog194](/posts/blog194_project-passport-agents-md-claude-md-memory/) 里 hook 那段讲的位置）。你今天写的 gate.js，是它的缩微版。

再给一个我自己的例子。我的自动发布流程里有一张保护清单："绝不改已发布文章的 pubDatetime、绝不动已发布文章的正文"。最早这两条写在 prompt 里，效果是"大多数时候遵守"——而对发布流程来说，"大多数时候"等于没有。现在这两条是脚本里的硬检查：diff 里出现已发布文章，直接拒绝退出。**写进 prompt 的是愿望，写进代码的分级表才是闸门**——blog04 讲过，prompt 是概率生效的行车守则；闸机不讲概率。两个都要有：prompt 负责让它大多数时候不往闸机上撞，闸机负责在它撞过来的那一次真的拦住。

### 4.5 Moonshot 注脚

> 这一层是全系列最好移植的：gate.js 整个活在你的进程里，不经过任何模型 API——分级表、readline、审计日志，切模型时一行都不用改。
>
> 唯一的差异在"拒绝怎么回话"：Anthropic 有 `is_error` 字段；OpenAI 风格（Moonshot / DeepSeek）的 `role: "tool"` 消息没有对应字段，你把 "user denied: ..." 直接写进 content，模型靠语言理解出"被人拒了，不是工具坏了"。结构不同、语义等价——blog03 注脚里那条规律，这里原样适用。
>
> 说到底，权限层本来就不该依赖任何模型特性——门是你家的，跟来客讲什么语言无关。

## 5. 界：类比的边界

window.confirm 这个类比好用的部分我认：装在副作用之前、二值决策、不点头就不往下走——都对，拿去用。但有三条撑不住的，得说满。

**第一条：路由表编译期可枚举，agent 的行动空间是开放的。** 前端守卫你把 `/admin`、`/billing` 那几条路护住就完了——路由表就那么长，产品加一条你加一条。agent 没有这张表：工具组合、参数取值、模型现编的工具名，穷举不完。所以守卫思维要换底座：不是"把危险的几条路拦住"，是"默认全部不信任，再按清单放行"。黑名单是往漏勺上补洞，白名单是直接换一只没有洞的碗。这也是为什么 v0.7 那行 `?? "deny"` 值得单独拎出来讲——它不是防御性编程的洁癖，它是整个权限模型的底座。

**第二条：window.confirm 弹给"当事人"，agent 的确认弹给"监护人"。** 用户点确认是为自己负责——删错了疼的是他自己。你替 agent 点确认，是替它负责——你是那个看得懂后果的人。这带来一个前端没有的失效模式：**疲劳确认**。门装多了，你会连敲 yes 敲出肌肉记忆，第 21 次和前 20 次在你手上没有任何区别——而事故偏偏就是第 21 次。所以门要少而重：只装在真正危险的路口，其余放行。一道每次都被认真对待的门，胜过十道被盲敲的门。我那条"两次确认"的规矩，本质就是在对抗这个：第二次问，是为了打断第一次的惯性。

**第三条：前端权限是安全问题，agent 权限一半是产品问题。** 前端你防的是恶意——越权、注入、CSRF，对手是攻击者。agent 不是攻击者，它是过度热情的实习生：它冲掉那份配置文件不是想搞破坏，是真心觉得自己在把活干完。防恶意靠鉴权和加密，防好心办坏事靠把"坏事"定义清楚、写成它能撞上的硬边界。手段长得像，出发点完全不同——你设计这道门的时候，心里装的不该是黑客，是那个太想帮忙的它。

一句话收尾：**这道门真正的对手不是模型，是你的肌肉记忆——门要少而重，重到每一次 yes 都还过脑子。**

呼应系列 spine：控制权交给概率函数（[blog01](/posts/blog206_fe2agent-01-agent-loop/)）、context 是它每轮的输入（blog02）、执行留在你手里（blog03）——本篇是给"执行"这一环真正上锁：**在几个关键路口装闸机——车还是它开，但有些路口，它必须停下来等你挥手。**

## 6. 钩：下集

下一篇《Subagent 就是 Web Worker：说不清需求，别怪外包干得烂》。

类比引子：确认门管住了一个 agent 的手。但活一多，新的问题冒出来：context 会满（blog02 那条账单曲线）、职责会混——起草的、审查的、发布的挤在同一个 messages 数组里互相污染。前端遇到主线程干不完的活怎么办？开 Worker。agent 也一样：开分身。但 postMessage 传不过去的东西，brief 一样传不过去——外包的成败，从需求文档写下的那一刻就注定了。

tiny-agent v0.8 会长出 `spawnSubagent`：独立 messages、独立循环、只把最终结果交回主循环。`git checkout v0.8` 就能看到下一版：[github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent)。

在那之前给你留个作业：给 v0.7 的分级表加一档试试——比如"写 /tmp 下的文件免确认，其余照旧 confirm"，跑几天，再打开 gate-audit.jsonl 数一数：你一共敲了多少次 yes，其中几次是认真看完后果才敲的。那个比例会诚实地告诉你，你的门是装多了，还是装少了。
