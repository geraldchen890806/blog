---
author: Gerald Chen
pubDatetime: 2026-03-23T14:00:00+08:00
title: "Tool Guide 10: Online Hash Generator"
slug: blog097_hash-generator-guide
featured: false
draft: true
reviewed: true
approved: true
tags:
  - 工具指南
  - 工具
  - 安全
description: "How hash functions work, the differences between MD5/SHA-1/SHA-256 and when to use each, plus practical applications in development: password storage, data verification, and cache invalidation."
---

Give it text of any length, and it spits out a fixed-length "fingerprint" — that's what a hash function does.

As a developer, you work with hashes almost every day, even if you don't always notice. npm install verifies package integrity with SHA-512, Git tracks file changes with SHA-1, and password storage, API signatures, cache invalidation — there's a hash behind all of them.

This article covers the core concepts of hash functions, compares the major algorithms, and walks through typical use cases and common pitfalls in real-world development.

## Three Core Properties of Hash Functions

A proper cryptographic hash function must satisfy three conditions:

**1. Determinism**: The same input always produces the same output. Compute the MD5 of `hello` and no matter how many times you run it, the result is `5d41402abc4b2a76b9719d911017c592`.

**2. Avalanche effect**: Change even a single character of the input and the output changes completely.

```text
"hello"  → 5d41402abc4b2a76b9719d911017c592
"Hello"  → 8b1a9953c4611296a827abf8c47804d7
```

Only the first letter's case differs, yet the results bear no resemblance to each other. This property guarantees you can't infer patterns about the input from the output.

**3. Irreversibility**: Given a hash value, you cannot recover the original input. In theory some input exists that maps to that hash, but you can't find it (at least not in a reasonable amount of time).

Together, these three properties make hash functions a foundational building block of information security.

## Comparing the Major Hash Algorithms

### MD5 (128-bit)

MD5 was published in 1991 and outputs 32 hexadecimal characters (128 bits). It was once the most popular hash algorithm, but back in 2004, Xiaoyun Wang's team proved MD5 has collision vulnerabilities — two different inputs producing the same hash can be found in a feasible amount of time.

**Status today**: No longer recommended for security purposes. But it's still widely used in non-security scenarios (file checksums, cache keys, deduplication) because it's fast and simple to implement.

```bash
# 命令行计算 MD5
echo -n "hello" | md5sum          # Linux
echo -n "hello" | md5             # macOS
echo -n "hello" | openssl dgst -md5  # 跨平台
# 输出: 5d41402abc4b2a76b9719d911017c592
```

### SHA-1 (160-bit)

SHA-1 outputs 40 hexadecimal characters (160 bits) — longer than MD5 — and was once the standard algorithm for SSL certificates and Git. But in 2017, Google and CWI jointly published the SHAttered attack, proving SHA-1 can also be collided.

