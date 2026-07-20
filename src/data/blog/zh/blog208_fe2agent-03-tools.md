---
author: 陈广亮
pubDatetime: 2026-07-21T09:00:00+08:00
title: "Tool Call：让 AI dispatch，你来当 reducer"
slug: blog208_fe2agent-03-tools
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI Agent
  - 前端
  - 开发效率
  - Claude Code
description: 前端里 dispatch 是你的活、reducer 是你写的；agent 里 dispatch 交给了 AI，reducer 那半边仍然是你的责任。这是 fe2agent 系列第 3 篇，讲 tool schema 三件套、执行权分离、把 AI 当不可信客户端校验，配 tiny-agent v0.3。
---

## 1. 坑

一个读者按着 blog01 的思路把 tiny-agent 拉下来跑通了，第二天来跟我抱怨：他给 agent 加了个 `write_file` 工具，让它读一下 README、告诉他项目干嘛的。它读完了，然后没等他反应过来，下一轮直接 `write_file` 把 README 里"贡献指南"那一段整个覆盖成了一段它自己觉得更好的措辞，理由是它注意到那一段"写得有点乱"。屏幕上半屏文件被推平。他给我留言：这不是我签的合同。

我看到"合同"这个词的时候心里一紧，因为我知道他踩到的是什么了。他以为 dispatch 是他，模型只是他的 UI；实际是他一签下 `write_file` 这个工具，dispatch 那一半就交出去了。**agent 里 dispatch 的不是你，是 AI**。你交出去的不只是 UI 控制权，还有下一步做什么这个选择权。

这是《从 useEffect 到 Agent Loop》系列第 3 篇。blog01 说 agent 是一个 while 循环、循环里的函数不纯；blog02 说 context 是它每一轮的输入。这一篇讲这个循环里最出戏的一环：**tools**——它这一轮能干什么，以及"能干什么"这件事一旦定义歪了，会出多离谱的事。

## 2. 桥

一句话：

> **Tool schema 就是 Redux 里的 action type + payload 契约。区别是 AI 在 dispatch，你在做 reducer。**

```
Redux:                        Agent:

  你 dispatch                    AI dispatch
    │                              │  (tool_use)
    ▼                              ▼
  action { type, payload }       tool call { name, input }
    │                              │
    ▼                              ▼
  reducer(state, action)         runTool(name, input)
    │                              │
  你写的、纯函数                  你写的、可以有副作用
```

执行权是你的，选择权是它的。这两半分开——记住这句话，本篇一半的话都是在给这句话打注解。

## 3. 真

### 3.1 tool schema 三件套：name / description / input_schema

先看一个最朴素的 tool 定义（Anthropic 风格）：

```javascript
{
  name: "read_file",
  description: "Read a file from disk. USE THIS BEFORE WRITING—always read current content first to avoid clobbering.",
  input_schema: {
    type: "object",
    properties: {
      path: { type: "string", description: "File path, relative or absolute" },
    },
    required: ["path"],
  },
}
```

三个字段，三种角色：

- `name`：模型决定**调不调**——它在一堆 tool 里挑，name 是它眼里的 key
- `description`：模型决定**什么时候调**——语义靠这句话，什么时候用、什么时候别用，全在这
- `input_schema`：模型决定**怎么调**——JSON Schema 告诉它字段名、类型、必填

关键洞察是第二条。**description 不是文档，是 prompt**。你写 `"Read a file"`，它理解成"读一次"；你写 `"Read a file. USE THIS BEFORE WRITING—always read current content first"`，它就先读再写。同一个工具、同一段实现代码、就因为 description 措辞不同，模型行为完全变一副样子。这为 blog04 讲 prompt 埋个钩：你以为 tools 是接口、prompts 是文案——不是的，**tools 里最重的一块也是 prompt**。

顺带把 LangChain 那层玄学揭掉。你写过 `@tool` 装饰器 + docstring，感觉挺魔法：一个 Python 函数装饰一下就变工具了。它不是魔法——它是**把 docstring 当 description 拼进去发给模型**。你写在 docstring 里那句"如果用户提到 xxx 就调用这个函数"，是被原样送到模型那边当提示的。意识到这一点，你就不会再被"框架给了我一个工具"这种感觉骗——**框架给你的是一个 prompt 拼装器，工具真正的语义是你自己写在 docstring 里的那句话**。

