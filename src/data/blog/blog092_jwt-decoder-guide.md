---
author: 陈广亮
pubDatetime: 2026-03-19T14:00:00+08:00
title: 工具指南6-JWT在线解码工具
slug: blog092_jwt-decoder-guide
featured: true
draft: false
tags:
  - 工具指南
  - 工具
  - JWT
  - 认证
  - Web安全
description: 深入解析 JWT 的结构、编码方式和安全机制，覆盖 token 调试、过期检测、签名验证等常见场景，帮助开发者快速定位认证问题。
---

如果你做过任何涉及用户登录的 Web 项目，大概率用过 JWT。它简单、无状态、跨语言支持好，几乎成了现代 Web 认证的默认选择。但多数人对 JWT 的了解停留在"用库生成一个 token，放到 Authorization header 里"，等到出了问题——token 无效、签名校验失败、莫名其妙的 401——才发现自己不太清楚 token 里到底装了什么。

这篇文章从 JWT 的内部结构开始，聊聊日常开发中那些和 JWT 相关的问题，以及在线工具怎么帮你更快地排查这些问题。

## JWT 的三段式结构

一个 JWT 看起来是一串用 `.` 分隔的字符：

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

分成三部分：

1. **Header**（头部）：声明 token 类型和签名算法
2. **Payload**（载荷）：存放实际数据（claims）
3. **Signature**（签名）：防篡改的校验值

前两部分是 Base64URL 编码的 JSON，任何人都能解码看到明文。第三部分是签名，需要密钥才能验证。

### Header

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

`alg` 指定签名算法。常见的有：

- **HS256**（HMAC-SHA256）：对称密钥算法，签名和验证用同一个密钥。适合单体应用或你能控制所有验证方的场景。
- **RS256**（RSA-SHA256）：非对称密钥算法，私钥签名、公钥验证。适合微服务架构——认证服务持有私钥，其他服务只需要公钥就能验证。
- **ES256**（ECDSA-SHA256）：也是非对称密钥算法，密钥更短、性能更好。越来越多的新项目在用。

### Payload

Payload 是 JWT 的核心。它包含一组"claims"（声明），分为三类：

**注册声明**（Registered Claims，RFC 7519 定义）：

| Claim | 全称 | 含义 |
|:-----:|:----:|:----:|
| `iss` | Issuer | 签发者 |
| `sub` | Subject | 主题（通常是用户 ID） |
| `aud` | Audience | 接收方 |
| `exp` | Expiration | 过期时间（Unix 时间戳） |
| `nbf` | Not Before | 生效时间 |
| `iat` | Issued At | 签发时间 |
| `jti` | JWT ID | Token 唯一标识 |

**公共声明**（Public Claims）：在 IANA 注册的标准字段名，比如 `name`、`email` 等。

**私有声明**（Private Claims）：你自己定义的字段，比如 `role`、`permissions`。

一个典型的 payload：

```json
{
  "sub": "user_8a3f2b",
  "name": "张三",
  "role": "admin",
  "iat": 1710835200,
  "exp": 1710838800
}
```

这里有个关键点：**payload 没有加密**。Base64URL 解码就能看到明文，所以不要在 payload 里放密码、信用卡号之类的敏感数据。JWT 保证的是**完整性**（不被篡改），不是**机密性**（不被读取）。如果需要加密 payload，要用 JWE（JSON Web Encryption），但那是另一个话题了。

### Signature

签名的计算方式（以 HS256 为例）：

```text
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret
)
```

服务端收到 token 后，用同样的方式重新计算签名，和 token 中的签名比对。如果一致，说明 token 没被篡改。

## 日常开发中的 JWT 调试场景

知道结构是一回事，实际调试又是另一回事。下面这些场景你多半遇到过。

### 场景一：token 到底存了什么

