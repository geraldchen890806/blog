---
author: 陈广亮
pubDatetime: 2026-04-16T14:00:00+08:00
title: 工具指南29-在线AES加密解密工具
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
description: 详解 AES 对称加密的原理、模式选择（CBC/GCM/ECB）、密钥管理策略，以及如何用在线 AES 加密解密工具快速完成数据加解密、调试接口加密参数，附完整的 Node.js 和浏览器端实现代码。
---

接口联调时，对方说"请求体用 AES-256-CBC 加密，密钥找我要"。你拿到密钥和 IV，写了一段加密代码，发过去对方说解密失败。到底是 padding 不对、编码不对，还是模式不对？这种排查如果在代码里来回改参数，效率极低。

一个能直接输入明文、密钥和 IV，实时看到密文的工具，能在几秒内定位问题。这篇文章讲清楚 AES 加密的核心概念，介绍 [在线 AES 加密解密工具](https://anyfreetools.com/tools/aes) 的使用场景，再给需要在项目中集成 AES 的开发者提供可直接使用的代码。

## AES 加密基础

AES（Advanced Encryption Standard）是目前使用最广泛的对称加密算法，2001 年被 NIST 选定为联邦信息处理标准（FIPS 197）。"对称"意味着加密和解密使用同一把密钥。

### 密钥长度

AES 支持三种密钥长度：128 位（16 字节）、192 位（24 字节）、256 位（32 字节）。日常开发中最常见的是 AES-128 和 AES-256。区别在于安全强度和计算轮数：

| 密钥长度 | 轮数 | 安全性 | 性能 |
|---------|------|-------|------|
| 128 位 | 10 轮 | 足够抵御当前所有已知攻击 | 最快 |
| 192 位 | 12 轮 | 更高安全余量 | 中等 |
| 256 位 | 14 轮 | 抗量子计算（理论上） | 稍慢 |

实际性能差异很小。如果没有特殊合规要求，AES-128 已经足够安全。选 AES-256 主要是为了满足某些合规场景的偏好或者为未来量子计算留安全余量。

### 加密模式

AES 本身是分组密码，一次只能加密 16 字节的数据块。处理更长的数据需要选择一种工作模式。几个常见模式的对比：

**ECB（Electronic Codebook）**：最简单，每个数据块独立加密。问题是相同的明文块会产生相同的密文块，这会泄露数据的模式特征。经典例子是用 ECB 加密位图图像，加密后图像轮廓依然可见。**生产环境不要用 ECB**。

**CBC（Cipher Block Chaining）**：每个数据块在加密前先和前一个密文块做 XOR。需要一个初始化向量（IV）来处理第一个块。CBC 是传统方案中最常用的模式，但有一个缺点：不支持并行加密（每个块依赖前一个块的结果），而且如果 padding 处理不当，可能遭受 Padding Oracle 攻击。

**GCM（Galois/Counter Mode）**：基于 CTR 模式，额外提供认证功能（AEAD）。加密的同时生成一个认证标签（Authentication Tag），解密时会验证数据是否被篡改。GCM 支持并行处理，性能好，安全性高。**如果没有兼容性限制，优先选 GCM**。

**CTR（Counter Mode）**：把 AES 变成流密码，用递增计数器生成密钥流，再和明文 XOR。支持并行处理和随机访问，但不提供完整性验证。

### IV 和 Nonce

CBC 模式需要 IV（Initialization Vector），长度必须是 16 字节。GCM 模式需要 Nonce，推荐 12 字节。关键规则：**每次加密必须使用不同的 IV/Nonce**。如果用相同的密钥和 IV 加密不同的明文，攻击者可以通过密文 XOR 推导出明文信息。

IV 不需要保密，通常直接拼在密文前面一起传输。

## 工具使用场景

[AES 加密解密工具](https://anyfreetools.com/tools/aes) 在以下场景能省大量时间：

**接口联调**：和第三方对接时，需要确认双方的加密参数是否一致。把对方给的密钥、IV、模式填进工具，加密一段测试文本，看密文是否和对方的示例一致。不一致的话，逐个参数排查，比在代码里调试快得多。

**加密方案验证**：设计数据加密方案时，先在工具里验证不同模式和参数的效果。比如测试 CBC 和 GCM 的输出格式差异，确认 padding 行为是否符合预期。

**解密调试**：拿到一段密文，知道密钥但解密失败。用工具逐步排查：密钥编码是 Hex 还是 UTF-8？IV 是固定的还是在密文头部？模式是 CBC 还是 GCM？这些问题用工具几分钟就能定位。

**教学演示**：向团队成员解释 AES 工作原理时，实时展示加密过程比看 PPT 直观得多。改变一个字符的明文，观察密文的完全变化（雪崩效应），比任何文字描述都有说服力。

## 工具功能详解

打开 [https://anyfreetools.com/tools/aes](https://anyfreetools.com/tools/aes)，界面分为输入区和输出区：

**输入区**：
- 模式选择：支持 CBC、GCM、ECB、CTR 等常见模式
- 密钥输入：支持文本或 Hex 格式，工具自动根据长度判断是 AES-128/192/256
- IV/Nonce 输入：根据模式自动提示所需长度
- 明文输入：支持文本和 Hex 两种输入格式
- Padding 选择：PKCS7（默认）、Zero Padding、No Padding

**输出区**：
- 密文：默认 Base64 编码，可切换为 Hex
- 操作切换：一键在加密/解密模式之间切换

一个典型的使用流程：选择 AES-256-CBC，输入 32 字节密钥，填入 16 字节 IV，输入明文，点加密得到 Base64 密文。把密文复制给对方，对方用相同参数解密验证。

## 开发者实战：代码实现

### Node.js 实现 AES-256-GCM

GCM 是推荐的模式。Node.js 内置的 `crypto` 模块直接支持：

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

这段代码的几个要点：

1. **Nonce 随机生成**：每次加密用 `crypto.randomBytes(12)` 生成新的 Nonce，不要复用
2. **输出格式**：把 Nonce + Tag + 密文拼成一个 Buffer，解密时按固定偏移拆分
3. **认证标签**：GCM 的核心优势，解密时如果数据被篡改，`decipher.final()` 会抛出错误

### Node.js 实现 AES-256-CBC

某些场景（和旧系统对接）需要 CBC 模式：

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

CBC 模式的 Node.js `crypto` 默认使用 PKCS7 padding，和大多数语言/框架的默认行为一致。联调时如果出问题，先确认双方的 padding 方式。

### 浏览器端实现

现代浏览器通过 Web Crypto API 原生支持 AES：

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

注意 Web Crypto API 的 GCM 输出是 `ciphertext + tag`（tag 在密文末尾），而 Node.js 示例的格式是 `nonce + tag + ciphertext`（tag 在前面）。如果要前后端互通，需要调整输出格式，确保双方的 tag 位置一致。

## 密钥管理：最容易出问题的环节

AES 算法本身足够安全，实际出问题的几乎都是密钥管理。几个常见错误：

**硬编码密钥**：把密钥写死在代码里。代码一旦泄露（GitHub 上搜索 "AES key" 能找到大量案例），加密形同虚设。正确做法：从环境变量或密钥管理服务（AWS KMS、HashiCorp Vault）获取。

**密钥派生不当**：直接用用户密码作为 AES 密钥。密码通常不够长且熵值低。正确做法：用 PBKDF2 或 Argon2 把密码派生为密钥：

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

**IV/Nonce 复用**：这是最危险的错误。在 CTR/GCM 模式下，相同的 Key + Nonce 加密两段不同明文，攻击者可以通过两段密文的 XOR 直接恢复明文。在 CBC 模式下，相同 Key + IV 会泄露明文前缀是否相同。**每次加密必须用随机生成的 IV/Nonce**。

**传输密钥用明文**：通过微信、邮件发送 AES 密钥。正确做法：用 RSA 或 ECDH 加密密钥后传输，或者通过安全的密钥交换协议。

## AES 与其他加密算法的对比

| 特性 | AES | RSA | ChaCha20 |
|-----|-----|-----|----------|
| 类型 | 对称加密 | 非对称加密 | 对称加密 |
| 密钥长度 | 128/192/256 位 | 2048/4096 位 | 256 位 |
| 速度 | 快（硬件加速） | 慢（大数运算） | 快（软件友好） |
| 典型用途 | 数据加密 | 密钥交换、签名 | TLS、移动端 |
| 硬件支持 | AES-NI 指令集 | 无专用指令 | 无专用指令 |

实际应用中，AES 和 RSA 经常配合使用：RSA 加密 AES 密钥，AES 加密实际数据。这种方案叫混合加密（Hybrid Encryption），兼顾了 RSA 的密钥分发优势和 AES 的加密速度。

ChaCha20-Poly1305 是 AES-GCM 的替代方案，在没有 AES-NI 硬件加速的设备上（老款手机）性能更好。Google 在 Android 设备的 TLS 连接中大量使用 ChaCha20。

## 常见问题排查

**密文解密报错 "bad decrypt"**：最常见的原因是密钥或 IV 不匹配。用在线工具对比：分别用你的参数和对方的参数加密同一段文本，看哪个参数导致结果不同。

**解密后末尾有乱码**：通常是 padding 处理问题。检查双方是否都在用 PKCS7。有些实现默认 Zero Padding，解密后不会自动去除尾部零字节。

**GCM 模式报 "Unsupported state or unable to authenticate data"**：Authentication Tag 不对。检查 Tag 是否正确传递。常见错误：Tag 被截断（应该是 16 字节）、Tag 的位置搞错（有的实现放密文前面，有的放后面）。

**Base64 解码后长度不对**：检查是否使用了 URL-safe Base64（用 `-_` 替代 `+/`）。不同语言的 Base64 默认行为可能不同。

---

**相关阅读**：
- [工具指南10-在线哈希生成器](https://chenguangliang.com/posts/blog097_hash-generator-guide/) - 了解哈希有助于理解密钥派生（PBKDF2）和消息认证（HMAC）等与加密配合使用的密码学原语
- [工具指南28-在线TOTP动态验证码生成器](https://chenguangliang.com/posts/blog125_totp-generator-guide/) - TOTP 涉及的密钥管理思路与 AES 类似，同属密码学工具箱中的常用组件

---

**本系列其他文章**：

- [工具指南1-在线图片压缩](https://chenguangliang.com/posts/blog084_image-compress-guide/)
- [工具指南2-在线JSON格式化工具](https://chenguangliang.com/posts/blog085_json-formatter-guide/)
- [工具指南3-在线正则表达式测试](https://chenguangliang.com/posts/blog086_regex-tester-guide/)
- [工具指南4-二维码生成工具](https://chenguangliang.com/posts/blog089_qrcode-generator-guide/)
- [工具指南5-Base64编解码工具](https://chenguangliang.com/posts/blog090_base64-tool-guide/)
- [工具指南6-JWT在线解码工具](https://chenguangliang.com/posts/blog092_jwt-decoder-guide/)
- [工具指南7-Unix时间戳转换工具](https://chenguangliang.com/posts/blog094_timestamp-tool-guide/)
- [工具指南8-在线密码生成器](https://chenguangliang.com/posts/blog095_password-generator-guide/)
- [工具指南9-URL编解码工具](https://chenguangliang.com/posts/blog096_url-encoder-guide/)
- [工具指南10-在线哈希生成器](https://chenguangliang.com/posts/blog097_hash-generator-guide/)
- [工具指南11-JSON转TypeScript类型生成器](https://chenguangliang.com/posts/blog099_json-to-typescript-guide/)
- [工具指南12-Cron表达式在线解析工具](https://chenguangliang.com/posts/blog100_cron-parser-guide/)
- [工具指南13-在线颜色转换工具](https://chenguangliang.com/posts/blog102_color-converter-guide/)
- [工具指南14-在线SQL格式化工具](https://chenguangliang.com/posts/blog103_sql-formatter-guide/)
- [工具指南15-在线Markdown实时预览工具](https://chenguangliang.com/posts/blog104_markdown-preview-guide/)
- [工具指南16-在线JSON对比工具](https://chenguangliang.com/posts/blog106_json-diff-guide/)
- [工具指南17-AI Token计数器](https://chenguangliang.com/posts/blog107_token-counter-guide/)
- [工具指南18-在线OCR文字识别工具](https://chenguangliang.com/posts/blog108_ocr-tool-guide/)
- [工具指南19-在线CSS渐变生成器](https://chenguangliang.com/posts/blog110_css-gradient-guide/)
- [工具指南20-在线UUID生成器](https://chenguangliang.com/posts/blog111_uuid-generator-guide/)
- [工具指南21-HTML转JSX在线转换工具](https://chenguangliang.com/posts/blog112_html-to-jsx-guide/)
- [工具指南22-WebSocket在线测试工具](https://chenguangliang.com/posts/blog114_websocket-tester-guide/)
- [工具指南23-CSV转JSON在线工具](https://chenguangliang.com/posts/blog116_csv-to-json-guide/)
- [工具指南24-在线CSS Box Shadow生成器](https://chenguangliang.com/posts/blog118_box-shadow-guide/)
- [工具指南25-在线Favicon生成器](https://chenguangliang.com/posts/blog120_favicon-generator-guide/)
- [工具指南26-在线子网计算器](https://chenguangliang.com/posts/blog121_subnet-calculator-guide/)
- [工具指南27-在线Mock数据生成器](https://chenguangliang.com/posts/blog123_mock-data-guide/)
- [工具指南28-在线TOTP动态验证码生成器](https://chenguangliang.com/posts/blog125_totp-generator-guide/)