### 3.2 dispatch table：AI 是 dispatcher，你是 reducer

再展开一下开头那句桥。

Redux 心智：**你**决定 dispatch 什么 action，reducer 决定怎么改 state。dispatch 那一步在你手里，是你按了个按钮、点了个链接、发了个网络请求回来。

Agent 心智：**AI** 决定 tool_use（dispatch），你写的 `runTool` 决定怎么跑（reducer）。dispatch 那一步已经不在你手里了——它读完 context 之后自己挑一个 tool、自己填 input，然后你的 runTool 拿到这个 action 去执行。

这不是修辞游戏，它对应几条具体的工程含义：

**一，reducer 必须行为可预测。** Redux reducer 强调纯函数：同 state + 同 action = 同新 state。你的 runTool 可以不纯——tool 天职就是产生副作用，读文件、写文件、发请求，这些都是副作用。但**行为必须可预测**：同一份 input 出同一份 output 或同一种错误。否则模型没法学会用你的工具，它这一轮试了、下一轮遇到相似情况不敢再试，因为它不知道你会不会突然表现不一样。

**二，action 契约不能变。** Redux 里你不会突然把 `ADD_TODO` 改叫 `ADD_ITEM`，那会打爆所有 reducer。tool schema 一旦发布也是一样——改字段名、改必填、改语义，等同于前端里改 API 版本，得走灰度发布。你以为改个字段名是重构，模型看到的是"你把我熟悉的按钮换了个位置还偷偷改了行为"。

**三，不认识的 action 要报错，不能吞掉。** Redux 里 default case 一般 return state 就完事，因为 action 空间是编译时枚举，模糊一点没事。agent 里不是——action 空间是**开放的**，模型会编不存在的 tool name（后面 §5 会讲清楚为什么）。你如果吞掉 unknown tool，模型看到调用"成功"了，就会继续基于假设推理，越走越歪。v0.3 里我特意留了 unknown tool 分支，这是必须的。

再往深一层，**执行权分离**为什么重要？答案是：让 AI 出错在**选择**上，不出错在**副作用**上。选错工具、参数写错，这些错你能拦、能重试、能兜底；副作用一旦发生——比如 `rm -rf` 真的跑了、DB 真的删了——一次伤透，没法回滚。把 dispatch 交给 AI、reducer 留在自己手里，就是把可控的部分留在你这边。

这也是 blog03 在系列 spine 里的位置。blog01 讲**控制权交给概率函数**（选择），blog02 讲 **context 是它每一轮读的东西**（输入），blog03 讲**执行留在你手里**（副作用）——三块拼起来是 agent 工程最小的三元结构。选择、输入、执行，一个交出去、一个由你喂、一个牢牢握住。这是我这两年做下来最想传达的一层骨架。

### 3.3 校验：把 AI 当不可信客户端

前端有一条肌肉记忆：**永远校验用户输入**。表单 required、类型 check、长度限制——你不会指望用户老老实实填。你这么做不是不信任用户，是因为你知道他们会瞎写、误操作、粘贴错。

对 AI 换个称呼你就懂了：**AI 也会瞎写**。它会漏必填字段、类型给错、path 里带上一段解释文字（真的会），偶尔还会自信地填一个不存在的字段名。你如果不校验，直接把它给的 input 塞进 `readFileSync`，就是把用户表单不校验直接塞进数据库。

tiny-agent v0.3 的 `validateInput` 就十来行，故意手写不上库：

```javascript
function validateInput(schema, input) {
  const errors = [];
  for (const key of schema.required ?? []) {
    if (!(key in input)) errors.push(`missing required field: ${key}`);
  }
  for (const [key, spec] of Object.entries(schema.properties ?? {})) {
    if (!(key in input)) continue;
    const actual = typeof input[key];
    if (actual !== spec.type) errors.push(`field '${key}' should be ${spec.type}, got ${actual}`);
  }
  return errors;
}
```

required + type check，就这两条已经够拦住 80% 的乱来。生产环境你换 **ajv** 或 **zod** 都行——它们更全、性能更好、错误信息更漂亮。但入门阶段我特意手写：**让你看清楚"schema 校验"这四个字翻译成代码就是这几行 for 循环**，别一上来就陷进 ajv 的 setup 里，把注意力从概念上带走。

