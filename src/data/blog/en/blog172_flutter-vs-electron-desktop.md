---
author: Gerald Chen
pubDatetime: 2026-05-28T15:30:00+08:00
title: "Flutter Desktop vs Electron: What Migration Patterns in 2026 Tell Us About Choosing a Desktop Framework"
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
description: "No boring comparison tables here. This post reverse-engineers the decision logic from what real products did in 2026 — why VS Code / Slack / Claude Desktop are still betting on Electron, why the Ubuntu 26.04 desktop went all-in on Flutter, and why Teams and Zed walked away."
---

Ubuntu 26.04 LTS recently switched its entire desktop environment — installer, file manager, app store, system settings — from GTK to Flutter. That move made me revisit a question that's been argued to death: which is actually better for desktop apps, Flutter Desktop or Electron?

There are dozens of comparison posts out there, but most of them stop at **single-point metrics** like bundle size and memory footprint — as if the smaller number automatically wins. Reality is a lot messier. This post takes a different angle: reverse-engineering the decision logic from which products stayed and which left in **actual production** as of 2026. Which companies are still betting on Electron, who has migrated away, where Flutter genuinely wins, and why Electron refuses to die — understanding the reasoning behind those choices is far more useful than staring at a static comparison table.

## The Numbers First: The Gap Is Real, But Read It Carefully

Let's get the unavoidable hard metrics out of the way. The data online is highly consistent on this part:

| Dimension | Flutter Desktop | Electron |
|---|---|---|
| Hello World bundle | ~25-30 MB | ~150-165 MB |
| Idle memory | ~90 MB | ~180 MB |
| Complex app memory (not same-app comparison) | ~170 MB | ~2.2 GB (Slack/Discord extreme cases) |
| CPU usage | ~130% | ~215% |
| GPU usage | ~13% | ~41% |

The numbers look like a clean sweep for Flutter — but there's an **easy-to-miss interpretation bias** here. Electron's extreme 2.2GB memory figures usually come from apps like Slack and Discord: long-running, loaded with massive message history and multimedia. A Flutter app of the same scale, with embedded rich text + multimedia + WebRTC, wouldn't come cheap on memory either. Flutter's real advantage is its **low starting point** — for the same "medium-complexity productivity tool," Flutter's baseline starts at roughly half of Electron's.

The more important data point is this: **Electron 30+ has done serious homework on memory optimization**. Discord fixed 9+ memory leaks and added a circuit breaker that auto-restarts the app when it's been idle for 30 minutes with memory above 4GB; VS Code's Piece Tree data structure keeps memory bounded when editing large files; Slack's 2019 single-process consolidation cut memory by 50%. **An Electron app's memory behavior depends heavily on how much engineering its vendor invests** — a fact you'll never read off a numbers table.

## Who's Still on Electron: Four Archetypes

The list of apps still betting on Electron in 2026 tells a story on its own:

**Plugin-ecosystem-driven**: VS Code with 75.9% developer share, Cursor with 1M+ DAU (a VS Code fork), Claude Desktop / Codex Desktop — all of these share code or the extension model with VS Code. **The plugin ecosystem is the real moat**; leaving Electron means torching the work of every extension developer. Cursor's ARR grew +9900% by late 2025, riding entirely on "seamlessly inherits VS Code extensions" — something a framework switch simply can't deliver.

**Web teams reusing code across platforms**: Slack, Notion, Figma, and Claude Desktop all explicitly say they "share code with the web app to keep the experience consistent." Notion has 100M+ MAU and its entire product logic is built around the web; Electron makes "also ship a desktop version" nearly free.

**Digging past performance bottlenecks with other languages**: Discord moved voice processing, noise suppression, and H.264 codecs into C++ native modules via N-API; Signal Desktop's crypto layer is the Rust-based libsignal-client; Figma's editing engine is WebAssembly. **The pattern is clear: the UI stays in Electron, the performance-critical core gets written in another language.** This hybrid approach raises Electron's ceiling far above "pure JS."

**OpenAI's ChatGPT for Windows**: this one is particularly interesting. **The Mac version is native Swift / AppKit; the Windows version is Electron (~260MB)** — same company, same product, different choices per platform. OpenAI's engineers were blunt about why: on Windows, iteration speed beats memory efficiency. It reflects a broader 2026 reality: **Mac users have low tolerance for non-native experiences, while Windows users have high tolerance for memory usage.**

## Who Left Electron: Three Kinds of Decisions

The list of departures is just as instructive:

**Microsoft Teams (Electron → WebView2, 2023-10)**: the decisive data was the installer going from 134 MiB to 12 MiB and memory cut in half. Microsoft had the WebView2 card to play — they could turn Chromium into a system-level shared component. No other company holds that card. The Teams migration path is **not replicable**: unless you can assume the user's machine already ships a runtime (WKWebView on macOS, WebView2 on Windows), you're just installing the same 150MB in a different place.

**Zed (Rust + GPUI, built from scratch)**: the original Atom team, with a hard-edged rationale — "Electron's Chromium model can't hit the latency targets we need." Zed's whole pitch is editing responsiveness: keystroke-to-screen latency pushed down to milliseconds, and Chromium's render pipeline has too many layers in between. **This is a very rare scenario**: your product's core value is literally "tens of milliseconds faster than the competition." Otherwise it's not worth rewriting everything.

**WhatsApp (Electron → UWP → WebView2, a long detour)**: after moving back to a thin wrapper, real-world feedback was that it actually got *laggier*. This cautionary tale shows that migration itself carries risk, technical debt follows you to the new place, and no framework is a silver bullet.

