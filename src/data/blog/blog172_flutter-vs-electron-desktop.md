---
author: 陈广亮
pubDatetime: 2026-05-28T15:30:00+08:00
title: Flutter Desktop vs Electron：从"谁在迁走、谁还在用"看 2026 桌面端选型
slug: blog172_flutter-vs-electron-desktop
featured: true
draft: false
reviewed: true
approved: true
tags:
  - 前端
  - 开发效率
  - 工具
  - 开源
description: 不做枯燥的对比表。本文从 2026 年实际产品的去留反推选型逻辑——VS Code / Slack / Claude Desktop 为什么押注 Electron，Ubuntu 26.04 桌面环境为什么转向 Flutter，Teams / Zed 又为什么离开。
---

最近 Ubuntu 26.04 LTS 把整个桌面环境（安装器、文件管理器、应用商店、系统设置）从 GTK 全面切换到 Flutter，这件事让我重新审视一个被聊烂的话题：Flutter Desktop 和 Electron 到底谁更适合做桌面应用。

网上类似的对比文有几十篇，但大多停在 bundle size、内存占用这些**单点指标**上——好像谁数字小谁就赢。真实的情况要复杂得多。我这篇换个角度：从 2026 年**实际生产环境**的产品去留来反推适用场景。哪些公司还在押注 Electron、哪些已经迁走、Flutter 真正赢在哪、Electron 凭什么死撑——把这些选择背后的逻辑想清楚，比看一张静态对比表实用得多。

## 先看数字：差距确实很大，但要看怎么读

绕不开的硬指标先列出来，这部分网上数据高度一致：

| 维度 | Flutter Desktop | Electron |
|---|---|---|
| Hello World 安装包 | ~25-30 MB | ~150-165 MB |
| Idle 内存 | ~90 MB | ~180 MB |
| 复杂应用内存（非同款应用对比） | ~170 MB | ~2.2 GB（Slack/Discord 极端案例） |
| CPU 占用 | ~130% | ~215% |
| GPU 占用 | ~13% | ~41% |

数字看着 Flutter 完胜——但这里有个**容易被忽略的解读偏差**。Electron 那 2.2GB 内存的极端数据，通常来自 Slack / Discord 这种长时间运行、加载海量历史消息和多媒体的应用；同样体量的 Flutter 应用如果真去做内嵌富文本 + 多媒体 + WebRTC，内存也不会便宜到哪里去。Flutter 的优势主要在于**起点低**——同样的"中等复杂度生产力工具"，Flutter 的基线就比 Electron 省一半起步。

更重要的是另一组数据：**Electron 30+ 在内存优化上做了不少功课**——Discord 修了 9+ 处内存泄漏 + 加了"闲置 30 分钟且内存 > 4GB 自动重启"的保险丝；VS Code 的 Piece Tree 数据结构让大文件编辑内存可控；Slack 2019 单进程合并把内存砍了 50%。**Electron 应用的内存表现非常依赖于厂商的工程投入**——这是数字对比表读不出来的事实。

## 谁还在用 Electron：四类典型场景

2026 年仍然押注 Electron 的应用名单本身就有故事可讲：

**插件生态驱动型**：VS Code 75.9% 开发者占有率、Cursor 1M+ DAU（VS Code fork）、Claude Desktop / Codex Desktop——这些都和 VS Code 共享代码或扩展模型。**插件生态才是真正的护城河**，离开 Electron 等于推倒所有扩展开发者的工作。Cursor 2025 年底 ARR 增长 +9900%，靠的就是"无缝继承 VS Code 扩展"——换个框架这件事根本做不到。

**Web 团队跨端复用**：Slack、Notion、Figma、Claude Desktop 都明说"和 web 端共享代码以保持一致体验"。Notion 100M+ MAU，整个产品逻辑围绕 web 构建，Electron 让"再做个桌面版"几乎零成本。