**Status today**: Git still uses SHA-1 (it's migrating to SHA-256), but new projects shouldn't use it for anything security-related.

### SHA-256 (256-bit)

SHA-256 belongs to the SHA-2 family and outputs 64 hexadecimal characters (256 bits). There is no known practical collision attack against it. It's the dominant secure hash algorithm today, widely adopted by TLS certificates, the Bitcoin blockchain, npm package verification, and more.

```bash
# 命令行计算 SHA-256
echo -n "hello" | sha256sum              # Linux
echo -n "hello" | shasum -a 256          # macOS
echo -n "hello" | openssl dgst -sha256   # 跨平台
# 输出: 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
```

### SHA-512 (512-bit)

Also part of the SHA-2 family, it outputs 128 hexadecimal characters. On 64-bit processors, SHA-512 can actually outperform SHA-256 (it maps naturally to 64-bit operations). npm's `integrity` field uses SHA-512.

### Algorithm Selection Cheat Sheet

| Scenario | Recommended Algorithm | Why |
|------|---------|------|
| Password storage | bcrypt / Argon2 | Purpose-built slow hashes, resistant to brute force |
| File integrity verification | SHA-256 | Secure with adequate performance |
| Deduplication / cache keys | MD5 or SHA-1 | Fast, collision risk is acceptable |
| Digital signatures / certificates | SHA-256+ | Required by security standards |
| API request signing | HMAC-SHA256 | Keyed message authentication |

## Hashing in Practice

### Scenario 1: Password Storage

This is the most discussed use of hashing — and the easiest to get wrong.

**Wrong approach**: storing a raw MD5/SHA-256 hash.

```javascript
// ❌ 千万别这么干
const passwordHash = crypto
  .createHash("sha256")
  .update(password)
  .digest("hex");
```

The problem: general-purpose hash algorithms are too fast. SHA-256 can be computed billions of times per second on a modern GPU (source: hashcat benchmarks), so attackers can easily recover common passwords with rainbow tables or brute force.

**Right approach**: use a hash function designed specifically for passwords.

```javascript
// ✅ 使用 bcrypt
const bcrypt = require("bcrypt");
const saltRounds = 12;
const hash = await bcrypt.hash(password, saltRounds);

// 验证
const isMatch = await bcrypt.compare(inputPassword, hash);
```

The core idea behind bcrypt, scrypt, and Argon2 is being deliberately slow. By raising the computational cost (iteration counts, memory usage), they make brute-forcing infeasible. Argon2 won the 2015 Password Hashing Competition — if you're starting a new project, pick it first.

### Scenario 2: File Integrity Verification

You download an ISO image or a software package — how do you confirm the file hasn't been tampered with? Sites typically publish a SHA-256 checksum:

```bash
# 下载文件后校验
sha256sum ubuntu-22.04.iso
# 对比官网提供的哈希值
```

npm uses a similar mechanism. Take a look at the `integrity` field in `package-lock.json`:

```json
{
  "integrity": "sha512-AbCdEf1234567890..."
}
```

This guarantees the package you install is exactly what the author published.

### Scenario 3: Cache Invalidation

Frontend build tools (webpack, Vite) embed a content hash in output filenames:

```text
main.a1b2c3d4.js
styles.e5f6g7h8.css
```

When the file content changes, the hash changes, the filename changes, and the browser knows to fetch it again. If the content hasn't changed, the hash stays the same and the cache keeps working. This is a classic application of content addressing.

```javascript
// webpack 配置
module.exports = {
  output: {
    filename: "[name].[contenthash:8].js",
  },
};
```

### Scenario 4: API Request Signing

Many APIs (payment gateways, cloud service APIs) require requests to be signed to prevent tampering. The common approach is HMAC (Hash-based Message Authentication Code):

```javascript
const crypto = require("crypto");

function signRequest(params, secretKey) {
  // 1. 按字母序排列参数
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  // 2. 用 HMAC-SHA256 签名
  return crypto
    .createHmac("sha256", secretKey)
    .update(sorted)
    .digest("hex");
}
```

Note the difference between HMAC and a plain hash: HMAC introduces a secret key, so only parties holding the key can generate and verify signatures. A plain hash can be computed by anyone.

### Scenario 5: Data Deduplication

When processing large volumes of data, hashes let you quickly determine whether two records are identical:

```javascript
function deduplicateByHash(items) {
  const seen = new Set();
  return items.filter((item) => {
    const hash = crypto
      .createHash("md5")
      .update(JSON.stringify(item))
      .digest("hex");
    if (seen.has(hash)) return false;
    seen.add(hash);
    return true;
  });
}
```

MD5 is plenty here — we don't care about security, only speed and collision probability. The random collision probability of a 128-bit hash is 1/2^64 (birthday attack), entirely negligible for millions of records.

## Web Crypto API: Native Hashing in the Browser

Modern browsers ship with the Web Crypto API, so you can compute hashes without pulling in any library:

```javascript
async function sha256(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// 使用
const hash = await sha256("hello");
console.log(hash);
// 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
```

`crypto.subtle.digest` supports SHA-1, SHA-256, SHA-384, and SHA-512, but not MD5 (browser vendors don't want to encourage its use).

Note that the Web Crypto API is asynchronous and returns a Promise. That's a deliberate design choice — hashing may involve large amounts of data, and async operations won't block the main thread.

## Online Tools: Quick Verification and Debugging

During development you often need to compute a quick hash — verifying a signature returned by the backend, or checking whether an uploaded file's content changed.

The [online hash generator](https://anyfreetools.com/tools/hash) computes multiple algorithms at once (MD5, SHA-1, SHA-256, SHA-512), producing results instantly as you type, sparing you the back-and-forth between the command line and your code. It also supports file hashing — drag in a file to compute its checksum, handy for verifying downloaded files.

When debugging API signatures, the usual workflow is: concatenate the request parameters according to the spec, compute the hash with a tool, and compare against the server's expected value. If they don't match, check whether it's an encoding issue (UTF-8 vs GBK), a sorting issue, or a missing parameter. For this kind of work, an online tool is far more efficient than writing a throwaway script.

## Common Misconceptions

### Misconception 1: Hashing Is Encryption

Hashing is not encryption. Encryption is bidirectional — with the key, you can decrypt. Hashing is one-way — there's no such thing as "unhashing." Those online MD5 "decryption" sites are actually doing rainbow table lookups (precomputed hash-to-plaintext mappings), not real decryption.

### Misconception 2: Salting Makes It Safe

Salting does defend against rainbow table attacks, but if the underlying algorithm is a fast one like SHA-256, brute force remains viable. Salt plus a slow hash (bcrypt/Argon2) is the correct password storage scheme.

### Misconception 3: SHA-256 Is Much Slower Than MD5

On modern hardware, the speed gap between SHA-256 and MD5 isn't as big as you'd think. According to OpenSSL benchmarks (openssl speed sha256 md5), SHA-256 runs at roughly 40%-60% of MD5's speed, but both are in GB/s territory. Unless you're hashing massive amounts of data in real time, the performance difference is negligible.

### Misconception 4: A Longer Hash Is Always More Secure

Security depends on algorithm design, not just output length. A flawed 512-bit hash can be less secure than a well-designed 256-bit one. Choose algorithms that have been thoroughly vetted by the cryptography community.

## Summary

Hash functions are a basic tool in every developer's toolbox:

- Need security (passwords, signatures) → SHA-256 + HMAC; use bcrypt/Argon2 for passwords
- Don't need security (caching, deduplication) → MD5 or SHA-1, fast enough and good enough
- Browser environment → Web Crypto API has native support
- Quick verification → [online hash tool](https://anyfreetools.com/tools/hash) for instant results

Remember two principles: hashing is not encryption, and never use general-purpose hashes for passwords.

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
