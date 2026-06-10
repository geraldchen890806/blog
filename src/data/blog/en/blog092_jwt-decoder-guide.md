---
author: Gerald Chen
pubDatetime: 2026-03-19T14:00:00+08:00
title: "Tool Guide 6: Online JWT Decoder"
slug: blog092_jwt-decoder-guide
featured: false
draft: true
reviewed: true
approved: true
tags:
  - 工具指南
  - 工具
  - 安全
description: "A deep dive into JWT structure, encoding, and security mechanisms, covering common scenarios like token debugging, expiration checks, and signature verification to help developers track down authentication issues fast."
---

If you've ever built a web project with user login, chances are you've used JWT. It's simple, stateless, and well supported across languages—practically the default choice for modern web authentication. But most people's understanding of JWT stops at "use a library to generate a token and put it in the Authorization header." It's only when something breaks—an invalid token, a failed signature check, a mysterious 401—that they realize they don't really know what's inside the token.

This article starts with JWT's internal structure, then walks through the JWT-related problems you hit in day-to-day development and how an online tool can help you debug them faster.

## The Three-Part Structure of a JWT

A JWT looks like a string of characters separated by `.`:

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

It splits into three parts:

1. **Header**: declares the token type and signing algorithm
2. **Payload**: holds the actual data (claims)
3. **Signature**: a tamper-proof verification value

The first two parts are Base64URL-encoded JSON—anyone can decode them and read the plaintext. The third part is the signature, which requires a key to verify.

### Header

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

`alg` specifies the signing algorithm. The common ones:

- **HS256** (HMAC-SHA256): a symmetric-key algorithm—signing and verification use the same secret. Good for monoliths or scenarios where you control every verifying party.
- **RS256** (RSA-SHA256): an asymmetric-key algorithm—sign with the private key, verify with the public key. Well suited to microservice architectures: the auth service holds the private key, and other services only need the public key to verify.
- **ES256** (ECDSA-SHA256): also asymmetric, with shorter keys and better performance. More and more new projects are adopting it.

### Payload

The payload is the core of a JWT. It contains a set of "claims," which fall into three categories:

**Registered Claims** (defined in RFC 7519):

| Claim | Full Name | Meaning |
|:-----:|:----:|:----:|
| `iss` | Issuer | Who issued the token |
| `sub` | Subject | The subject (usually a user ID) |
| `aud` | Audience | The intended recipient |
| `exp` | Expiration | Expiration time (Unix timestamp) |
| `nbf` | Not Before | When the token becomes valid |
| `iat` | Issued At | When the token was issued |
| `jti` | JWT ID | Unique token identifier |

**Public Claims**: standard field names registered with IANA, such as `name` and `email`.

**Private Claims**: fields you define yourself, like `role` or `permissions`.

A typical payload:

```json
{
  "sub": "user_8a3f2b",
  "name": "张三",
  "role": "admin",
  "iat": 1710835200,
  "exp": 1710838800
}
```

