---
author: 陈广亮
pubDatetime: 2026-07-30T09:00:00+08:00
title: "在 Agent 的世界，报错是排期内日常：从 Error Boundary 到 Verifier"
slug: blog211_fe2agent-06-error
featured: true
draft: true
reviewed: false
approved: false
tags:
  - AI Agent
  - 前端
  - 开发效率
  - Claude Code
description: 模型自信满满说"完成了"，但活没干完——这种不报错的错，try/catch 一层都拦不住。机械故障用重试加指数退避和 max_steps 硬闸，语义故障用 verifier 独立验收，而且验收必须隔离上下文。这是 fe2agent 系列第 6 篇，配 tiny-agent v0.6（withRetry + MAX_STEPS + verifier）。
---

## 1. 坑

先坦白一件事：这个系列的每一篇，初稿都不是我一个字一个字敲的——我的流程里有一个起草 agent，我写 brief，它交稿，我再改。上上周它交一篇稿子，brief 里写明"正文 4000 字以上"。它交稿时在最后附了一句："全文 3847 字，符合要求。"

我差点就信了。顺手跑了一遍流程里的字数脚本——3341。

差了 500 多字。而它自报数字的时候没有一丝犹豫，精确到个位数，连个"约"字都不带。它不是在撒谎——撒谎需要先知道真相。它只是根本没数过：3847 是它"觉得"出来的一个数，跟它觉得任务完成了，是同一种觉得。

从那天起我的流程里多了一条铁律：**所有字数由主流程独立跑脚本核对，永远不信 agent 自报**。后来我意识到，这条土规矩有个学名，叫 verifier——干活的说"到了"，另一个不掺和干活的来查一遍，是不是真到了。

这是《从 useEffect 到 Agent Loop》系列第 6 篇。[blog01](/posts/blog206_fe2agent-01-agent-loop/) §3.3 埋过三个钩，今天兑现前两个：**万一它不停呢**（步数债），**停错了怎么办**（verifier）。blog01 还留过一个伏笔：v0.1 连 try/catch 都没有，v0.3 在工具层补上了，这一篇补最后一层——loop 层。blog05 结尾那句话也在这里接上：失败不是异常分支，是主路径。

## 2. 桥

一句话：

> **Error Boundary 拦的是 throw；agent 世界里最贵的错不 throw——模型自信满满说"完成了"，而活没干完。机械故障交给 retry 和 max_steps，语义故障交给 verifier。**

```
React:                        Agent:

  render() 抛异常                429 / 529 / ENOENT
    │                              │
    ▼                              ▼
  ErrorBoundary 捕获            retry + max_steps 接住
    │                              │
    ▼                              ▼
  fallback UI                   塞回 context 让它再试
                                   │
  （不 throw 就不触发）          verifier（end_turn 之后）
                                专拦"不 throw 的错"
```

左边的防线靠异常触发，不抛不管；右边多出一整层——模型说停之后，还得有人验收。

## 3. 真

### 3.1 先把失败清单摆全

前端讲容错，你脑子里的清单大概是：请求挂了、组件抛了、用户输入非法。agent 的失败清单长得多，得分三层摆。

**API 层**。429（限流，你打太快了）、529（过载，服务端忙不过来）、网络超时。这些是标准 HTTP 故障，前端全见过——fetch 一个不稳定的接口就是这个体验。特征：**有明确的错误码，可机器识别，通常等一等重试就能过**。

**工具层**。ENOENT（文件不存在）、EACCES（权限不够）、命令超时。blog03 的 runTool 三层防御接的就是这层——catch 住、塞回 tool_result、带上 is_error，让模型自己看到失败换条路走。特征：也有明确报错，但**处理权在你手里**——你决定告诉模型多少、怎么措辞。

**模型层**。这层是新物种，前端没有对应物。让它输出 JSON，它给你少个右括号；工具箱里拢共只注册了三个工具的那阵子，它就自信地调过一个 search_file（blog03 界第一条说过，它真的会编）；最要命的是第三种——**自信的半成品**：写了半个文件、跑通了 lint 没跑测试、字数差 500 却自报达标，然后 end_turn，语气圆满。

