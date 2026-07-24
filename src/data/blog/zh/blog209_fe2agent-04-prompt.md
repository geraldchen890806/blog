---
author: 陈广亮
pubDatetime: 2026-07-24T09:00:00+08:00
title: "Prompt 是新的 CSS：声明式、会级联、没有 devtools"
slug: blog209_fe2agent-04-prompt
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI Agent
  - 前端
  - 开发效率
  - Claude Code
description: 改一行 system prompt，agent 行为整个变一副样子——prompt 像 CSS：声明式、会级联、可以覆盖，但没有 devtools 告诉你当前生效的是哪一条。这是 fe2agent 系列第 4 篇，讲 prompt 的层、指令稀释与结构化写法，配 tiny-agent v0.4（同一套工具、两版 system prompt 跑行为对比）。
---

## 1. 坑

blog03 结尾我留了一句话：description 从 "Read a file" 改成 "Read a file. USE THIS BEFORE WRITING"，模型行为完全变一副样子。当时就有读者追问：一句话就能改行为，那多写几句会怎样？

这个问题，上个月我用一场事故回答了自己。

我的博客发布流程里有一个审查 agent，专门在发布前给稿子挑刺。有天我往它的 system prompt 里加了一条规则："检查弯引号，本博客只用半角直引号"。加完当晚跑下一篇稿子，它报了 40 多个"引号问题"。我吓一跳，打开稿子逐个看——全是中文全角引号，一篇干净的中文稿，42 个假阳性。

麻烦出在一个冷知识上：中文全角引号和英文弯引号是**同一对 Unicode 码点**,U+201C 和 U+201D。同一个字符，出现在英文单词中间是排版事故，出现在中文句子里是正经标点。我的规则只说了"检查弯引号"，没说语境，它就一视同仁全抓了。

（顺便，这对字符我在这篇文章里一次都没法直接打出来——打出来，我自己的审查 agent 就会把这一段报上去。规则已经立了，立法者也得守。）

第一反应是把那条规则删掉。但删了，英文里真混进来的弯引号就没人管了。最后的修法是再加一条："U+201C/U+201D 出现在中文句子里时是正常中文标点，不上报；只有夹在英文和代码里才算弯引号问题"。再跑一遍，42 个假阳性归零，英文弯引号照抓。

你品一下这个修法：**我没有改第一条规则一个字，我是用一条更具体的规则，把它在特定场景下覆盖掉了。** 写过 CSS 的人应该已经坐直了——这不就是级联吗。

这是《从 useEffect 到 Agent Loop》系列第 4 篇。blog01 讲循环，blog02 讲 context,blog03 讲工具。这一篇讲的东西你从第一篇起就一直在用，但从没正眼看过它：**prompt**——那些你写给模型的字，到底是按什么规矩生效的。

## 2. 桥

一句话：

> **Prompt 就是新的 CSS：声明式、会级联、可以覆盖——但没有 devtools 告诉你当前生效的是哪一条。**

```
CSS:                            Prompt:

  UA 样式表(浏览器默认)           预训练+对齐(模型出厂人格)
    │ 可被覆盖                       │ 可被覆盖
  author 样式表                    system prompt
    │ 可被覆盖                       │ 可被覆盖
  inline style                    tool description / 本轮 user
    │                                │
    ▼                                ▼
  devtools 一眼看到谁生效         跑十次任务,数行为,猜谁生效
```

左边每一层谁赢谁输，规范里写着算法，devtools 里标着删除线；右边每一层都只是"倾向"，谁赢要看这一轮的采样。骨架同构，判决机制完全不同。

## 3. 真

### 3.1 prompt 的"层"：你写的每个字都住在某一层里

先把"prompt"这个词拆开。很多人以为 prompt 就是聊天框里那句话，其实模型每一轮读到的声明至少有四层：

第一层，**模型默认行为**。预训练加对齐训练给它的出厂人格：乐于助人、倾向给出答案、说话自带一股客服味。这是 UA 样式表——你一行 CSS 不写，h1 也有默认字号；你一行 prompt 不写，模型也自带一整套行事风格。这层你改不了，只能覆盖。

第二层，**system prompt**。你亲手写的常驻规则，每一轮都在——author 样式表。tiny-agent v0.2 里我们加 cache_control 的那一块就是它。

