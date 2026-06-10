---
author: 陈广亮
pubDatetime: 2026-04-17T09:00:00+08:00
title: 工具指南32-在线RSA密钥生成器
slug: blog131_rsa-keygen-guide
featured: false
draft: true
reviewed: false
approved: false
tags:
  - 工具指南
  - 工具
  - 安全
description: 介绍在线 RSA 密钥生成器的核心功能，拆解 RSA 算法原理、密钥长度选择、PEM 格式规范，以及在 Node.js、Python、OpenSSL 中的实际使用代码。
---

密钥管理是加密系统里最容易出错的一环。生成密钥、导出 PEM、在服务端验签、在客户端加密——这些操作每一步都有坑，尤其在开发调试阶段，反复处理密钥格式问题浪费大量时间。

这篇文章拆解 RSA 算法的核心原理，介绍 [在线 RSA 密钥生成器](https://anyfreetools.com/tools/rsa-keygen) 的功能和使用场景，并给出前后端实际可运行的代码示例。

## RSA 算法原理

RSA 是一种非对称加密算法，由 Rivest、Shamir、Adleman 三人在 1977 年提出。非对称的核心特点是：加密和解密用不同的密钥。

**数学基础**：

RSA 的安全性依赖大整数分解的计算困难性。给定两个大质数 $p$ 和 $q$，计算 $n = p \times q$ 很快；但反过来，给定 $n$，找出 $p$ 和 $q$ 在计算上极其困难。

密钥生成过程分四步：

1. **选取质数**：随机选两个大质数 $p$、$q$，计算 $n = p \times q$
2. **计算欧拉函数**：$\phi(n) = (p-1)(q-1)$
3. **选取公钥指数**：找一个与 $\phi(n)$ 互质的整数 $e$（通常取 65537，即 `0x10001`）
4. **计算私钥指数**：找满足 $e \times d \equiv 1 \pmod{\phi(n)}$ 的 $d$

公钥是 $(n, e)$，私钥是 $(n, d)$。加密用公钥，解密用私钥；签名用私钥，验签用公钥。

**为什么 65537 是标准公钥指数**：

65537 是质数，二进制表示是 `10000000000000001`（只有两个 1），使得模幂运算非常快，同时比小公钥指数（如 3）更安全，是 PKCS#1 和 X.509 的推荐值。

## 密钥长度选择

| 密钥长度 | 安全性 | 适用场景 |
|---------|--------|---------|
| 1024 位 | 已不安全，NIST SP 800-131A 从 2011 年起逐步弃用，2013 年底后完全禁止 | 仅用于测试，不可生产使用 |
| 2048 位 | 当前最低推荐长度，等同于 112 位对称密钥安全性，量子计算突破前可长期使用 | 大多数应用的默认选择 |
| 3072 位 | 中期安全，推荐用于新系统 | 对安全要求较高的场景 |
| 4096 位 | 长期安全，但性能开销显著 | 根证书、密钥签名密钥（KSK） |

实际选型建议：**新项目直接用 2048 位，长期存档或 PKI 根证书用 4096 位**。1024 位只能出现在你的测试代码里，且要加注释说明不能上生产。

## 工具功能

打开 [https://anyfreetools.com/tools/rsa-keygen](https://anyfreetools.com/tools/rsa-keygen)，核心功能：

**密钥生成**：选择密钥长度（1024/2048/3072/4096 位），一键生成公私钥对。生成过程完全在浏览器本地完成，密钥不会上传服务器。

**格式支持**：
- PEM 格式（Base64 编码的 DER，带 `-----BEGIN...-----` 头尾）
- PKCS#1（传统 RSA 格式，`RSA PRIVATE KEY`）
- PKCS#8（现代格式，`PRIVATE KEY`，更通用）

**加解密测试**：生成密钥后可以直接在工具页面测试加密解密，验证密钥是否可用，不需要写代码。

**签名验签**：支持用私钥对文本签名、用公钥验证签名，覆盖 JWT 签名、API 请求签名等场景的快速验证。

## PEM 格式解析

PEM（Privacy Enhanced Mail）是最常见的密钥存储格式，理解它的结构能帮你快速排查格式问题。

```
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA2a2rwplBQLF29amygykEMmYz0+Kcj3bKBp29HNlMQD5FPCcx
... (Base64 编码的 DER 数据)
-----END RSA PRIVATE KEY-----
```

头尾行的类型标识区分了不同格式：

| 头部标识 | 格式 | 说明 |
|---------|------|------|
| `-----BEGIN RSA PRIVATE KEY-----` | PKCS#1 | 传统 OpenSSL 格式 |
| `-----BEGIN PRIVATE KEY-----` | PKCS#8 | 现代推荐格式，支持多种算法 |
| `-----BEGIN ENCRYPTED PRIVATE KEY-----` | PKCS#8 加密 | 私钥用密码保护 |
| `-----BEGIN PUBLIC KEY-----` | PKCS#8 公钥 | 通用公钥格式 |
| `-----BEGIN RSA PUBLIC KEY-----` | PKCS#1 公钥 | 仅含 RSA 模数和指数 |

**常见错误**：把 PKCS#1 私钥传给期望 PKCS#8 的库，或者反过来，会导致"invalid key format"错误。工具生成的密钥明确标注了格式，对照头部标识就能判断。

## 代码实战

### Node.js：生成密钥对

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

### Node.js：加密与解密

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

### Node.js：签名与验签

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

### Python：加密与签名

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

### 用在线工具生成的密钥直接导入

工具生成的 PEM 可以直接在代码里使用：

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

### OpenSSL 命令行操作

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

## 常见问题

**填充方式选哪个**：优先用 OAEP（加密）和 PSS（签名），不要用 PKCS#1 v1.5——后者存在 Bleichenbacher 攻击漏洞，在新系统里已经不安全。浏览器 Web Crypto API 默认就是 OAEP，不用担心。

**RSA 能加密多大的数据**：RSA 只适合加密小数据（通常 ≤ 245 字节，2048 位密钥下 OAEP 填充）。加密大文件的正确做法是混合加密：用 AES 加密文件内容，用 RSA 加密 AES 密钥。这也是 HTTPS、PGP、SSH 的实现方式。

**私钥要不要加密存储**：生产环境的私钥必须加密存储，不能明文落盘。用密码保护（PKCS#8 Encrypted）或通过密钥管理服务（KMS）存储。在线工具生成的密钥用完即销毁，不要长期保存在浏览器历史或剪贴板里。

**密钥对不匹配怎么排查**：用工具页面的"加解密测试"功能，直接用页面上生成的密钥对测试一遍。如果工具内测试通过但代码报错，基本是格式问题——检查 PEM 头部类型是否和代码里的格式参数对应。

---

RSA 的使用场景非常集中：HTTPS 握手、JWT 签名、SSH 认证、代码签名、文件加密密钥保护。理解密钥格式和填充方式，能解决 90% 的集成问题。

如果是全新系统且不需要兼容老协议，也可以考虑 Ed25519 或 ECDSA 等椭圆曲线方案——密钥更短、性能更好，256 位 ECC 的安全性相当于 3072 位 RSA。RSA 的优势在于生态兼容性，几乎所有库和平台都支持。

需要快速生成和测试密钥对，用 [在线 RSA 密钥生成器](https://anyfreetools.com/tools/rsa-keygen)；需要在代码里集成，参考上面的示例直接改。

---

**工具指南系列**

[工具指南1-在线图片压缩](https://chenguangliang.com/posts/blog084_image-compress-guide/) | [工具指南2-JSON格式化](https://chenguangliang.com/posts/blog085_json-formatter-guide/) | [工具指南3-正则测试](https://chenguangliang.com/posts/blog086_regex-tester-guide/) | [工具指南4-二维码生成](https://chenguangliang.com/posts/blog089_qrcode-generator-guide/) | [工具指南5-Base64](https://chenguangliang.com/posts/blog090_base64-tool-guide/) | [工具指南6-JWT解码](https://chenguangliang.com/posts/blog092_jwt-decoder-guide/) | [工具指南7-时间戳转换](https://chenguangliang.com/posts/blog094_timestamp-tool-guide/) | [工具指南8-密码生成器](https://chenguangliang.com/posts/blog095_password-generator-guide/) | [工具指南9-URL编解码](https://chenguangliang.com/posts/blog096_url-encoder-guide/) | [工具指南10-哈希生成器](https://chenguangliang.com/posts/blog097_hash-generator-guide/) | [工具指南11-JSON转TypeScript](https://chenguangliang.com/posts/blog099_json-to-typescript-guide/) | [工具指南12-Cron解析器](https://chenguangliang.com/posts/blog100_cron-parser-guide/) | [工具指南13-颜色转换](https://chenguangliang.com/posts/blog102_color-converter-guide/) | [工具指南14-SQL格式化](https://chenguangliang.com/posts/blog103_sql-formatter-guide/) | [工具指南15-Markdown预览](https://chenguangliang.com/posts/blog104_markdown-preview-guide/) | [工具指南16-JSON对比](https://chenguangliang.com/posts/blog106_json-diff-guide/) | [工具指南17-Token计数器](https://chenguangliang.com/posts/blog107_token-counter-guide/) | [工具指南18-OCR文字识别](https://chenguangliang.com/posts/blog108_ocr-tool-guide/) | [工具指南19-CSS渐变生成器](https://chenguangliang.com/posts/blog110_css-gradient-guide/) | [工具指南20-UUID生成器](https://chenguangliang.com/posts/blog111_uuid-generator-guide/) | [工具指南21-HTML转JSX](https://chenguangliang.com/posts/blog112_html-to-jsx-guide/) | [工具指南22-WebSocket测试](https://chenguangliang.com/posts/blog114_websocket-tester-guide/) | [工具指南23-CSV转JSON](https://chenguangliang.com/posts/blog116_csv-to-json-guide/) | [工具指南24-Box Shadow生成器](https://chenguangliang.com/posts/blog118_box-shadow-guide/) | [工具指南25-Favicon生成器](https://chenguangliang.com/posts/blog120_favicon-generator-guide/) | [工具指南26-子网计算器](https://chenguangliang.com/posts/blog121_subnet-calculator-guide/) | [工具指南27-Mock数据生成器](https://chenguangliang.com/posts/blog123_mock-data-guide/) | [工具指南28-TOTP验证码](https://chenguangliang.com/posts/blog125_totp-generator-guide/) | [工具指南29-AES加密](https://chenguangliang.com/posts/blog127_aes-encryption-guide/) | [工具指南30-毛玻璃效果](https://chenguangliang.com/posts/blog128_glassmorphism-guide/) | [工具指南31-IP地址查询](https://chenguangliang.com/posts/blog130_ip-lookup-guide/)