前两层的错会"响"——有状态码、有异常栈、有 is_error。第三层的错**不响**：没有任何信号告诉你出事了，一切看起来都在正常走，stop_reason 干干净净是 end_turn，进程退出码 0。我管它叫**不报错的错**。这一层，才是 agent 容错真正的主战场。

把清单摆全之后，标题那句话就好懂了。前端里报错是异常态——线上冒一个未捕获异常，够拉个群查一晚上；agent 里这三层失败天天来、轮轮可能来，它们不是异常，是排期内日常。所以容错代码在 agent 项目里不是 catch 块里随手一行 console.error 的边角料，是要按主流程来设计的正戏：失败之后重不重试、谁来判成没成、判不过怎么办，每一条都得在写循环的那天就想好。

### 3.2 机械故障，用机械手段

先解决会响的错，手段全是前端的老朋友。

**重试加指数退避**。429/529/5xx 这类错，重试是标准答案；退避是重试的礼貌——失败一次等 1 秒，再失败等 2 秒、4 秒，别在服务端已经过载的时候贴脸连打。这套你在网络请求库里见了十年。顺带说一句，Anthropic 官方 SDK 对这类错自带部分自动重试，你不写也有兜底；但 v0.6 我还是手写了一层 withRetry——一是教学，让你看清"重试策略"翻译成代码就十来行；二是可观测，每次重试 stderr 打一行，SDK 内部的重试你看不见。动机跟 blog02 加那行 cache 日志是同一个——省了没省、错了没错，得先看得见，才谈得上治。

**max_steps 硬闸**。blog01 的原话：模型可能陷在"我再试一次这个工具，说不定这次不一样"的自我说服里，while(true) 头顶没盖，一路跑到你信用卡告警——[blog195](/posts/blog195_loop-engineering-three-debts-playbook/) 里我把它叫"步数债"。答案一点都不精巧：**不信任模型的自控力，你替它数数**。步数超了直接 break，不商量。这不是对模型的侮辱，是对概率函数的基本尊重——你不会指望 `while (Math.random() < 0.99)` 自己停下来。

**结构化输出校验**。让模型出 JSON，JSON.parse 一旦炸了，别自己上正则修补——把 parse 的报错原样塞回去，让它重出一遍。跟 blog03 的 is_error 是同一个心法：**报错是给模型的输入，不是给你的日志**。它拿到 "Unexpected end of JSON input"，下一轮通常能自己补上那个右括号。

顺手兑现 blog01 的另一个小钩：stop_reason 还有第三种，max_tokens——话没说完被截了，continue 还是 break？我的判断标准是看**截断的是什么**：自由文本被截，续着生成拼起来就行；结构化输出（JSON、代码）被截，拼接容易缝出语法错，不如加大 max_tokens 整个重出；连着截三次，说明输出本身失控了，break，交给人。

### 3.3 语义故障，用语义手段

现在到不报错的错。retry 救不了它——它没失败，它只是没做对。你需要的不是 try/catch，是**验收**。

verifier 的核心设计就一条：**干活的和检查的，分开**。让干活的模型自己"检查你刚才的工作"，效果很差——它在同一个 context 里，看得见自己刚才的全部推理，大概率顺着自己的思路再点一次头。这不是模型的道德缺陷，你 review 自己刚写完的代码，不也是越看越对？

分开之后，verifier 分两档，**便宜的在前**：

**规则 verifier**。能用脚本判的，绝不动用模型：字数达标没有——跑字数脚本；文件写了没有——fs.existsSync；测试过了没有——跑测试看退出码。确定、免费、不会被话术糊弄。我那条"永远不信 agent 自报字数"，就是一条规则 verifier，一行 shell 的事。

**LLM verifier**。"活干完了没有"这种规则写不出来的判断，才交给第二个模型：给它任务描述和最终产出，按 rubric 判 PASS/FAIL，附一句原因。注意它自己也是概率函数，判得也会错——所以它是第二道网，不是天条；规则能拦的，别劳驾它。

