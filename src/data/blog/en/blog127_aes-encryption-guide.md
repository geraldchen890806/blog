---
author: Gerald Chen
pubDatetime: 2026-04-16T14:00:00+08:00
title: "Tool Guide 29: Online AES Encryption & Decryption Tool"
slug: blog127_aes-encryption-guide
featured: false
draft: true
reviewed: true
approved: false
tags:
  - 工具指南
  - 工具
  - 加密
  - 安全
description: "A deep dive into AES symmetric encryption: how it works, choosing a mode (CBC/GCM/ECB), key management strategies, and how to use an online AES tool to encrypt/decrypt data and debug API encryption parameters fast — with complete Node.js and browser-side implementation code."
---

You're integrating with a third-party API and they tell you, "Encrypt the request body with AES-256-CBC, ask me for the key." You get the key and IV, write some encryption code, send a request — and they say decryption failed. Is it the padding, the encoding, or the mode? Debugging this by tweaking parameters back and forth in code is painfully slow.

A tool where you can type in the plaintext, key, and IV and see the ciphertext in real time lets you pinpoint the problem in seconds. This article covers the core concepts of AES encryption, walks through where the [online AES encryption/decryption tool](https://anyfreetools.com/tools/aes) fits, and provides ready-to-use code for developers who need to integrate AES into their projects.

## AES Fundamentals

AES (Advanced Encryption Standard) is the most widely used symmetric encryption algorithm today, adopted by NIST as a Federal Information Processing Standard (FIPS 197) in 2001. "Symmetric" means encryption and decryption use the same key.

### Key Lengths

AES supports three key lengths: 128 bits (16 bytes), 192 bits (24 bytes), and 256 bits (32 bytes). AES-128 and AES-256 are the most common in everyday development. The differences come down to security margin and number of rounds:

| Key Length | Rounds | Security | Performance |
|---------|------|-------|------|
| 128-bit | 10 rounds | Sufficient against all currently known attacks | Fastest |
| 192-bit | 12 rounds | Higher security margin | Medium |
| 256-bit | 14 rounds | Quantum-resistant (in theory) | Slightly slower |

The real-world performance difference is tiny. Unless you have specific compliance requirements, AES-128 is already secure enough. People choose AES-256 mainly to satisfy compliance preferences in certain contexts, or to leave a safety margin against future quantum computing.

### Encryption Modes

AES itself is a block cipher — it can only encrypt 16-byte blocks at a time. To handle longer data, you need to pick a mode of operation. Here's how the common modes compare:

**ECB (Electronic Codebook)**: The simplest — each block is encrypted independently. The problem is that identical plaintext blocks produce identical ciphertext blocks, which leaks patterns in the data. The classic example is ECB-encrypting a bitmap image: the outline of the image is still visible after encryption. **Never use ECB in production.**

**CBC (Cipher Block Chaining)**: Each block is XORed with the previous ciphertext block before encryption. It requires an initialization vector (IV) for the first block. CBC is the most common of the traditional modes, but it has drawbacks: encryption can't be parallelized (each block depends on the previous block's result), and if padding is handled incorrectly, it can be vulnerable to Padding Oracle attacks.

**GCM (Galois/Counter Mode)**: Built on CTR mode with authentication on top (AEAD). It produces an Authentication Tag alongside the ciphertext, and decryption verifies that the data hasn't been tampered with. GCM supports parallel processing, performs well, and is highly secure. **If you have no compatibility constraints, GCM should be your default.**

**CTR (Counter Mode)**: Turns AES into a stream cipher — an incrementing counter generates a keystream that's XORed with the plaintext. It supports parallel processing and random access, but provides no integrity verification.

### IV and Nonce

CBC mode requires an IV (Initialization Vector) that must be 16 bytes. GCM mode requires a Nonce, with 12 bytes recommended. The critical rule: **every encryption must use a different IV/Nonce**. If you encrypt different plaintexts with the same key and IV, an attacker can XOR the ciphertexts to derive information about the plaintext.

The IV doesn't need to be secret — it's typically prepended to the ciphertext and transmitted together.

