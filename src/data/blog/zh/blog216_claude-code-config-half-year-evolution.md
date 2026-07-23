---
author: 陈广亮
pubDatetime: 2026-07-22T14:28:44+08:00
title: 从 OpenClaw 到 Claude Code：半年后我的配置演化账本
slug: blog216_claude-code-config-half-year-evolution
featured: true
draft: false
reviewed: true
approved: true
tags:
  - AI Agent
  - Claude Code
  - 自动化
  - 复盘
description: 当时留的两个 TODO 和一个遗憾如今全部翻篇，还长出四件当时想都没想过的东西：memory 变成规则中枢、Skills 进入流水线、双语 i18n 拉出第二条发布线、AdSense 事件反向重塑写作纪律。七条演化，一条一节，一份账本。
---

## 一份账本，不是宣言

三个多月前我写过 [blog115](/posts/blog115_openclaw-to-claude-code-migration/)——OpenClaw 停服那天，用 `claude -p` 加一份 Node.js 桥接把七个 Agent 两天救活的迁移记录。

当时留了两个 TODO 和一个明确的遗憾：`launchd` 因为 Keychain 权限问题放弃了、真正的 cron 还没跑起来、每次开机得手动 `./start.sh`。

三个多月过去。两个 TODO 兑现了、遗憾也解决了。真正让我意外的是——账本上多出四件当时想都没想过的东西：memory 从零变成跨会话规则中枢、Skills 生态出现并进了每日流水线、双语 i18n 拉出第二条完全独立的发布线、AdSense 拒审事件反向重塑了整套写作纪律。

这篇不讲"要不要迁到 Claude Code"，那事三个月前已经聊过。这篇是给已经在用的人看的：**迁了之后这几个月，会长成什么样。**

（标题写"半年"其实只有三个多月。写着写着才发现变化密度让人以为过了半年。这个错觉本身也是一个数据点。）

七条演化，一条一节。

## 一、launchd 复活了

blog115 里我写过一句话："launchd 因为 Keychain 权限问题放弃了。"这是老文最大的遗憾。

这条已经翻篇。`~/Library/LaunchAgents/com.agents.bots.plist` 常驻加载，跑的就是老文里那份 `start.sh watch`：

```xml
<key>ProgramArguments</key>
<array>
  <string>/bin/bash</string>
  <string>~/ai/agents/start.sh</string>
  <string>watch</string>
</array>
<key>RunAtLoad</key><true/>
<key>KeepAlive</key><true/>
```

关键突破不是 launchd 变了，是我换了思路。老文里想让 launchd 直接跑 `node bot.js`——那要 launchd 从 Keychain 里读 Telegram token，权限一路踩雷。现在让 launchd 只负责跑 `start.sh watch` 这个 shell 层，token 的读取仍然是老办法在 shell 里 `source ~/ai/.bot-tokens`。launchd 不碰凭据，它只做"进程守护"这一件事。

代价：`start.sh watch` 里那个 30 秒探活循环还得留着（launchd 的 KeepAlive 只在进程完全退出时重启，探不到"卡死但没退出"）。收益：Mac 睡醒、断电重启、系统更新，七个 bot 都能自己回来，我不再需要每天早上跑一遍 `./start.sh`。

## 二、openclaw 的遗产彻底断根

blog115 时我做的是"复用 OpenClaw 目录结构"——SOUL.md、TOOLS.md、MEMORY.md 这一整套命名和框架借得干干净净，凭据也还留在 `~/.openclaw/ai/credentials.json`。

这些遗产在 2026-07-17 被彻底清理。

2026-07-17 那天做了三件事：把 `~/.openclaw/` 整个 mv 成 `~/.openclaw.uninstalled-2026-07-17/`（打算 8 月中彻底删）、凭据统一迁到 XDG 风格的 `~/.config/agents-creds/credentials.json`、所有 bot workspace 里的 credential 读取路径改到新位置。

命名保留了。SOUL.md、TOOLS.md、MEMORY.md 这些命名沿用至今——好用的东西没必要为了"独立"而重命名。

## 三、bot.js 从 500 行长到 1145 行

老文里那份桥接层 500 多行。现在打开一看，`bot.js` 已经 1145 行。

不是失控膨胀。是从"能跑"进化到"能默默跑几个月不出事"多出来的那些东西：

| 能力 | blog115 时期 | 现在 |
|---|---|---|
| stream-json 解析 | 有 | 有 |
| `--resume` session 续接 | 有 | 有 |
| per-chatId Promise 队列 | 有 | 有 |
| watchdog 30 秒探活 | 有 | 有 |
| MCP 集成 | 无 | chrome-devtools + playwright，cron 可挂 |
| Telegram `/cron`、`/status` 命令 | 无 | 有 |
| HTTP `/health` 端点 | 有（简版） | 有（含各 bot 状态聚合） |
| pid 文件 + 端口探活 | pid 有、端口探活无 | 都有，`lsof -tiTCP:$PORT` 判活 |
| 日志轮转 | 无 | 有 |

