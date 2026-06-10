---
author: Gerald Chen
pubDatetime: 2026-04-17T09:00:00+08:00
title: "Tool Guide 32: Online RSA Key Generator"
slug: blog131_rsa-keygen-guide
featured: false
draft: true
reviewed: false
approved: false
tags:
  - 工具指南
  - 工具
  - 安全
description: "A walkthrough of the online RSA key generator: how the RSA algorithm works, how to choose a key length, what the PEM format actually contains, plus working code for Node.js, Python, and OpenSSL."
---

Key management is where encryption systems break most often. Generating keys, exporting PEM files, verifying signatures on the server, encrypting on the client—every one of these steps has pitfalls, and during development you can burn hours wrestling with key format issues alone.

This post breaks down how RSA works under the hood, walks through the features of the [online RSA key generator](https://anyfreetools.com/tools/rsa-keygen), and provides runnable code examples for both frontend and backend.

## How RSA Works

RSA is an asymmetric encryption algorithm, introduced by Rivest, Shamir, and Adleman in 1977. The defining property of asymmetric crypto: encryption and decryption use different keys.

**The math behind it**:

RSA's security rests on the computational hardness of factoring large integers. Given two large primes $p$ and $q$, computing $n = p \times q$ is fast; but going the other way—given $n$, recovering $p$ and $q$—is computationally infeasible.

Key generation takes four steps:

1. **Pick primes**: choose two large random primes $p$ and $q$, compute $n = p \times q$
2. **Compute Euler's totient**: $\phi(n) = (p-1)(q-1)$
3. **Pick the public exponent**: find an integer $e$ coprime to $\phi(n)$ (typically 65537, i.e. `0x10001`)
4. **Compute the private exponent**: find $d$ satisfying $e \times d \equiv 1 \pmod{\phi(n)}$

The public key is $(n, e)$, the private key is $(n, d)$. Encrypt with the public key, decrypt with the private key; sign with the private key, verify with the public key.

**Why 65537 is the standard public exponent**:

65537 is prime, and its binary representation is `10000000000000001` (only two 1 bits), which makes modular exponentiation very fast. It's also more secure than small exponents (like 3), and it's the recommended value in PKCS#1 and X.509.

## Choosing a Key Length

| Key Length | Security | Use Cases |
|---------|--------|---------|
| 1024-bit | No longer secure—NIST SP 800-131A began deprecating it in 2011 and fully disallowed it after the end of 2013 | Testing only, never in production |
| 2048-bit | Current minimum recommendation, equivalent to 112-bit symmetric security; safe for long-term use until quantum computing breaks through | The default choice for most applications |
| 3072-bit | Medium-term security, recommended for new systems | Scenarios with higher security requirements |
| 4096-bit | Long-term security, but with significant performance overhead | Root certificates, key-signing keys (KSK) |

Practical advice: **use 2048-bit for new projects, 4096-bit for long-term archives or PKI root certificates**. 1024-bit keys belong only in your test code, with a comment making clear they must never ship to production.

## Tool Features

Open [https://anyfreetools.com/tools/rsa-keygen](https://anyfreetools.com/tools/rsa-keygen). Core features:

**Key generation**: pick a key length (1024/2048/3072/4096 bits) and generate a key pair with one click. Generation happens entirely in your browser—keys are never uploaded to a server.

**Format support**:
- PEM format (Base64-encoded DER with `-----BEGIN...-----` headers and footers)
- PKCS#1 (the legacy RSA format, `RSA PRIVATE KEY`)
- PKCS#8 (the modern format, `PRIVATE KEY`, more widely compatible)

**Encryption/decryption testing**: after generating a key pair, you can test encryption and decryption right on the page to verify the keys work—no code required.

**Sign and verify**: sign text with the private key and verify with the public key, which covers quick validation for JWT signing, API request signing, and similar scenarios.

## Understanding the PEM Format

PEM (Privacy Enhanced Mail) is the most common key storage format, and understanding its structure helps you debug format issues quickly.

```
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA2a2rwplBQLF29amygykEMmYz0+Kcj3bKBp29HNlMQD5FPCcx
... (Base64-encoded DER data)
-----END RSA PRIVATE KEY-----
```

The type label in the header and footer lines distinguishes the formats:

| Header Label | Format | Notes |
|---------|------|------|
| `-----BEGIN RSA PRIVATE KEY-----` | PKCS#1 | Legacy OpenSSL format |
| `-----BEGIN PRIVATE KEY-----` | PKCS#8 | Modern recommended format, supports multiple algorithms |
| `-----BEGIN ENCRYPTED PRIVATE KEY-----` | PKCS#8 encrypted | Private key protected by a passphrase |
| `-----BEGIN PUBLIC KEY-----` | PKCS#8 public key | Generic public key format |
| `-----BEGIN RSA PUBLIC KEY-----` | PKCS#1 public key | Contains only the RSA modulus and exponent |

**Common mistake**: passing a PKCS#1 private key to a library that expects PKCS#8 (or vice versa) produces an "invalid key format" error. The tool labels each generated key's format explicitly, so checking the header tells you which one you have.

## Code in Practice

### Node.js: Generating a Key Pair

```javascript
const { generateKeyPairSync, publicEncrypt, privateDecrypt } = require("crypto");

// 生成 2048 位 RSA 密钥对
const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: "pkcs1",
    format: "pem",
  },
  privateKeyEncoding: {
    type: "pkcs8",     // 推荐 PKCS#8
    format: "pem",
  },
});

console.log(publicKey);   // -----BEGIN RSA PUBLIC KEY-----
console.log(privateKey);  // -----BEGIN PRIVATE KEY-----
```

### Node.js: Encrypting and Decrypting

```javascript
const { publicEncrypt, privateDecrypt, constants } = require("crypto");

const plaintext = Buffer.from("Hello, RSA!");

// 公钥加密（OAEP 填充，比 PKCS#1 v1.5 更安全）
const encrypted = publicEncrypt(
  {
    key: publicKey,
    padding: constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: "sha256",
  },
  plaintext
);

// 私钥解密
const decrypted = privateDecrypt(
  {
    key: privateKey,
    padding: constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: "sha256",
  },
  encrypted
);

console.log(decrypted.toString()); // Hello, RSA!
```

### Node.js: Signing and Verifying

```javascript
const { createSign, createVerify } = require("crypto");

const message = "需要签名的内容";

// 私钥签名
const signer = createSign("SHA256");
signer.update(message);
const signature = signer.sign(privateKey, "base64");

// 公钥验签
const verifier = createVerify("SHA256");
verifier.update(message);
const isValid = verifier.verify(publicKey, signature, "base64");

console.log(isValid); // true
```

### Python: Encrypting and Signing

```python
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes, serialization
# 生成密钥对
private_key = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048,
)
public_key = private_key.public_key()

# 导出 PEM
private_pem = private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption()
)

# 加密（OAEP 填充）
ciphertext = public_key.encrypt(
    b"Hello, RSA!",
    padding.OAEP(
        mgf=padding.MGF1(algorithm=hashes.SHA256()),
        algorithm=hashes.SHA256(),
        label=None
    )
)

# 解密
plaintext = private_key.decrypt(
    ciphertext,
    padding.OAEP(
        mgf=padding.MGF1(algorithm=hashes.SHA256()),
        algorithm=hashes.SHA256(),
        label=None
    )
)

print(plaintext.decode())  # Hello, RSA!

# 签名
signature = private_key.sign(
    b"sign this message",
    padding.PSS(
        mgf=padding.MGF1(hashes.SHA256()),
        salt_length=padding.PSS.MAX_LENGTH
    ),
    hashes.SHA256()
)

# 验签
public_key.verify(
    signature,
    b"sign this message",
    padding.PSS(
        mgf=padding.MGF1(hashes.SHA256()),
        salt_length=padding.PSS.MAX_LENGTH
    ),
    hashes.SHA256()
)
print("验签通过")
```

### Importing Keys Generated by the Online Tool

PEM keys generated by the tool can be used in code directly:

```javascript
const { createSign } = require("crypto");
const fs = require("fs");

// 从工具复制的私钥
const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----`;

const signer = createSign("SHA256");
signer.update("要签名的内容");
const signature = signer.sign(privateKey, "base64");
```

### OpenSSL on the Command Line

```bash
# 生成 2048 位私钥（PKCS#8）
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out private.pem

# 从私钥提取公钥
openssl pkey -in private.pem -pubout -out public.pem

# 验证密钥信息
openssl pkey -in private.pem -text -noout

# 加密文件（OpenSSL 3.0+ 用 pkeyutl，rsautl 已弃用）
openssl pkeyutl -encrypt -pkeyopt rsa_padding_mode:oaep -pkeyopt rsa_oaep_md:sha256 \
  -inkey public.pem -pubin -in plain.txt -out encrypted.bin

# 解密文件
openssl pkeyutl -decrypt -pkeyopt rsa_padding_mode:oaep -pkeyopt rsa_oaep_md:sha256 \
  -inkey private.pem -in encrypted.bin -out plain.txt
```

## Common Questions

**Which padding scheme should I use**: prefer OAEP for encryption and PSS for signatures. Avoid PKCS#1 v1.5—it's vulnerable to the Bleichenbacher attack and is no longer considered safe for new systems. The browser Web Crypto API defaults to OAEP, so nothing to worry about there.

**How much data can RSA encrypt**: RSA is only suitable for small payloads (typically ≤ 245 bytes with a 2048-bit key and OAEP padding). The right way to encrypt large files is hybrid encryption: encrypt the file contents with AES, then encrypt the AES key with RSA. This is exactly how HTTPS, PGP, and SSH work.

**Should private keys be stored encrypted**: in production, private keys must be encrypted at rest—never written to disk in plaintext. Protect them with a passphrase (PKCS#8 Encrypted) or store them in a key management service (KMS). Keys generated with the online tool should be destroyed after use; don't let them linger in browser history or your clipboard.

**How to debug a mismatched key pair**: use the tool page's encrypt/decrypt test feature and run a round trip with the keys generated on the page. If the in-tool test passes but your code throws errors, it's almost certainly a format issue—check that the PEM header type matches the format parameter in your code.

---

RSA's use cases are highly concentrated: HTTPS handshakes, JWT signing, SSH authentication, code signing, and protecting file encryption keys. Understanding key formats and padding schemes solves 90% of integration problems.

If you're building a brand-new system with no legacy protocol constraints, also consider elliptic-curve options like Ed25519 or ECDSA—shorter keys, better performance, and 256-bit ECC offers security comparable to 3072-bit RSA. RSA's advantage is ecosystem compatibility: virtually every library and platform supports it.

When you need to quickly generate and test key pairs, use the [online RSA key generator](https://anyfreetools.com/tools/rsa-keygen); when you need to integrate it in code, adapt the examples above directly.

---

**Tool Guide Series**

[Tool Guide 1: Online Image Compression](/en/posts/blog084_image-compress-guide/) | [Tool Guide #2: Online JSON Formatter](/en/posts/blog085_json-formatter-guide/) | [Tool Guide #3: Online Regex Tester](/en/posts/blog086_regex-tester-guide/) | [Tool Guide 4: QR Code Generator](/en/posts/blog089_qrcode-generator-guide/) | [Tool Guide 5: Base64 Encoder/Decoder](/en/posts/blog090_base64-tool-guide/) | [Tool Guide 6: Online JWT Decoder](/en/posts/blog092_jwt-decoder-guide/) | [Tool Guide 7: Unix Timestamp Converter](/en/posts/blog094_timestamp-tool-guide/) | [Tool Guide 8: Online Password Generator](/en/posts/blog095_password-generator-guide/) | [Tool Guide 9: URL Encoder/Decoder](/en/posts/blog096_url-encoder-guide/) | [Tool Guide 10: Online Hash Generator](/en/posts/blog097_hash-generator-guide/) | [Tool Guide 11: JSON to TypeScript Type Generator](/en/posts/blog099_json-to-typescript-guide/) | [Tool Guide 12: Online Cron Expression Parser](/en/posts/blog100_cron-parser-guide/) | [Tool Guide 13: Online Color Converter](/en/posts/blog102_color-converter-guide/) | [Tool Guide 14: Online SQL Formatter](/en/posts/blog103_sql-formatter-guide/) | [Tool Guide 15: Online Markdown Live Preview Tool](/en/posts/blog104_markdown-preview-guide/) | [Tool Guide 16: Online JSON Diff Tool](/en/posts/blog106_json-diff-guide/) | [Tool Guide 17: AI Token Counter](/en/posts/blog107_token-counter-guide/) | [Tool Guide 18: Online OCR Text Recognition](/en/posts/blog108_ocr-tool-guide/) | [Tool Guide 19: Online CSS Gradient Generator](/en/posts/blog110_css-gradient-guide/) | [Tool Guide 20 - Online UUID Generator](/en/posts/blog111_uuid-generator-guide/) | [Tool Guide 21: HTML to JSX Online Converter](/en/posts/blog112_html-to-jsx-guide/) | [Tool Guide 22: Online WebSocket Tester](/en/posts/blog114_websocket-tester-guide/) | [Tool Guide 23: Free Online CSV to JSON Converter](/en/posts/blog116_csv-to-json-guide/) | [Tool Guide 24: Online CSS Box Shadow Generator](/en/posts/blog118_box-shadow-guide/) | [Tool Guide 25: Online Favicon Generator](/en/posts/blog120_favicon-generator-guide/) | [Tool Guide 26: Online Subnet Calculator](/en/posts/blog121_subnet-calculator-guide/) | [Tool Guide 27: Online Mock Data Generator](/en/posts/blog123_mock-data-guide/) | [Tool Guide 28: Online TOTP Code Generator](/en/posts/blog125_totp-generator-guide/) | [Tool Guide 29: Online AES Encryption & Decryption Tool](/en/posts/blog127_aes-encryption-guide/) | [Tool Guide 30: Online Glassmorphism Generator](/en/posts/blog128_glassmorphism-guide/) | [Tool Guide 31: Online IP Address Lookup Tool](/en/posts/blog130_ip-lookup-guide/)
