---
author: Gerald Chen
pubDatetime: 2026-06-01T16:00:00+08:00
title: "How Electron Desktop Wallets Should Store Private Keys: safeStorage Isn't Enough — Learn from MetaMask and Phantom"
slug: blog176_electron-private-key-storage
featured: true
draft: false
reviewed: true
approved: true
tags:
  - 安全
  - JavaScript
  - 开发效率
  - 开源
description: "A few days ago I wrote a teardown of safeStorage — the conclusion was that it's fine for ordinary API keys. But what if you need to store a wallet private key worth tens of thousands of dollars? safeStorage falls short. This post looks at how real desktop wallets like MetaMask and Phantom do it, and why the trio of \"encryption + master password + short-lived unlock\" is unavoidable."
---

A few days ago I published [Opening the Electron safeStorage Black Box](/en/posts/blog169_electron-credential-storage-security). The takeaway: safeStorage is fine for ordinary API keys, but it has real boundary conditions — malicious code in the same process can read your secrets, the Linux fallback amounts to plaintext, and an attached debugger can grab the master key.

At the end of that post I said: "If your product matches the bottom five rows of the threat model table (password managers, crypto wallets, enterprise SSO), you must add a master password plus a short-lived unlock window on top."

This post is entirely about that "extra layer" — **how an Electron desktop app should actually store private-key-grade secrets**. By "private key" I specifically mean: crypto wallet mnemonics / seed phrases / private keys, SSH private keys, PGP/GPG private keys, enterprise root certificate keys — the kind where a leak means irreversible loss.

## Why safeStorage Alone Isn't Enough

Let me restate the conclusion from the previous post so you don't have to go dig it up. The ceiling of safeStorage's threat model is:

- ✅ Protects against a stolen hard drive
- ✅ Protects against other login users on the same machine
- ❌ Does not protect against other processes running as the same user (macOS shows an authorization prompt; Windows lets it straight through)
- ❌ Does not protect against other modules or extensions inside the same Electron app
- ❌ Does not protect against malicious code injected via a supply chain attack
- ❌ Does not protect against a debugger attaching at runtime and scraping memory
- ❌ Does not protect against V8 snapshot tampering (CVE-2025-55305)

For ordinary API keys, covering the first two is enough — worst case, you revoke and reissue. But in the private key scenario, **failing on any single one of these is a disaster**:

- Wallet mnemonic read → tens of thousands to millions of dollars in assets drained instantly; on-chain transactions cannot be rolled back
- SSH private key read → the attacker gets every server you can log into
- PGP private key read → all historical encrypted communication decrypted, plus all future signatures forgeable

That asymmetry is the crux: the cost of a leaked private key is nothing like "just request a new one." Which is why **no commercial wallet relies on safeStorage alone** — they all layer on a whole additional defense stack.

## MetaMask's Approach: Master Password + In-Memory Decryption + Auto-Lock