## Where Flutter Desktop Genuinely Wins: The Ubuntu 26.04 Case

Canonical rewrote **all** of Ubuntu 26.04 LTS's core desktop apps (installer, file manager, app store, system settings, firmware updater) **in Flutter** — the largest production deployment of Flutter Desktop to date.

Why Flutter and not Electron? Three reasons worth unpacking:

1. **System-level apps can't afford a 150MB hello world.** The Ubuntu installer has to fit inside the ISO image; every extra 100MB costs real money.
2. **A unified look for the Linux desktop.** Inconsistent styling across GTK / Qt apps has been a long-standing Linux desktop pain point; Flutter's self-drawn UI can actually enforce a consistent visual language.
3. **Cross-platform reach.** Canonical can later take the same apps to IoT devices, embedded terminals, and a future Ubuntu Touch — places Electron fundamentally can't go.

But Ubuntu's usage also exposes **Flutter Desktop's true applicability boundary**: it fits scenarios where **you control the entire UI, don't need a plugin ecosystem, don't need web reuse, and your target devices include non-desktop platforms**. Within that boundary, Flutter has virtually no competition — but that boundary is narrower than people imagine.

## Some Uncomfortable Truths About Flutter Desktop

Having praised the strengths, here are the weaknesses:

- **System integration is still a second-class citizen**: filesystem access, native menu bars, drag-and-drop, system tray — capabilities Electron takes for granted either require writing platform channels in Flutter Desktop, or rely on community plugins of wildly varying maintenance quality. I've seen production projects burn days on something as small as "the context menu needs per-platform customization."
- **Missing macOS native feel**: Flutter's self-drawn UI just doesn't look "Mac" on macOS — scroll inertia, font rendering, and window title bar styling all fall short of native. If your target users are primarily designers / creatives (the audience most sensitive to Mac-native polish), this is a dealbreaker.
- **The Dart ecosystem is relatively isolated**: compared to Electron's direct access to the entire npm ecosystem, many libraries Flutter desktop needs (system API wrappers, crypto, network proxying, local databases) are still playing catch-up.
- **Weak enterprise integration**: Active Directory integration, enterprise SSO, Windows DPAPI — the "boring but important" stuff. Electron has plenty of off-the-shelf solutions; with Flutter you'll mostly be writing your own platform channels.

## A Not-So-Objective Decision Framework

Anyone can write a comparison table. Here's the decision logic I actually use:

```text
✅ Pick Flutter Desktop if:
   - The team already has Flutter mobile experience, and the product needs both mobile + desktop
   - It's a system app / utility where you control the UI style and don't need "native feel"
   - Bundle size is a hard constraint (embedded, installers, apps shipped with devices)
   - Linux is the primary target platform (post-Ubuntu 26.04, Flutter is a first-class citizen on Linux)

✅ Pick Electron if:
   - You already have a mature web product and desktop is just an extension channel
   - You need a rich plugin ecosystem (IDEs, document tools, design collaboration)
   - The team comes from a web stack with no Dart / Flutter experience
   - Complex business logic can live with V8 performance, but UI / interaction responsiveness matters

🤔 Neither fits well — think again, if:
   - Extreme latency requirements (< 10ms response) → the Zed-style roll-your-own route
   - Tiny bundle size + a preference for the Rust ecosystem → Tauri
   - Fully Mac-only with top-tier native feel → straight Swift / AppKit
   - Windows-first and you can accept the WebView2 dependency → native + WebView2
```

## Closing: Framework Choice Is a Compromise Across Constraints, Not a Technical Beauty Contest

Writing this post deepened my own conviction: **if you only look at the numbers in comparisons like this, you'll always arrive at the cheap conclusion that "smaller wins."** But real product decisions are never "pick whichever performs best" — they're "pick whatever lets my team ship fastest, generates the fewest user complaints, and costs the least to maintain long-term."

The VS Code team is one of the most capable teams in the world at writing a native editor — and they didn't. Slack has been roasted for its memory appetite for years, yet after the 2019 single-process refactor they didn't switch frameworks. None of these choices were "technically optimal"; they were "optimal under their constraints."

My own advice is plain: **don't let bundle size tables lead you around.** First write down your own product's constraints — team stack, user profile, platform priorities, whether you need a plugin ecosystem, whether you need mobile code reuse — then look back at Flutter and Electron. The answer is usually clearer than you expected.

---

**Further reading**:
- [A 2026 Audit of Famous Electron Apps (codenote.net)](https://codenote.net/en/posts/famous-electron-apps-2026-research/) - Who's still on Electron, who left, and why
- [Ubuntu 26.04 LTS Beta: Flutter Replaces GTK as the Primary Framework for System Apps](https://www.webpronews.com/ubuntu-26-04-lts-beta-arrives-with-a-new-toolkit-fresh-desktop-and-a-quiet-power-play-for-the-linux-desktop/) - The engineering motivation behind Canonical's all-in bet on Flutter
- [macOS Performance Comparison: Flutter Desktop vs. Electron (getstream.io)](https://getstream.io/blog/flutter-desktop-vs-electron/) - Measured comparison of the same app built with both frameworks
- [6 Electron Performance Optimization Techniques from Slack / VSCode / Notion (palette.dev)](https://palette.dev/blog/improving-performance-of-electron-apps) - How Electron apps keep memory in check
- [A Deep Dive into electrobun, an Electron Alternative (this blog, blog071)](/en/posts/blog071_electrobun-electron-alternative) - An Electron alternative with a 12MB app bundle
- [Cracking Open Electron's safeStorage Black Box (this blog, blog169)](/en/posts/blog169_electron-credential-storage-security) - A look at the security side of Electron
