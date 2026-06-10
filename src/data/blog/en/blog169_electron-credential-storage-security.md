---
author: Gerald Chen
pubDatetime: 2026-05-25T11:00:00+08:00
title: "Cracking Open the Electron safeStorage Black Box: AES-128-CBC, a Hardcoded IV, and the Things Nobody Tells You"
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
description: "safeStorage is Electron's recommended API for storing secrets, but its implementation details are rarely discussed. This post cracks open the source: roughly 100 lines of C++ wrapping Chromium's OSCrypt, AES-128-CBC, an IV hardcoded to 16 spaces, and PBKDF2 with a single iteration. Paired with real cases — VS Code credentials read directly by extensions, VoidStealer grabbing the master key with a hardware breakpoint — it ends with a threat-model-based storage decision table."
---

Anyone who's built an Electron app has probably reached for `safeStorage.encryptString()` at some point. It's the officially recommended "secure storage" solution, and the docs say it protects your data using the system keyring. But almost nobody actually digs into its source — the result is a huge number of apps written on top of a flawed mental model, assuming that "encrypted" means "done worrying."

A while back, trying to figure out exactly how safe the API keys in tools like Claude Desktop and Cursor really are, I went through the safeStorage implementation in the Electron repo. The more I read, the more I felt the API name was almost dangerously reassuring. This post is the teardown. The point isn't to teach you how to use it — it's to tell you what it **actually** protects, and what it **doesn't**.

## safeStorage isn't a crypto library — it's a 100-line C++ wrapper

The first counterintuitive fact: safeStorage has no cryptography of its own. The **entire thing** is a thin wrapper over Chromium's `OSCrypt` component — it exposes C++ `OSCryptImpl::EncryptString / DecryptString` to Node.js, totaling roughly 100 lines of C++.

Which means: the security strength of safeStorage = the security strength of Chromium OSCrypt. Every piece of Chromium's historical baggage, design compromise, and platform difference is inherited by safeStorage word for word.

OSCrypt's implementation splits into two layers: the **symmetric encryption parameters** are common across all three platforms, while the **key source** differs completely per platform.