MetaMask isn't an Electron app, but its browser extension uses Chrome's storage APIs (the same lineage as Electron's safeStorage), and the code is fully open source — you can port it to Electron wholesale. The core mechanism:

**1. Derive a key from a user master password**

```javascript
// 概念示意（非 MetaMask 原文）
const masterKey = pbkdf2(userPassword, salt, {
  iterations: 10_000,
  hash: 'sha256',
  keyLen: 32
});
```

MetaMask originally defaulted to PBKDF2 with 10,000 iterations + SHA-256, but since 2023 `@metamask/browser-passworder` has been upgraded to **600,000 iterations** — which is also OWASP's current minimum recommendation for PBKDF2-SHA256. If you copy code from an old blog post, remember to bump the iteration count from 10k to 600k or more. The checklist below follows the new standard.

**2. AES-GCM (authenticated) encryption over the entire vault**

Note that it's GCM, not CBC — GCM carries an authentication tag, so flipping a single bit in the ciphertext makes decryption fail outright. This is a direct contrast with the AES-128-CBC + hardcoded IV used by safeStorage: the latter is vulnerable to bit-flipping attacks, the former is completely immune.

**3. Decrypted private keys live only in memory, never on disk**

Open the extension and enter the password → private key is decrypted → stored in the in-memory `memStore` object → wiped when the browser closes or locks. **What sits on disk is always ciphertext**.

**4. Auto-lock mechanism**

Locks automatically after 5 minutes of inactivity by default; unlocking requires re-entering the master password. This single measure squeezes the "key sits in memory while the AI is being prompt-injected" window down to a minimum.

This entire mechanism ports cleanly to Electron — every primitive (PBKDF2, AES-GCM, memory wiping) is natively supported in Node.js.

## Phantom and the MPC Wallet Route: ChaCha20-Poly1305 + Key Sharding

Phantom is the dominant wallet in the Solana ecosystem, and its desktop version is Electron. Phantom has publicly disclosed that it encrypts its local vault with ChaCha20-Poly1305 — which by itself is already a tier above the AES-128-CBC used by safeStorage.

The benefits of ChaCha20-Poly1305 over AES-GCM:

- Much faster than AES-GCM on devices without hardware AES instructions (especially noticeable on mobile)
- Stronger resistance to timing attacks
- Widely regarded by cryptographers as the more modern choice (the two are equivalent in security strength)

**On key sharding** — I need to be upfront here: Phantom has disclosed that it uses a Shamir Secret Sharing-style scheme, but **there is no fully public technical documentation on exactly how the shares are split, how many there are, or where they're stored**. Phantom's newer "Embedded Wallet" is closer to MPC / TSS (multi-party computation / threshold signatures), not textbook Shamir. So the following is **the common industry approach (used by open-source MPC schemes like Web3Auth / Torus / Lit Protocol)**, not a precise description of Phantom's actual architecture:

```text
Common industry MPC wallet approach (not Phantom's actual architecture)

Full key K (never exists in complete form anywhere)
    │
    ├─ Share 1 (stored in the device Keychain)
    ├─ Share 2 (stored in the cloud, encrypted with login state)
    └─ Share 3 (derived from the user's master password)
    
Any 2 shares → recover K
Any single share → zero information (not partial information — zero in the information-theoretic sense)
```

The core value of this "K-of-N sharding" idea:

- One share in macOS Keychain / Windows Credential Manager (OS-level protection)
- One share in the cloud (encrypted with the user's login state)
- One share in the user's head (derived from the master password)

A leak through any single channel cannot reconstruct the original private key — even an attacker with full control of the Electron process only gets 1/3 of the information. This is genuine defense in depth. If you're building a wallet-grade product, **the MPC route (Web3Auth / Privy / Lit) is worth your research time** — far safer than rolling your own Shamir implementation.

## A Copy-Paste-Ready Checklist for Wallet-Grade Private Key Storage in Electron

Here's the MetaMask + Phantom playbook distilled into one engineering checklist you can use directly:

```text
□ [Required] Users must set a master password (do not let them skip it)
□ [Required] PBKDF2 ≥ 600k iterations (current OWASP recommendation; don't skimp on this CPU — it's the only gate against brute force)
□ [Required] AEAD algorithm: AES-GCM or ChaCha20-Poly1305 (never CBC)
□ [Required] A unique random IV per encrypted record (no hardcoding, no reuse)
□ [Required] Decrypted private keys live only in main-process memory; never pass them to the renderer process
□ [Required] Auto-lock (default 5 minutes); wipe plaintext from memory on lock
□ [Required] Never persist the master password; require user input on every unlock
□ [Required] Every operation touching private keys (signing, transfers, export) requires secondary confirmation
□ [Recommended] Use Shamir Secret Sharing to split the key 2-of-3, so a single-channel leak isn't fatal
□ [Recommended] Integrate hardware enclaves (macOS Secure Enclave, Windows TPM) for the most sensitive share
□ [Recommended] Enable the Electron trio: sandbox / contextIsolation / nodeIntegration: false
□ [Recommended] Both ASAR integrity fuses (against code tampering)
□ [Recommended] On first setup, force the prompt "Please write your mnemonic down on paper" — paper is the best anti-prompt-injection medium
□ [Recommended] Support hardware wallets (Ledger, Trezor) as a power user option
```

## An Unavoidable Honest Conclusion: Hardware Wallets Will Always Be Safer

Something has to be said at this point: **a pure software solution has a hard security ceiling, and it never reaches a hardware wallet**.

Ledger / Trezor keep the private key in a dedicated secure element, and signing happens inside the secure element too — **the key never leaves the hardware from factory to retirement**. The best an Electron app can do is "the private key briefly exists in memory for a few milliseconds"; what a hardware wallet achieves is "the private key never enters general-purpose CPU memory at all."

So a responsible Electron wallet should:

1. **Offer a software wallet by default** (using the mechanisms above)
2. **Strongly encourage users to connect a hardware wallet** (one-click signing authorization)
3. **Trigger the hardware wallet above an amount threshold** (e.g., mandatory hardware confirmation for any single transaction over $1,000)
4. **Be honest with users about the software wallet's limits** ("This encryption protects against stolen drives and some malware, but not against deep compromise — use a hardware wallet for large amounts")

Many wallets refuse to take this step — because it amounts to "admitting our product isn't secure enough." But **this is what writing responsibly for your users looks like**.

## A Few Words for Electron Developers

Finally, some notes for fellow engineers:

- **Don't build cryptographic primitives from scratch**: use Node.js's built-in `crypto`, or audited libraries like `node-forge` and `tweetnacl`. A hand-rolled AES-GCM implementation is wrong 95% of the time
- **Don't believe "encrypted means safe"**: the "safe" in safeStorage's name is not a silver bullet — it's a tool with clearly defined boundaries. For private-key-grade storage, safeStorage is one of the bottom layers, not the whole stack
- **Threat model before implementation**: what is your product defending against? A stolen drive? Commodity malware? Nation-state APTs? Each tier calls for a completely different design. An ordinary wallet defending against APTs is neither realistic nor necessary
- **CVE-2025-55305 is a wake-up call**: no encryption survives the process itself being injected. So **never treat "encryption" as the only line of defense** — pair it with code signing, ASAR integrity, and runtime integrity checks
- **Being conservative is nothing to be ashamed of**: commercially, "AI auto-signing / auto-operating the wallet" sounds cool; in engineering terms, every layer of automation is another attack surface. In the private key scenario, **the moment a human presses the confirm button is the most important safety net**

Writing this clarified things for me too: **it's not that Electron can't store private keys — it's that the engineering required is far bigger than people imagine**. A casual "just encrypt it with safeStorage" is nowhere near enough. If you're seriously building a wallet app, reading through the MetaMask / Phantom open-source implementations one by one is worth more than any "build an Electron wallet in 5 minutes" tutorial.

---

**Further reading**:

- [Opening the Electron safeStorage Black Box (blog169 on this blog)](/en/posts/blog169_electron-credential-storage-security) - The prequel to this post: a teardown of safeStorage's own security boundaries
- [Letting Claude Code Modify My Real-Money Trading Code (blog175 on this blog)](/en/posts/blog175_claude-code-trading-bot-dogfooding) - The other side of credential protection when real money is on the line
- [MetaMask Vault Decryptor](https://metamask.github.io/vault-decryptor/) - Official reference tool for the vault ciphertext format
- [Phantom Wallet Security docs](https://help.phantom.com/hc/en-us/articles/4406399207059-Is-Phantom-Safe-to-Use) - Official notes on the ChaCha20-Poly1305 + Shamir implementation
- [iOS Secure Enclave documentation](https://support.apple.com/guide/security/secure-enclave-sec59b0b31ff/web) - Reference implementation for hardware-level key protection
- [How Ledger hardware wallets work](https://www.ledger.com/academy/security/the-safest-way-to-use-blockchain) - The design philosophy of keys never leaving the hardware
