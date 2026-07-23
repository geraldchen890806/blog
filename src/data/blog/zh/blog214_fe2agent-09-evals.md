---
author: 陈广亮
pubDatetime: 2026-08-08T09:00:00+08:00
title: "Flaky 不再是 bug，是本体：前端测试思维怎么迁移到 Eval"
slug: blog214_fe2agent-09-evals
featured: true
draft: true
reviewed: false
approved: false
tags:
  - AI Agent
  - 前端
  - 开发效率
  - Claude Code
description: 前端里 flaky test 是要修的 bug，agent 世界里 flaky 是本体——同一个任务跑 10 次，7 次完美、2 次啰嗦、1 次自信地错。exact match 必死、单次结果不说明任何事、评测集是你的伤疤集。这是 fe2agent 系列第 9 篇，配 tiny-agent v0.9（evals 用例集 + 多次采样跑通过率 + LLM judge）。
---

## 1. 坑

前端时代，flaky test 是要修的 bug。CI 上一条测试今天绿明天红，你重跑三次、加 waitFor、mock 时钟、锁定网络请求，总能修到它稳定变绿——"flaky"这个词本身就带着道德批判，意思是"这测试写得不干净"。

上个月我给 tiny-agent 写"测试"：同一个任务——"把 README 第一行提取出来写到 tmp.txt"——跑 10 次。7 次干净利落；2 次啰嗦但结果对，比如出发前把 `list_dir` 连调三遍；还有 1 次是自信地错：它把整个 README 全文写了进去，然后向我汇报"已完成，内容一行"。我盯着这个 7/2/1 看了很久，本能地想"修"——加一句 prompt、换个措辞、把任务描述写得更死。折腾一晚上，比例变成 8/1/1；第二天早上再跑，又回到 7/2/1。

后来我反应过来：**我修的不是测试，是我对"通过"两个字的执念**。在一个概率函数上面，flaky 不是待修的 bug，是系统的本体。你要做的不是把那个 1 修成 0，是先能把它测出来——知道它是 10% 还是 1%，知道你改完 prompt 之后它变成了多少。测不出来，你连自己刚才那一晚是在优化还是在抽签都不知道。

这是《从 useEffect 到 Agent Loop》系列第 9 篇。blog08 结尾说：一个 agent 靠 verifier（blog06），一群 agent 靠统计。而 [blog01](/posts/blog206_fe2agent-01-agent-loop/) 更早就埋了话——"测试从判断题变成了统计题"。这一篇把这句话兑现。

## 2. 桥

一句话：

> **jest 断言的是"输入 A 必出 B"，eval 断言的是"输入 A 出对的比例大于九成"——判断题变统计题，绿灯变及格线。**

```
Jest:                         Eval:

  input A                        task A
    │                              │
    ▼                              ▼
  expect(f(A)).toBe(B)          跑 N 次 → ✓✓✓✗✓
    │                              │
  红 / 绿（二值）                通过率 80%（分布）
  修到绿为止                     给分布画一条及格线
```

左边跑一次就能下结论；右边单次结果不说明任何事——你要的是分布，和一条你自己定的线。

## 3. 真

### 3.1 exact match 为何必死

前端断言的地基是 `expect(output).toBe(expected)`：输出和期望逐字符相等。这个地基在 agent 上一天都站不住——同一个正确答案有一万种说法。"tmp.txt 已创建"和"我已经把第一行写进了 tmp.txt"都是对的，`===` 只认一个。在概率函数上断言"输出严格等于 X"，约等于断言"抛硬币永远正面"：不是标准太高，是标准的形状就错了。

前端其实吃过一次形状相近的亏：snapshot test。把整棵渲染树快照下来逐字符比对，听着严谨，结果改个无关 class 名就红一片，最后人人闭眼 `--updateSnapshot`，断言形同虚设。对 LLM 输出做 exact match 是加强版的同一个错误——快照至少还有"代码没改就必相等"兜底，模型连这条都不给你。出路也是同一个方向：**别断言全文，断言性质**。

替代方案有三层，按优先级排：

**一，规则断言。** 能用机器判的尽量用机器判：JSON 能不能 parse、文件存不存在、测试跑没跑过、输出里有没有包含关键实体。确定、免费、毫秒级——这是 blog06 里"规则 verifier 优先于 LLM verifier"那条纪律在测试域的直接平移。