这套东西的前端对应物是什么？blog01 里我管 verifier 叫 agent 版的 code review，现在可以说得更准一点：它是 agent 版的 **CI**。你从来不会因为开发者说一句"我自测过了"就直接合并——你让流水线把 lint、测试、构建全跑一遍。开发者水平再高，流水线照跑；模型再聪明，verifier 照跑。**"自检清单"不如"外部验收"**，这条在人类工程里早是共识，只是模型的语气太笃定，笃定到我们差点忘了它。

## 4. 干：tiny-agent v0.6

### 4.1 v0.6 长出什么

`git checkout v0.6` 就能看到这一版：[github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent)。相比 v0.5，长出三件事：

- `src/agent.js` 加 MAX_STEPS 硬闸和 withRetry（指数退避），所有 messages.create 都包进去
- 新文件 `src/verifier.js`：end_turn 之后先跑规则检查，再起一次**不带历史**的独立调用判 PASS/FAIL
- FAIL 的原因塞回主循环再跑，最多 2 轮——verifier 自己也得有步数闸

### 4.2 核心代码

```javascript
// src/agent.js 新增
const MAX_STEPS = 20;
const MAX_VERIFY_ROUNDS = 2;

async function withRetry(fn, { retries = 3, baseMs = 1000 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const retryable = err.status === 429 || err.status === 529 || err.status >= 500;
      if (!retryable || attempt >= retries) throw err;
      const wait = baseMs * 2 ** attempt;
      console.error(`[retry · status=${err.status} attempt=${attempt + 1} wait=${wait}ms]`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}
```

```javascript
// src/verifier.js
const RULES = [
  { name: "output_not_empty", check: (task, output) => output.trim().length > 0 },
];

export async function verify(client, model, task, output) {
  for (const rule of RULES) {
    if (!rule.check(task, output)) return { pass: false, reason: `rule failed: ${rule.name}` };
  }
  const res = await client.messages.create({
    model,
    max_tokens: 256,
    system: "You are a strict verifier. Judge ONLY whether the output fulfills the task. First line: PASS or FAIL. Second line: one-sentence reason.",
    messages: [{
      role: "user",
      content: `<task>\n${task}\n</task>\n\n<output>\n${output}\n</output>`,
    }],
  });
  const text = res.content.find(b => b.type === "text")?.text ?? "";
  const pass = text.trim().toUpperCase().startsWith("PASS");
  return { pass, reason: text.split("\n").slice(1).join(" ").trim() };
}
```

主循环的 end_turn 分支改成这样（steps 和 verifyRounds 在循环外初始化为 0；main 的入参 userInput 这一版顺手改名叫 task——往后 subagent 和 eval 用的都是这个词）：

```javascript
if (res.stop_reason === "end_turn") {
  const output = res.content.find(b => b.type === "text")?.text ?? "";
  if (verifyRounds >= MAX_VERIFY_ROUNDS) {
    console.error(`[verify · rounds exhausted, unverified output — hand to human]`);
    return output;
  }
  const verdict = await verify(client, MODEL, task, output);
  console.error(`[verify · ${verdict.pass ? "PASS" : "FAIL: " + verdict.reason}]`);
  if (verdict.pass) return output;
  verifyRounds++;
  ctx.addUser(`[verifier] FAIL: ${verdict.reason}\nThe task is NOT done. Fix it and finish properly.`);
  continue;
}
```

四点讲透：

**一，withRetry 只重试"重试可能变对"的错。** 429/529/5xx 是服务端的临时状况，等一等换个时机就过；400（请求本身非法）重发一万次还是 400，重试它只是在给账单做贡献。判断口径就一句：**这个错是"时机不对"还是"内容不对"？** 前者退避重试，后者回去修内容。

**二，MAX_STEPS = 20 不是调出来的，是量出来的。** 我翻了自己一段时间的运行日志，正常任务绝大多数在 10 轮之内结束，20 是留了一倍余量的硬顶。它存在的意义不在精确，在**有**——blog01 说过，while(true) 头顶得有个盖。触发即 break，不商量、不"再给它一轮机会"——机会主义是步数债的利息。

**三，verify 是一次全新的 messages.create，不带任何历史。** 只有 task 和 output 两个变量进去，主循环的 messages 数组一个字节都不给。为什么这么绝情，4.3 的翻车段有血泪。

