---
author: 陈广亮
pubDatetime: 2026-05-25T11:00:00+08:00
title: 拆开 Electron safeStorage 黑盒：AES-128-CBC、硬编码 IV，和那些没人告诉你的事
slug: blog169_electron-credential-storage-security
featured: true
draft: false
reviewed: true
approved: true
tags:
  - 安全
  - 前端
  - JavaScript
  - 开发效率
description: safeStorage 是 Electron 推荐的密钥存储 API，但实现细节少被讨论。本文拆开它的源码黑盒：约 100 行 C++ 包装 Chromium OSCrypt，AES-128-CBC、IV 硬编码 16 空格、PBKDF2 只迭代 1 轮。配合 VS Code 凭据被扩展直接读、VoidStealer 用硬件断点抢 master key 的案例，给一份基于威胁模型的存储决策表。
---

写过 Electron 应用的人多少都用过 `safeStorage.encryptString()`，它是官方推荐的"安全存储"方案，文档说会用系统密钥环保护数据。但很少有人真去翻它的源码——结果就是大量应用基于一个错误的心理模型在写代码，以为加密了就万事大吉。

我前阵子为了搞清楚 Claude Desktop / Cursor 这类工具的 API key 到底有多安全，翻了 Electron 仓库里 safeStorage 的实现，越看越觉得这个 API 名字起得太"安心"了。这篇把拆解过程写下来，重点不是教你怎么用，是告诉你它**实际**保护了什么、**没有**保护什么。

## safeStorage 不是一个加密库，是一个 100 行的 C++ 包装

第一个反直觉的事实：safeStorage 没有自己的密码学实现。它**整体**是 Chromium `OSCrypt` 组件的一层薄包装——把 C++ 的 `OSCryptImpl::EncryptString / DecryptString` 暴露给 Node.js，加起来大约 100 行 C++。

这意味着：safeStorage 的安全强度 = Chromium OSCrypt 的安全强度。任何 Chromium 的历史包袱、设计妥协、平台差异，safeStorage 一字不漏地继承。

OSCrypt 的实现要分两层看：**对称加密参数**三平台共通，**密钥来源**三平台完全不同。

**共通层（OSCrypt 的对称加密参数）**：

- 算法：AES-128-CBC（不是 AES-256，不是 GCM——CBC 没有认证）
- IV：**硬编码为 16 个空格字符**（不是每次随机生成）

这两条意味着：同一份 master key 下，相同明文每次加密出来的密文相同——可以做"密文比对"，理论上还能配合 padding oracle、bit-flipping 等 CBC 模式经典攻击。

**密钥来源（三平台差异巨大）**：

- macOS 主路径：master key 是 Keychain 里**随机生成**的 128-bit 密钥，存储在 `<AppName> Safe Storage` 条目，由系统 ACL 保护
- Windows 主路径：master key 也是随机生成的密钥，但用 **DPAPI** 加密后落盘
- Linux 主路径（libsecret / kwallet 可用）：master key 是随机生成、存进系统密钥环的密钥
- Linux fallback 路径（`basic_text`）：**没有 master key 的概念**——直接用 PBKDF2-HMAC-SHA1 派生密码，**salt 硬编码为字符串 `"saltysalt"`、迭代次数 = 1**，源密码也是 Chromium 源码里写死的字符串

`PBKDF2-1-saltysalt` 这套是历史遗留——Chromium 早期 Linux 实现，当时被定位为"比明文好一点"的兜底方案。可怕的是 Electron 在 Linux 上**默认会回退到这条路径**，应用开发者通常没意识到自己的密文等同于明文，因为 PBKDF2 的"源密码"是写死在 Chromium 源码里的常量，任何拿到磁盘文件的人都能用同一个公开常量解出来。

Chromium 自己当然知道这套老设计的问题，但浏览器存储的 cookie / 自动填充密码属于"低敏数据"，对应威胁模型够用就没动力重构。问题是 Electron 把这套机制**原样**作为"安全存储 API"卖给应用开发者——而你存的可能是 OpenAI API key、JWT、加密货币私钥。

## 三个平台，三种不同的"安全感"

OSCrypt 的实际行为还要看平台。这里把官方文档没明说的细节列出来：

### macOS

加密密钥保存在用户 Keychain 的一个名为 `<AppName> Safe Storage` 的条目里。**这是三个平台里最强的一档**：

- 其他应用想读这个 Keychain 条目，系统会弹授权框
- 系统级 ACL 可以拒绝指定进程
- 即使硬盘被偷，Keychain 数据库本身是加密的（除非用户没设登录密码）

但 macOS 的强度也有边界：**同一应用的子进程、加载的动态库、被注入的代码——都被视为应用本体**，不会触发授权框。一个被恶意 npm 包污染的 Electron 应用，启动后调 safeStorage 解密自己的密钥，OS 一声不吭。

### Windows

用 DPAPI。**保护范围是"当前 Windows 登录用户"**：