真正关键的设计不在校验本身，在**校验失败之后你怎么告诉模型**。看这段：

```javascript
{
  type: "tool_result",
  tool_use_id: b.id,
  content: result.error ?? result.content,
  is_error: !!result.error,
}
```

Anthropic 的 tool_result 支持一个 `is_error: true` 字段——**明确告诉模型这次调用失败了**。模型收到这个信号，下一轮自己会修正参数重来。校验错误变成学习机会，而不是 crash 出局。这里正好呼应 blog01 §4.3 埋的坑——v0.1 我故意没写 try/catch，让 tool 抛异常直接崩，就是为了在 v0.3 补上这一层的时候能对照着看两代的差别。

引一段 blog195：

> [blog195 loop debt 三债剧本](/posts/blog195_loop-engineering-three-debts-playbook/) 里 tool call 校验被放进 verification debt——不是可选优化，是必须还的债。因为**没校验的 tool 是把方向盘扔进副驾**，模型愿意抓就抓、不抓就没人管方向，你连自己什么时候要撞墙都不知道。

这句话在这里我原样引一遍：没校验的 tool = 方向盘扔进副驾。这是 blog03 全篇最想让你记住的一句。

## 4. 干：tiny-agent v0.3

### 4.1 v0.3 长出什么

从 v0.2 到 v0.3 的 diff：

- 新文件 `src/tools.js`：3 个工具（`read_file` / `write_file` / `list_dir`）+ `validateInput` + `runTool`
- `agent.js` 变短：tools 相关的定义、schema、执行分支全部搬到 tools.js
- tool_result 增加 `is_error` 字段

为什么这一版要抽出 `tools.js` 这个文件？blog02 抽 `Context` 类是因为字段多了要给它个家；这里抽 tools 是因为**工具会越来越多**：blog05 会加"记忆检索"、blog08 会加"subagent 调度"——都会往这个文件里塞工具；blog07 的"危险操作确认门"则会在它旁边独立成一层（门不是工具，是工具前面的闸）。现在集中管理，是提前给后面几篇腾地方，不是洁癖。

### 4.2 贴代码 + 逐块讲

`runTool` 主函数长这样：

```javascript
export function runTool(name, input) {
  const spec = toolByName[name];
  if (!spec) return { error: `unknown tool: ${name}` };

  const errors = validateInput(spec.input_schema, input);
  if (errors.length) return { error: `input validation failed: ${errors.join("; ")}` };

  try {
    if (name === "read_file") {
      return { content: readFileSync(input.path, "utf-8") };
    }
    if (name === "write_file") {
      writeFileSync(input.path, input.content, "utf-8");
      return { content: `wrote ${input.content.length} bytes to ${resolve(input.path)}` };
    }
    if (name === "list_dir") {
      const entries = readdirSync(input.path).map(name => {
        const full = resolve(input.path, name);
        const s = statSync(full);
        return { name, type: s.isDirectory() ? "dir" : "file", size: s.size };
      });
      return { content: JSON.stringify(entries, null, 2) };
    }
    return { error: `tool '${name}' has no handler` };
  } catch (err) {
    return { error: `${err.code ?? err.name}: ${err.message}` };
  }
}
```

四点讲透：

**一，三层防御，顺序不能反。** 先 `unknown name` → 再 `validateInput` → 最后 `try/catch`。反过来会怎样？schema 都没找到你怎么校验？没校验就跑代码你不就在等它崩？三层是有严格因果的，别为了"看着更 flat"把它拉平。

**二，返回统一 `{ content } | { error }` 这个形状。** TypeScript 里叫 discriminated union，JavaScript 里也一样好使——调用方一次 `if (result.error) ... else ...` 就分完。别一个函数一会 return 字符串一会 throw 异常，调用点会长成迷宫。

**三，`try/catch` 兜运行时错误。** `ENOENT`（文件不存在）、`EACCES`（权限不够）、`EINVAL`（参数非法）——这些都是 fs 会抛的真实错误。这一行就是 blog01 §4.3 v0.1 crash 事件的答案：**上一版故意让它崩，这一版一行 catch 全接住**。写在这里，对比着看，才知道"补上"这件事到底意味着什么。