**四，FAIL 塞回去，但最多 2 轮。** verifier 的判决变成下一轮的 user message，模型看到具体原因，通常能修。但 verifier 自己也是概率的——万一它跟干活模型意见不合、来回打乒乓，那又是一笔新的步数债。所以 MAX_VERIFY_ROUNDS = 2：两轮还不过，停下来交给人，别让两个概率函数互相说服到天亮。

### 4.3 跑一下

正常路径，故意给一个容易交半成品的任务：

```
$ node src/agent.js "把 README 的安装步骤抽出来写到 docs/install.md，要求包含全部 5 个步骤"
[turn · tool_use=read_file]
[turn · tool_use=write_file]
[verify · FAIL: output only contains 3 of the 5 installation steps]
[turn · tool_use=read_file]
[turn · tool_use=write_file]
[verify · PASS]
done. docs/install.md 已写入，5 个步骤齐全。
```

第一轮它写了 3 步就宣布完工，verifier 打回；第二轮自己补齐。整个过程不需要我在场——这就是把"我顺手跑一遍字数脚本"这个动作，长进了循环里。

当然，verify 这一步自己也花钱——多一次独立调用，input 是任务加产出，output 顶天 256 token。值不值？算一下就知道：它拦下一次半成品，省掉的是你人工发现、人工描述问题、再跑一轮返工的全部成本；漏放一次半成品到生产，代价更不止这个数。**验收是成本，但比它便宜的只有事故之前的侥幸。**

再看 429 被接住的样子（我拿并发脚本压出来的）：

```
[retry · status=429 attempt=1 wait=1000ms]
[retry · status=429 attempt=2 wait=2000ms]
[turn · tool_use=list_dir]
```

等了 3 秒，过了，任务无感继续。没有这层，进程直接死在第 7 轮，前 6 轮攒的 context 和烧掉的 token 全部白费。

**翻车段（必备）**：v0.6 第一版的 verify，我把**整个对话历史**都传给了 verifier——想着信息越全判得越准，很合理对吧？结果它几乎全判 PASS。我抽查了一个明显没干完的 case，看它给的理由，大意是：模型已经多次尝试读取该文件并妥善处理了编码问题，从过程看，任务已经尽力完成。

我盯着"尽力"两个字看了很久。它**共情**了。它看到了干活模型一路的挣扎——试了三次、绕了两个弯、每一步都带着解释——然后像一个旁观了全程的同事一样，心软了。把输入改成只给任务描述和最终产出、一个字的过程都不给，同一批 case 重判，PASS 率立刻掉下来，判决冷酷得像换了个人。

其实没换人，换的是 context。**看得到过程，就会给过程分；只看得到结果，才会只给结果分。** 这就是为什么验收必须隔离上下文。这个原则后面还会再长大一次——blog08 讲 subagent 时你会看到，隔离上下文不只是验收的纪律，是多 agent 协作的地基。

### 4.4 一处映射：blog195 的验证债，和我的发布 cron

[blog195《Loop Engineering 三笔债》](/posts/blog195_loop-engineering-three-debts-playbook/) 里的第二笔债——验证债，本篇就是它的还债篇：tool 校验（blog03）管单步，verifier 管终局。

再给一个我自己生产里的例子。这个博客的发布流程是一个定时 cron：改发布 flag、构建、推送、线上 curl 验证。我给它的容错设计只有一条主线：**任何一步失败，先把已经改过的东西全部回滚，再退出**——build 挂了回滚 flag，push 被拒回滚 commit，curl 拿不到 200 同样回滚。要么走完，要么什么都没改，不留残局。

这才是 Error Boundary 心法在 agent 世界的完整移植：Error Boundary 的价值从来不是"拦住异常"，是**给用户一个可用的 fallback UI**，而不是半白的屏。agent 的 fallback UI，就是回滚到已知好状态——比"停在半路"好得多。半路状态是最贵的状态：你不知道哪些做了哪些没做，人工清理比重跑一遍还费劲。

### 4.5 Moonshot 注脚