**二，rubric 打分。** 有些"好"没法一条正则判掉，那就把"好"拆开：拆成一条条**可判**的维度——"是否创建了目标文件""内容是否只有一行""是否没有动别的文件"。每条单独判 PASS/FAIL，比一个笼统的"输出质量高"可靠一个量级。拆不出可判项的 rubric，等于没写（下面 4.3 翻车段就是这一条的学费）。

**三，LLM-as-judge。** rubric 里总有几条只有语言模型才判得动（"摘要是否忠实原文"）。那就让另一个模型按 rubric 打分——但记住两件事：judge 自己也是概率的，你得定期抽查校准（人工复核 20 条它的判决，算你和它的一致率）；以及别让它既当运动员又当裁判——judge 的调用必须是独立的、不带干活历史的，blog06 里 verifier 共情翻车那一课，在 eval 里要固化成架构。

blog04 讲 prompt 时留过一句：prompt 优先级的裁判不是规范，是 eval。blog05 讲记忆时也留过一句：召回质量本身也要 eval。两张欠条，这一篇一起还。

### 3.2 从断言到分布：temperature=0 也救不了你

有同学会说：把 temperature 调成 0，模型不就确定了吗？判断题不就回来了吗？

blog01 界里我写过一句："temperature=0 也不完全稳定——batch 调度 / 浮点误差都会让它抖，第 09 篇 eval 会展开。"现在展开。

temperature=0 意味着贪心解码：每一步都选概率最高的那个 token，理论上同输入必同输出。但推理服务端是按 batch 跑的——你的请求跟谁拼进同一个 batch、矩阵运算被切成什么形状，是调度器每次临时决定的。而浮点加法不满足结合律：`(a+b)+c` 和 `a+(b+c)` 在小数点后十几位就是不相等。求和顺序一变，算出来的 logits 就微抖一下。大多数时候抖不出事——第一名遥遥领先，抖一抖还是它；可一旦某一步的前两名本来就咬得很紧，这点微抖就够让 argmax 翻面，选中另一个 token。而生成是自回归的，一个 token 咬着一个 token——临界处翻一次面，后面整段就走上另一条路。不是玄学，是并行计算的账。

所以结论很干脆：**单次结果不说明任何事**。工程做法是把"跑一次看对错"换成"跑 N 次看比例"：

- **通过率**：同一条用例跑 N 次，通过 M 次，M/N 就是这条用例的分数。适合回答"它稳不稳"。
- **pass@k**：k 次里至少过一次就算过。适合回答"它到底能不能做到"——探索性任务常用。
- **阈值**：通过率 ≥90% 算绿、80–90% 算黄、再往下算红。线画在哪是你的产品判断，但必须画——没有及格线的跑分只是一堆数字。

N 取多大也是个统计常识问题：跑 5 次全过，真实通过率照样可能只有七成——样本越小，数字越像谣言。我自己的用法是日常回归 5 次（省钱、够看趋势），动了 prompt 或换了模型跑 10 次，发版前对关键用例跑 20 次。每一次都是真金白银的 API 调用，所以 N 是精度和账单之间的滑杆——这笔账和 blog02 的 token 账是同一个钱包出的。

前端你调试靠 F12，agent 你调试靠民调。blog01 说过"一个是查案，一个是做民调"——当时是句比喻，现在它是你的 CI 脚本里的一个 `--runs=5` 参数。

### 3.3 回归集怎么攒：评测集是你的伤疤集

最常见的死法是反过来的：兴冲冲要"建设评测体系"，坐下来凭空设计 100 个用例，覆盖各种"典型场景"——两周后这 100 条里 90 条永远全绿（因为是顺着模型能力编的），剩 10 条你自己都说不清判断标准。大而假，不如小而真。

真用例只有一个来源：**翻过的车**。我给你讲我评测集里资历最老的一条。blog02 初稿里我写过一句断言："cache_control 只能加在 system 上，加在 tools 上无效。"听起来很专业，我自己通读三遍都没起疑——是流程里的第二个审查 agent 逮住的：它的 brief 里有一条"API 行为断言必须能给出依据"，它找不到这条的依据，就标了出来。事实是 cache_control 可以加在 tools 数组最后一个 tool 定义上，发布版已修正。从那天起，我的评测集里多了一条固定用例：给审查 agent 一段夹带错误 API 断言的稿子，check 是"它是否点名了那条断言"。这条用例后来又抓到过两次同族的错。

