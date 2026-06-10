---
author: Gerald Chen
pubDatetime: 2026-06-04T17:00:00+08:00
title: "WebContentsView in Electron 30: How to Build Multi-View Apps After BrowserView's Deprecation"
slug: blog180_electron-webcontentsview
featured: true
draft: false
reviewed: true
approved: true
tags:
  - 前端
  - JavaScript
  - 开发效率
  - 开源
description: "BrowserView is officially deprecated in Electron 30; the new API is the WebContentsView + BaseWindow combo. This post breaks down the new model: key differences from iframe/webview/BrowserView, migration code diffs, how to lay out multi-view apps, and a few easy-to-hit pitfalls."
---

I've recently been rewriting an old Electron app — it used seven or eight BrowserViews to piece together a "multi-tab + sidebar + floating panel" UI. The moment I upgraded to Electron 30, deprecation warnings popped up everywhere: BrowserView, an API we'd relied on for years, has finally been replaced.

The replacement is the new `WebContentsView` + `BaseWindow` combo. Electron has an official migration guide, but it's fairly terse, and I hit a few snags while doing the work myself. This post covers the design intent behind the new model, the migration details, and the gotchas — all in one place, so the next person doesn't have to rediscover them.

## Why the Change: BrowserView's Historical Baggage

BrowserView was an early Electron workaround for "embedding a child page inside a BrowserWindow." From Chromium's perspective it was always an oddball — neither a standard `<iframe>` nor a proper product of the Chromium Views API, but a glue layer that Electron implemented on its own.

Concretely:

- A BrowserView lives outside the DOM tree, yet its webContents is a full Chromium rendering pipeline product
- A BrowserView's position, size, and stacking order are all managed by explicit `setBounds` calls from the main process — its relationship with BrowserWindow is "attachment," not "composition"
- Stacking multiple BrowserViews leads to messy z-order management, requiring manual `setTopBrowserView` calls

This design kept Electron running for years, but the maintenance cost kept climbing — especially as Chromium evolved its own Views API, the non-standard BrowserView implementation always needed separate adaptation work. The Electron team decided to start over: bring "embedded views" back onto the standard Chromium Views API path.

## The New Model: `BaseWindow + WebContentsView`

`WebContentsView` is a first-class citizen of the Chromium Views API. It does roughly what BrowserView did — the main process holds a web rendering unit and explicitly controls its position and size — but the implementation sits directly on Chromium Views, so it tracks Chromium upgrades going forward without separate adaptation.

Its companion `BaseWindow` is the new window base class. `BrowserWindow` is now effectively syntactic sugar for `BaseWindow + a built-in main WebContentsView`; if you need a more complex multi-view composition, use `BaseWindow` directly and add N `WebContentsView`s by hand.

A sketch in code:

```javascript
const { app, BaseWindow, WebContentsView } = require('electron');

app.whenReady().then(() => {
  const win = new BaseWindow({ width: 1200, height: 800 });

  // 主视图
  const mainView = new WebContentsView();
  win.contentView.addChildView(mainView);
  mainView.setBounds({ x: 0, y: 0, width: 800, height: 800 });
  mainView.webContents.loadURL('https://chenguangliang.com');

  // 侧边栏视图
  const sidebarView = new WebContentsView();
  win.contentView.addChildView(sidebarView);
  sidebarView.setBounds({ x: 800, y: 0, width: 400, height: 800 });
  sidebarView.webContents.loadFile('sidebar.html');

  // 浮动小窗
  const popupView = new WebContentsView();
  win.contentView.addChildView(popupView);
  popupView.setBounds({ x: 500, y: 600, width: 300, height: 150 });
  popupView.webContents.loadFile('popup.html');
});
```

Three independent WebContentsViews composed inside one BaseWindow, each with its own webContents — which means an independent V8 context, independent cookie scope (if you configure different partitions), and independent DevTools.