第三层，**tool description**。blog03 说过"description 不是文档，是 prompt"——它是散落在 tools 数组里的样式片段，管"这个工具什么时候用"这类局部行为，像组件级的 scoped style。很多人 system prompt 抠得很细，tool description 随手一句话，然后奇怪模型工具用得乱——全局样式表写得再好，组件里 style 属性乱写一气，页面照样花。

第四层，**本轮 user message**。最近、最具体——inline style。

层与层冲突时谁赢？CSS 有一套确定算法：origin、specificity、书写顺序，一路比下去，必有唯一答案。prompt 没有算法，只有倾向：Anthropic 的模型被训练成 system 的优先级大致高于 user；同时，离得近的内容（最近几条消息）天然拿到更多注意力。注意这两股力量是拧着的——system 靠身份赢，最近的 user 靠位置赢，拧出来的结果不是规范定的，是概率定的。

顺带纠正一个容易照抄错的点：OpenAI 那边有 role: "developer" 这个专门的指令角色，**Anthropic 没有**——你在 Anthropic API 里能操作的就是 system 和 messages 两处，别照着 OpenAI 的文章去找 developer role，找不到的。

回头用四层结构套我的引号事故，一套一个准："检查弯引号"住在 system 层，它跟谁冲突？跟第一层——模型出厂就知道中文全角引号是正常标点，但我的规则更具体、更像命令，把这条常识覆盖了。而我的修法，是在同一层里再立一条 specificity 更高的规则，反向覆盖回来。三层声明叠着打架，最后生效的是最具体那条——全程没有一处报错，也没有任何面板能让我点开看"当前生效的规则列表"。

### 3.2 指令稀释：每条规则都在掏其他规则的口袋

CSS 老兵都打过 specificity 战争：你写 .btn，同事写 .card .btn，你回敬 #main .card .btn，最后两边掀桌子，一起上 !important。

prompt 的战争长得几乎一样，只是武器从选择器换成了语气。你发现模型不守某条规则，把那条改成大写；别的规则相形见绌，也跟着大写；然后开始加粗、加 NEVER、加感叹号。**大写加粗的 IMPORTANT，就是 prompt 界的 `!important`——用之前觉得丢人，用完都说真香。**

真香是真的。模型对 IMPORTANT、ALWAYS、NEVER 这类标记确实更敏感，该用就用，不丢人。但 CSS 那条老教训在这儿原样成立：!important 的威力来自稀缺。满屏 !important 的样式表等于没有 !important——人人都插队，队就没了。prompt 同理：system prompt 里十条规则八条大写，模型读到的信息是"这个人说话都这个音量"，然后按自己的理解挑着执行。**强调是相对的，全都强调等于都不强调。**

比音量战争更隐蔽的是稀释。模型一轮里的注意力大致是个定量，规则列表在它那儿不是 checklist——它不逐条打勾，它把所有规则揉成一团软约束一起消化。每加一条，其他每条分到的注意力就薄一点。我在 v0.4 上实测过一回（4.3 节有数字）：规则从 7 条加到 11 条，新规则是执行了，一直好好的第 3 条开始丢。**加规则不是免费的：你以为在做加法，注意力在做除法。**

所以改 prompt 的正确心态不是"多写点保险"，是像管 CSS 代码库一样管它：能删则删、冲突要清、!important 记账。blog02 说过"少给一点，它反而干得更准"——在 context 体量上成立，在规则条数上同样成立。

### 3.3 结构化写法：给注意力画格子

blog02 讲 context 三招时埋过一个钩："结构化 context，细讲留到 blog04"。还钩的时候到了。

同样几条规则，写成一段散文和写成分节列表，执行率差得远（4.3 有实测）。原因不玄：模型在训练数据里见过海量的 XML 标签、markdown 标题、编号列表，这些结构是它熟悉的边界信号——标签把一坨字切成有名字的块，注意力找起来有格子可循。散文没有边界，规则和规则之间只隔一个句号，读着读着就糊了。

结构化写法三板斧：

**一，分节并命名。** 用 XML 标签（`<rules>`、`<output_format>`）或 markdown 标题把不同职责的内容隔开。这不是因为 Claude 会解析 XML 语法——是标签让"这一块是规则、那一块是格式要求"变得可寻址。