这就是回归集的攒法：**每次线上翻车、每次审查逮住一个错，固化成一条用例**——和前端"每修一个 bug 补一条回归测试"是同一块肌肉。评测集不是考纲，是伤疤集；它不证明你的 agent 有多强，它保证翻过的车不再翻。而且伤疤用例天然带着两样凭空设计给不了的东西：真实的输入分布（它就是从生产里来的）和明确的判断标准（当时错在哪一清二楚）。十条这样的用例，比一百条"典型场景"值钱。

攒起来之后，eval 要进 CI 心智：改 prompt、换模型、动工具 description，前后各跑一遍，diff 通过率。blog04 说 prompt 没有 devtools，你改一行没有任何反馈——这就是答案：**eval 就是你自己造的 devtools**。没有它，每次改 prompt 都是闭眼拧方向盘。

## 4. 干：tiny-agent v0.9

### 4.1 v0.9 长出什么

`git checkout v0.9` 就能看到：[github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent)。相比 v0.8，长出三件事：

- 新目录 `evals/`：`cases.json` 用例集，每条 = id + task + checks 数组，check 有 `file_exists` / `contains` / `llm_judge` 三种类型
- 新文件 `src/eval.js`：`node src/eval.js --runs=5`，每条用例跑 5 次，输出"用例 × 通过率"表格，低于阈值的用例让进程退出码非 0——CI 就认这个（为了让 eval 调得动，agent.js 这一版把 main 重构成可导出的 `runAgent(task, { cwd })`，CLI 变成一层薄壳）
- `llm_judge` 走一次独立的 `messages.create`：不带任何对话历史，只带 rubric 和最终产出（blog06 verifier 的隔离教训，固化进代码）

### 4.2 核心代码

先看 `cases.json` 里的一条（就是本文开头那个任务）：

```javascript
{
  "id": "write-one-line",
  "task": "把 README 第一行提取出来写到 tmp.txt",
  "checks": [
    { "type": "file_exists", "path": "workspace/tmp.txt" },
    { "type": "contains", "path": "workspace/tmp.txt", "text": "# tiny-agent" },
    { "type": "llm_judge", "rubric": ["tmp.txt 的内容是否只有一行", "是否没有创建或修改除 tmp.txt 之外的文件"] }
  ]
}
```

再看 `src/eval.js` 的骨架：

```javascript
// 无人值守：确认门自动放行（blog07 那个显式逃生口），否则第一次 write 就挂在 readline 上
process.env.TINY_AGENT_AUTO_APPROVE = "1";

import { existsSync, readFileSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { runAgent } from "./agent.js";

const client = new Anthropic();
const MODEL = "claude-opus-4-7";
const THRESHOLD = 0.8;

async function runCheck(check, output) {
  if (check.type === "file_exists") return existsSync(check.path);
  if (check.type === "contains") {
    return existsSync(check.path) && readFileSync(check.path, "utf-8").includes(check.text);
  }
  if (check.type === "llm_judge") {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 256,
      system: "You are a strict grader. For each rubric item answer PASS or FAIL with a one-line reason. Last line: VERDICT: PASS (only if every item passed) or VERDICT: FAIL.",
      messages: [{
        role: "user",
        content: `<rubric>\n${check.rubric.map((r, i) => `${i + 1}. ${r}`).join("\n")}\n</rubric>\n\n<output>\n${output}\n</output>`,
      }],
    });
    return /VERDICT:\s*PASS/.test(res.content.find(b => b.type === "text")?.text ?? "");
  }
  return false;
}

async function runCase(c, runs) {
  let passed = 0;
  for (let i = 0; i < runs; i++) {
    rmSync("workspace", { recursive: true, force: true });
    mkdirSync("workspace");
    // 用例假设 workspace 里有 README——不 seed 就必挂；固定内容，判定才可复现
    writeFileSync("workspace/README.md", "# tiny-agent\n\nA minimal AI agent.\n", "utf-8");
    const output = await runAgent(c.task, { cwd: "workspace" });
    let ok = true;
    for (const check of c.checks) ok = ok && await runCheck(check, output);
    if (ok) passed++;
  }
  return passed / runs;
}

const runs = Number(process.argv.find(a => a.startsWith("--runs="))?.split("=")[1] ?? 5);
const cases = JSON.parse(readFileSync("evals/cases.json", "utf-8"));
let below = 0;
for (const c of cases) {
  const rate = await runCase(c, runs);
  console.log(`${c.id.padEnd(24)} runs=${runs}  rate=${(rate * 100).toFixed(0)}%`);
  if (rate < THRESHOLD) below++;
}
process.exit(below ? 1 : 0);
```