- 能阻止：同机器上其他 Windows 用户登录后读你的密钥
- 不能阻止：同用户身份下运行的任何其他进程

第二条意味着：你装了任何恶意软件、任何带本地代码执行漏洞的应用，它都能 `import ctypes; ctypes.windll.crypt32.CryptUnprotectData(...)` 把你的密钥解出来。DPAPI 在威胁模型上比 macOS Keychain 弱一档。

### Linux

最复杂也最容易出事的一档。Electron 会按桌面环境自动选 backend：

```text
GNOME / XFCE / Cinnamon / Unity → gnome_libsecret
KDE 5 → kwallet5
KDE 6 → kwallet6
都没有 → basic_text
```

`basic_text` 是字面意义上的"裸奔"：用前面说的 PBKDF2-1 轮 + saltysalt 派生一个**硬编码密码**做 CBC 加密。任何拿到你磁盘文件的人都能解密——包括同一台机器上的其他用户、备份服务、企业 IT 镜像盘。

更可怕的是：**`basic_text` 是默认 fallback**，不会报错、不会警告。你的应用在一台没装 libsecret 的最小化 Debian 上运行，会"成功加密"，然后把等同于明文的密文写盘。

**正确的防御写法**——这段代码我建议每个 Electron 应用都加上：

```javascript
const { app, safeStorage } = require('electron');

app.whenReady().then(() => {
  if (process.platform === 'linux') {
    const backend = safeStorage.getSelectedStorageBackend();
    if (backend === 'basic_text') {
      throw new Error(
        'System keyring unavailable (basic_text fallback). ' +
        'Refusing to store credentials. Please install libsecret or kwallet.'
      );
    }
  }
});
```

我翻了 GitHub 上几个流行 Electron 项目，**没有一个**默认加了这段检查。

## VS Code 案例：sandbox 不存在时，safeStorage 等于装饰品

ControlPlane 那篇 VS Code 凭据窃取分析很值得细看。结论先说：**任何 VS Code 扩展都能绕过 safeStorage 直接读其他扩展的密钥**，根本不需要漏洞，按 API 调用即可。

攻击链短到令人尴尬：

1. VS Code 的 `SecretStorage` API 最终调 safeStorage 把密钥加密后存到 SQLite
2. 文件路径固定：`${HOME}/.config/Code/User/globalStorage/state.vscdb`
3. 任何扩展都有完整 Node.js 权限——可以直接读这个 SQLite 文件
4. 扩展再直接调 `libsecret`（或 `keytar` fork、或 Windows `CryptUnprotectData`）解密 OSCrypt 的密钥
5. 用解出来的 OSCrypt 密钥按 CBC + 硬编码 IV 解密 SQLite 里的密文 → 拿到所有扩展的所有密钥

ControlPlane 直接放了个 PoC 扩展，装上点一个按钮就 dump 所有 VS Code 管理的 secrets。

根本原因不在 safeStorage 本身——是 **VS Code 没有给扩展做沙箱**。整个 Electron 应用是一个进程、一个用户身份、一份 Keychain ACL，OS 看不到"这个扩展是好的、那个扩展是坏的"。

这个案例的普遍性值得警惕：所有"插件化的 Electron 应用"都有同一个问题——Cursor、Windsurf、Trae、Obsidian、Raycast……扩展能跑 Node.js 代码，就能绕过 safeStorage 任何层面的"加密"。

## 新攻击面：调试器抢 master key（VoidStealer 2026-03）

2026 年 3 月 Kaspersky 披露的 VoidStealer 提供了一个更隐蔽的新思路，针对 Chrome v20 App-Bound Encryption——但同样原理对所有 Electron 应用有效。

技术原理：

1. 不去找密钥的存储位置（那是 OS 保护的）
2. 等应用**自己**调解密 API
3. 此时 master key 必然以明文形式出现在 Chromium 进程内存里（要算 AES 就得有 key）
4. 用 Windows 的合法调试 API（`WaitForDebugEvent` / `SetThreadContext`）**附加为调试器**，在解密函数地址放一个**硬件断点**
5. 程序执行到断点就被冻结，从寄存器里把 key 读出来
6. 全程不需要管理员权限，不需要代码注入，不触发 EDR 常用的注入检测

对应到 Electron 应用：你的应用调 `safeStorage.decryptString()` 的瞬间，明文密钥短暂存在于进程内存里——一个同用户身份的进程附加调试器，就能在那一瞬间把它读走。

这个攻击面没有干净的防御：

- Windows 上可以调 `IsDebuggerPresent` 检测，但调试器有反检测手段
- macOS 上可以用 `PT_DENY_ATTACH` 阻止 `ptrace`，但 Apple 自己的 dtrace / lldb 用其他通道
- 真正的根治是把"密钥永远不进应用进程内存"——硬件 enclave（macOS Secure Enclave、Windows TPM、Linux TEE）才能做到