**The common layer (OSCrypt's symmetric encryption parameters)**:

- Algorithm: AES-128-CBC (not AES-256, not GCM — and CBC provides no authentication)
- IV: **hardcoded to 16 space characters** (not randomly generated each time)

These two facts mean: under the same master key, identical plaintext encrypts to identical ciphertext every time — enabling "ciphertext comparison," and in theory opening the door to classic CBC-mode attacks like padding oracles and bit-flipping.

**The key source (wildly different across the three platforms)**:

- macOS main path: the master key is a **randomly generated** 128-bit key in the Keychain, stored in a `<AppName> Safe Storage` entry and protected by a system ACL
- Windows main path: the master key is also randomly generated, but encrypted with **DPAPI** before being written to disk
- Linux main path (libsecret / kwallet available): the master key is randomly generated and stored in the system keyring
- Linux fallback path (`basic_text`): **there is no master key at all** — it derives a key directly with PBKDF2-HMAC-SHA1, with the **salt hardcoded to the string `"saltysalt"` and an iteration count of 1**, and the source password is also a string hardcoded in Chromium's source

This `PBKDF2-1-saltysalt` scheme is a historical relic — it's from Chromium's early Linux implementation, where it was positioned as a "slightly better than plaintext" fallback. The scary part is that Electron on Linux **falls back to this path by default**, and app developers usually don't realize that their ciphertext is equivalent to plaintext, because PBKDF2's "source password" is a constant baked into Chromium's source — anyone who gets hold of the disk file can decrypt it using the same public constant.

Chromium itself is of course aware of the problems with this old design, but the cookies and autofill passwords a browser stores count as "low-sensitivity data," and for that threat model the scheme is good enough, so there's no incentive to refactor it. The problem is that Electron sells this exact mechanism, **as-is**, to app developers as a "secure storage API" — and what you're storing might be an OpenAI API key, a JWT, or a cryptocurrency private key.

## Three platforms, three different flavors of "feeling safe"

OSCrypt's actual behavior depends on the platform. Here are the details the official docs don't spell out:

### macOS

The encryption key is stored in a Keychain entry named `<AppName> Safe Storage`. **This is the strongest of the three platforms**:

- If another app tries to read this Keychain entry, the system prompts for authorization
- A system-level ACL can deny specific processes
- Even if the disk is stolen, the Keychain database itself is encrypted (unless the user has no login password set)

But macOS has its limits too: **child processes of the same app, dynamically loaded libraries, and injected code are all treated as the app itself**, and won't trigger the authorization prompt. An Electron app poisoned by a malicious npm package can call safeStorage to decrypt its own keys after launch, and the OS won't say a word.

### Windows

Uses DPAPI. **Its protection scope is "the current Windows logged-in user"**:

- Can stop: another Windows user on the same machine reading your keys after logging in
- Cannot stop: any other process running under the same user identity

That second point means: any malware you install, any app with a local code-execution vulnerability, can run `import ctypes; ctypes.windll.crypt32.CryptUnprotectData(...)` to decrypt your keys. In terms of threat model, DPAPI is a notch weaker than the macOS Keychain.

### Linux

The most complex and the most accident-prone of the bunch. Electron automatically picks a backend based on the desktop environment:

```text
GNOME / XFCE / Cinnamon / Unity → gnome_libsecret
KDE 5 → kwallet5
KDE 6 → kwallet6
None of the above → basic_text
```

`basic_text` is "running naked" in the literal sense: it uses the PBKDF2-1-iteration + saltysalt scheme described earlier to derive a **hardcoded password** for CBC encryption. Anyone who gets your disk file can decrypt it — including other users on the same machine, backup services, or a corporate IT disk image.

Worse still: **`basic_text` is the default fallback** — no error, no warning. Run your app on a minimal Debian box without libsecret installed, and it will "encrypt successfully," then write ciphertext that's equivalent to plaintext to disk.

**The correct defensive pattern** — I'd recommend every Electron app add this:

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

I went through several popular Electron projects on GitHub, and **not a single one** had this check by default.

## The VS Code case: when there's no sandbox, safeStorage is just decoration

ControlPlane's analysis of VS Code credential theft is well worth a close read. The conclusion first: **any VS Code extension can bypass safeStorage and read other extensions' secrets directly** — no vulnerability needed, just regular API calls.

The attack chain is embarrassingly short:

1. VS Code's `SecretStorage` API ultimately calls safeStorage to encrypt secrets and store them in SQLite
2. The file path is fixed: `${HOME}/.config/Code/User/globalStorage/state.vscdb`
3. Any extension has full Node.js privileges — it can read this SQLite file directly
4. The extension then calls `libsecret` directly (or a `keytar` fork, or Windows `CryptUnprotectData`) to decrypt OSCrypt's key
5. With the recovered OSCrypt key, it decrypts the SQLite ciphertext using CBC + the hardcoded IV → it now has every secret of every extension

ControlPlane even dropped a PoC extension: install it, click a button, and it dumps every secret VS Code manages.

The root cause isn't safeStorage itself — it's that **VS Code doesn't sandbox extensions**. The whole Electron app is one process, one user identity, one Keychain ACL. The OS can't tell "this extension is good and that one is bad."

The generality of this case should worry you: every "pluggable Electron app" has the same problem — Cursor, Windsurf, Trae, Obsidian, Raycast, and so on. If an extension can run Node.js code, it can bypass any layer of safeStorage "encryption."

## A new attack surface: stealing the master key with a debugger (VoidStealer, 2026-03)

VoidStealer, disclosed by Kaspersky in March 2026, offers a stealthier new approach. It targets Chrome v20 App-Bound Encryption — but the same principle applies to every Electron app.

The technical principle:

1. Don't go looking for where the key is stored (that's OS-protected)
2. Wait for the app to **call the decryption API itself**
3. At that moment, the master key necessarily appears in plaintext in the Chromium process's memory (you need the key to run AES)
4. Use Windows' legitimate debugging APIs (`WaitForDebugEvent` / `SetThreadContext`) to **attach as a debugger**, and place a **hardware breakpoint** at the decryption function's address
5. The program freezes when it hits the breakpoint, and you read the key out of the registers
6. No admin privileges, no code injection, and it doesn't trip the injection detection EDRs commonly rely on

Mapped onto Electron apps: the instant your app calls `safeStorage.decryptString()`, the plaintext key briefly exists in process memory — and a process running under the same user identity that attaches a debugger can read it in that instant.

There's no clean defense against this attack surface:

- On Windows you can call `IsDebuggerPresent` to detect it, but debuggers have anti-detection tricks
- On macOS you can use `PT_DENY_ATTACH` to block `ptrace`, but Apple's own dtrace / lldb use other channels
- The real fix is to keep the key **out of the app's process memory entirely** — only a hardware enclave (macOS Secure Enclave, Windows TPM, Linux TEE) can achieve that

A typical Electron app can't pull off enclave integration. So the most pragmatic take is: **your key is protected by safeStorage at all times outside of the moments you actively call it, and during that call it sits exposed in memory for a few milliseconds** — and that window is plenty for a targeted attack.

## Where the Electron team stands on these limitations