其中"端口探活"这条踩过一个坑值得单独讲。最初我用 `sed -n '2p' logs/xxx.log` 从日志第二行判断进程是否启动成功——听起来很粗暴但意外好用了一段时间。直到某次 log 格式变了，第二行是空行，探活永远失败、watchdog 无限重启、CPU 拉满。换成 `lsof -tiTCP:$PORT` 判端口占用之后再没出过事。

一条经验：**别用日志内容判活。日志格式会变，端口不会。**

## 四、cron 从 setInterval 到真正的调度矩阵

blog115 时期 cron 是这样的：bot.js 里一个 `setInterval` 每分钟 tick，加两个 Anthropic 云端的 Remote Trigger 顶着博客选题和技术趋势。

现在的 cron 是这样的（`~/ai/agents/*/crons/` 下的 markdown 文件，被 bot.js 读取执行）：

| workspace | 任务 | schedule | 用途 |
|---|---|---|---|
| main | daily-tips | `0 9 * * *` | 每日技巧 + Skills 推荐 |
| main | git-sync | `0 22 * * *` | 配置同步 |
| main | memory-cleanup | `0 21 * * *` | 夜间 memory 整理 |
| main | system-check | `0 7,10,13,16,19 * * *` | 每 3 小时系统巡查 |
| main | ssl-reminder | `0 1 10 4 *` | SSL 证书年度提醒 |
| blog | blog-proposal | `0 8 * * 1,3,5` | 博客选题 |
| blog | tech-trends | `0 8 * * 2,4,6` | 技术趋势 |
| blog | hot-topics | `30 8 * * *` | 热门话题采集（挂 chrome MCP）|
| blog | cn-tech-trends | `30 9 * * *` | 中文社区监控（挂 playwright MCP）|
| blog | fe2agent-auto-publish | `0 9 * * *` | fe2agent 系列自动发布 |
| tools | tools-scan | `30 9 * * 1` | 竞品扫描 |

十一个启用、一个停用（`daily-article.md` 因为 AdSense 事件停了，见第八节）。cron 定义现在是 markdown 文件，frontmatter 里带 `model` `budget` `timeout` `tools` 细粒度约束：

```markdown
---
schedule: "0 9 * * *"
timezone: Asia/Shanghai
model: claude-opus-4-7
budget: 100000
timeout: 3600
tools: ["Read", "Write", "Edit", "Bash"]
---
```

MCP 是这层调度里当时完全没预见的能力。老文时期"每天 8:30 采集热榜"是幻想——`fetch` 拉不到 SPA 页面、`puppeteer` 装起来太重、真装了写脚本也难长期维护。chrome-devtools 和 playwright 两个 MCP 进来之后，cron 里直接一句自然语言"打开某站点、按人气排序、抓前 20 条标题和链接、写进 hot-topics/$(date +%Y-%m-%d).md"就跑通了。

## 五、双语 i18n 拉出第二条流水线

blog115 是单语博客时代的产物。老文里发一篇的流程是：写 → build → deploy。

2026-06-10 起走上了双语 i18n。现在 `src/data/blog/` 下分 `zh/` 和 `en/` 两个目录，同一篇文章两个文件，`enhanced-publish.js` 是双语同步的强制入口——**缺英文版会直接中断发布**。这个约束是架构级的，不是流程规范，绕不过去。

发布流程从 3 步长成 7 步铁律（`~/.claude/projects/-/memory/project_blog-publish-workflow.md` 里的 164 行是它的权威来源）：

1. 起草中文 `draft: false`
2. 子 agent 6 维度审校中文
3. 中文完稿贴给我过目，等 A/B/C 三选一
4. 翻译英文
5. 子 agent 审英文翻译
6. build + push + SSH 部署
7. X 推文（英文 URL）+ 掘金（中文 URL）+ 更新 `.last-deploy-commit`

第七步里有个当时不明显的取舍值得讲。**X 推文一律走英文 URL，掘金保留中文 URL。** 原因很实用：X 上的技术受众英文更主流、英文版能吃到全球流量；掘金是中文社区，中文 URL 让读者点进去就是中文，不给他们看到 `/en/posts/...` 再手动切语言。

186 篇存量批量翻译时踩过一个小坑：`detect-new-posts.sh` 最初同时数 `zh/` 和 `en/`，同一篇被算两次触发两次通知。后来改成"只数 `zh/`，英文视作 zh 的翻译产物"才对上账。

## 六、memory 从笔记本进化成规则中枢

blog115 时期完全没 memory 系统——那时 Claude Code 的 auto-memory 还没铺开，我的"跨会话记忆"就是把重要的东西写进 CLAUDE.md 或者靠自己每次重新讲一遍。

现在光 `~/ai/agents` 这一个项目上下文的 memory 就 25 个文件，主体三类：