四点讲透：

**一，checks 的顺序是成本顺序。** `file_exists` 和 `contains` 同步、免费、非黑即白；`llm_judge` 要花一次 API 调用的钱，还自带概率。所以便宜且确定的排前面，`ok && await runCheck(...)` 的短路保证：机器判都没过的产出，不用再花钱请 judge。规则判优先于 LLM 判——blog06 定过的顺序，在 eval 里原样成立。

**二，judge 不带历史。** `llm_judge` 那次调用里只有 rubric 和最终产出，没有干活过程的一个字。blog06 翻过的车：verifier 看到干活模型一路多努力，就"共情"放水；不给过程只给结果，判决立刻变冷酷。验收要隔离上下文——当时是一条经验，现在是一行架构。

**三，每次跑之前重置 workspace。** 这就是 jest 的 `beforeEach`。但 agent 世界里脏状态更阴险：上一轮跑剩的 tmp.txt 不只会让 `file_exists` 假阳性——agent 自己会"发现"这个遗留文件，然后顺着它推理（"已经有 tmp.txt 了，看来任务做过了"），把整条用例带进沟里。用例之间必须干净起步。顺带钉死 `cwd` 的语义：runAgent 把它透传给工具层，所有 path 按 `resolve(cwd, path)` 解析——不是 process.chdir，不然下一轮 `rmSync("workspace")` 的相对路径就跟着漂了。

**四，退出码按阈值。** 这是 eval 进 CI 的钥匙：改 prompt 提 PR，流水线跑 `node src/eval.js --runs=5`，通过率掉穿 80% 就红灯。从此"我感觉这版 prompt 更好了"这句话在你的仓库里失去发言权——数字说话。

### 4.3 跑一下

```
$ node src/eval.js --runs=5
write-one-line           runs=5  rate=80%
memory-recall-top3       runs=5  rate=100%
fact-assertion-check     runs=5  rate=60%
1 case below threshold 80% → exit 1
```

三条用例：第一条是开头那个写文件任务（80%，那个"整篇 README 塞进去"的老毛病 5 次里犯了 1 次）；第二条是 blog05 欠的账——给 `search_memory` 三个查询，判 top3 里有没有该命中的那条笔记；第三条就是 cache_control 那道伤疤，60%——审查 agent 5 次里有 2 次没点名那条错误断言。红灯，退出码 1。这个 60% 后面还有故事。

**翻车段（必备）**：`fact-assertion-check` 这条用例的第一版，rubric 我是这么写的："评价这个审查输出好不好。"跑 5 次，judge 全给 PASS，通过率 100%，我还挺欣慰。直到有一次我人工翻了翻它判过的产出——有一份审查输出根本没提那条错误断言，只夸了排版，judge 照样 PASS，理由是"输出结构清晰、语气专业"。**因为"好"没有定义，judge 就自己找了个能夸的维度**——它比干活模型还宽容。我把 rubric 改成三条可判项："是否点名了那条错误的 API 断言""是否给出了正确说法""是否没有误报正常内容"，通过率从 100% 直接掉到 60%。掉下去的那 40% 不是 judge 变严了，是真相本来就在那——之前是我的 rubric 糊住了它。教训一句话：**模糊的 rubric 测不出模糊的模型**。你拿"好不好"去问一个概率函数，它只会还你一个概率性的客气。

### 4.4 一处映射：blog195 验证债的最后一块拼图

[blog195《Loop Engineering 三笔债》](/posts/blog195_loop-engineering-three-debts-playbook/) 里的验证债，blog06 还了第一期：单次任务的 verifier。eval 是最后一块拼图——verifier 管"这一次干完没"，eval 管"这个系统长期靠不靠谱"。

我自己的写作流程现在整个就是一套天天在跑的评测集：起草 agent 交稿，二审 agent 按固定 rubric 挑刺（两个 judge），主流程独立跑字数脚本核对（一条规则 check，blog06 讲过的"永远不信 agent 自报"就是它）；每次有错漏穿透到发布，就固化一条新用例。没有哪天"专门做 eval"，eval 长在流程里。顺带一句：从各家模型厂公开的评测文档看，rubric + 多次采样也是业界的主流路数——你不是在用土办法。

