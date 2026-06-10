---
author: Gerald Chen
pubDatetime: 2026-04-15T10:00:00+08:00
title: "Tool Guide 28: Online TOTP Code Generator"
slug: blog125_totp-generator-guide
featured: false
draft: true
reviewed: true
approved: true
tags:
  - 工具指南
  - 工具
  - 安全
description: "How to use an online TOTP generator to quickly create and verify RFC 6238-compliant 6-digit OTPs — covering how TOTP works, when to use it, how it compares to Google Authenticator, and complete code examples for integrating TOTP into your own system."
---

The most common form of two-factor authentication (2FA) is that 6-digit number that refreshes every 30 seconds. Scan a QR code, a number pops up on your phone, type it in at login — the whole flow is so smooth that most people never wonder how it actually works.

This post breaks down how TOTP works, walks through the use cases for the [online TOTP code generator](https://anyfreetools.com/tools/totp-generator), and gives developers who need to build 2FA themselves code they can use directly.

## What is TOTP

TOTP stands for Time-based One-Time Password, defined by RFC 6238. The core idea is simple: combine a shared secret with the current timestamp and run them through HMAC-SHA1 to produce a number that's only valid for a short window.

The computation takes three steps:

1. **Time step**: Divide the current Unix timestamp by 30 (seconds) to get an integer `T`. `T` increments every 30 seconds.
2. **HMAC**: Compute HMAC-SHA1 over the 8-byte big-endian encoding of `T`, keyed with the Base32-decoded secret, producing a 20-byte digest.
3. **Dynamic truncation**: Take the low 4 bits of the digest's last byte as an offset, read 4 bytes starting at that offset, and take the result modulo 10^6 to get a 6-digit code.

The key property of this algorithm: **the server and client only need to share the secret once — after that, no network communication is required** for both sides to independently compute the same code. As long as their clocks are in sync, they will always agree.

## When to use the tool

The [TOTP code generator](https://anyfreetools.com/tools/totp-generator) beats a phone app in these scenarios:

**Testing and development**: When building your own 2FA feature, you need to quickly check whether a secret is configured correctly and whether the frontend and backend algorithms agree. Open the tool, paste in the secret, and you immediately see the current OTP and its remaining validity — much faster than pulling out your phone to cross-check.

**Temporary devices**: If you need to log into an account from a computer without an authenticator app installed, an online tool can generate the code on the spot. Caveat: only do this when you fully trust the device and the network.

**Bulk verification**: When automated test scripts need to simulate 2FA logins, verifying a secret directly in the tool is more straightforward than debugging it in code.

**Recovery**: If you lose or replace your phone but still have the original secret (the Base32 string), an online tool restores access immediately, with no dependency on a backup device.

## Core features

Open [https://anyfreetools.com/tools/totp-generator](https://anyfreetools.com/tools/totp-generator) and you'll find two areas:

**Generator**: Enter a Base32 secret and the tool shows the current 6-digit OTP in real time, along with a countdown progress bar. When the countdown hits 0, the next OTP appears automatically. Custom time steps (default 30 seconds) and OTP lengths (default 6 digits) are supported.

**Secret generation**: If you're adding 2FA to your own system, the built-in random secret generator produces a spec-compliant Base32 key you can copy and use directly.

All computation happens locally in the browser — your secret is never uploaded to a server.

## How it differs from Google Authenticator

Google Authenticator, Authy, 1Password, and similar apps all implement the same RFC 6238 standard, so the codes they produce are identical to the online tool's. The differences:

| Dimension | Phone authenticator app | Online tool |
|---|---|---|
| Security | Higher (local storage, works offline) | Moderate (local computation, but requires a browser environment) |
| Convenience | Always available, no computer needed | Requires entering the secret; suited to occasional use |
| Best for | Everyday 2FA logins | Development testing, temporary access, recovery |
| Multi-account management | Managed in one app | Secret must be entered manually each time |

**Important**: the online tool is for development, debugging, and one-off situations. For everyday account 2FA, stick with a local authenticator app, and never store your secret long-term in any online service.

## For developers: integrating TOTP into your system

If you're building a system that needs 2FA, here's how to implement it on both the backend and frontend.

### Backend: Node.js

With the `otpauth` library, it's just a few lines:

```bash
npm install otpauth
```

```javascript
import * as OTPAuth from "otpauth";

// 生成新用户的 Secret
function generateSecret(username) {
  const totp = new OTPAuth.TOTP({
    issuer: "MyApp",
    label: username,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromRandom(20),
  });

  return {
    secret: totp.secret.base32, // 保存到数据库
    otpauthUrl: totp.toString(), // 生成二维码用这个 URL
  };
}

// 验证用户输入的 OTP
function verifyOTP(secret, token) {
  const totp = new OTPAuth.TOTP({
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  // delta 表示时间窗口偏移，±1 容忍 30 秒误差
  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}
```

The `otpauthUrl` has the format `otpauth://totp/MyApp:username?secret=XXX&issuer=MyApp`. Render this string as a QR code and the user can scan it with Google Authenticator to complete the binding.

### Backend: Python

```python
import pyotp
import qrcode

# 生成 Secret
secret = pyotp.random_base32()

# 创建 TOTP 对象
totp = pyotp.TOTP(secret)

# 生成二维码 URL
otpauth_url = totp.provisioning_uri(
    name="user@example.com",
    issuer_name="MyApp"
)

# 验证用户输入
def verify(token: str) -> bool:
    # valid_window=1 容忍 ±30 秒时钟偏差
    return totp.verify(token, valid_window=1)

print(f"Secret: {secret}")
print(f"OtpAuth URL: {otpauth_url}")
print(f"Current OTP: {totp.now()}")
```

### Frontend: displaying the setup QR code

When a user first enables 2FA, the backend generates the secret and returns the `otpauthUrl`; the frontend renders it as a QR code with the `qrcode` library:

```javascript
import QRCode from "qrcode";

async function renderQRCode(otpauthUrl, canvasElement) {
  await QRCode.toCanvas(canvasElement, otpauthUrl, {
    width: 200,
    margin: 2,
  });
}
```

After the user scans it with their authenticator app, have them enter the current OTP once to confirm the binding succeeded before persisting the secret. This verification step matters — it prevents users from getting locked out if the secret was corrupted in transit.

### Database design

A TOTP integration needs a few columns:

```sql
ALTER TABLE users ADD COLUMN
  totp_secret VARCHAR(64),           -- Base32 Secret，加密存储
  totp_enabled BOOLEAN DEFAULT FALSE, -- 是否已开启 2FA
  totp_verified_at TIMESTAMP,        -- 首次验证成功时间
  totp_backup_codes TEXT;            -- 备用恢复码（JSON 数组，哈希存储）
```

Backup recovery codes are easy to overlook but matter a lot to users. Generate 8-10 random strings, store their hashes, and let users disable 2FA with one if they lose their device. Each backup code is single-use — mark it as consumed once redeemed.

## Common questions

**The OTP doesn't match**: 99% of the time it's clock drift. If the server's clock is off by more than 30 seconds, verification fails. Adding `window: 1` to the validation logic (allowing one time step before and after) tolerates a 30-second skew, which is usually enough. For larger drift, check the server's NTP configuration.

**Storing secrets safely**: A TOTP secret is a credential — as sensitive as a password. Don't store it in plaintext; encrypt it with AES before writing to the database, and keep the encryption key in an environment variable or a key management service (KMS).

**Multiple devices**: The same secret works on multiple devices simultaneously because the algorithm is deterministic — given the same secret, any device computes the same OTP. That's both a feature (multi-device backup) and a risk (a leaked secret lets anyone generate valid OTPs).

**TOTP vs HOTP**: HOTP (HMAC-based OTP, RFC 4226) replaces the timestamp with a counter that increments on each use. The upside is no dependency on clock synchronization; the downside is messier state synchronization and counter drift. For everyday 2FA, TOTP is the mainstream choice.

---

TOTP is an elegantly designed protocol: one key exchange, then fully offline operation — no middleman, no network dependency. Understanding how it works helps you implement 2FA correctly, and also helps you judge when an online tool is appropriate and where the security boundaries lie.

Need to quickly generate or verify an OTP? Use the [online TOTP generator](https://anyfreetools.com/tools/totp-generator). Need to integrate 2FA into your own system? The code above should run pretty much as-is.

---

**Tool Guide Series**

[Tool Guide 1: Online Image Compression](/en/posts/blog084_image-compress-guide/) | [Tool Guide #2: Online JSON Formatter](/en/posts/blog085_json-formatter-guide/) | [Tool Guide #3: Online Regex Tester](/en/posts/blog086_regex-tester-guide/) | [Tool Guide 4: QR Code Generator](/en/posts/blog089_qrcode-generator-guide/) | [Tool Guide 5: Base64 Encoder/Decoder](/en/posts/blog090_base64-tool-guide/) | [Tool Guide 6: Online JWT Decoder](/en/posts/blog092_jwt-decoder-guide/) | [Tool Guide 7: Unix Timestamp Converter](/en/posts/blog094_timestamp-tool-guide/) | [Tool Guide 8: Online Password Generator](/en/posts/blog095_password-generator-guide/) | [Tool Guide 9: URL Encoder/Decoder](/en/posts/blog096_url-encoder-guide/) | [Tool Guide 10: Online Hash Generator](/en/posts/blog097_hash-generator-guide/) | [Tool Guide 11: JSON to TypeScript Type Generator](/en/posts/blog099_json-to-typescript-guide/) | [Tool Guide 12: Online Cron Expression Parser](/en/posts/blog100_cron-parser-guide/) | [Tool Guide 13: Online Color Converter](/en/posts/blog102_color-converter-guide/) | [Tool Guide 14: Online SQL Formatter](/en/posts/blog103_sql-formatter-guide/) | [Tool Guide 15: Online Markdown Live Preview Tool](/en/posts/blog104_markdown-preview-guide/) | [Tool Guide 16: Online JSON Diff Tool](/en/posts/blog106_json-diff-guide/) | [Tool Guide 17: AI Token Counter](/en/posts/blog107_token-counter-guide/) | [Tool Guide 18: Online OCR Text Recognition](/en/posts/blog108_ocr-tool-guide/) | [Tool Guide 19: Online CSS Gradient Generator](/en/posts/blog110_css-gradient-guide/) | [Tool Guide 20 - Online UUID Generator](/en/posts/blog111_uuid-generator-guide/) | [Tool Guide 21: HTML to JSX Online Converter](/en/posts/blog112_html-to-jsx-guide/) | [Tool Guide 22: Online WebSocket Tester](/en/posts/blog114_websocket-tester-guide/) | [Tool Guide 23: Free Online CSV to JSON Converter](/en/posts/blog116_csv-to-json-guide/) | [Tool Guide 24: Online CSS Box Shadow Generator](/en/posts/blog118_box-shadow-guide/) | [Tool Guide 25: Online Favicon Generator](/en/posts/blog120_favicon-generator-guide/) | [Tool Guide 26: Online Subnet Calculator](/en/posts/blog121_subnet-calculator-guide/) | [Tool Guide 27: Online Mock Data Generator](/en/posts/blog123_mock-data-guide/)