前后端联调时，后端返回了一个 token，你想知道里面的 payload 是什么。最快的方式是用 [JWT 解码工具](https://anyfreetools.com/tools/jwt-decoder) 直接粘贴 token，立刻看到 header 和 payload 的 JSON 内容。

手动解码也行，但比较啰嗦：

```javascript
const token = "eyJhbGciOiJIUzI1NiIs...";
const parts = token.split(".");
const header = JSON.parse(atob(parts[0].replace(/-/g, "+").replace(/_/g, "/")));
const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
console.log("Header:", header);
console.log("Payload:", payload);
```

注意这里有 Base64URL 到标准 Base64 的字符替换（`-` → `+`，`_` → `/`）。另外 `atob` 对纯 ASCII payload 没问题，但如果 payload 含中文等多字节字符会乱码，完整的 UTF-8 处理见后文的 TypeScript 实现。在线工具帮你省掉了这些细节。

### 场景二：token 过期了吗

JWT 的过期机制通过 `exp` claim 实现。`exp` 是一个 Unix 时间戳（秒级），表示 token 的过期时间。一个典型的问题是：用户抱怨"刚登录就提示过期"，你检查发现 `exp` 的值比当前时间小了几秒——可能是服务器和客户端的时钟不同步（clock skew）。

```javascript
// 检查 token 是否过期
function isTokenExpired(token) {
  const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
  if (!payload.exp) return false; // 没有 exp 字段，永不过期
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}
```

[JWT 解码工具](https://anyfreetools.com/tools/jwt-decoder)会自动把 `exp`、`iat`、`nbf` 这些时间戳转换成人类可读的日期格式，直接告诉你 token 什么时候过期、签发了多久，不用自己算时间戳。

### 场景三：签名验证失败

签名验证失败的常见原因：

1. **密钥不对**：最常见的情况。检查签名密钥（secret 或公钥）是否正确。
2. **算法不匹配**：header 里写的 `alg` 和验证时用的算法不一致。
3. **token 被截断**：复制粘贴时丢了几个字符。JWT 末尾的 Base64 字符很容易被吞掉。
4. **编码问题**：密钥的编码方式不对。比如有些库要求密钥是 Base64 编码的字符串，有些要求原始字节。

用工具解码看 header 的 `alg` 字段，至少能快速排除算法不匹配的问题。

### 场景四：调试 OAuth/OIDC 流程

OAuth 2.0 和 OpenID Connect 中到处都是 JWT。`id_token` 是 JWT，`access_token` 可能是 JWT（取决于认证服务器的实现），甚至 `client_assertion` 也是 JWT。

调试 OIDC 登录流程时，你经常需要同时查看多个 token 的内容：

- `id_token` 的 `sub` 和 `email` 是否正确
- `access_token` 的 `scope` 是否包含需要的权限
- `exp` 是否合理（有些认证服务器默认给的过期时间非常短）

把 token 一个个粘贴到 [JWT 解码工具](https://anyfreetools.com/tools/jwt-decoder)里快速检查，比在代码里加 `console.log` 效率高得多。

## JWT 的安全注意事项

JWT 用起来简单，但安全方面有不少坑。这里列几个最常见的。

### 不要用 `alg: "none"`

JWT 规范允许 `alg` 设为 `"none"`，表示不签名。这是一个历史设计问题。在早期的某些 JWT 库中，攻击者可以把 header 的 `alg` 改成 `"none"`，然后去掉签名部分，某些库竟然会接受这个 token。

现代的 JWT 库基本都修复了这个问题，但验证 token 时仍然建议**显式指定允许的算法**，而不是信任 header 中的 `alg` 字段：

```javascript
// jsonwebtoken 库（Node.js）
jwt.verify(token, secret, { algorithms: ["HS256"] });
// 明确只接受 HS256，拒绝其他算法
```

### 不要在 payload 里放敏感数据

前面说过，payload 是明文。但还是经常看到有人在 JWT 里存密码、密钥、甚至信用卡信息。Base64URL 编码不是加密，任何人拿到 token 都能看到完整内容。

payload 里适合放的内容：用户 ID、角色、权限列表、过期时间。不适合放的：密码、API 密钥、个人隐私数据（身份证号、手机号等）。

### 注意 token 的存储位置

前端存储 JWT 的常见方式和对应的安全风险：

**localStorage**：方便，但容易被 XSS 攻击读取。如果页面上有任何 XSS 漏洞，攻击者可以直接 `localStorage.getItem("token")` 拿到 token。

**httpOnly Cookie**：不能被 JavaScript 访问，防 XSS。但需要处理 CSRF 攻击（配合 `SameSite` 属性和 CSRF token）。

**内存变量**：最安全，但页面刷新就丢了。适合 SPA 配合 Refresh Token 使用。

没有完美方案。通常推荐 httpOnly Cookie + `SameSite=Strict`（或 `Lax`），兼顾安全性和用户体验。

### 设置合理的过期时间

JWT 一旦签发就无法撤销（除非维护一个黑名单，但那就失去了无状态的优势）。所以过期时间不能太长。

常见的策略：

- **Access Token**：15 分钟到 1 小时。短一点更安全。
- **Refresh Token**：7 天到 30 天。存在 httpOnly Cookie 里。
- **Access Token 过期后**：用 Refresh Token 换一个新的 Access Token。

这样即使 Access Token 被盗，影响范围限制在短时间内。

## 手动实现 JWT 解码

如果你想理解 JWT 解码的完整过程，下面是一个不依赖任何库的实现：

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

这段代码做了几件事：

1. 按 `.` 分割 token，校验是否为三段
2. Base64URL 转标准 Base64（替换字符、补齐填充）
3. 解码并处理 UTF-8（通过 `decodeURIComponent` 处理多字节字符）
4. 解析 JSON

注意第三步的 UTF-8 处理。如果 payload 包含中文或 emoji，`atob` 解码后的字符串不能直接用，需要再做一次 UTF-8 解码。`decodeURIComponent` + percent-encoding 是浏览器环境中最兼容的方式。

当然，日常使用直接打开 [JWT 解码工具](https://anyfreetools.com/tools/jwt-decoder) 更省事。代码实现更多是帮助理解原理。

## JWT vs Session：怎么选

JWT 不是万能的。它和传统 Session 各有优劣：

**JWT 的优势**：
- 无状态，服务端不用存储 session 信息
- 天然支持跨域和分布式（多个服务共享同一个公钥即可验证）
- 移动端友好（不依赖 Cookie）

**JWT 的劣势**：
- 无法主动撤销（用户被封禁后，已签发的 token 在过期前仍然有效）
- Token 体积比 Session ID 大（以文中示例 token 为例约 230 字节，含自定义 claims 的生产 token 通常 400-800 字节；Session ID 通常只有 32-64 字节）
- Payload 不加密，不适合存放敏感信息

**Session 的优势**：
- 可以随时销毁（踢人、改密码后立刻失效）
- 体积小（只传一个 ID）
- 数据存在服务端，客户端看不到

**Session 的劣势**：
- 有状态，需要服务端存储（通常用 Redis）
- 跨域和分布式场景需要额外处理（共享 session store）

简单说：单体应用、需要随时踢人的场景适合 Session；微服务、跨域、移动端场景适合 JWT。很多项目实际上是混合使用：短期 JWT Access Token + 服务端存储的 Refresh Token。

## 调试工具的选择

调试 JWT 的工具不少，各有特点：

**在线工具**：[AnyFreeTools JWT Decoder](https://anyfreetools.com/tools/jwt-decoder) 和 jwt.io 是最常用的。前者的优势是界面简洁、自动时间戳转换、支持中文 payload；jwt.io 有签名验证功能但界面相对复杂。两个工具都在浏览器本地完成解码，不会上传 token 到服务器。

**命令行**：`jq` 配合 `base64` 命令可以快速解码：

```bash
# tr 处理 Base64URL 字符替换，避免含 - 或 _ 时解码失败
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" | tr '_-' '/+' | base64 -d | jq .
```

**IDE 插件**：VS Code 的 JWT 相关插件可以在编辑器里直接预览 token 内容，适合后端开发者。

**浏览器 DevTools**：在 Application 面板的 Cookies 或 Local Storage 中找到 token，然后复制到在线工具解码。

我个人的习惯是日常调试用在线工具，CI/CD 脚本里用命令行，写代码时靠 IDE 插件。不同场景用不同工具，没必要只选一个。

---

**本系列其他文章**：
- [工具指南1-在线图片压缩](https://chenguangliang.com/posts/blog084_image-compress-guide/)
- [工具指南2-在线JSON格式化工具](https://chenguangliang.com/posts/blog085_json-formatter-guide/)
- [工具指南3-在线正则表达式测试](https://chenguangliang.com/posts/blog086_regex-tester-guide/)
- [工具指南4-二维码生成工具](https://chenguangliang.com/posts/blog089_qrcode-generator-guide/)
- [工具指南5-Base64编解码工具](https://chenguangliang.com/posts/blog090_base64-tool-guide/)