- **feedback（12 条）**——协作反馈类。比如"发现值得记的直接存，别问要不要存"、"私有项目在博客里必须替换为中性占位"、"写 pubDatetime 必须先跑 `date` 命令"。
- **project（3 条）**——正在跑的长期项目。比如 fe2agent 系列的 126 行主计划（10 主线 + 3 番外 + 每篇发布状态表）。
- **reference（8 条）**——不变的事实指针。比如 `post-to-x.sh` 的用法、博客通知专属 Telegram 频道的定位、cron 文件在哪个目录。

另外还有 1 条 `rule-weekly-cap`（每周文章上限规则）和 MEMORY.md 索引，加起来正好 25 个文件。

每条 memory 现在都按三段式写：

```markdown
---
name: blog-anthropic-api-claims-verify
description: 涉 Anthropic API 断言必先跑 claude-api skill 核对
metadata:
  type: feedback
---

**规则**：fe2agent 系列或任何涉及 Anthropic API 参数、定价、
特性的断言，起草前必须先跑一次 `claude-api` skill 交叉验证。

**Why**：blog02 首发那版把 `cache_control` 写在了 tools 数组
上，实际 API 只在 messages 里生效。硬伤过审、上线才发现。
根因是我凭印象写、没查文档。

**How to apply**：起草涉 API 章节前 → 调用 `claude-api` skill →
用它返回的字段和默认值写。写完再让子 agent 审校时把"API 断言
是否核对过"作为独立一维打分。

**相关**：[[project_fe2agent_series_plan]] · [[feedback_deliver_zh_md_before_translate]]
```

这条规则是从血教训里长出来的。blog02（fe2agent 系列第二篇）首发那版就是没查文档凭印象写、`cache_control` 位置写错、过审上线才被发现。修完之后我做的不是"下次记得查"，是把这条流程固化成一条 feedback memory，并把"API 断言核对"变成子 agent 审校的独立一维。

**这就是 memory 的价值——把一次事故变成一条持续生效的规则。**

## 七、Skills 从零到"三个自建 + 系统一整套"

blog115 里完全没提 Skills。那时 Claude Code 的 skill 生态还没成型，我也没造过任何一个。

现在自建了三个：

- `audit-website`（用户级）——包 squirrelscan CLI 的 230+ 规则做网站扫描，SEO / 性能 / 安全一起过。给自己的博客做过五轮。
- `humanizer-zh`（blog agent 项目级）——去除中文文本里的 AI 生成痕迹，基于维基百科的"AI 写作特征"综合指南。
- `writer`（blog agent 项目级）——修复段首词雷同、节奏单调、`this/the/it` 陷阱这类 AI 写作模式。

系统 Skills 里进入每日流水线的三个是 `claude-api`、`verify`、`code-review`。其中 `claude-api` 已经被 memory 明确要求成前置步骤（见上一节那条规则）——**任何 Anthropic API 相关的断言，起草前先跑一次 `claude-api` skill 交叉验证**。

一条经验：Skills 真正好用是当它进入 memory 的强制 checklist、而不是"哦对我知道有这个"。有多少个 skill 不重要，有多少个 skill 变成不可绕过的流程步骤才重要。

## 八、账本背后的三条元规律

七节写完，回头看这几个月的变化，能拎出三条元规律：

**元规律一：每一次事故都被固化成 memory / cron / skill 三件套里的一件。** `cache_control` 位置写错 → 一条 memory；日志格式变了导致 watchdog 无限重启 → bot.js 里换 `lsof` 判活；X 推文断了近四个月才被发现 → `post-to-x.sh` 加日志。不是"下次记得"，是"这次之后不可能再犯"。

**元规律二：自动化的边界永远在"能不能默默失败"。** 老文里我引以为豪的 watchdog + 重试逻辑其实只解决了"进程会挂"这一类失败。真正让我这几个月踩最多的是"进程还在跑但结果没出来"——cron 静默跳过、API 静默返回空、Telegram 消息静默丢包。**有告警能被发现的失败才是可接受的失败。** 这几个月下来 bot.js 里加最多的不是新功能，是各种角落的 `console.log` 和 Telegram 通知。X 推文管线断了近四个月才被发现（因为它默默失败、没告警）——这个教训直接推动了 `post-to-x.sh` 每次都写日志的规则。

**元规律三：工具升级追不上工作方式升级。** Claude Code 这几个月给了 Skills、Auto-memory、MCP 这一堆新玩意，但真正让效率上台阶的不是这些工具本身，是"memory 三段式模板"、"写完先贴过目再翻译"、"审校拆成独立维度打分"这些工作方式的固化。工具是砖，工作方式才是墙的形状。

## 下一次账本

两个 TODO 留给下一份：

- `hot-topics` 采集积累了 4 个多月，该到"从采集到成稿"自动化管线的整合时候了
- memory 已经 25 条，需要一次"整理成小册子"的复盘（哪些规则已经内化可以删、哪些还在生效但表述过时）

下一份账本再见。

## 相关阅读

- [OpenClaw 停服之后——用 Claude Code CLI 重建多 Agent 自动化体验](/posts/blog115_openclaw-to-claude-code-migration/) —— 本文的前传，讲两天迁移的完整过程
