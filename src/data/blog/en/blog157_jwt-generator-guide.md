---
author: Gerald Chen
pubDatetime: 2026-04-29T16:00:00+08:00
title: "Tool Guide 53: Online JWT Generator"
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
description: "JWT is the most common approach to API authentication, but hand-rolling signatures is full of pitfalls. This post breaks down the differences between HS256, RS256, and ES256, shows how to generate test tokens quickly with an online JWT generator, and includes Node.js / Python / Go code samples plus common security traps."
---

When debugging API authentication, you often need to whip up a JWT token fast: checking whether the Authorization header is parsed correctly, simulating an expired token to verify refresh logic, or debugging signature compatibility across algorithms (HS256 / RS256). Hand-writing a JWT looks simple, but base64url encoding, HMAC signing, and claim timestamp formats are easy to get wrong.

This post breaks down JWT's three-part structure and the mainstream signing algorithms, clarifies when to use HS256 / RS256 / ES256, and then shows how to use the [online JWT generator](https://anyfreetools.com/tools/jwt-generator) to quickly produce tokens for debugging.

## The Three Parts of a JWT

A complete JWT is three base64url strings joined by `.`:

```text
xxxxx.yyyyy.zzzzz
header.payload.signature
```

### Header

Declares the signing algorithm and token type:

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

The `alg` field determines the security level of the entire token. Common values:

- `HS256` / `HS384` / `HS512` — HMAC + SHA, symmetric key
- `RS256` / `RS384` / `RS512` — RSA + SHA, asymmetric
- `ES256` / `ES384` / `ES512` — ECDSA + SHA, asymmetric
- `none` — no signature (**never use this**)

### Payload

The actual claim data being carried. RFC 7519 defines 7 standard (registered) claims:

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

| Claim | Meaning | Required? |
|---|---|---|
| `iss` | issuer | Recommended |
| `sub` | subject (usually the user ID) | Recommended |
| `aud` | audience | Recommended |
| `exp` | expiration time (Unix seconds) | Required |
| `nbf` | not before | Optional |
| `iat` | issued at | Recommended |
| `jti` | JWT ID, unique identifier (anti-replay) | Optional |

Note: `exp` is Unix time in seconds (an integer), not milliseconds. This is the most common pitfall — the frontend passes `Date.now()` directly, the timestamp ends up 1000x too large, and the token never expires.