**四，`write_file` 的 description 里我特意写了一句 "will not mkdir"（本文没贴这个 tool 定义，repo 的 `src/tools.js` 里能看到）。** 要不要在写之前自动 mkdir 是**策略决定**，不该藏在工具行为里让 AI 自己猜。你写在 description 里明说不会 mkdir，AI 就知道遇到不存在的目录得先问用户、或者先 `list_dir` 探一下。你不说，它会假设一个"合理默认"——而它的"合理"经常不是你的"合理"。策略要写在语义里，别藏在实现里。

### 4.3 跑一下

多工具协作（这一版跟 v0.2 最大的可感差别）：

```
$ node src/agent.js "看看当前目录有什么，然后把 README 里第一行提取出来写到 tmp.txt"
[turn · tool_use=list_dir]
[turn · tool_use=read_file]
[turn · tool_use=write_file]
done. tmp.txt 已创建，内容 "# tiny-agent"
```

三个工具串起来做一个小任务，模型自己拆步骤：先 list 看有啥、再 read 拿内容、最后 write 落盘。这就是 blog01 §3.2 三分法里 workflow → agent 的分界线——workflow 是你把 list→read→write 硬编码好，agent 是**模型自己排的顺序**。同样三步，前者你写 if/else，后者你给三个工具让它挑。

再看校验触发：

```
$ node src/agent.js "读文件"
[turn · tool_use=read_file input={} ]
tool_result: is_error=true, "missing required field: path"
[turn · tool_use=read_file input={"path": "README.md"} ]
读完 README.md...
```

第一轮它漏了 path，校验拦住，`is_error: true` 回给它；第二轮它自己补上 path 重来。第一次看到这一幕的时候我盯着屏幕看了几秒——它没崩、没道歉、就是**换了个参数重来**。那一刻我第一次觉得，schema 校验不是防御，是教学。

**翻车段（必备）**：我第一版写 tool_result 的时候忘了传 `is_error`，只把 error 字符串塞进了 content。表面看没啥问题——模型也收到了"missing required field: path"这句话。跑起来才发现坏事：模型**完全把这段错误信息当作我调用这个工具得到的结果**，下一轮基于这段"结果"继续自信推理。比如它调了 `read_file`，我塞了句 error 进 content，它下一轮的思考里就会出现"根据我刚才读到的文件内容显示 missing required field..."这种鬼话。它把错误当内容读了。

看起来像是模型 bug——其实是我少给了它一个信号。教训一句话：**"是否失败"和"失败原因"是两个字段，别塞在一起**。前端类比更狠：`fetch` 只返回 body 不返回 status code，你怎么知道 200 还是 500？你不知道——你就当 200 处理，把错误页面的 HTML 当业务数据渲染出去。tool_result 少 `is_error`，就是这个场景。

### 4.4 一处映射：blog194 的 PreToolUse 和这里的校验

系列内引一下：

> [blog194 项目护照](/posts/blog194_project-passport-agents-md-claude-md-memory/) 里我讲过 Claude Code 的 `PreToolUse` hook——每次调工具前跑一段脚本决定放不放行。这是本篇校验层的**外延**，不是替代：`validateInput` 管**参数对不对**（数据层），`PreToolUse` 管**这事该不该做**（策略层）。校验通过之后，真跑之前，再加一道"要不要人工确认"的门——比如"delete 类工具必须敲 yes 才继续"。两层分工明确：一层管数据，一层管策略。blog07 会展开做危险确认门，到时候你会看到这两层怎么叠起来。

### 4.5 Moonshot 注脚

> OpenAI 系 tool schema 结构不同：外面要包一层 `{ type: "function", function: { name, description, parameters } }`，`parameters` 那一块就是 JSON Schema，等价 Anthropic 的 `input_schema`。Moonshot / DeepSeek 都兼容 OpenAI 结构。
>
> Anthropic 的 `is_error` 在 OpenAI 端没有显式字段对应——你要把报错信息+上下文写进 tool 消息的 content 里，模型靠语言理解识别"这次失败了"。**结构不同、语义等价**：你想让模型知道失败了、失败原因是什么，这个诉求两边都满足，只是一个用字段、一个用文本。
>
> 一句话：切国内模型时把 tools 每一项包一层 `function`，`validateInput` 那段逻辑一行都不用动。

## 5. 界：类比的边界