GitHub issue #42318 is a feature request from a developer asking that Electron's docs clearly spell out safeStorage's limitations — for example, that other code in the same process can read the keys, that Linux silently falls back to plaintext, and that any app can read the keyring once it's unlocked.

The Electron team's resolution: **"Closed as not planned."**

I can understand the decision (the cost of maintaining docs, avoiding misleading users into switching solutions, avoiding being cited as "the project officially admitting it's insecure"), but it also makes one thing clear: **the security boundary of safeStorage is something app developers have to figure out for themselves**. The project won't proactively tell you what it can't stop.

This attitude is fairly common across the Electron ecosystem. Electron has long been criticized for "bolting a web security model onto desktop apps," and the team acknowledges that assessment — but the business tradeoff is "we provide the tools, the app layer is responsible for using them sensibly."

## A threat-model-based storage decision table

Lay out the attacks safeStorage can actually defend against, and developers can decide, against their own product's threat model, whether it's enough:

```text
Threat                                                  Does safeStorage stop it?
────────────────────────────────────────────────────────────────────────────────
User's disk is stolen                                   ✅ (except Linux basic_text)
Another logged-in user on the same machine              ✅ (macOS / Windows)
Another process under same user reads the keyring       ❌ (macOS prompts; Win/Linux pass through)
Other modules / extensions in the same Electron app     ❌ (the VS Code case)
Your app is injected with malicious code via supply chain ❌ (it's the app's own identity)
A debugger attaches at runtime to grab memory           ❌ (the VoidStealer surface)
V8 snapshot tampered locally to inject JS (CVE-2025-55305) ❌
```

A product that only cares about the first two rows (an ordinary SaaS client, a docs tool, a chat app) is perfectly reasonable using safeStorage. A product that hits any of the last five rows (a password manager, a crypto wallet, an enterprise SSO client) must add another layer — a user master password plus a short-lived unlock window. That's what 1Password and Bitwarden do, and it's the realistic ceiling of what you can achieve within the Electron framework.

## Practical checklist

If you're building an Electron app that will handle API keys or tokens:

```text
□  [Must] Don't use electron-store's encryptionKey (CBC, no authentication; bit-flipping attacks are dirt cheap)
□  [Must] Use safeStorage, and check getSelectedStorageBackend() at startup; refuse to store on Linux basic_text
□  [Must] The trio: contextIsolation: true, nodeIntegration: false, sandbox: true
□  [Must] Keep Electron on an LTS version, and subscribe to electron/electron Security Advisories
□  [Recommended] Enable both ASAR integrity fuses (embeddedAsarIntegrityValidation + onlyLoadAppFromAsar, cross-platform from Electron 30+)
□  [Recommended] Add OS-level re-authentication before sensitive operations (Touch ID / Windows Hello / master password)
□  [Recommended] chmod 0600 the on-disk key file, for an extra FS-level line of defense
□  [Recommended] Don't put keys in a BrowserWindow's renderer process; keep them only in the main process
□  [Recommended] Honestly document the security boundary in your product docs; don't promise things safeStorage can't deliver
```

I especially want to stress the second item: **not a single popular Electron app adds the basic_text check by default**. This is the one line of code I'd recommend every project add — lowest effort, highest return.

## Closing thoughts

I'm not trying to talk anyone out of using safeStorage — on mainstream macOS / Windows environments, it's still the most pragmatic option in the Electron ecosystem. But treat it as **a tool with clearly defined boundaries**, not an "encrypted, therefore safe" silver bullet.

The essence of a technical decision is matching the threat model. For ordinary user scenarios, safeStorage is enough; for security-sensitive scenarios, you need defense in depth — a master password plus a Secure Enclave. Thinking clearly about "what safeStorage actually stops" matters far more than blindly trusting the word "safe" in the API name.

---

**Further reading**:

- [Electron safeStorage official docs](https://www.electronjs.org/docs/latest/api/safe-storage) - the API surface and the backend list
- [Chromium OSCrypt source](https://source.chromium.org/chromium/chromium/src/+/main:components/os_crypt/) - safeStorage's underlying implementation
- [Abusing VSCode: From Malicious Extensions to Stolen Credentials (Part 2)](https://control-plane.io/posts/abusing-vscode-from-malicious-extensions-to-stolen-credentials-part-2/) - ControlPlane's VS Code credential-theft PoC
- [Analysis of VoidStealer bypassing Chrome App-Bound Encryption](https://www.kaspersky.com/blog/chrome-application-bound-encryption-bypass-voidstealer/55735/) - the technical details of stealing the master key with a debugger
- [Electron Issue #42318: Improve safeStorage docs (closed as not planned)](https://github.com/electron/electron/issues/42318) - the project's stance on the security boundary