This ability to "compose multiple views from the main process" used to be cobbled together with multiple BrowserViews; now it's a first-class API.

## The Real Differences vs. iframe / webview / BrowserView

The boundaries between these options are what newcomers mix up most often. Here's a summary:

| Option | In the DOM? | Controlled by | Process isolation | Use case |
|---|---|---|---|---|
| `<iframe>` | ✅ | renderer | Same process (same origin) / cross-process (cross-origin + site-isolation) | Embedding in-house or trusted third-party pages |
| `<webview>` | ✅ | renderer | Separate process | Embedding fully untrusted third-party pages |
| `BrowserView` (old) | ❌ | main process | Separate process | Main process composing multiple native views |
| **`WebContentsView` (new)** | ❌ | main process | Separate process | **Main process composing multiple native views; the modern replacement for BrowserView** |

WebContentsView takes over BrowserView's slot — iframe and webview are **unchanged**. If your app uses iframe or webview, no migration needed.

When to pick WebContentsView over iframe? My rule of thumb:

- **Embedding a fully independent web page** (e.g., your own SaaS web app inside a desktop shell) → WebContentsView
- **Building a multi-tab / multi-panel IDE-style app** (think VS Code, Cursor) → WebContentsView
- **The embedded page needs its own cookies / session / extension set** → WebContentsView (with a separate partition)
- **Embedding trusted in-house content (settings pages, modal layers)** → iframe is simple and sufficient
- **Embedding fully untrusted third parties** → webview, for the more thorough sandbox

## Migration: From BrowserView to WebContentsView

In practice, about 80% of the migration is mechanical find-and-replace; the remaining 20% is a handful of API changes.

### Change 1: Construction and Attachment

```javascript
// 旧（BrowserView）
const view = new BrowserView({ webPreferences: { ... } });
mainWindow.setBrowserView(view);            // 设为主 view
// 或
mainWindow.addBrowserView(view);            // 添加额外 view

// 新（WebContentsView）
const view = new WebContentsView({ webPreferences: { ... } });
mainWindow.contentView.addChildView(view);  // 统一用 addChildView
```

Note: the semantic split between `setBrowserView` and `addBrowserView` is gone. The new API uses `contentView.addChildView()` for everything — the standard Views API pattern.

### Change 2: Auto-Resizing

```javascript
// 旧（BrowserView 的 setAutoResize）
view.setAutoResize({ width: true, height: true });

// 新（手动监听 resize 事件）
mainWindow.on('resize', () => {
  const [w, h] = mainWindow.getContentSize();
  view.setBounds({ x: 0, y: 0, width: w, height: h });
});
```

This is the step people most often miss during migration. `setAutoResize` is gone; you handle the resize event yourself. If your app has a complex sidebar + main view + bottom bar layout, I recommend wrapping bounds management for all views in a `LayoutManager` class — far easier to maintain than resize listeners scattered everywhere.

### Change 3: Transparent Backgrounds

```javascript
// 旧
view.setBackgroundColor('#00000000');  // 部分平台不生效

// 新
view.setBackgroundColor('#00000000');  // alpha=00 全平台生效
```

