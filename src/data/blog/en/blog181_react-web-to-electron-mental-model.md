---
author: Gerald Chen
pubDatetime: 2026-06-04T17:05:00+08:00
title: "Electron for React Developers: 9 Things, Ranked by How Hard They Hit"
slug: blog181_react-web-to-electron-mental-model
featured: true
draft: false
reviewed: true
approved: true
tags:
  - 前端
  - JavaScript
  - 开发效率
  - 开源
description: "This isn't a tutorial on installing electron-builder. It's a primer for web developers with a few years of React experience, organized by actual impact from biggest to smallest — from the fundamental process model, to the native-module pit everyone falls into, to tooling and debugging. Reading it should save you about a week of trial and error."
---

I've recently been helping a teammate move the React app he's worked on for years to an Electron desktop build. The day after he installed electron-builder, he came to me with: "Why can't I see my HTTP requests in the DevTools Network panel? Why does `better-sqlite3` throw a `NODE_MODULE_VERSION` mismatch after install? Why is `window.electronAPI` undefined?"

None of these are bugs — they're **mismatches between a web developer's mental model and Electron's reality**. Most Electron tutorials out there are organized as feature lists ("API → config → packaging"). Nobody sorts the material by **actual impact**: which things are fundamental conceptual flips, which are runtime pits you will fall into, and which are just engineering details.

This post is that ranking. Starting from the biggest mental shift and working down.

## 1. The Process Model — The Biggest Mental Shift

On the web there's a single JS runtime (the browser page). Electron splits it into three kinds of processes, each with completely different capabilities and constraints:

| Process | What it is | What it can do | Typical responsibilities |
|---|---|---|---|
| **Main** | Node.js process, exactly 1 | Filesystem, native modules, window creation, networking, OS APIs, app lifecycle | Wallet key logic, hardware interaction, SQLite reads/writes, external HTTP, code signing |
| **Renderer** | Chromium page, N of them | Same as a browser: DOM, fetch, Web APIs | Your React app (business views, shell views, settings panels) |
| **Preload** | A bridge injected before the Renderer loads | Exposes Main capabilities to the Renderer in a controlled way | One per Renderer, exposing only named APIs |

**The key mental model**:

> Writing React components = Renderer. But "read a hardware wallet / write to a database / call your backend / use OS APIs" — all of that **only happens in Main**. There's a process boundary between the two; you cannot call functions directly across it. This is exactly why, in a wallet-grade Electron project, all keys, signing, and HTTP live in the Main process — the React code never touches any of it.

This design produces the first conceptual pit every web developer falls into: **the Network panel blind spot**. If an HTTP request has been moved to Main (to hide a token, sign credentials, or dodge CORS), the Renderer's DevTools Network panel **simply cannot see that request**.

My teammate spent an entire afternoon debugging "why the login access-token POST isn't in the Network panel" — until he realized the request was actually going out from the Main process. **He was pointing the debugger at the wrong place.** This is a **direct consequence** of the process model, not a bug.

To inspect Main's network traffic, you need to attach to the Main process's Node Inspector via `chrome://inspect`.

## 2. IPC — The Replacement for the "Direct Call / fetch" You're Used To

On the web, components call `fetch('/api')` or import a function directly. In Electron, when a Renderer wants a Main capability, **the only option is to send a message**:

```
Renderer:  window.electronAPI.callMain('connectWallet', {})
              ↓ IPC (ipcRenderer.invoke)
Main:      ipcMain.handle('business:callMain', ...)  → do the work → return
```

The things to internalize:

- **Everything is async**: `invoke` returns a Promise; there are no synchronous calls
- **Serializable data only**: JSON is fine; **TypedArray / ArrayBuffer / Date / Map / Set all pass through directly since Electron 9+** (structured clone under the hood); but functions, class instances, DOM nodes, and Symbols can't cross — you have to handle those yourself
- **Handler names are a contract**: if the Renderer sends `'business:connectWallet'`, Main must `ipcMain.handle` the exact same string — change one side and forget the other, and it fails silently at runtime. Use shared TypeScript types to constrain channel names + arguments + return values