**二，正例反例。** 与其堆三条抽象形容词（"要谨慎、要仔细"），不如给一对 good/bad 例子。CSS 里你也不写"标题要好看"，你写 font-size: 24px——具体的值永远比抽象的意图管用。模型是模式匹配的生物，例子就是它的具体值。

**三，防御性规则显式写。** 模型的出厂默认（还记得 UA 样式表那层吗）是倾向于给出答案，哪怕它不知道。所以"找不到就直说没有，别编"这种话，你不写，它就用默认行为补位。防御性 CSS 你写过——`img { max-width: 100% }` 防的是没约束的图片撑爆布局；防御性 prompt 防的是没出口的模型编造内容。给它一个"承认不知道"的显式出口，比事后抓它编造便宜得多。

三板斧的共同点，是把"希望它怎么做"从你脑子里的默认假设，变成结构上可寻址的声明。写 CSS 的人早就懂这个理：浏览器不读你的心。模型也不读——区别只是浏览器错得稳定，模型错得随机。

## 4. 干：tiny-agent v0.4

### 4.1 v0.4 长出什么

`git checkout v0.4` 就能看到这一版：[github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent)。相比 v0.3，长出来三件事：

- 新文件 `src/prompts.js`：两版 system prompt 常量——`PROMPT_V1`（一句话版）和 `PROMPT_V2`（结构化版）
- `src/agent.js` 加一个 `--prompt=v1|v2` flag、task 取参改成"跳过 flag 的第一个位置参数"，其余不动
- 玩法变了：同一套工具、同一个任务、只换 prompt，跑几遍数行为差异

这是全系列代码量最小的一版——因为这一篇要证明的恰恰是：**一行执行代码不改，只改声明，行为整个换一副样子。**

### 4.2 两版 prompt

```javascript
// src/prompts.js
export const PROMPT_V1 = `You are tiny-agent, a helpful assistant
with file tools. Be careful and accurate.`;

export const PROMPT_V2 = `You are tiny-agent, a cautious file editor.

<rules>
1. ALWAYS call read_file on an existing file before write_file.
2. If a file or directory does not exist, say so. NEVER invent content.
3. Prefer the smallest change that completes the task.
4. After writing, state which files changed and by how many bytes.
</rules>

<output_format>
Reply in the user's language.
End with one line: DONE: <files touched, comma separated>.
</output_format>

<examples>
<good>
Task: update the title in README.md
-> read_file README.md -> write_file with ONLY the title line changed
</good>
<bad>
Task: update the title in README.md
-> write_file README.md from memory, guessing the rest of the content
</bad>
</examples>`;
```

（repo 里这两段实际叫 `RULES_V1` / `RULES_V2`——导出前各自拼上 v0.2 那份项目说明：`PROMPT_V1 = RULES_V1 + BRIEF`。不拼的话，换个 prompt 做实验，system 就掉回 4096 的缓存门槛以下了。这里只展示会变的部分。）

`agent.js` 的改动就这几行：

```javascript
import { PROMPT_V1, PROMPT_V2 } from "./prompts.js";

const promptArg = process.argv.find(a => a.startsWith("--prompt="));
const version = promptArg?.split("=")[1] ?? "v2";
const task = process.argv.slice(2).find(a => !a.startsWith("--"));
const ctx = new Context(version === "v1" ? PROMPT_V1 : PROMPT_V2, client, MODEL);
```

四点讲透：

**一，严格控制变量。** v1 和 v2 之间，工具、模型、任务、温度全部相同，唯一差异是 system 字符串。这是拿 A/B test 的纪律对待 prompt 改动——想知道一条声明的效果，就只改这一条。听着像废话，但我见过太多人一次改八处然后问"为什么行为变了"——这跟一次改八个 CSS 属性然后问哪个生效了，是同一种自我为难。

**二，v2 的四条规则，每条都在覆盖一个出厂默认。** 第 1 条覆盖"上手直接写"（blog03 开头那位读者的 README 惨案，病根一半在这）；第 2 条覆盖"倾向给答案"（防编造）；第 3 条覆盖"顺手优化"（模型很爱把你没让它碰的地方也润色一遍）；第 4 条要求自报改动——这是给 blog06 的 verifier 提前留的验收接口。没有一条是装饰。