The code is identical, but in my own testing, the new API is more reliable about cross-platform transparent backgrounds than the old BrowserView — the occasional Windows failure I used to see is gone in my project (I couldn't find an explicit entry for this fix in the official changelog, so verify against your own testing).

### Change 4: webContents Access

```javascript
// 旧 + 新都一样
view.webContents.loadURL(...);
view.webContents.openDevTools();
```

The `view.webContents` property is unchanged — all your existing IPC wiring, listeners, and preload configuration stay as they are. This is the cheapest part of the migration.

## A Few Pitfalls I Hit

Reading the official migration guide alone isn't enough. I hit three pitfalls, recorded here for whoever comes next:

### Pitfall 1: addChildView Order Is the Stacking Order

A view added later via `addChildView` renders **on top of** earlier ones (z-index order). So floating panels / modal layers must be added **last**. If your migration happens to add views in "main view → sidebar → modal popup" order, it works by coincidence; but if you add them as "modal → main view → sidebar," the modal ends up buried at the bottom.

The old `setTopBrowserView` is gone — to reorder, you have to `removeChildView` and then `addChildView` again.

### Pitfall 2: DevTools Now Opens in a Separate Window

The old BrowserView's DevTools defaulted to docked mode. WebContentsView's DevTools **opens in a separate window** by default — that's not a bug, it's a feature, but if you're used to the old behavior, the first time is confusing. For docked mode:

```javascript
view.webContents.openDevTools({ mode: 'detach' });  // 独立窗口
view.webContents.openDevTools({ mode: 'bottom' }); // 底部 docked
```

### Pitfall 3: Always Use Absolute Paths for preload

This one isn't specific to WebContentsView — Electron has always required `webPreferences.preload` to be an **absolute path**. But if your old BrowserView code got away with relative paths (some versions had fallback resolution behavior), I recommend **standardizing on `path.join(__dirname, 'preload.js')`** during migration. Consider it tech debt cleaned up along the way, not a new problem introduced by WebContentsView.

## Performance: Does It Get Better?

Honest answer: **virtually no difference in single-view scenarios**. WebContentsView's actual rendering pipeline runs on Chromium just like BrowserView; the performance difference is within 1%.

The difference shows up in **multi-view scenarios**:

- With stacked BrowserViews, the main process did a lot of z-index computation and IPC coordination
- WebContentsView goes through the standard Chromium Views API compositing path, so stacked multi-view rendering is more efficient

After migrating my old 7-view app: memory usage dropped about 8%, startup got about 200ms faster. **Sample size of one project, for reference only** — not a game-changing improvement, but free optimization is worth taking.

## Advice for Those Who Haven't Migrated Yet

If you're still on Electron < 30, time the migration around your product cadence:

- **Major Electron upgrade not until next year**: no rush — keep using BrowserView, but write new code with WebContentsView to avoid piling up migration debt
- **Upgrading to Electron 30+ this quarter**: do the migration now; unresolved deprecation warnings will become a blocker sooner or later
- **Already on Electron 30+ but still using BrowserView**: migrate ASAP — Electron hasn't announced a specific removal version, but given the typical deprecated-to-removed cadence of 2-4 major versions, I'd clean it up before Electron 32

The migration itself isn't much work — a mid-size project with 5-10 views takes roughly half a day to a day. **The real cost is testing** — multi-view layouts have lots of edge cases, so walk through every view-switching, resize, and modal-popup scenario.

## One-Sentence Summary

WebContentsView isn't a revolutionary new capability; it's Electron retiring its homegrown BrowserView implementation and **returning to the Chromium Views API standard** — an engineering cleanup. For developers: a more consistent API, a more stable future, slightly better multi-view composition performance. For maintainers: one less layer of non-standard glue, fewer surprises when tracking Chromium upgrades.

Not a sexy update, but the kind that tidies up the foundations — worth migrating to, no need to get excited.

---

**Further reading**:

- [Electron official migration guide: BrowserView → WebContentsView](https://www.electronjs.org/blog/migrate-to-webcontentsview) - the most authoritative API mapping
- [WebContentsView API docs](https://www.electronjs.org/docs/latest/api/web-contents-view) - full interface definition
- [BaseWindow API docs](https://www.electronjs.org/docs/latest/api/base-window) - the new window base class
- [Web Embeds guide](https://www.electronjs.org/docs/latest/tutorial/web-embeds) - three-way comparison of iframe / webview / WebContentsView
- [PR #35658: Replace BrowserView with WebContentsView](https://github.com/electron/electron/pull/35658) - design motivation and discussion
- [Flutter Desktop vs Electron (blog172 on this blog)](/en/posts/blog172_flutter-vs-electron-desktop) - Electron's multi-view capability from a cross-framework perspective