If you've used React Native's or Flutter's MethodChannel, this pattern will feel familiar — it's fundamentally the same thing: **delegating work to the host process**. Electron's IPC is lighter-weight, but the mindset is identical.

Real projects usually wrap this in a `dispatch` layer that routes "method name + params" to concrete handlers, so you don't have to register a matching pair of ipcMain.handle / electronAPI functions on both sides for every new capability. But that's engineering convenience — it doesn't change the fundamental IPC model.

## 3. Preload + contextBridge — The Security Boundary

The Renderer doesn't get Node by default (`nodeIntegration: false` has been the default since Electron 5, `contextIsolation: true` since Electron 12). To expose capabilities to the page, you **must go through `contextBridge` in the preload script**:

```javascript
// preload.ts —— 显式枚举每个方法
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  callAppPromise: (method, params) =>
    ipcRenderer.invoke('business:callAppPromise', method, params),
  // 每个能力是一个具名 entry，不暴露 ipcRenderer.invoke 泛用入口
});
```

**Why not just flip `nodeIntegration: true` and save yourself the trouble?**

Because the moment the Renderer loads anything that isn't 100% trusted (a remote URL, a third-party iframe, an XSS injection), giving it Node access means **XSS escalates straight into RCE** — an attacker can `require('fs')` to wipe the disk or `require('child_process')` to run arbitrary commands.

For wallet / financial / enterprise-grade Electron apps this is a **hard constraint**: **the preload exposes only explicitly named methods**, and never a generic `ipcRenderer.invoke` passthrough. This boundary is exactly what React developers tend to miss — on the web you have no "trust boundary" concept (same origin means full trust), but in Electron the preload **is** that gate.

If your Renderer loads a remote URL (say, your own SaaS web frontend), be even stricter — an XSS on the server side can call every method the preload exposes. Design the preload as an **API gateway**, not a "general-purpose bridge".

## 4. WebContentsView — A Multi-View Composition Card Only Electron Holds

A web developer's first instinct for embedding third-party content is `<iframe>`. Electron has a card the web doesn't — `WebContentsView` (which replaced `BrowserView` in Electron 30+):

```javascript
const { BaseWindow, WebContentsView } = require('electron');

const win = new BaseWindow({ width: 1200, height: 800 });

// 主业务视图（可以是远程页面）
const mainView = new WebContentsView({
  webPreferences: { preload: path.join(__dirname, 'preload-business.js') }
});
win.contentView.addChildView(mainView);
mainView.setBounds({ x: 0, y: 0, width: 800, height: 800 });
mainView.webContents.loadURL('https://app.example.com');

// 本地外壳视图（用 app:// 协议加载，见第 8 节）
const shellView = new WebContentsView({
  webPreferences: { preload: path.join(__dirname, 'preload-shell.js') }
});
win.contentView.addChildView(shellView);
shellView.setBounds({ x: 800, y: 0, width: 400, height: 800 });
shellView.webContents.loadURL('app://shell/index.html');
```

Each WebContentsView is an **independent OS process + independent session + independent preload + independent cert pinning**. Position and visibility are controlled with code — **not CSS** — via `setBounds()` calls on the Main side.

The most valuable use case is **security layering**:

- "Semi-trusted remote business page" → its own WebContentsView + a restricted preload + intercepted will-navigate
- "Locally trusted shell" (wallet management, signing, sensitive operations) → another WebContentsView + local assets loaded via the `app://` protocol + a rich preload

An iframe can't deliver this dual **process-level + trust-level** isolation — it only has site-isolation, and the preload is still shared.

A plain "wrap an SPA for the desktop" project won't need WebContentsView, but for wallets / IDEs / multi-view collaboration apps, this is a capability only Electron offers. The full API is covered in [blog180](/en/posts/blog180_electron-webcontentsview).

## 5. Security Configuration (Especially If You're Building a Wallet)

Web browsers protect you by default: same-origin policy, CSP, sandboxing, `window.open` isolation. In Electron, **you have to turn all of this on yourself**:

```javascript
new BrowserWindow({
  webPreferences: {
    contextIsolation: true,    // preload 和页面 JS 隔离 context（Electron 12+ 默认）
    sandbox: true,             // Renderer 进 OS 沙箱（强烈建议）
    nodeIntegration: false,    // 页面拿不到 require（Electron 5+ 默认）
    webSecurity: true,         // 同源策略不能关——开发偷懒关了上线就送钥匙
  },
});

// 还要补的：
mainWindow.webContents.on('will-navigate', (event, url) => {
  // 拦截非预期跳转——只允许跳到信任域名，其他强制 shell.openExternal 外部打开
});

mainWindow.webContents.setWindowOpenHandler(({ url }) => {
  return { action: 'deny' };  // 默认拒绝 window.open，需要的具体放行
});

// HTML 里强制 CSP
// <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'" />
```

Miss one item and you have a vulnerability. Electron maintains a complete official [Security checklist](https://www.electronjs.org/docs/latest/tutorial/security), and multiple Electron app audit reports from teams like Doyensec and Trail of Bits repeatedly identify misconfiguration as the primary risk source.

For projects touching wallets, enterprise credentials, or medical data, this section is **mandatory before signing off**, not a nice-to-have.

## 6. Node.js Power + Native Modules — The First Big Runtime Pit

The single best part of switching: the Main process gets the **entire Node ecosystem**.

```javascript
const fs = require('fs');                                 // 直接用
const crypto = require('crypto');                         // 直接用
const Database = require('better-sqlite3');               // native 模块
const HID = require('@ledgerhq/hw-transport-node-hid');   // native 模块（USB 硬件）
```

**The pit is native modules**: these are compiled C++ artifacts, and prebuilt binaries target **Node's ABI** (Application Binary Interface). **Electron's Node ABI is usually different from your system Node's ABI** — run a plain `npm install better-sqlite3` and at runtime you get:

```
Error: The module was compiled against a different Node.js version using
NODE_MODULE_VERSION 115. This version of Node.js requires NODE_MODULE_VERSION 127.
```

(The exact numbers depend on your Node / Electron version combo — Node 20 = ABI 115, Node 22 = ABI 127. If you see this error, this is the cause.)

**The fix**: after installing all native dependencies, run `electron-builder install-app-deps` (or `electron-rebuild`) to **recompile** them against Electron's Node ABI.

In practice: **bake this step into** your `package.json` `postinstall` script — otherwise new teammates who clone the project simply can't run it. This is the pit web developers fall into on day two: everything felt fine yesterday, then you add SQLite or a hardware library today and it all blows up.

## 7. The Custom `app://` Protocol

On the web, pages come from `http(s)://`. Electron can register an `app://` protocol that **serves local assets from inside the binary**:

```javascript
const { protocol, net, app } = require('electron');
const path = require('path');

app.whenReady().then(() => {
  protocol.handle('app', (req) => {
    const url = new URL(req.url);
    const filePath = path.join(__dirname, 'renderer', url.pathname);
    return net.fetch('file://' + filePath);
  });
});

// 注册之后，本地外壳页面可以从 app://shell/index.html 或 app://core/main.html 加载
```

Why not just use `file:///`? Two reasons:

1. **Code-signing trust chain**: `app://` assets are **packaged into the `.asar` and code-signed along with the binary** — local code "signed together with the binary" sits a trust tier above any remote URL
2. **Avoiding file:// side effects**: under some Electron versions, file:// breaks `BrowserRouter` history mode (routes collide with filesystem paths); a custom protocol has no such problem

Not every project needs this. But for **security-sensitive projects** (wallets, internal enterprise tools, medical records), this "even local assets ride the code-signing trust chain" design is worth copying. Combined with the WebContentsView layering from section 4, you can build a strongly isolated "remote business page + locally trusted shell" architecture.

## 8. Build / Packaging — Nothing Like the Web

| | Web | Electron |
|---|---|---|
| **Build** | Vite/webpack → static files → CDN | Three parallel pipelines: renderer + main + preload |
| **Artifact** | Upload `dist/` | `.dmg` / `.exe` / `.AppImage`, code-signed + notarized |
| **Updates** | User refreshes, gets latest | `electron-updater` pulls a new package + verifies the signature |
| **Entry point** | `index.html` | The `main` field in `package.json` pointing to the Main JS |

Toolchain recommendations:

- **`electron-vite`**: built on Vite, auto-configures all three pipelines (renderer + main + preload); in dev you get renderer HMR plus auto-restart when main changes. One of the community's mainstream choices
- **`electron-forge`**: officially maintained, more stable but somewhat more configuration
- **Package with `electron-builder`**: cross-platform code signing + auto-update in one tool

Lower your release expectations:

- macOS: requires an Apple Developer account + notarization
- Windows: an OV certificate can sign, but SmartScreen reputation takes time to build; only an **EV certificate** passes SmartScreen immediately
- Linux: comparatively simple — AppImage / deb / rpm don't require signing

**Budgeting 1-2 weeks to get the full release pipeline working the first time is not an exaggeration** — it's a different order of magnitude from `git push` triggering CI on the web.

## 9. Debugging — Know Which Process You're Debugging

On the web, F12 covers everything. Electron has **two separate debuggers**:

- **Renderer process**: Chromium DevTools (`Cmd+Option+I` / `Ctrl+Shift+I`), same as the web
- **Main process**: Node Inspector (launch with `--inspect=5858` + Chrome `chrome://inspect`, or a VS Code launch attach)
- **Preload scripts**: run in the Renderer context but with Node capabilities — breakpoints here are the flakiest, so **keep the preload minimal** (contextBridge forwarding only, no business logic)

**First figure out which process the bug lives in**, then pick the tool — otherwise you end up like the teammate in section 1 (hunting in Renderer DevTools for a request the Main process sent).

The engineering move: configure two launches in VS Code's `launch.json` (one attaching to Main, one to Renderer) and switch as needed during development. That turns "two debuggers" into muscle memory, far more efficient than wiring up an inspector from scratch every time.

## A Suggested Onboarding Path

If you have a mature React project you want to move to Electron, **the safest order**:

1. **Spend the first week building process-model intuition**: understand the three identities — Main / Renderer / Preload — and be clear that "your React code = Renderer". Every other concept flows from this
2. **Bootstrap with the `electron-vite` template** and move your React app over wholesale (90% of it will just run)
3. **List every feature that needs OS capabilities** (file I/O, tray, notifications, auto-launch, hardware devices) → write one IPC handler + one explicit preload expose for each
4. **Audit your fetch calls**: which stay remote, which move to Main, which become IPC
5. **Set up the security trio**: CSP, `will-navigate` interception, `setWindowOpenHandler` — none of them is optional
6. **The moment you add a native module, wire up `electron-builder install-app-deps`**: otherwise teammates pulling the code will hit mysterious crashes
7. **Reserve 1-2 weeks before release to get signing + notarization + auto-update working**

## One-Sentence Summary

**Electron is not "a desktop runtime for React"** — it's "a browser process + a Node.js process + a bridge", and your job is to **design what crosses that bridge, how, and what doesn't**.

90% of your React code will carry over — but the data layer, the security model, and the release pipeline all have to be redesigned by Electron's rules. This impact-ranked guide exists so you **don't spend a week in small pits to learn a big principle you could have grasped in a day**.

---

**Further reading**:

- [Official Electron IPC tutorial](https://www.electronjs.org/docs/latest/tutorial/ipc) - the ipcMain / ipcRenderer / contextBridge interfaces
- [Electron Security Checklist](https://www.electronjs.org/docs/latest/tutorial/security) - the official security checklist
- [electron-vite](https://electron-vite.org/) - unified build tooling for renderer + main + preload
- [Opening the Electron safeStorage Black Box (blog169 on this blog)](/en/posts/blog169_electron-credential-storage-security) - the limits of credential storage
- [Advanced Private Key Storage in Electron Wallets (blog176 on this blog)](/en/posts/blog176_electron-private-key-storage) - advanced approaches for highly sensitive data
- [The Electron WebContentsView API (blog180 on this blog)](/en/posts/blog180_electron-webcontentsview) - the modern API for multi-view composition
- [Flutter Desktop vs Electron (blog172 on this blog)](/en/posts/blog172_flutter-vs-electron-desktop) - the reverse angle: what if you don't pick Electron
