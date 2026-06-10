---
author: Gerald Chen
pubDatetime: 2026-04-19T09:00:00+08:00
title: "Tool Guide 38: Online User-Agent Parser"
slug: blog135_user-agent-guide
featured: false
draft: true
reviewed: false
approved: false
tags:
  - 工具指南
  - 工具
  - 前端
description: "How to use an online User-Agent parser, a breakdown of the UA string's structure and historical baggage, and code examples for parsing UAs in Node.js, the browser, and Nginx."
---

`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36`

This is a standard Chrome User-Agent string. It mentions Mozilla, WebKit, KHTML, Gecko, and Safari all at once—yet it's actually Chrome running on a Mac.

The User-Agent string is the messiest field in the HTTP request headers, loaded with historical baggage and traces of browsers imitating each other. The [online User-Agent parser](https://anyfreetools.com/tools/user-agent) lets you break down any UA string instantly, no hand-written regex or docs digging required.

## The Historical Baggage of UA Strings

The UA mess comes from the history of browser competition.

In 1993, NCSA Mosaic was the first popular graphical browser, with the UA `NCSA_Mosaic/2.0`. Then Netscape (Navigator) shipped with the UA format `Mozilla/1.0`, and many servers started using the `Mozilla` prefix to decide whether a browser supported advanced features.

In 1995, Internet Explorer was released. To get recognized by those servers as a "browser with advanced features," IE changed its UA to `Mozilla/2.0 (compatible; MSIE 3.0; Windows NT)`—borrowing Netscape's prefix.

Every browser since has kept the tradition going:
- IE pretended to be Mozilla
- Firefox inherited the Mozilla prefix and added the Gecko engine identifier
- By the time Safari launched, servers were checking for Gecko, so Safari added `(KHTML, like Gecko)` to its UA
- Chrome was built on WebKit (same lineage as Safari), so it inherited Safari's UA format and tacked on `Chrome/xxx`

The result is what we have today: every Chrome UA contains Mozilla, WebKit, KHTML, Gecko, and Safari.

## UA String Structure

Despite the mess, UA strings follow a roughly parseable format:

```
ProductName/Version (comment) ProductName/Version ...
```

Breaking down Chrome's UA as an example:

```
Mozilla/5.0
  (Macintosh; Intel Mac OS X 10_15_7)   <- operating system
  AppleWebKit/537.36                      <- rendering engine
  (KHTML, like Gecko)                     <- compatibility claim
  Chrome/124.0.0.0                        <- actual browser
  Safari/537.36                           <- compatibility claim
```

Mobile UAs also include device information:

```
Mozilla/5.0
  (Linux; Android 13; Pixel 7)           <- device and OS
  AppleWebKit/537.36 (KHTML, like Gecko)
  Chrome/124.0.6367.82
  Mobile Safari/537.36                   <- Mobile marker
```

UAs in other contexts include:
- **Crawlers**: `Googlebot/2.1 (+http://www.google.com/bot.html)`
- **CLI tools**: `curl/8.4.0`
- **Mobile apps**: usually a custom format, e.g. `MyApp/2.3.1 (iOS 17.4; iPhone15,2)`

## Tool Features

Open [https://anyfreetools.com/tools/user-agent](https://anyfreetools.com/tools/user-agent):

**Parse your current UA**: On page load, the tool automatically reads your browser's UA and immediately shows structured info—browser name, version, operating system, device type (desktop/mobile/tablet), rendering engine, and more.

**Custom parsing**: Paste any UA string and the tool parses it in real time. Handy for debugging mobile device emulation, testing requests from different browsers, and similar scenarios.

**UA library**: Built-in templates for common UAs (Chrome, Firefox, Safari, iOS, Android, major crawlers, etc.)—copy with one click, no need to memorize the format.

**Field breakdown**: Parsing results are shown in a table, with each field annotated with where it came from in the string, making it easy to understand what each part of the UA means.

## Developer Use Cases

**Mobile debugging**: Chrome DevTools device emulation modifies the UA, but sometimes you need to verify the server correctly recognizes a mobile UA. Paste the emulated UA into the tool to confirm the format is right.

**Validating server-side UA detection**: If your backend has device-detection logic based on the UA (e.g. redirecting to a mobile site), use the tool to quickly generate various UAs and test your coverage.

**Identifying crawlers**: When you see anomalous traffic, paste the suspicious request's UA in to quickly tell whether it's a crawler, an automation tool, or a regular browser.

**Compatibility testing**: When you need to test behavior on a specific Safari/iOS version, the UA library in the tool provides standard formats for each version.

## Code Examples

### Browser: Reading and Parsing the UA

The most direct way to read the UA in the browser:

```javascript
// 读取当前 UA
const ua = navigator.userAgent;
console.log(ua);

// 使用 User-Agent Client Hints（Chrome 89+，更结构化）
if (navigator.userAgentData) {
  const uaData = await navigator.userAgentData.getHighEntropyValues([
    "platform",
    "platformVersion",
    "architecture",
    "model",
    "uaFullVersion",
  ]);
  console.log(uaData);
  // {
  //   platform: "macOS",
  //   platformVersion: "13.6.0",
  //   architecture: "arm",
  //   model: "",
  //   uaFullVersion: "124.0.6367.82"
  // }
}
```

`navigator.userAgentData` is the modern alternative (User-Agent Client Hints). It returns structured data, which is more reliable than parsing the string by hand. For now, though, support is mostly limited to Chromium-based browsers—Firefox and Safari haven't implemented it yet.

Simple device-type detection (no third-party library):

```javascript
function getDeviceType() {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android|blackberry|opera mini|windows phone/i.test(ua)) return "mobile";
  return "desktop";
}

function getBrowserName() {
  const ua = navigator.userAgent;
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("Chrome/") && !ua.includes("Chromium/")) return "Chrome";
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Safari/") && !ua.includes("Chrome/")) return "Safari";
  if (ua.includes("OPR/") || ua.includes("Opera/")) return "Opera";
  return "Unknown";
}
```

Note that detection order matters—both Edge and Chrome UAs contain `Chrome/`, so Edge has to be checked first.

### Node.js: Server-Side UA Parsing

Parsing with the `ua-parser-js` library (the most mature UA parsing library for Node.js):

```javascript
import UAParser from "ua-parser-js";

const parser = new UAParser();

// 解析请求头里的 UA
function parseUserAgent(userAgentString) {
  const result = parser.setUA(userAgentString).getResult();
  return {
    browser: {
      name: result.browser.name,      // "Chrome"
      version: result.browser.version, // "124.0.0.0"
    },
    os: {
      name: result.os.name,           // "macOS"
      version: result.os.version,     // "10.15.7"
    },
    device: {
      type: result.device.type,       // undefined（桌面）/ "mobile" / "tablet"
      vendor: result.device.vendor,   // 设备厂商
      model: result.device.model,     // 设备型号
    },
    engine: {
      name: result.engine.name,       // "Blink"
      version: result.engine.version,
    },
  };
}

// Express 中间件示例
function uaMiddleware(req, res, next) {
  const ua = req.headers["user-agent"] || "";
  req.deviceInfo = parseUserAgent(ua);
  next();
}
```

### Express: Routing by Device Type

```javascript
import express from "express";
import UAParser from "ua-parser-js";

const app = express();
const parser = new UAParser();

app.get("/", (req, res) => {
  const ua = req.headers["user-agent"] || "";
  const device = parser.setUA(ua).getDevice();

  // 移动端重定向到移动站
  if (device.type === "mobile") {
    return res.redirect(301, "https://m.example.com" + req.url);
  }

  res.send("Desktop site");
});
```

### Nginx: Routing Based on the UA

```nginx
# nginx.conf
map $http_user_agent $is_mobile {
  default         0;
  "~*android"     1;
  "~*iphone"      1;
  "~*ipod"        1;
  "~*(windows phone)" 1;
}

server {
  listen 80;

  location / {
    if ($is_mobile) {
      return 302 https://m.example.com$request_uri;
    }
    proxy_pass http://desktop_backend;
  }
}
```

### Python: Parsing the UA in Flask

```python
from flask import Flask, request
from user_agents import parse

app = Flask(__name__)

@app.route("/")
def index():
    ua_string = request.headers.get("User-Agent", "")
    ua = parse(ua_string)

    return {
        "browser": f"{ua.browser.family} {ua.browser.version_string}",
        "os": f"{ua.os.family} {ua.os.version_string}",
        "device": ua.device.family,
        "is_mobile": ua.is_mobile,
        "is_tablet": ua.is_tablet,
        "is_pc": ua.is_pc,
        "is_bot": ua.is_bot,
    }
```

## Limitations of UA Detection

**UAs can be spoofed**: Any HTTP client can send an arbitrary UA string, so never base security decisions on the UA. UA detection is only suitable for UX optimization (like redirecting to a mobile site), not for authorization.

**The UA freeze trend**: Starting with v101, Chrome froze the minor version to `.0.0.0`; v107 froze the desktop OS version; v110 froze Android device info. This is the phased rollout of the Chromium User-Agent Reduction plan. Version info in the UA will keep getting less precise, and `navigator.userAgentData` is the officially recommended replacement.

**Crawler disguises**: Many crawlers spoof Chrome's UA, so the UA alone can't reliably identify crawlers. Combine it with behavioral signals (request frequency, lack of JS execution, missing cookies, etc.) for a more reliable judgment.

**Alternatives for device detection**: Rather than guessing the device type from the UA, use CSS media queries (responsive layout) or `window.innerWidth` to check the viewport size directly—it's more accurate than UA detection and immune to UA changes.

---

The UA string is a living fossil of web history. Understanding its format helps you debug weird compatibility issues and figure out user environments.

Need to parse a UA quickly? Use the [online User-Agent parser](https://anyfreetools.com/tools/user-agent). Need to handle UAs in code? Pick the right library from the examples above.

---

**Tool Guide Series**

[Tool Guide 1: Online Image Compression](/en/posts/blog084_image-compress-guide/) | [Tool Guide #2: Online JSON Formatter](/en/posts/blog085_json-formatter-guide/) | [Tool Guide #3: Online Regex Tester](/en/posts/blog086_regex-tester-guide/) | [Tool Guide 4: QR Code Generator](/en/posts/blog089_qrcode-generator-guide/) | [Tool Guide 5: Base64 Encoder/Decoder](/en/posts/blog090_base64-tool-guide/) | [Tool Guide 6: Online JWT Decoder](/en/posts/blog092_jwt-decoder-guide/) | [Tool Guide 7: Unix Timestamp Converter](/en/posts/blog094_timestamp-tool-guide/) | [Tool Guide 8: Online Password Generator](/en/posts/blog095_password-generator-guide/) | [Tool Guide 9: URL Encoder/Decoder](/en/posts/blog096_url-encoder-guide/) | [Tool Guide 10: Online Hash Generator](/en/posts/blog097_hash-generator-guide/) | [Tool Guide 11: JSON to TypeScript Type Generator](/en/posts/blog099_json-to-typescript-guide/) | [Tool Guide 12: Online Cron Expression Parser](/en/posts/blog100_cron-parser-guide/) | [Tool Guide 13: Online Color Converter](/en/posts/blog102_color-converter-guide/) | [Tool Guide 14: Online SQL Formatter](/en/posts/blog103_sql-formatter-guide/) | [Tool Guide 15: Online Markdown Live Preview Tool](/en/posts/blog104_markdown-preview-guide/) | [Tool Guide 16: Online JSON Diff Tool](/en/posts/blog106_json-diff-guide/) | [Tool Guide 17: AI Token Counter](/en/posts/blog107_token-counter-guide/) | [Tool Guide 18: Online OCR Text Recognition](/en/posts/blog108_ocr-tool-guide/) | [Tool Guide 19: Online CSS Gradient Generator](/en/posts/blog110_css-gradient-guide/) | [Tool Guide 20 - Online UUID Generator](/en/posts/blog111_uuid-generator-guide/) | [Tool Guide 21: HTML to JSX Online Converter](/en/posts/blog112_html-to-jsx-guide/) | [Tool Guide 22: Online WebSocket Tester](/en/posts/blog114_websocket-tester-guide/) | [Tool Guide 23: Free Online CSV to JSON Converter](/en/posts/blog116_csv-to-json-guide/) | [Tool Guide 24: Online CSS Box Shadow Generator](/en/posts/blog118_box-shadow-guide/) | [Tool Guide 25: Online Favicon Generator](/en/posts/blog120_favicon-generator-guide/) | [Tool Guide 26: Online Subnet Calculator](/en/posts/blog121_subnet-calculator-guide/) | [Tool Guide 27: Online Mock Data Generator](/en/posts/blog123_mock-data-guide/) | [Tool Guide 28: Online TOTP Code Generator](/en/posts/blog125_totp-generator-guide/) | [Tool Guide 29: Online AES Encryption & Decryption Tool](/en/posts/blog127_aes-encryption-guide/) | [Tool Guide 30: Online Glassmorphism Generator](/en/posts/blog128_glassmorphism-guide/) | [Tool Guide 31: Online IP Address Lookup Tool](/en/posts/blog130_ip-lookup-guide/) | [Tool Guide 32: Online RSA Key Generator](/en/posts/blog131_rsa-keygen-guide/) | [Tool Guide 33: Online Color Contrast Checker](/en/posts/blog133_color-contrast-guide/) | [Tool Guide 37: Online Unit Converter](/en/posts/blog132_unit-converter-guide/)