Redux 类比这一篇撑得最久：dispatch/reducer 分离、schema 是契约、错误回给"用户"——都对，中级前端秒懂。但有三条撑不住的，得说满。

**第一条：Redux 的 action 空间是编译时枚举，agent 的 action 空间是开放的。** Redux 里 action type 是 `AddTodo | RemoveTodo | ToggleTodo`，一个 union，TypeScript 帮你穷举完。agent 里没有这种保证——**模型会编不存在的 tool name**。你只暴露了 3 个工具，它有时候会调用 `delete_file`、`git_commit`、`send_email`——它见过太多别的项目、脑子里有一个"这种场景一般用这个工具"的模式匹配，就顺手编一个出来。所以你的 `unknown tool` 分支**不是防御性洁癖，是主路径**。第一次跑 v0.3 那天我就看见它调过一次 `search_file`，我根本没有这个工具。

**第二条：Redux 的 reducer 语义是显式的，tool 的语义大部分藏在 description 里给模型看。** reducer 里 `case 'ADD_TODO': return [...state, action.payload]`——语义就是这几行代码，你写死了。tool 不是——**tool 的语义有一半是给你自己实现看的（runTool 里的分支），有一半是给模型理解的（description）**。而这后一半你没有直接掌控：你以为写清楚了，模型可能读歪；模型这个版本读对了，下次模型升级可能又读出别的意思。**你在维护一份给模型看的 spec，这份 spec 的读者是概率性的**。这一层跟前端里"文档写好就行"是完全不同的手感。

**第三条：Redux 里 dispatch 完必然 reduce，agent 里 tool_use 完模型可能不用你的结果。** Redux 是幂等的、必然的——dispatch 走完 reducer 就跑、state 就更新，你能预测。agent 不是：模型调了 `read_file`，你给它准确的文件内容，它下一轮**可以选择不信你**。它可能"根据我的判断，这个内容看起来不完整，让我再调一次"，也可能"根据这个内容，我认为原始意图是..."——它决定 tool_result 怎么用，你只负责给出准确结果。**它可以选择不信你**——这句话第一次说出来的时候我自己也惊了一下，但事实就是这样。

第三条最刺激。前端你不会预期用户瞎猜 reducer 的返回值，但 agent 会。这是 blog01 spine 的具体落地——**你把方向盘交出去了，方向盘上有 tool 这一段，但 tool 转不转你的方向，最终由它决定**。

一句话收尾：**Redux 教会你把 action 契约当合同签；agent 教会你，合同签完，对方读没读懂、认不认账，也是你要处理的事。**

呼应 blog01/02 的 spine：控制权交给概率函数（[blog01](/posts/blog206_fe2agent-01-agent-loop/)）+ context 是它每一轮的输入（blog02）+ tools 是它这一轮能做的选择（blog03）——**三块拼齐**，agent 骨架就出来了。剩下 7 篇都是在这副骨架上贴肌肉：记忆是给"输入"加层沉淀、subagent 是给"选择"加层编排、hooks 是给"执行"加层保险。骨架不变。

## 6. 钩：下集

下一篇《Prompt 是新的 CSS：声明式、会级联、没有 devtools》。

类比引子：blog03 讲了工具怎么定义，但**为什么 description 措辞就能决定模型行为**这件事没深挖——那是 prompt 工程的核心。同一个工具，description 从 `"Read a file"` 改成 `"Read a file. USE THIS BEFORE WRITING"`，模型行为完全变一副样子；system prompt 从 `"You are a helpful assistant"` 改成 `"You are a cautious file editor who always reads before writing"`，调用策略又变一副样子。这些行为差异跟 CSS 的级联很像——声明式、可以覆盖、但你没有 devtools 帮你看当前生效的是哪一条。

tiny-agent v0.4 会长出：**重写 system prompt 做行为对比**——同一套工具、两版 prompt，跑同一个任务看输出差异。这是把"prompt 影响行为"从空话变成屏幕上的数字。`git checkout v0.4` 就能看到下一版：[github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent)。

在那之前你可以先给 v0.3 加个作业：把 `read_file` 的 description 改成三个不同版本（极简的、带 USE THIS BEFORE 的、带 EXAMPLES 的），各跑五次同一个任务，看模型什么时候调用它、多频繁调用。这份手感比任何"prompt 最佳实践"文章都管用——因为它是**你自己工具上的**数据。