Beyond the standard claims, you can add arbitrary custom fields, but avoid name collisions and oversized payloads (a JWT can't be revoked — you can only wait for it to expire).

### Signature

Concatenate the header and payload, then sign with the algorithm:

```text
HMACSHA256(
  base64url(header) + "." + base64url(payload),
  secret
)
```

The signature is the foundation of JWT security — **skipping signature verification means you have no security at all**.

## How the Three Signing Algorithms Differ

### HS256: Symmetric Key, the Simplest

HS256 uses one shared secret for both signing and verification:

```javascript
// 签名方
sign(headerPayload, secret) → signature

// 验证方
verify(headerPayload, signature, secret) → true / false
```

**Pros**: simple to implement, fast signing, short tokens.
**Cons**: every verifier must hold the secret. If 5 microservices all need to verify tokens, the secret gets distributed 5 times, widening the exposure surface.

**Best for**: monolithic apps, internal services, cases where the issuer and verifier are the same service.

### RS256: Asymmetric, Public Key Distribution

RS256 signs with an RSA private key and verifies with the public key:

```javascript
// 签名方（持有 private key）
sign(headerPayload, privateKey) → signature

// 验证方（只需 public key）
verify(headerPayload, signature, publicKey) → true / false
```

**Pros**: the private key stays with the issuer only; the public key can live at a JWKS endpoint (e.g. `/.well-known/jwks.json`) for any service to fetch.
**Cons**: signing is about 20x slower than HS256, and tokens are longer (an RSA-2048 signature is 256 bytes).

**Best for**: microservice architectures, third-party OAuth/OIDC, pushing verification down to CDNs/gateways.

### ES256: Elliptic Curve, Shorter Signatures

ES256 is ECDSA + SHA-256 over the P-256 curve:

**Pros**: signatures are only 64 bytes (4x shorter than RSA-2048), and it's faster than RSA.
**Cons**: implementation details are trickier than RSA, and the randomness requirements are strict (weak randomness leaks the private key).

**Best for**: scenarios needing short tokens (e.g. URL parameters), mobile clients, latency-sensitive high-frequency calls.

## Choosing an Algorithm

```text
Monolithic app, same service issues and verifies?
  └── HS256 (simplest)

Microservices / OAuth / public-key verification?
  └── RS256 (most mature ecosystem)

Performance-sensitive / token-length-sensitive?
  └── ES256 (short and fast)
```

## Quick Generation with the Online Tool

The [online JWT generator](https://anyfreetools.com/tools/jwt-generator) supports algorithm selection (HS256/HS384/HS512/RS256/ES256), custom claims, auto-filled timestamps, and one-click generation of a complete token. Common uses:

- **Debugging the Authorization header**: paste a secret, configure sub/exp, get a working token instantly
- **Testing expiration scenarios**: manually set exp to a past time and verify the server rejects it
- **Validating claim formats**: tweak aud/iss to see whether backend validation kicks in

The tool runs entirely in the browser — your secret never gets uploaded to any server.

## Code Examples

### Node.js

For Node.js, use the `jsonwebtoken` package:

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

In Python, use `PyJWT`:

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

## Common Security Pitfalls

### 1. Algorithm Confusion Attacks (alg confusion)

If the server doesn't explicitly pin the algorithm, an attacker can change an RS256 token's alg to HS256 and forge a signature using the **public key as the secret**:

```javascript
// 错误：信任 token 中的 alg 字段
jwt.verify(token, publicKey); // 危险

// 正确：显式指定算法白名单
jwt.verify(token, publicKey, { algorithms: ["RS256"] });
```

Most mainstream libraries now disable the `none` algorithm by default, but alg confusion still requires active defense.

### 2. Weak Secrets

HS256's security rests entirely on the strength of the secret. A string like `mySecret123` can be brute-forced in seconds.

```javascript
// 生成 32 字节随机 secret
const crypto = require("crypto");
const secret = crypto.randomBytes(32).toString("hex");
// 例如：d3a7f2b8c1e4...（64 字符十六进制）
```

Store it in an environment variable — **never hardcode it**.

### 3. Tokens That Never Expire

`exp` is mandatory. A token without exp, once leaked, is valid forever. Typical production values:

- access token: 15 minutes to 1 hour
- refresh token: 7 to 30 days

### 4. JWTs Can't Be Revoked

JWTs are stateless — once issued, the server doesn't know they exist. If a user logs out or their permissions change, previously issued tokens remain valid until exp. Common workarounds:

- Short exp + a refresh token mechanism
- Maintain a blacklist (sacrificing statelessness)
- Re-verify the session for critical operations

### 5. Sensitive Data in the Payload

A JWT payload is base64-encoded, **not encrypted**. Anyone who gets the token can decode it.

```javascript
// 错误：把密码、手机号塞进 JWT
const token = jwt.sign({ phone: "13800138000", password: "..." }, secret);

// 正确：只放标识符，敏感数据查数据库
const token = jwt.sign({ sub: "user_12345" }, secret);
```

If you truly need an encrypted payload, use JWE (JSON Web Encryption) instead of JWT.

## Debugging Tips

A claim configuration commonly used in testing:

```json
{
  "sub": "test_user",
  "iat": 1745923200,
  "exp": 1745926800,
  "scope": "read:profile write:posts"
}
```

To test expiration, manually set exp to a time in the past:

```javascript
// 1 小时前过期
const expired = Math.floor(Date.now() / 1000) - 3600;
```

To inspect a token's contents, paste it into the companion [JWT decoder](https://anyfreetools.com/tools/jwt-decoder).

---

**Related reading**:
- [Tool Guide 6: Online JWT Decoder](/en/posts/blog092_jwt-decoder-guide/) - JWT decoding and verification

**Further reading**:
- [RFC 7519: JSON Web Token](https://datatracker.ietf.org/doc/html/rfc7519) - The official JWT specification
- [JWT.io](https://jwt.io/) - Online JWT debugging and algorithm reference
