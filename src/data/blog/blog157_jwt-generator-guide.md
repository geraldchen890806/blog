---
author: 陈广亮
pubDatetime: 2026-04-29T16:00:00+08:00
title: 工具指南53-在线 JWT 生成器
slug: blog157_jwt-generator-guide
featured: false
draft: true
reviewed: false
approved: false
tags:
  - 工具指南
  - 工具
  - 安全
  - 开发效率
description: JWT 是 API 鉴权最常用的方案，但手写签名容易踩坑。本文拆解 HS256、RS256、ES256 三种签名算法的差异，结合在线 JWT 生成器演示快速生成测试 token，附带 Node.js / Python / Go 代码示例和常见安全陷阱。
---

调试 API 鉴权的时候，经常需要快速生成一个 JWT token：测试 Authorization header 是否正确解析、模拟过期 token 验证刷新逻辑、调试不同算法（HS256 / RS256）的签名兼容性。手写一个 JWT 看起来简单，但 base64url 编码、HMAC 签名、claim 时间戳格式很容易踩坑。

这篇文章拆解 JWT 的三段结构和主流签名算法，说清楚 HS256 / RS256 / ES256 的适用场景，然后演示怎么用 [在线 JWT 生成器](https://anyfreetools.com/tools/jwt-generator) 快速生成调试用 token。

## JWT 三段结构

一个完整的 JWT 是用 `.` 分隔的三段 base64url 字符串：

```text
xxxxx.yyyyy.zzzzz
header.payload.signature
```

### Header（头部）

声明签名算法和 token 类型：

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

`alg` 字段决定整个 token 的安全级别，常见值：

- `HS256` / `HS384` / `HS512` — HMAC + SHA，对称密钥
- `RS256` / `RS384` / `RS512` — RSA + SHA，非对称
- `ES256` / `ES384` / `ES512` — ECDSA + SHA，非对称
- `none` — 无签名（**绝不要用**）

### Payload（载荷）

实际携带的 claim 数据。RFC 7519 定义了 7 个标准 claim（registered claim）：

```json
{
  "iss": "auth.example.com",
  "sub": "user_12345",
  "aud": "api.example.com",
  "exp": 1745923200,
  "nbf": 1745919600,
  "iat": 1745919600,
  "jti": "random-unique-id"
}
```

| Claim | 含义 | 是否必填 |
|---|---|---|
| `iss` | issuer，签发方 | 推荐 |
| `sub` | subject，主体（通常是用户 ID）| 推荐 |
| `aud` | audience，受众 | 推荐 |
| `exp` | expiration，过期时间（Unix 秒）| 必须 |
| `nbf` | not before，生效时间 | 可选 |
| `iat` | issued at，签发时间 | 推荐 |
| `jti` | JWT ID，唯一标识（防重放）| 可选 |

注意：`exp` 是 Unix 秒数（整数），不是毫秒。这是最常见的踩坑点——前端用 `Date.now()` 直接传，结果时间戳大了 1000 倍，token 永不过期。

除了标准 claim，可以加任意自定义字段，但要避免重名和过大的 payload（JWT 没法撤销，只能等过期）。

### Signature（签名）

把 header 和 payload 拼起来，用算法签名：

```text
HMACSHA256(
  base64url(header) + "." + base64url(payload),
  secret
)
```

签名是 JWT 安全的基石，**不验证签名等于裸奔**。

## 三种签名算法的差异

### HS256：对称密钥，最简单

HS256 用一个共享 secret 同时签名和验证：

```javascript
// 签名方
sign(headerPayload, secret) → signature

// 验证方
verify(headerPayload, signature, secret) → true / false
```

**优点**：实现简单、签名计算快、token 短。
**缺点**：所有验证方都要持有 secret。如果有 5 个微服务都需要验证 token，secret 就要分发 5 次，泄露面扩大。

**适用场景**：单体应用、内部服务、签发方与验证方同一个服务。

### RS256：非对称，公钥分发

RS256 用 RSA 私钥签名，公钥验证：

```javascript
// 签名方（持有 private key）
sign(headerPayload, privateKey) → signature

// 验证方（只需 public key）
verify(headerPayload, signature, publicKey) → true / false
```

**优点**：私钥只在签发方，公钥可以放 JWKS 端点（如 `/.well-known/jwks.json`）让任意服务自取。
**缺点**：签名比 HS256 慢约 20 倍，token 也更长（RSA-2048 签名 256 字节）。

**适用场景**：微服务架构、第三方 OAuth/OIDC、需要把验证下放到 CDN/网关。

### ES256：椭圆曲线，更短的签名

ES256 是 ECDSA + SHA-256，曲线为 P-256：

**优点**：签名长度仅 64 字节（比 RSA-2048 短 4 倍）、性能比 RSA 快。
**缺点**：实现细节比 RSA 复杂、随机数生成要求严格（弱随机会泄露私钥）。

**适用场景**：需要短 token 的场景（如 URL 参数）、移动端、对延迟敏感的高频调用。

## 算法选型建议

```text
单体应用，签发和验证同一服务？
  └── HS256（最简单）

微服务 / OAuth / 公钥验证？
  └── RS256（生态最成熟）

性能敏感 / token 长度敏感？
  └── ES256（短而快）
```

## 用在线工具快速生成

[在线 JWT 生成器](https://anyfreetools.com/tools/jwt-generator) 支持选择算法（HS256/HS384/HS512/RS256/ES256）、自定义 claim、自动填充时间戳、一键生成完整 token。常见用法：

- **调试 Authorization header**：粘贴 secret，配置 sub/exp，立即拿到可用 token
- **测试过期场景**：手动调整 exp 到过去时间，验证服务端拒绝逻辑
- **验证 claim 格式**：修改 aud/iss 看后端校验是否生效

工具完全在浏览器内执行，secret 不会上传到任何服务器。

## 代码示例

### Node.js

Node.js 推荐用 `jsonwebtoken` 包：

```javascript
// npm install jsonwebtoken
const jwt = require("jsonwebtoken");

// HS256：用 secret 签名
const tokenHS = jwt.sign(
  {
    sub: "user_12345",
    iss: "auth.example.com",
    aud: "api.example.com",
  },
  process.env.JWT_SECRET, // 至少 32 字节随机字符串
  {
    algorithm: "HS256",
    expiresIn: "1h", // 自动设置 exp
  }
);

// RS256：用私钥签名
const fs = require("fs");
const privateKey = fs.readFileSync("private.pem");
const tokenRS = jwt.sign({ sub: "user_12345" }, privateKey, {
  algorithm: "RS256",
  expiresIn: "1h",
});

// 验证
try {
  const decoded = jwt.verify(tokenHS, process.env.JWT_SECRET, {
    algorithms: ["HS256"], // 必须显式指定，防止算法混淆攻击
    audience: "api.example.com",
    issuer: "auth.example.com",
  });
  console.log(decoded.sub);
} catch (err) {
  console.error("invalid token:", err.message);
}
```

### Python

Python 用 `PyJWT`：

```python
# pip install PyJWT cryptography
import jwt
import time
import os

# HS256
token_hs = jwt.encode(
    {
        "sub": "user_12345",
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600,
        "iss": "auth.example.com",
    },
    os.environ["JWT_SECRET"],
    algorithm="HS256",
)

# RS256
with open("private.pem", "rb") as f:
    private_key = f.read()
token_rs = jwt.encode(
    {"sub": "user_12345", "exp": int(time.time()) + 3600},
    private_key,
    algorithm="RS256",
)

# 验证
try:
    payload = jwt.decode(
        token_hs,
        os.environ["JWT_SECRET"],
        algorithms=["HS256"],  # 显式指定算法
        issuer="auth.example.com",
    )
    print(payload["sub"])
except jwt.ExpiredSignatureError:
    print("token expired")
except jwt.InvalidTokenError as e:
    print(f"invalid: {e}")
```

### Go

```go
// go get github.com/golang-jwt/jwt/v5
package main

import (
    "fmt"
    "os"
    "time"

    "github.com/golang-jwt/jwt/v5"
)

func main() {
    // HS256
    claims := jwt.MapClaims{
        "sub": "user_12345",
        "iat": time.Now().Unix(),
        "exp": time.Now().Add(time.Hour).Unix(),
        "iss": "auth.example.com",
    }
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    signed, err := token.SignedString([]byte(os.Getenv("JWT_SECRET")))
    if err != nil {
        panic(err)
    }
    fmt.Println(signed)

    // 验证
    parsed, err := jwt.Parse(signed, func(t *jwt.Token) (interface{}, error) {
        if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, fmt.Errorf("unexpected method: %v", t.Header["alg"])
        }
        return []byte(os.Getenv("JWT_SECRET")), nil
    })
    if err != nil || !parsed.Valid {
        fmt.Println("invalid token")
        return
    }
    fmt.Println(parsed.Claims.(jwt.MapClaims)["sub"])
}
```

## 常见安全陷阱

### 1. 算法混淆攻击（alg confusion）

服务端如果不显式指定算法，攻击者可以把 RS256 token 的 alg 改成 HS256，然后用**公钥作为 secret** 来伪造签名：

```javascript
// 错误：信任 token 中的 alg 字段
jwt.verify(token, publicKey); // 危险

// 正确：显式指定算法白名单
jwt.verify(token, publicKey, { algorithms: ["RS256"] });
```

主流库现在大多默认禁用 `none` 算法，但 alg 混淆问题仍要主动防御。

### 2. secret 太弱

HS256 的安全完全依赖 secret 强度。`mySecret123` 这种字符串能在几秒内被暴力破解。

```javascript
// 生成 32 字节随机 secret
const crypto = require("crypto");
const secret = crypto.randomBytes(32).toString("hex");
// 例如：d3a7f2b8c1e4...（64 字符十六进制）
```

存到环境变量，**永远不要硬编码**。

### 3. 永不过期的 token

`exp` 是必填的。没有 exp 的 token 一旦泄露就是终身有效的。生产环境一般：

- access token：15 分钟到 1 小时
- refresh token：7 天到 30 天

### 4. JWT 不能撤销

JWT 是无状态的，签发后服务器不知道它存在。如果用户登出或权限变更，签发过的 token 仍然有效到 exp。常见解法：

- 短 exp + refresh token 机制
- 维护一个黑名单（牺牲无状态性）
- 关键操作再验证一次 session

### 5. 敏感信息放在 payload

JWT 的 payload 是 base64 编码，**不是加密**。任何拿到 token 的人都能解码。

```javascript
// 错误：把密码、手机号塞进 JWT
const token = jwt.sign({ phone: "13800138000", password: "..." }, secret);

// 正确：只放标识符，敏感数据查数据库
const token = jwt.sign({ sub: "user_12345" }, secret);
```

如果一定要加密 payload，用 JWE（JSON Web Encryption）而非 JWT。

## 调试小技巧

测试时常用的 claim 配置：

```json
{
  "sub": "test_user",
  "iat": 1745923200,
  "exp": 1745926800,
  "scope": "read:profile write:posts"
}
```

要测试过期场景，手动把 exp 改到过去：

```javascript
// 1 小时前过期
const expired = Math.floor(Date.now() / 1000) - 3600;
```

要查看 token 内容，可以用配套的 [JWT 解码工具](https://anyfreetools.com/tools/jwt-decoder) 直接粘贴解析。

---

**相关阅读**：
- [工具指南6-JWT在线解码工具](https://chenguangliang.com/posts/blog092_jwt-decoder-guide/) - JWT 解码与验证篇

**延伸阅读**：
- [RFC 7519: JSON Web Token](https://datatracker.ietf.org/doc/html/rfc7519) - JWT 官方规范
- [JWT.io](https://jwt.io/) - JWT 在线调试与算法说明
