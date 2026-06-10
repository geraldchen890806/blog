---
author: Gerald Chen
pubDatetime: 2026-03-22T14:00:00+08:00
title: "Tool Guide 9: URL Encoder/Decoder"
slug: blog096_url-encoder-guide
featured: false
draft: true
reviewed: true
approved: true
tags:
  - 工具指南
  - 工具
  - 前端
description: "A deep dive into how URL encoding works: percent-encoding rules, the difference between encodeURI and encodeURIComponent, plus common pitfalls and debugging techniques you'll hit in everyday development."
---

You've definitely seen something like this before: `%E4%BD%A0%E5%A5%BD`.

Drop it into your browser's address bar and it turns into "你好" (hello). The other way around, type a non-ASCII character, a space, or a special symbol into a URL and the browser automatically converts it into this `%XX` format. That's URL encoding, also known as percent-encoding.

For developers who work with URLs every day, URL encoding is a fundamental topic that's surprisingly easy to get wrong. Especially when you're dealing with search parameters, API requests, or redirect links, encoding bugs tend to pop up in the most unexpected places.

## Why URLs Need Encoding

URLs are defined by RFC 3986, which only allows a subset of the ASCII character set. Specifically, these characters can appear in a URL as-is:

- Letters: `A-Z`, `a-z`
- Digits: `0-9`
- A handful of special characters: `-`, `_`, `.`, `~`

These are called "unreserved characters."

There's also a set of "reserved characters" that carry special meaning within a URL:

```text
: / ? # [ ] @ ! $ & ' ( ) * + , ; =
```

For example, `?` separates the path from the query string, `&` separates parameters, and `=` joins keys with values. If these characters appear as data (rather than as delimiters), they must be encoded.

As for Chinese, Japanese, emoji, and other non-ASCII characters — they're not in the allowed character set at all, so encoding is mandatory.

### The Encoding Rules

Percent-encoding is straightforward: convert the character into its UTF-8 byte sequence, then represent each byte as `%` followed by two hex digits.

A few examples:

| Character | UTF-8 bytes | Encoded result |
|---------|-----------|---------|
| Space | 0x20 | `%20` |
| 你 | 0xE4 0xBD 0xA0 | `%E4%BD%A0` |
| 好 | 0xE5 0xA5 0xBD | `%E5%A5%BD` |
| & | 0x26 | `%26` |
| = | 0x3D | `%3D` |

A Chinese character typically takes 3 bytes in UTF-8, so it becomes 9 characters after encoding (three `%XX` groups). That's why URLs containing Chinese text get so long.

### The Special Case of Spaces

There are two conventions for encoding a space, and this is a common source of confusion:

- **Percent-encoding**: a space becomes `%20` — used in URL paths and most other contexts
- **Form encoding** (`application/x-www-form-urlencoded`): a space becomes `+` — used specifically for HTML form submissions

So `hello world` should be `hello%20world` in a URL path, but might be `hello+world` in form-submitted query parameters. The two notations mean the same thing in their respective contexts, but mixing them up leads to parsing errors.

## Encoding Functions in JavaScript

JavaScript ships several URL encoding functions with different encoding scopes — pick the wrong one and you get bugs.

### encodeURI vs encodeURIComponent

These are the two most commonly used functions. The difference lies in which characters they leave unencoded:

```javascript
const url = "https://example.com/搜索?q=hello world&lang=中文";

console.log(encodeURI(url));
// https://example.com/%E6%90%9C%E7%B4%A2?q=hello%20world&lang=%E4%B8%AD%E6%96%87

console.log(encodeURIComponent(url));
// https%3A%2F%2Fexample.com%2F%E6%90%9C%E7%B4%A2%3Fq%3Dhello%20world%26lang%3D%E4%B8%AD%E6%96%87
```

`encodeURI` preserves the URL's structural characters (`:`, `/`, `?`, `&`, `=`, etc.) and only encodes the data portions. It's suited for encoding a complete URL.

`encodeURIComponent` encodes nearly every special character, including `:` `/` `?` `&` `=`. It's suited for encoding parameter values within a URL.

Easy way to remember it: **use `encodeURI` for an entire URL, use `encodeURIComponent` for a component of a URL**.

### Real-World Usage

When building query strings, use `encodeURIComponent`:

```javascript
const searchTerm = "React hooks & patterns";
const url = `https://api.example.com/search?q=${encodeURIComponent(searchTerm)}`;
// https://api.example.com/search?q=React%20hooks%20%26%20patterns
```

If you used `encodeURI` here, the `&` would stay unencoded and the API would treat `patterns` as a separate parameter name — wrong parse.

When handling redirect URLs, the entire target URL goes in as a parameter value, so `encodeURIComponent` is a must:

```javascript
const redirectUrl = "https://example.com/callback?token=abc123";
const loginUrl = `https://auth.example.com/login?redirect=${encodeURIComponent(redirectUrl)}`;
// redirect 参数的值中，? 和 = 都被正确编码，不会和外层URL的结构冲突
```

### The Deprecated escape/unescape

`escape()` and `unescape()` are very old APIs that MDN has marked as deprecated. They have two main problems:

1. They don't handle the `+` sign (won't encode it, won't decode it as a space)
2. They use the `%uXXXX` format for non-ASCII characters instead of UTF-8 percent-encoding, which is incompatible with modern standards

```javascript
// 不要用这个
escape("你好");  // "%u4F60%u597D" — 非标准格式
encodeURIComponent("你好");  // "%E4%BD%A0%E5%A5%BD" — 标准 UTF-8 编码
```

If you run into `escape/unescape` in legacy code, gradually replace them with `encodeURIComponent/decodeURIComponent`.

## Common Pitfalls

### Double Encoding

This is the most common problem. When data passes through multiple rounds of encoding:

```javascript
const param = "hello world";
const encoded = encodeURIComponent(param);  // "hello%20world"
const doubleEncoded = encodeURIComponent(encoded);  // "hello%2520world"
```

The `%` in `%20` gets encoded again as `%25`, producing `%2520`. After the server decodes once, it gets the literal string `%20` — not a space.

This typically happens in layered code: the frontend encodes once, then a middleware encodes again, or your HTTP client library encodes automatically on top of your manual encoding.

**How to spot it**: whenever you see `%25`, be suspicious — it means a `%` was encoded, which is very likely double encoding.

### Plus Sign vs Space Confusion

As mentioned earlier, `+` means a space in form encoding, but in standard percent-encoding, `+` is just `+`.

```javascript
// 场景：用户搜索 "C++ tutorial"
const query = "C++ tutorial";

// 编码后：C%2B%2B%20tutorial（正确）
encodeURIComponent(query);

// 如果后端用的是表单解码逻辑，
// 它可能把 URL 中的 + 当成空格
// "foo+bar" 被解码成 "foo bar" 而不是 "foo+bar"
```

The fix: encode consistently with `encodeURIComponent` before sending, and have the receiver use the matching decode function. If you must produce form-encoded output, you can manually replace `%20` with `+` after encoding:

```javascript
function formEncode(str) {
  return encodeURIComponent(str).replace(/%20/g, "+");
}
```

### Frontend/Backend Encoding Mismatch

The frontend encodes in JavaScript; the backend decodes in Python, Java, or Go. Different languages have different defaults:

```python
# Python 3
from urllib.parse import quote, quote_plus

quote("hello world")        # "hello%20world"
quote_plus("hello world")   # "hello+world"
```

```java
// Java
URLEncoder.encode("hello world", "UTF-8");  // "hello+world"（注意：Java默认用 + 表示空格）
```

Java's `URLEncoder.encode` follows the form-encoding spec: spaces become `+`, not `%20`. If the frontend sends `%20`, Java's `URLDecoder.decode` handles it fine (it accepts both). But going the other way, a `+` encoded by Java can break a frontend that doesn't do form decoding.

The key principle: **verify that the encode/decode functions on both sides actually match**, especially how they handle spaces.

### Encoding in Hash Fragments

The part of a URL after `#` (the fragment/hash) is never sent to the server, but the browser still encodes special characters in it. SPA routers often store state in the hash:

```javascript
// 设置 hash
window.location.hash = encodeURIComponent("tab=设置&page=2");

// 读取时解码
const hash = decodeURIComponent(window.location.hash.slice(1));
```