普通 Electron 应用做不到 enclave 集成。所以最务实的认知是：**你的密钥在用户主动调用之外的所有时间都受 safeStorage 保护，调用瞬间在内存里裸奔几毫秒**——这个窗口对针对性攻击足够了。

## Electron 团队对这些限制的态度

GitHub issue #42318 是一个开发者提的 feature request：希望 Electron 文档明确写清 safeStorage 的局限——比如同进程内其他代码能读密钥、Linux 静默 fallback 到明文、密钥环解锁后任何应用都能读。

Electron 团队的处置是：**"Closed as not planned"**。

我能理解这个决定（文档维护成本、避免误导用户改方案、避免被引用为"官方承认不安全"），但它也清楚地表达了一件事：**safeStorage 的安全边界，应用开发者要自己搞清楚**。官方不会主动告诉你它防不住什么。

这种态度在 Electron 生态里相当普遍。Electron 长期被批评为"web 安全模型套到桌面应用上"，团队也承认这个判断——但商业取舍是"我们提供工具，应用层负责合理使用"。

## 一份基于威胁模型的存储决策表

把 safeStorage 实际能防的攻击列出来，开发者就能按自己产品的威胁模型决定是否够用：

```text
威胁                                        safeStorage 防得住？
─────────────────────────────────────────────────────────────
用户硬盘被偷                                 ✅（除 Linux basic_text）
同机器其他登录用户                            ✅（macOS / Windows）
同用户身份下其他进程读取密钥环                 ❌（macOS 弹授权，Win/Linux 直接通过）
同 Electron 应用内其他模块 / 扩展             ❌（VS Code 案例）
你的应用被供应链攻击注入恶意代码               ❌（应用本体身份）
应用运行时被调试器附加抢内存                   ❌（VoidStealer 攻击面）
V8 snapshot 被本地篡改注入 JS（CVE-2025-55305） ❌
```

满足前两行的产品（普通 SaaS 客户端、文档工具、聊天软件）用 safeStorage 完全合理。后五行命中任何一行的产品（密码管理器、加密钱包、企业 SSO 客户端）必须再加一层用户主密码 + 短期解锁窗口——这是 1Password、Bitwarden 的做法，也是 Electron 框架下能做到的现实上限。

## 实操 checklist

如果你正在写一个会经手 API key / token 的 Electron 应用：

```text
□  [必做] 不要用 electron-store 的 encryptionKey（CBC 无认证，位翻转攻击成本极低）
□  [必做] 用 safeStorage，并在启动时检查 getSelectedStorageBackend()，Linux basic_text 拒绝存储
□  [必做] contextIsolation: true, nodeIntegration: false, sandbox: true 三件套
□  [必做] Electron 版本保持在 LTS，订阅 electron/electron Security Advisories
□  [建议] 启用 ASAR integrity 两个 fuse（embeddedAsarIntegrityValidation + onlyLoadAppFromAsar，Electron 30+ 跨平台可用）
□  [建议] 高敏操作前加 OS 级二次认证（Touch ID / Windows Hello / 主密码）
□  [建议] 密钥写盘文件 chmod 0600，多一层 FS 防线
□  [建议] 不要把密钥放进 BrowserWindow 的渲染进程，仅在主进程持有
□  [建议] 在产品文档里诚实写清安全边界，不要承诺 safeStorage 做不到的事
```

第二条特别想强调一下：**没有任何一个流行 Electron 应用默认加了 basic_text 检查**。这是我建议每个项目都要补上的最低投入、最高回报的一行代码。

## 结语

我不是要劝大家弃用 safeStorage——在 macOS / Windows 主流环境下，它仍然是 Electron 生态最务实的方案。但请把它当成**一个有明确边界的工具**，不是"加密了就安全"的银弹。

技术决策的本质是匹配威胁模型。普通用户场景下 safeStorage 够用；安全敏感场景下，你需要主密码 + Secure Enclave 这种纵深防御。把"safeStorage 实际防住了什么"想清楚，比盲目相信 API 名字里的 "safe" 重要得多。

---

**延伸阅读**：

- [Electron safeStorage 官方文档](https://www.electronjs.org/docs/latest/api/safe-storage) - API 接口和 backend 列表
- [Chromium OSCrypt 源码](https://source.chromium.org/chromium/chromium/src/+/main:components/os_crypt/) - safeStorage 底层实现
- [Abusing VSCode: From Malicious Extensions to Stolen Credentials (Part 2)](https://control-plane.io/posts/abusing-vscode-from-malicious-extensions-to-stolen-credentials-part-2/) - ControlPlane 的 VS Code 凭据窃取 PoC
- [VoidStealer 绕过 Chrome App-Bound Encryption 分析](https://www.kaspersky.com/blog/chrome-application-bound-encryption-bypass-voidstealer/55735/) - 调试器抢 master key 的技术细节
- [Electron Issue #42318: 改进 safeStorage 文档（已被 closed as not planned）](https://github.com/electron/electron/issues/42318) - 官方对安全边界的态度