Here's the key point: **the payload is not encrypted**. A Base64URL decode reveals the plaintext, so never put passwords, credit card numbers, or other sensitive data in the payload. JWT guarantees **integrity** (it can't be tampered with), not **confidentiality** (it can't be read). If you need an encrypted payload, that's JWE (JSON Web Encryption)—a different topic altogether.

### Signature

How the signature is computed (using HS256 as an example):

```text
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret
)
```

When the server receives a token, it recomputes the signature the same way and compares it to the one in the token. If they match, the token hasn't been tampered with.

## Everyday JWT Debugging Scenarios

Knowing the structure is one thing; actually debugging is another. You've probably run into most of these scenarios.

### Scenario 1: What's actually in this token?

During frontend-backend integration, the backend returns a token and you want to see what's in the payload. The fastest way is to paste the token into a [JWT decoder](https://anyfreetools.com/tools/jwt-decoder) and instantly see the header and payload as JSON.

You can decode it manually too, but it's verbose:

```javascript
const token = "eyJhbGciOiJIUzI1NiIs...";
const parts = token.split(".");
const header = JSON.parse(atob(parts[0].replace(/-/g, "+").replace(/_/g, "/")));
const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
console.log("Header:", header);
console.log("Payload:", payload);
```

Note the character substitution from Base64URL to standard Base64 (`-` → `+`, `_` → `/`). Also, `atob` is fine for pure ASCII payloads, but it garbles multi-byte characters like Chinese—see the TypeScript implementation later in this article for proper UTF-8 handling. An online tool spares you all these details.

### Scenario 2: Has the token expired?

JWT expiration works through the `exp` claim. `exp` is a Unix timestamp (in seconds) indicating when the token expires. A classic problem: a user complains "I just logged in and it says my session expired," and you find `exp` is a few seconds earlier than the current time—likely clock skew between server and client.

```javascript
// 检查 token 是否过期
function isTokenExpired(token) {
  const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
  if (!payload.exp) return false; // 没有 exp 字段，永不过期
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}
```

The [JWT decoder](https://anyfreetools.com/tools/jwt-decoder) automatically converts timestamps like `exp`, `iat`, and `nbf` into human-readable dates, telling you exactly when the token expires and how long ago it was issued—no manual timestamp math required.

### Scenario 3: Signature verification fails

Common causes of signature verification failures:

1. **Wrong key**: the most common case. Check whether the signing key (secret or public key) is correct.
2. **Algorithm mismatch**: the `alg` in the header doesn't match the algorithm used for verification.
3. **Truncated token**: a few characters got lost during copy-paste. The Base64 characters at the end of a JWT are easy to swallow.
4. **Encoding issues**: the key is encoded the wrong way. Some libraries expect a Base64-encoded key string, others expect raw bytes.

Decoding the token in a tool and checking the header's `alg` field at least lets you quickly rule out the algorithm mismatch.

### Scenario 4: Debugging OAuth/OIDC flows

JWTs are everywhere in OAuth 2.0 and OpenID Connect. The `id_token` is a JWT, the `access_token` may be a JWT (depending on the auth server's implementation), and even the `client_assertion` is a JWT.

When debugging an OIDC login flow, you often need to inspect several tokens at once:

- Are the `sub` and `email` in the `id_token` correct?
- Does the `access_token`'s `scope` include the permissions you need?
- Is `exp` reasonable? (Some auth servers default to very short expiration times.)

Pasting tokens one by one into the [JWT decoder](https://anyfreetools.com/tools/jwt-decoder) for a quick check is far more efficient than sprinkling `console.log` through your code.

## JWT Security Considerations

JWT is easy to use, but it has plenty of security pitfalls. Here are the most common ones.

### Never use `alg: "none"`

The JWT spec allows `alg` to be set to `"none"`, meaning no signature. This is a historical design flaw. With some early JWT libraries, an attacker could change the header's `alg` to `"none"`, strip the signature, and certain libraries would actually accept the token.

Modern JWT libraries have mostly fixed this, but when verifying tokens you should still **explicitly specify the allowed algorithms** rather than trusting the `alg` field in the header:

```javascript
// jsonwebtoken 库（Node.js）
jwt.verify(token, secret, { algorithms: ["HS256"] });
// 明确只接受 HS256，拒绝其他算法
```

### Don't put sensitive data in the payload

As mentioned earlier, the payload is plaintext. Yet people still store passwords, secrets, and even credit card information in JWTs. Base64URL encoding is not encryption—anyone with the token can see everything in it.

What belongs in the payload: user ID, role, permission list, expiration time. What doesn't: passwords, API keys, personal data (national ID numbers, phone numbers, and the like).

### Mind where you store the token

Common ways to store a JWT on the frontend, and their security trade-offs:

**localStorage**: convenient, but readable via XSS. If the page has any XSS vulnerability, an attacker can grab the token with a simple `localStorage.getItem("token")`.

**httpOnly Cookie**: inaccessible to JavaScript, which protects against XSS. But you have to handle CSRF (with the `SameSite` attribute and CSRF tokens).

**In-memory variable**: the safest, but lost on page refresh. Works well for SPAs paired with a Refresh Token.

There's no perfect option. The usual recommendation is an httpOnly Cookie with `SameSite=Strict` (or `Lax`), balancing security and user experience.

### Set sensible expiration times

Once issued, a JWT can't be revoked (unless you maintain a blocklist, which throws away the stateless advantage). So expiration times shouldn't be too long.

A common strategy:

- **Access Token**: 15 minutes to 1 hour. Shorter is safer.
- **Refresh Token**: 7 to 30 days. Stored in an httpOnly Cookie.
- **When the Access Token expires**: exchange the Refresh Token for a new Access Token.

This way, even if an Access Token is stolen, the damage is limited to a short window.

## Implementing JWT Decoding by Hand

If you want to understand the full decoding process, here's an implementation with zero dependencies:

```typescript
interface JWTHeader {
  alg: string;
  typ: string;
  [key: string]: unknown;
}

interface JWTPayload {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  [key: string]: unknown;
}

function decodeJWT(token: string): { header: JWTHeader; payload: JWTPayload } {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT: expected 3 parts, got " + parts.length);
  }

  const decodeBase64URL = (str: string): string => {
    // Base64URL -> Base64
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    // 补齐填充
    const pad = base64.length % 4;
    if (pad === 2) base64 += "==";
    else if (pad === 3) base64 += "=";

    return decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
  };

  const header: JWTHeader = JSON.parse(decodeBase64URL(parts[0]));
  const payload: JWTPayload = JSON.parse(decodeBase64URL(parts[1]));

  return { header, payload };
}
```

This code does a few things:

1. Splits the token on `.` and validates there are exactly three parts
2. Converts Base64URL to standard Base64 (character substitution, padding)
3. Decodes and handles UTF-8 (multi-byte characters via `decodeURIComponent`)
4. Parses the JSON

Pay attention to the UTF-8 handling in step 3. If the payload contains Chinese characters or emoji, the string `atob` produces can't be used directly—it needs an extra UTF-8 decoding pass. `decodeURIComponent` plus percent-encoding is the most compatible approach in browser environments.

Of course, for day-to-day use, just opening the [JWT decoder](https://anyfreetools.com/tools/jwt-decoder) is easier. The code here is mainly for understanding how it works.

## JWT vs Session: Which to Choose

JWT isn't a silver bullet. It and traditional sessions each have trade-offs:

**JWT advantages**:
- Stateless—the server doesn't store session data
- Naturally suited to cross-origin and distributed setups (multiple services can verify with a shared public key)
- Mobile-friendly (no Cookie dependency)

**JWT disadvantages**:
- Can't be actively revoked (after a user is banned, already-issued tokens remain valid until they expire)
- Tokens are larger than session IDs (the example token in this article is about 230 bytes; production tokens with custom claims typically run 400-800 bytes, while a session ID is usually just 32-64 bytes)
- The payload is unencrypted, so it's no place for sensitive data

**Session advantages**:
- Can be destroyed at any time (kick a user out, invalidate immediately after a password change)
- Small footprint (only an ID travels over the wire)
- Data lives on the server, invisible to the client

**Session disadvantages**:
- Stateful—requires server-side storage (typically Redis)
- Cross-origin and distributed scenarios need extra work (a shared session store)

In short: monoliths and scenarios that require kicking users out on demand favor sessions; microservices, cross-origin, and mobile scenarios favor JWT. Many projects actually mix both: short-lived JWT Access Tokens plus server-stored Refresh Tokens.

## Choosing a Debugging Tool

There's no shortage of JWT debugging tools, each with its strengths:

**Online tools**: [AnyFreeTools JWT Decoder](https://anyfreetools.com/tools/jwt-decoder) and jwt.io are the most popular. The former has a cleaner interface, automatic timestamp conversion, and support for Chinese payloads; jwt.io offers signature verification but with a relatively busier interface. Both decode entirely in the browser and never upload your token to a server.

**Command line**: `jq` plus the `base64` command makes for quick decoding:

```bash
# tr 处理 Base64URL 字符替换，避免含 - 或 _ 时解码失败
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" | tr '_-' '/+' | base64 -d | jq .
```

**IDE plugins**: VS Code's JWT extensions let you preview token contents right in the editor—handy for backend developers.

**Browser DevTools**: find the token under Cookies or Local Storage in the Application panel, then copy it into an online tool to decode.

My own habit: online tools for everyday debugging, the command line in CI/CD scripts, and IDE plugins while writing code. Different scenarios call for different tools—no need to pick just one.

---

**Other articles in this series**:
- [Tool Guide 1: Online Image Compression](/en/posts/blog084_image-compress-guide/)
- [Tool Guide #2: Online JSON Formatter](/en/posts/blog085_json-formatter-guide/)
- [Tool Guide #3: Online Regex Tester](/en/posts/blog086_regex-tester-guide/)
- [Tool Guide 4: QR Code Generator](/en/posts/blog089_qrcode-generator-guide/)
- [Tool Guide 5: Base64 Encoder/Decoder](/en/posts/blog090_base64-tool-guide/)