Note that browsers don't behave identically when reading `window.location.hash` — some decode it automatically, some don't. The safe approach is to decode manually once and wrap it in try-catch (so a malformed encoding sequence doesn't throw).

## URL Encoding in Practice

### Building API Requests

Modern frontend code typically uses `URLSearchParams` to build query strings — it handles encoding automatically:

```javascript
const params = new URLSearchParams({
  q: "React hooks & patterns",
  page: "1",
  lang: "中文"
});

console.log(params.toString());
// q=React+hooks+%26+patterns&page=1&lang=%E4%B8%AD%E6%96%87
```

Note that `URLSearchParams` follows the form-encoding spec, so spaces become `+`. If your backend doesn't accept `+` as a space, you may need to handle that manually.

### Debugging Encoding Issues

When you hit an encoding-related bug, the most effective debugging approach is to decode step by step and inspect each layer:

```javascript
function debugDecode(str) {
  let current = str;
  let step = 0;
  while (current !== decodeURIComponent(current)) {
    console.log(`Step ${step}: ${current}`);
    current = decodeURIComponent(current);
    step++;
  }
  console.log(`Final: ${current}`);
}

debugDecode("hello%252520world");
// Step 0: hello%252520world
// Step 1: hello%2520world
// Step 2: hello%20world
// Final: hello world
// 结论：这个字符串被编码了 3 次
```

### Handling Non-Standard Encodings

Sometimes you'll encounter URLs encoded with GBK, Shift-JIS, or other non-UTF-8 charsets (common in legacy systems). JavaScript's built-in functions only support UTF-8, so non-UTF-8 percent-encoded sequences will throw or produce garbage.

In that case, the `TextDecoder` API lets you handle it manually:

```javascript
function decodeGBK(percentEncoded) {
  // 仅适用于纯百分号编码字符串（如 "%C4%E3%BA%C3"），不处理混合 ASCII 的情况
  const bytes = percentEncoded
    .split("%")
    .filter(Boolean)
    .map(hex => parseInt(hex, 16));

  const decoder = new TextDecoder("gbk");
  return decoder.decode(new Uint8Array(bytes));
}
```

That said, this scenario is increasingly rare. If a system you maintain is still on a non-UTF-8 encoding, it's probably time to plan a migration.

## The Convenience of Online Tools

Once you understand the fundamentals, the most practical day-to-day workflow is to just use an online tool for quick encoding and decoding. Say you've got a string like `%E4%BD%A0%E5%A5%BD` and want to know what it says — open the [AnyFreeTools URL Encoder/Decoder](https://anyfreetools.com/tools/url-encoder), paste it in, and decode with one click.

Or the other way around: you need to encode a piece of text containing non-ASCII characters and special symbols before splicing it into a URL. Calling `encodeURIComponent` manually and copying the result out of the console works, but a tool is faster — and it shows the before/after comparison side by side.

The tool supports both standard percent-encoding and form encoding, and handles batch processing too, which is handy for developers who frequently debug URL parameters.

## Security Considerations

URL encoding and security are more closely related than they appear.

### URL Encoding and XSS

Attackers can use encoding to slip past naive input filters. For instance, a literal `<script>` gets filtered, but `%3Cscript%3E` might not. If the application filters first and decodes afterward, the attack payload bypasses the check.

The right approach: **decode first, then validate and filter**. Better yet, use your template engine's auto-escaping instead of manually concatenating HTML.

### Directory Traversal Attacks

`%2e%2e%2f` decodes to `../`. If the server builds file paths from URL parameters, an attacker can use encoded `../` sequences to escape the intended directory and read system files.

```text
https://example.com/download?file=%2e%2e%2f%2e%2e%2fetc%2fpasswd
```

Defense: validate file path parameters against an allowlist rather than simply filtering the `../` string — attackers can bypass string filters with multiple layers of encoding, mixed case, and other tricks.

### Open Redirects

When a URL parameter carries a redirect target and isn't validated, an attacker can craft an encoded malicious link:

```text
https://trusted.com/login?redirect=https%3A%2F%2Fmalicious.com
```

The user sees the `trusted.com` domain but gets redirected to `malicious.com` after clicking. The fix is to validate the redirect parameter against a domain allowlist.

## Summary

URL encoding is part of the basic infrastructure of web development. The key takeaways:

- Percent-encoding converts non-ASCII and reserved characters into the `%XX` format
- `encodeURI` encodes a whole URL; `encodeURIComponent` encodes parameter values
- A space is `%20` in percent-encoding but `+` in form encoding
- Double encoding is the most common pitfall — investigate whenever you see `%25`
- Encoding tricks are a common attack vector; always validate after decoding

With these fundamentals in hand, you can quickly diagnose and fix the vast majority of URL encoding issues. For quick day-to-day encoding and decoding, the [AnyFreeTools URL Encoder/Decoder](https://anyfreetools.com/tools/url-encoder) is a handy efficiency boost.

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