**三，`<examples>` 里 bad 和 good 一样重要。** 只给正例，模型学到"这样做对"；配上反例，它才学到边界在哪。这对例子直接取材自 blog03 的真实事故——评测用例从翻车里来，示例也从翻车里来。

**四，改 system 会打掉缓存。** blog02 讲过 cache 是前缀匹配的，而 system 就在前缀里——你每改一版 prompt，下一轮就得按约 1.25 倍原价重新写入缓存。所以 prompt 迭代别跟日常任务混着跑：改完集中测，测稳了再上，不然行为和账单一起抖，你分不清哪个抖动是谁贡献的。

### 4.3 跑一下

同一个任务，两版 prompt 各跑五次：

```text
$ node src/agent.js --prompt=v1 "把 README.md 的标题改成 tiny-agent v0.4"
[turn · tool_use=write_file]
改好了!我重写了 README.md,顺手把安装说明也理顺了一些。

$ node src/agent.js --prompt=v2 "把 README.md 的标题改成 tiny-agent v0.4"
[turn · tool_use=read_file]
[turn · tool_use=write_file]
README.md 已更新:标题行由 "# tiny-agent" 改为 "# tiny-agent v0.4",
其余内容未动(+5 bytes)。
DONE: README.md
```

我的五次实测：v1 有两次不读直接写，其中一次还"顺手"改了标题之外的三处措辞；v2 五次全部先读后写，五次都只动标题行。同一套工具、同一段 runTool，行为差异全部来自那段声明。blog03 里那位读者要是当时有 v2 这版 prompt，他的 README 至少能多活一阵——注意我说的是"多活一阵"，不是"永生"，prompt 是倾向不是闸门，真正的闸门要等 blog07 的确认门。

**翻车段（必备）**:v2 不是一次写成的。第一版我没用 `<rules>` 标签，把 7 条规则写成一段 190 个词的英文散文，自我感觉写得挺周到。同一个任务跑五次，稳定执行的只有开头两条；"写完报告字节数"那条排在散文中段，五次一次都没出现——lost in the middle,blog02 讲 context 时那个现象，在一段 300 token 的 system prompt 里照样发作。拆成带编号的 `<rules>` 之后，五次全执行。

结构的问题解决了，我又手痒撞上了稀释：后来往 `<rules>` 里陆续加到 11 条——输出语言、路径规范、各种小洁癖——新规则倒是都执行了，但五次里有三次，第 3 条"最小改动"开始丢，模型又开始润色我没让它碰的段落。最后删到 4 条，就是上面你看到的那版，第 3 条稳定回归。**规则条数和单条执行率之间，有一条你看不见的预算线。** 我现在的纪律是：每想加一条规则，先问自己愿不愿意为它删一条旧的。

### 4.4 一处映射：CLAUDE.md 为什么长那个样子

[blog194 项目护照](/posts/blog194_project-passport-agents-md-claude-md-memory/) 里讲过 Claude Code 的 CLAUDE.md / AGENTS.md——每轮被拼进 system 层的项目说明。用这一篇的语言重新看它：这就是**用户态的 author 样式表**。你项目里那份 markdown，就是你写给模型的 stylesheet,Claude Code 负责把它拼进级联。

再看官方推荐的写法：短句、分节、bullet、少废话——现在你知道这不是审美偏好，是级联工程。CLAUDE.md 的内容要跟内置 system prompt、tool description、你本轮的指令叠在同一套级联里消化，写成散文就会被稀释，写成结构才可寻址。文档让你"保持简短"，跟本篇 3.2 那条注意力预算线，是同一条线。

### 4.5 Moonshot 注脚

> OpenAI 系在 system 之外还有 role: "developer" 这个指令角色——在新模型里它实际上就是 system 的新名字，优先级语义相同，不是一个额外的超级层。Moonshot / DeepSeek 兼容 OpenAI 口径，切过去时 PROMPT_V1/V2 内容原样能用，放进对应的 system 或 developer 消息即可。
>
> 结构化写法两边通吃，但偏好有微差：Claude 系对 XML 标签格外顺手（训练数据里见得多）,OpenAI 系文档更常示范 markdown 分节。差异不大，原则同一条：分节、命名、给边界。别背"哪家用哪种"——同一个任务跑五次数一数，你自己模型上的数据比任何教程可信。