## When to Use the Tool

The [AES encryption/decryption tool](https://anyfreetools.com/tools/aes) saves serious time in these situations:

**API integration**: When working with a third party, you need to confirm both sides agree on the encryption parameters. Plug their key, IV, and mode into the tool, encrypt a test string, and check whether the ciphertext matches their example. If it doesn't, walk through the parameters one by one — far faster than debugging in code.

**Validating an encryption design**: When designing a data encryption scheme, test different modes and parameters in the tool first. For example, compare the output formats of CBC and GCM, or verify that padding behaves as expected.

**Decryption debugging**: You have a ciphertext and the key, but decryption fails. Use the tool to narrow it down: is the key Hex-encoded or UTF-8? Is the IV fixed or embedded at the head of the ciphertext? Is the mode CBC or GCM? Questions like these take minutes to resolve with the tool.

**Teaching and demos**: When explaining how AES works to your team, showing the encryption live beats any slide deck. Change one character in the plaintext and watch the ciphertext change completely (the avalanche effect) — more convincing than any written description.

## Tool Features in Detail

Open [https://anyfreetools.com/tools/aes](https://anyfreetools.com/tools/aes) — the interface is split into an input area and an output area:

**Input area**:
- Mode selection: supports common modes including CBC, GCM, ECB, and CTR
- Key input: accepts text or Hex; the tool infers AES-128/192/256 from the key length
- IV/Nonce input: automatically hints at the required length based on the mode
- Plaintext input: supports both text and Hex formats
- Padding selection: PKCS7 (default), Zero Padding, No Padding

**Output area**:
- Ciphertext: Base64-encoded by default, switchable to Hex
- Operation toggle: switch between encrypt and decrypt modes with one click

A typical workflow: select AES-256-CBC, enter a 32-byte key, fill in a 16-byte IV, type the plaintext, and click encrypt to get a Base64 ciphertext. Copy the ciphertext to the other party, who decrypts it with the same parameters to verify.

## Developer Deep Dive: Code Implementation

### AES-256-GCM in Node.js

GCM is the recommended mode. Node.js's built-in `crypto` module supports it directly:

```javascript
const crypto = require("crypto");

function encryptAesGcm(plaintext, key) {
  // key 必须是 32 字节（AES-256）
  const nonce = crypto.randomBytes(12); // GCM 推荐 12 字节 Nonce
  const cipher = crypto.createCipheriv("aes-256-gcm", key, nonce);

  let encrypted = cipher.update(plaintext, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const tag = cipher.getAuthTag(); // 16 字节认证标签

  // 返回格式：nonce(12) + tag(16) + ciphertext
  return Buffer.concat([nonce, tag, encrypted]);
}

function decryptAesGcm(encryptedData, key) {
  const nonce = encryptedData.subarray(0, 12);
  const tag = encryptedData.subarray(12, 28);
  const ciphertext = encryptedData.subarray(28);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf8");
}

// 使用示例
const key = crypto.randomBytes(32); // 生产环境从安全存储获取
const encrypted = encryptAesGcm("需要加密的数据", key);
console.log("密文 (Base64):", encrypted.toString("base64"));

const decrypted = decryptAesGcm(encrypted, key);
console.log("明文:", decrypted);
```

A few key points in this code:

1. **Random Nonce generation**: generate a fresh Nonce with `crypto.randomBytes(12)` on every encryption — never reuse one
2. **Output format**: pack Nonce + Tag + ciphertext into a single Buffer, then split it at fixed offsets when decrypting
3. **Authentication tag**: GCM's core advantage — if the data has been tampered with, `decipher.final()` throws during decryption

### AES-256-CBC in Node.js

Some scenarios (integrating with legacy systems) require CBC mode:

```javascript
const crypto = require("crypto");

function encryptAesCbc(plaintext, key) {
  const iv = crypto.randomBytes(16); // CBC 需要 16 字节 IV
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

  let encrypted = cipher.update(plaintext, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]); // 默认 PKCS7 padding

  // 返回格式：iv(16) + ciphertext
  return Buffer.concat([iv, encrypted]);
}

function decryptAesCbc(encryptedData, key) {
  const iv = encryptedData.subarray(0, 16);
  const ciphertext = encryptedData.subarray(16);

  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf8");
}
```

Node.js `crypto` uses PKCS7 padding by default in CBC mode, matching the default behavior of most languages and frameworks. If something breaks during integration, check both sides' padding scheme first.

### Browser-side Implementation

Modern browsers support AES natively through the Web Crypto API:

```javascript
async function encryptInBrowser(plaintext, rawKey) {
  const key = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    key,
    encoded
  );

  // Web Crypto API 的 GCM 输出已包含 tag（附在密文末尾）
  const result = new Uint8Array(12 + ciphertext.byteLength);
  result.set(nonce, 0);
  result.set(new Uint8Array(ciphertext), 12);

  return result;
}

async function decryptInBrowser(encryptedData, rawKey) {
  const key = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const nonce = encryptedData.slice(0, 12);
  const ciphertext = encryptedData.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: nonce },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}
```

Note that the Web Crypto API's GCM output is `ciphertext + tag` (tag appended at the end), while the Node.js example uses `nonce + tag + ciphertext` (tag in front). If your frontend and backend need to interoperate, adjust the output format so both sides agree on where the tag goes.

## Key Management: Where Things Actually Go Wrong

The AES algorithm itself is plenty secure — in practice, nearly all failures come from key management. Common mistakes:

**Hardcoded keys**: baking the key into source code. Once the code leaks (search "AES key" on GitHub and you'll find plenty of examples), the encryption is worthless. The right approach: load keys from environment variables or a key management service (AWS KMS, HashiCorp Vault).

**Improper key derivation**: using a user's password directly as the AES key. Passwords are usually too short and low-entropy. The right approach: derive a key from the password with PBKDF2 or Argon2:

```javascript
const crypto = require("crypto");

function deriveKey(password, salt) {
  // PBKDF2: 60万次迭代 (OWASP 2023 推荐), SHA-256, 输出 32 字节
  return crypto.pbkdf2Sync(password, salt, 600000, 32, "sha256");
}

const salt = crypto.randomBytes(16); // 每个用户/每次加密用不同 salt
const key = deriveKey("user-password", salt);
// salt 需要和密文一起存储（salt 不需要保密）
```

**IV/Nonce reuse**: the most dangerous mistake. In CTR/GCM mode, encrypting two different plaintexts with the same Key + Nonce lets an attacker recover plaintext directly by XORing the two ciphertexts. In CBC mode, reusing the same Key + IV reveals whether plaintexts share a common prefix. **Every encryption must use a freshly random IV/Nonce.**

**Transmitting keys in plaintext**: sending the AES key over WeChat or email. The right approach: encrypt the key with RSA or ECDH before transmission, or use a secure key exchange protocol.

## AES vs. Other Encryption Algorithms

| Property | AES | RSA | ChaCha20 |
|-----|-----|-----|----------|
| Type | Symmetric | Asymmetric | Symmetric |
| Key length | 128/192/256-bit | 2048/4096-bit | 256-bit |
| Speed | Fast (hardware-accelerated) | Slow (big-number arithmetic) | Fast (software-friendly) |
| Typical use | Data encryption | Key exchange, signatures | TLS, mobile |
| Hardware support | AES-NI instruction set | No dedicated instructions | No dedicated instructions |

In practice, AES and RSA are often used together: RSA encrypts the AES key, and AES encrypts the actual data. This scheme is called Hybrid Encryption — it combines RSA's key-distribution advantage with AES's encryption speed.

ChaCha20-Poly1305 is an alternative to AES-GCM that performs better on devices without AES-NI hardware acceleration (older phones). Google uses ChaCha20 heavily for TLS connections on Android devices.

## Troubleshooting Common Issues

**Decryption fails with "bad decrypt"**: most often a mismatched key or IV. Compare with the online tool: encrypt the same text with your parameters and the other party's parameters separately, and see which parameter causes the results to diverge.

**Garbage characters at the end after decryption**: usually a padding issue. Verify that both sides use PKCS7. Some implementations default to Zero Padding and don't automatically strip trailing zero bytes after decryption.

**GCM throws "Unsupported state or unable to authenticate data"**: the Authentication Tag is wrong. Check that the Tag is passed correctly. Common mistakes: the Tag got truncated (it should be 16 bytes), or the Tag is in the wrong position (some implementations put it before the ciphertext, others after).

**Wrong length after Base64 decoding**: check whether URL-safe Base64 is in use (`-_` instead of `+/`). Default Base64 behavior varies across languages.

---

**Related reading**:
- [Tool Guide 10: Online Hash Generator](/en/posts/blog097_hash-generator-guide/) - Understanding hashes helps with key derivation (PBKDF2), message authentication (HMAC), and other cryptographic primitives used alongside encryption
- [Tool Guide 28: Online TOTP Code Generator](/en/posts/blog125_totp-generator-guide/) - TOTP involves key management ideas similar to AES, and both are staples of the cryptography toolbox

---

**Other articles in this series**:

- [Tool Guide 1: Online Image Compression](/en/posts/blog084_image-compress-guide/)
- [Tool Guide #2: Online JSON Formatter](/en/posts/blog085_json-formatter-guide/)
- [Tool Guide #3: Online Regex Tester](/en/posts/blog086_regex-tester-guide/)
- [Tool Guide 4: QR Code Generator](/en/posts/blog089_qrcode-generator-guide/)
- [Tool Guide 5: Base64 Encoder/Decoder](/en/posts/blog090_base64-tool-guide/)
- [Tool Guide 6: Online JWT Decoder](/en/posts/blog092_jwt-decoder-guide/)
- [Tool Guide 7: Unix Timestamp Converter](/en/posts/blog094_timestamp-tool-guide/)
- [Tool Guide 8: Online Password Generator](/en/posts/blog095_password-generator-guide/)
- [Tool Guide 9: URL Encoder/Decoder](/en/posts/blog096_url-encoder-guide/)
- [Tool Guide 10: Online Hash Generator](/en/posts/blog097_hash-generator-guide/)
- [Tool Guide 11: JSON to TypeScript Type Generator](/en/posts/blog099_json-to-typescript-guide/)
- [Tool Guide 12: Online Cron Expression Parser](/en/posts/blog100_cron-parser-guide/)
- [Tool Guide 13: Online Color Converter](/en/posts/blog102_color-converter-guide/)
- [Tool Guide 14: Online SQL Formatter](/en/posts/blog103_sql-formatter-guide/)
- [Tool Guide 15: Online Markdown Live Preview Tool](/en/posts/blog104_markdown-preview-guide/)
- [Tool Guide 16: Online JSON Diff Tool](/en/posts/blog106_json-diff-guide/)
- [Tool Guide 17: AI Token Counter](/en/posts/blog107_token-counter-guide/)
- [Tool Guide 18: Online OCR Text Recognition](/en/posts/blog108_ocr-tool-guide/)
- [Tool Guide 19: Online CSS Gradient Generator](/en/posts/blog110_css-gradient-guide/)
- [Tool Guide 20 - Online UUID Generator](/en/posts/blog111_uuid-generator-guide/)
- [Tool Guide 21: HTML to JSX Online Converter](/en/posts/blog112_html-to-jsx-guide/)
- [Tool Guide 22: Online WebSocket Tester](/en/posts/blog114_websocket-tester-guide/)
- [Tool Guide 23: Free Online CSV to JSON Converter](/en/posts/blog116_csv-to-json-guide/)
- [Tool Guide 24: Online CSS Box Shadow Generator](/en/posts/blog118_box-shadow-guide/)
- [Tool Guide 25: Online Favicon Generator](/en/posts/blog120_favicon-generator-guide/)
- [Tool Guide 26: Online Subnet Calculator](/en/posts/blog121_subnet-calculator-guide/)
- [Tool Guide 27: Online Mock Data Generator](/en/posts/blog123_mock-data-guide/)
- [Tool Guide 28: Online TOTP Code Generator](/en/posts/blog125_totp-generator-guide/)