> OpenAI 风格这一套几乎原样成立：429/5xx 的语义是 HTTP 通用的，openai SDK 也有内置重试（max_retries 参数），withRetry 的判断逻辑基本不用改——唯一一处：529 是 Anthropic 自家的过载码，OpenAI 侧没有，照搬时删掉那个分支即可；end_turn 对应 finish_reason: "stop"，被截断对应 "length"。verifier 更是纯客户端逻辑，跟哪家模型都无关。
>
> 一个实操差异：国内模型的低价档并发配额普遍更紧，429 会来得更频繁，退避参数建议更保守（baseMs 给到 2000 以上）——否则三次重试全打在同一段过载窗口里，等于没退。

## 5. 界：类比的边界

Error Boundary 这个类比撑得住的部分我认：分层兜底、fallback 心智、"错误不该炸穿整个应用"——都对，可以放心迁移。但有三条撑不住的，得说满。

**第一条：Error Boundary 拦得住 throw，拦不住"不报错的错"。** React 的错误边界靠异常触发——组件不抛，它永远沉默。而 agent 最贵的错恰恰不抛：模型自信满满做完错事，stop_reason 干净、日志无红字、退出码 0。对这种错，你写多少层 try/catch 都是零覆盖——**你需要的不是捕获，是验收**。这是从前端到 agent 最需要重写的一条直觉：容错的重心，从"接住异常"移到"审查成果"。

**第二条：前端的 retry 大多幂等，agent 的步骤常带副作用。** GET 重发十次，世界不变；但 agent 的一步可能是 write_file、发消息、下单。429 重试当然安全——请求根本没进门；可如果是"工具执行成功了，下一步才炸"，你敢把这一步整个重跑吗？文件会被写两遍，消息会发两条。所以 agent 的重试要落在**步的粒度**上，先问一句：**这步重跑安全吗？** 读操作放心重，写操作要么设计成幂等（写之前先查），要么别自动重。这也是 blog07 要给危险操作单独立一道门的原因之一。

**第三条：错误边界是组件树上的静态位置，agent 的失败点是动态的。** React 里你在树的固定位置放 ErrorBoundary，哪棵子树可能炸，编译期就圈好了。agent 不行——你不知道它这次会在第几步、用哪个工具、以哪种姿势翻车，失败点跟着模型的选择漂移。所以兜底不能设计在"树"这个粒度，得设计在"步"这个粒度：每步 API 调用有 retry、每步计数进 max_steps、每步工具结果有 is_error、终局有 verifier。**防线不是一堵墙，是每一步脚下的网。**

一句话收尾：**Error Boundary 教你别让一个组件炸掉整个页面；agent 教你，更难的是它什么都没炸，你还得知道活没干完。**

呼应系列 spine：blog01 说控制权交给了概率函数——选择是它的；blog02、blog03 说 context 是你喂的、执行是你握的。这一篇加上第四块：**它说"到了"，信不信是你的事**。给车装一个副驾考官——他不开车，只在它说"到了"的时候查一遍是不是真到了。前端工程化的那套直觉——错误边界、重试、CI——在这里全部成立，只是防御对象从用户的瞎点换成了模型的瞎说；而模型的瞎说，连报错都不给你一声。

## 6. 钩：下集

下一篇《给 AI 弹一个 window.confirm：权限、Hooks 与 human-in-the-loop》。

类比引子：retry 和 verifier 管的都是"错了怎么救"，但还有一类事是**对了也不能让它直接干**——rm -rf 重试三次终于成功了，这不叫容错，这叫灾难交付。有些操作的问题不在会不会失败，在**该不该发生**：删文件、改配置、部署上线。这类操作需要的不是更好的兜底，是一道执行前的闸——agent 版的 window.confirm，弹给你，不弹给它。

tiny-agent v0.7 会长出 `src/gate.js`：工具危险分级表加确认门，write 类工具执行前停下来等你敲 yes；拒绝会作为明确信号回给模型（blog03 的 is_error 又要出场）。`git checkout v0.7` 就能看到下一版：[github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent)。

在那之前给你留个作业：往 v0.6 的 RULES 数组里加一条你自己任务域的规则——写作类任务加字数下限，代码类任务加"测试退出码为 0"。跑上几天你会发现，规则 verifier 拦下的半成品比 LLM verifier 多得多——**最值钱的验收，往往是最不智能的那种**。