**性能瓶颈用其他语言挖深**：Discord 把语音处理、噪声抑制、H.264 编解码通过 N-API 放进 C++ 原生模块；Signal Desktop 的加密层是 Rust 实现的 libsignal-client；Figma 的编辑引擎是 WebAssembly。**模式很清晰：UI 留在 Electron，性能关键的核心写在其他语言里**。这套混合方案让 Electron 应用的天花板远比"全 JS"高。

**OpenAI ChatGPT Windows 版**：这个案例特别有意思。**Mac 版是原生 Swift / AppKit，Windows 版是 Electron（~260MB）**——同一家公司、同一款产品，平台不同选择不同。原因 OpenAI 工程师说得很直白：Windows 上的快速迭代速度优先于内存效率。这反映了 2026 年一个普遍现象：**Mac 用户对原生体验的容忍度低，Windows 用户对内存占用的容忍度高**。

## 谁离开了 Electron：三类决断

迁走的名单同样能反推选型逻辑：

**Microsoft Teams（Electron → WebView2，2023-10）**：决定性数据是安装包 134 MiB → 12 MiB、内存减半。Microsoft 自己有 WebView2 这张牌可以打，把 Chromium 的"系统级共享"做出来——其他公司没这个底牌。Teams 这个迁移路径**不可复制**：除非你能假设用户机器上已经有现成的 runtime（macOS 上的 WKWebView、Windows 上的 WebView2），否则你只是把同样的 150MB 换个地方装。

**Zed（Rust + GPUI，从零造）**：Atom 团队原班人马，理由很硬——"Electron 的 Chromium 模型达不到我们要的延迟目标"。Zed 主打的是"代码编辑响应速度"，输入到屏幕的延迟要压到毫秒级，Chromium 的 render pipeline 中间隔了太多层。**这是个非常少数的场景**：你的产品核心价值就是"比对手快几十毫秒"，否则不值得为此重写一切。

**WhatsApp（Electron → UWP → WebView2，绕了一大圈）**：迁回 thin wrapper 后实际反馈"反而更卡"。这个反面教材说明：迁移本身有风险，技术债换个地方还在，框架不是银弹。

## Flutter Desktop 真正赢在哪：Ubuntu 26.04 这个案例

Canonical 把 Ubuntu 26.04 LTS 的核心桌面应用（安装器、文件管理器、应用商店、系统设置、固件更新）**全部用 Flutter 重写**——这是迄今为止 Flutter Desktop 最大规模的生产部署。

为什么是 Flutter 而不是 Electron？三个原因值得拆：

1. **系统级应用容不下 150MB 的 hello world**。Ubuntu 安装器要塞进 ISO 镜像里，每多 100MB 就是真金白银。
2. **Linux 桌面环境的统一审美**。GTK / Qt 各家应用风格不一是 Linux 桌面长期痛点，Flutter 自绘 UI 反而能强制做出统一视觉。
3. **跨平台延伸价值**。Canonical 之后可以把同一套应用做到 IoT 设备、嵌入式终端、未来的 Ubuntu Touch——Electron 在这些场景上根本上不去。

但 Ubuntu 这种用法也暴露了 **Flutter Desktop 的真正适用边界**：它适合**整个 UI 自己掌控、不需要插件生态、不需要 web 复用、目标设备包括非桌面平台**的场景。这类场景里 Flutter 几乎没有对手——但这类场景也比想象中窄。

## Flutter Desktop 的几个不舒服的真相

吹完优势讲短板：

- **系统集成仍然是二等公民**：文件系统访问、原生菜单栏、drag-and-drop、系统托盘——这些 Electron 习以为常的能力在 Flutter Desktop 上要么需要写平台 channel、要么有现成的社区插件但维护质量参差不齐。我看过几个生产项目卡在"右键菜单要按平台定制"这种小事上耗几天。
- **macOS 原生感缺失**：Flutter 自绘 UI 在 macOS 上看起来"不那么 Mac"——滚动惯性、字体渲染、窗口标题栏样式都和原生差一截。如果你的目标用户主要是设计师 / 创意人群（这群人对 Mac 原生体验最敏感），这是硬伤。
- **Dart 生态相对孤立**：和 Electron 能直接用整个 npm 生态相比，Flutter 桌面需要的库（系统 API 包装、加密、网络代理、本地数据库）很多还在补课阶段。
- **企业级集成弱**：Active Directory 集成、企业 SSO、Windows DPAPI 这类"无聊但重要"的能力，Electron 有大量现成方案，Flutter 多半要自己写 platform channel。