### 4.5 Moonshot 注脚

> eval 层是模型无关的：`cases.json` 和三种 check 一行都不用改，换 Moonshot / DeepSeek 只是 `runAgent` 里的 client 换掉（blog01 注脚讲过的两处改动）。有两点值得说：一，judge 模型可以和干活模型不同家——甚至建议不同家，减少"同源审同源"的口味偏好；二，OpenAI 系提供 `seed` 参数和 `system_fingerprint` 想让采样可复现，但官方口径也只是 best effort，不承诺完全确定——**多次采样看分布这件事，换哪家都省不掉**。评测集反而是你换模型时唯一可信的依据：别看厂商跑分，跑你自己的伤疤集。

## 5. 界：类比的边界

前端测试的心智大半能平移过来：回归集、beforeEach、CI 红绿灯、"修 bug 先补用例"——都成立，放心用。但有三条撑不住的，得说满。

**第一条：前端断言非黑即白，eval 是给分布画及格线。** jest 跑一次就能下结论，因为函数是纯的；eval 单次结果什么都不是。这条的推论很日常：看到别人晒"我们的 agent 一次就搞定了"是吹牛，看到自己 agent 翻一次车就骂"这模型不行"是骂街——样本量为 1 的结论，正反都一文不值。统计题的世界里，判断题式的发言全体作废。

**第二条：jest 的绿是"这段代码对"，eval 的绿是"这个系统这周对"。** 前端测试一旦变绿，只要代码不动，它就一直绿——绿是性质。eval 的绿有保质期：模型供应商一次静默升级、你改一行 prompt、某个工具 description 换个措辞，上周的绿就可能作废。所以 eval 不是上线前的一次验收，是持续测量——这也是为什么它得进 CI 而不是进 checklist。上线之后怎么把它变成日常体检，blog10 会讲。

**第三条：覆盖率心智失效。** 前端 100% coverage 有明确定义：每行代码都被执行过，分母是有限的。agent 的输入空间是自然语言——无穷维、没有边界，不存在"覆盖完"这回事，任何"我们的评测覆盖了所有场景"都是修辞。你追求的从来不是全覆盖，是**翻过的车不再翻**：伤疤集的分母不是"所有可能"，是"我付过学费的部分"。这个分母会一直长，这不丢人，这就是这门手艺的形状。

一句话收尾：**前端测试证明"它是对的"，eval 只承诺"它错的方式我都见过"。**

呼应 spine：方向盘交出去之后（blog01），你管住了它看什么（blog02）、能干什么（blog03）、说话规矩（blog04）、记什么（blog05）、错了怎么救（blog06）、哪些事必须问你（blog07）、活多了怎么分（blog08）——到这一篇，你终于有了一块看清它开得好不好的仪表：**你不再盯着每一次转向，你统计一千次转向里它压线几次**。防的还是"模型的瞎说"，用的还是前端那块测试肌肉，只是断言换成了分布。Agent 工程是在一个不确定的函数之上建立工程确定性——而 eval，就是那份确定性的度量衡。这不是额外的仪式感，是你写 agent 之后回不去的新地基。

## 6. 钩：下集

下一篇《从抠 bundle 到抠 token：把 Agent 送上生产，再给它一张脸》，系列主线收官。

类比引子：评测过关，你终于敢把 agent 送上生产——上去才发现新大陆：tracing（network 面板的 agent 版，没有它生产事故没法查）、成本熔断（blog01 埋的第三个钩"烧钱失控"，欠了九篇，第 10 篇兑现）、限流与鉴权。以及一个前端人最熟悉的结局：agent 总得有张脸——聊天窗、流式输出、确认按钮，兜兜转转，最后还是要写前端。

tiny-agent v1.0 会长出：**trace 记账（每步一条 span）+ 美元预算熔断 + checkpoint 续跑**。`git checkout v1.0` 就能看到收官版：[github.com/geraldchen890806/tiny-agent](https://github.com/geraldchen890806/tiny-agent)。

在那之前给你留个作业：翻出你自己 agent 最近一次翻车的记录，把它写成 `cases.json` 里的一条，跑 `node src/eval.js --runs=10`。你会知道它到底是 10% 的病还是 60% 的病——这两种病的治法完全不同，而在你跑出这个数字之前，你开的每一副药都是猜的。