## 5. 界：类比的边界

CSS 这个类比撑得住的部分我认：声明式、分层、覆盖、specificity 战争、!important 的兴衰——全对得上，对得让人起鸡皮疙瘩。但有三条撑不住的，得说满。

**第一条：CSS 级联有确定算法，prompt 只有概率倾向。** 两条 CSS 规则打架，谁赢是可计算的：origin、specificity、书写顺序，规范写死了，你甚至能笔算。两条 prompt 规则打架，没有任何文档能告诉你谁赢——system 大致压过 user、具体大致压过抽象、近的大致压过远的，全是"大致"。裁判不是规范，是你自己跑出来的评测：同一组任务，改动前后各跑 N 次，数通过率。这件事第 09 篇会展开成正经方法论，这里先立块牌子：**在 prompt 的世界里，eval 就是你的 W3C。**

**第二条：CSS 改坏了立刻看得见，prompt 改坏了什么都不发生。** 样式写错，页面当场长歪，F12 三分钟定位。prompt 改坏了呢？不报错、不变红、不崩——模型只是"表现得不太一样"，而你多半不在场。我的引号事故里，从那条规则上线到我看见 42 个假阳性，中间隔了一整天；要不是假阳性多到刺眼，它可能再潜伏一个月。这跟 blog02 的 cache 静默不命中是同一族病：不报错，只变坏——而"变坏"这件事，没有任何面板会替你标红。CSS 要是没有 devtools 顶多难受，prompt 没有 devtools 是危险——因为连"坏了"这个事实本身，都要靠人肉发现。

**第三条：CSS 的读者是标准化的，prompt 的读者是概率的，还会换人。** 浏览器大战早打完了，同一段 CSS 在 Chrome 和 Safari 里语义基本一致，兼容性查 caniuse 就行。prompt 没有 caniuse——同一段 prompt，换个模型是一种行为，同一个模型升个版本又是一种行为，连一字不改原地重跑都有波动。你不是在给一台确定的机器写规则，**你在给一个概率读者写规则**——他今天读进去了，不保证下周还读得进去。

一句话收尾：**CSS 教会你声明和级联，但它也惯坏了你——它让你以为声明出去的东西必然生效。prompt 会把这个惯性掰回来。**

呼应 spine:[blog01](/posts/blog206_fe2agent-01-agent-loop/) 说控制权交给概率函数（选择）,blog02 说 context 是它每一轮的输入，blog03 说执行留在你手里。prompt 贴在"输入"那块骨头上——它是输入里常驻的、由你亲手写的那一层。用方向盘的话说：**prompt 是贴在仪表盘上的行车守则——它每次出发前都读一遍，但读没读进去，是概率的。** 你能做的，是把守则写短、写清、分好节，然后用评测盯着它有没有照做。

## 6. 钩：下集

下一篇《Context 是内存，记忆是硬盘：给 Agent 上 lazy loading》。

类比引子：读完这一篇你可能已经憋出一个问题——prompt 也好、context 也好，全都活在上下文窗口里，而窗口是有限的、按 token 计费的（blog02 那条账单曲线还记得吧）。项目约定、历史结论、上周踩过的坑，这些塞不进每一轮的东西放哪？前端早答过这道题：内存放不下的放硬盘，首屏用不到的 lazy load。agent 世界同款：context 是内存，记忆文件是硬盘，检索就是按需 import()。

tiny-agent v0.5 会长出：**markdown 记忆文件 + 朴素检索**——save_memory / search_memory 两个新工具进 tools.js（blog03 说过这个文件会越来越挤，兑现从下篇开始）。`git checkout v0.5` 就能看到下一版：[github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent)。

在那之前给你留个作业：把 v0.4 的 `<rules>` 故意加到 12 条，同一个任务跑十次，数每条规则的执行率；再删回 5 条，再跑十次。你会亲眼看到那条注意力预算线画在哪——这份手感比任何 prompt 工程课都值钱，因为它是在你自己的模型上量出来的。