## 一个不那么客观的决策框架

对比表谁都会写，我说说我的实际选型逻辑：

```text
✅ 选 Flutter Desktop，如果：
   - 团队已经有 Flutter 移动经验，且产品有移动 + 桌面双端需求
   - 系统应用 / 工具类产品，自己掌控 UI 风格，不需要"原生感"
   - 包体积是硬约束（嵌入式、安装器、随设备出厂的应用）
   - Linux 是主要目标平台（Ubuntu 26.04 之后 Flutter 是 Linux 一等公民）

✅ 选 Electron，如果：
   - 已经有成熟 web 产品，桌面端只是延伸渠道
   - 需要丰富插件生态（IDE、文档工具、设计协作）
   - 团队是 web stack 出身，没有 Dart / Flutter 经验
   - 复杂业务逻辑可以接受 V8 性能，但对 UI / 交互响应有高要求

🤔 都不太合适、可以再想想，如果：
   - 极致延迟需求（< 10ms 响应）→ Zed 那种自研路线
   - 极小包体积 + Rust 生态偏好 → Tauri
   - 完全 Mac-only 且要顶级原生感 → 直接 Swift / AppKit
   - Windows 优先且能接受 WebView2 依赖 → 原生 + WebView2
```

## 结语：框架选择是一系列约束的妥协，不是技术优劣赛跑

写完这篇我自己的体会更深了：**这种对比题如果只看数字，永远会得出"小的赢"的廉价结论**。但真实的产品选型从来不是"哪个性能好选哪个"——是"哪个能让我团队最快交付、用户最少投诉、长期维护成本最低"。

VS Code 团队是世界上最有能力把编辑器写成原生应用的团队之一，但他们没做。Slack 早就被吐槽内存胃口，但他们 2019 单进程重构后没换框架。这些选择都不是"技术上的最优"，是"在他们的约束条件下的最优"。

我自己的建议很朴素：**不要被 bundle size 表格牵着走**。先把你自己产品的约束条件列清楚——团队技术栈、用户画像、平台优先级、是否需要插件生态、是否有移动端复用需求——再回头看 Flutter 和 Electron，答案通常会比你以为的更明确。

---

**延伸阅读**：
- [A 2026 Audit of Famous Electron Apps（codenote.net）](https://codenote.net/en/posts/famous-electron-apps-2026-research/) - 谁还在用 Electron、谁迁走了、为什么
- [Ubuntu 26.04 LTS Beta：Flutter 取代 GTK 成为系统应用主框架](https://www.webpronews.com/ubuntu-26-04-lts-beta-arrives-with-a-new-toolkit-fresh-desktop-and-a-quiet-power-play-for-the-linux-desktop/) - Canonical 全面押注 Flutter 的工程动机
- [macOS Performance Comparison: Flutter Desktop vs. Electron（getstream.io）](https://getstream.io/blog/flutter-desktop-vs-electron/) - 同款应用两种框架的实测对比
- [Slack / VSCode / Notion 的 6 种 Electron 性能优化方法（palette.dev）](https://palette.dev/blog/improving-performance-of-electron-apps) - Electron 应用怎么把内存压下去
- [Electron Desktop 替代品 electrobun 深度解析（本博客 blog071）](/posts/blog071_electrobun-electron-alternative) - 12MB 应用包的 Electron 替代方案
- [拆开 Electron safeStorage 黑盒（本博客 blog169）](/posts/blog169_electron-credential-storage-security) - Electron 安全侧的另一面调研
