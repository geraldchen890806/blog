---
author: 陈广亮
pubDatetime: 2026-04-19T09:00:00+08:00
title: 工具指南38-在线User-Agent解析器
slug: blog135_user-agent-guide
featured: false
draft: true
reviewed: false
approved: false
tags:
  - 工具指南
  - 工具
  - 前端
description: 介绍在线 User-Agent 解析器的使用方法，拆解 UA 字符串的结构和历史包袱，以及在 Node.js、前端、Nginx 中解析 UA 的代码实现。
---

`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36`

这是一个标准的 Chrome 浏览器 User-Agent 字符串。里面同时出现了 Mozilla、WebKit、KHTML、Gecko 和 Safari 的字样——但实际上这是一个运行在 Mac 上的 Chrome 浏览器。

User-Agent 字符串是 HTTP 请求头里最混乱的一个字段，充满了历史包袱和浏览器之间互相模仿的痕迹。[在线 User-Agent 解析器](https://anyfreetools.com/tools/user-agent) 可以帮你快速拆解任意 UA 字符串，不需要手写正则或查文档。

## UA 字符串的历史包袱

User-Agent 的混乱来自浏览器竞争的历史。

1993 年，NCSA Mosaic 是第一款流行的图形浏览器，UA 是 `NCSA_Mosaic/2.0`。随后 Netscape（Navigator）发布，UA 格式改为 `Mozilla/1.0`，很多服务器开始根据 `Mozilla` 前缀判断是否支持高级特性。

1995 年，Internet Explorer 发布。为了被这些服务器识别为"支持高级特性的浏览器"，IE 把 UA 改成了 `Mozilla/2.0 (compatible; MSIE 3.0; Windows NT)`——借用了 Netscape 的前缀。

之后每款浏览器都延续了这个做法：
- IE 伪装成 Mozilla
- Firefox 继承了 Mozilla 前缀，并加上了 Gecko 引擎标识
- Safari 发布时，服务器已经开始检查 Gecko，所以 Safari 在 UA 里加上了 `(KHTML, like Gecko)`
- Chrome 基于 WebKit（Safari 同源），所以继承了 Safari 的 UA 格式，还加上了 `Chrome/xxx`

结果就是现在这个局面：每个 Chrome 的 UA 里都有 Mozilla、WebKit、KHTML、Gecko 和 Safari 的字样。

## UA 字符串结构

尽管混乱，UA 字符串有一个大致可解析的格式：

```
产品名/版本 (注释) 产品名/版本 ...
```

以 Chrome 为例分解：

```
Mozilla/5.0
  (Macintosh; Intel Mac OS X 10_15_7)   <- 操作系统
  AppleWebKit/537.36                      <- 渲染引擎
  (KHTML, like Gecko)                     <- 兼容声明
  Chrome/124.0.0.0                        <- 实际浏览器
  Safari/537.36                           <- 兼容声明
```

移动端的 UA 则会包含设备信息：

```
Mozilla/5.0
  (Linux; Android 13; Pixel 7)           <- 设备和系统
  AppleWebKit/537.36 (KHTML, like Gecko)
  Chrome/124.0.6367.82
  Mobile Safari/537.36                   <- Mobile 标识
```

不同场景的 UA 还包括：
- **爬虫**：`Googlebot/2.1 (+http://www.google.com/bot.html)`
- **CLI 工具**：`curl/8.4.0`
- **移动应用**：通常是自定义格式，如 `MyApp/2.3.1 (iOS 17.4; iPhone15,2)`

## 工具功能

打开 [https://anyfreetools.com/tools/user-agent](https://anyfreetools.com/tools/user-agent)：

**解析当前 UA**：页面加载时自动读取浏览器的 UA，立即显示浏览器名称、版本、操作系统、设备类型（桌面/移动/平板）、渲染引擎等结构化信息。

**自定义解析**：粘贴任意 UA 字符串，工具实时解析。适合调试移动设备模拟、测试不同浏览器的请求等场景。

**UA 库**：内置常用 UA 模板（Chrome、Firefox、Safari、iOS、Android、主流爬虫等），一键复制，不需要记格式。

**字段对照**：把解析结果以表格形式展示，每个字段都标注了来源位置，方便理解 UA 字符串的各部分含义。

## 开发者使用场景

**调试移动端**：Chrome DevTools 的设备模拟会修改 UA，但有时候需要验证服务端是否正确识别了移动 UA。把模拟的 UA 粘贴到工具里确认格式正确。

**服务端 UA 检测验证**：后端有根据 UA 做设备判断的逻辑（如重定向到移动站），用工具快速生成各类 UA 来测试覆盖情况。

**爬虫标识确认**：收到异常流量时，把可疑请求的 UA 粘进来，快速判断是爬虫、自动化工具还是正常浏览器。

**兼容性测试**：需要测试特定 Safari/iOS 版本的行为时，工具里的 UA 库直接提供各版本的标准格式。

## 代码实现

### 浏览器端：读取和解析 UA

浏览器里读取 UA 最直接的方式：

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

`navigator.userAgentData` 是现代的替代方案（User-Agent Client Hints），返回结构化数据，比手动解析字符串更可靠。但目前主要是 Chromium 系浏览器支持，Firefox 和 Safari 尚未实现。

简单的设备类型判断（不依赖第三方库）：

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

注意检测顺序很重要——Edge 和 Chrome 的 UA 都包含 `Chrome/`，所以 Edge 要先检测。

### Node.js：服务端 UA 解析

用 `ua-parser-js` 库解析（最成熟的 Node.js UA 解析库）：

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

### Express 路由中按设备类型分发

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

### Nginx：根据 UA 做路由

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

### Python：Flask 中解析 UA

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

## UA 检测的局限性

**UA 可以被伪造**：任何 HTTP 客户端都可以发送任意 UA 字符串，不能依赖 UA 做安全决策。UA 检测只适合做用户体验优化（如重定向到移动站），不适合做权限判断。

**UA 冻结趋势**：Chrome 从 v101 起将次版本号冻结为 `.0.0.0`，v107 起冻结桌面操作系统版本，v110 起冻结 Android 设备信息，这是 Chromium User-Agent Reduction 计划的分阶段推进。未来 UA 的版本信息会越来越不精确，`navigator.userAgentData` 是官方推荐的替代方向。

**爬虫伪装**：很多爬虫会伪装成 Chrome 的 UA，单靠 UA 无法可靠地识别爬虫。可以结合行为特征（访问频率、缺少 JS 执行、不发送 Cookie 等）做综合判断。

**设备检测替代方案**：与其通过 UA 猜设备类型，不如直接用 CSS 媒体查询（响应式布局）或 `window.innerWidth` 来判断视口大小——这比 UA 检测更准确，也不会被 UA 变化影响。

---

UA 字符串是 Web 历史的活化石，理解它的格式有助于排查奇怪的兼容性问题，也帮助判断用户环境。

需要快速解析一个 UA，用 [在线 User-Agent 解析器](https://anyfreetools.com/tools/user-agent)；需要在代码里处理 UA，参考上面的示例选对应的库。

---

**工具指南系列**

[工具指南1-在线图片压缩](https://chenguangliang.com/posts/blog084_image-compress-guide/) | [工具指南2-JSON格式化](https://chenguangliang.com/posts/blog085_json-formatter-guide/) | [工具指南3-正则测试](https://chenguangliang.com/posts/blog086_regex-tester-guide/) | [工具指南4-二维码生成](https://chenguangliang.com/posts/blog089_qrcode-generator-guide/) | [工具指南5-Base64](https://chenguangliang.com/posts/blog090_base64-tool-guide/) | [工具指南6-JWT解码](https://chenguangliang.com/posts/blog092_jwt-decoder-guide/) | [工具指南7-时间戳转换](https://chenguangliang.com/posts/blog094_timestamp-tool-guide/) | [工具指南8-密码生成器](https://chenguangliang.com/posts/blog095_password-generator-guide/) | [工具指南9-URL编解码](https://chenguangliang.com/posts/blog096_url-encoder-guide/) | [工具指南10-哈希生成器](https://chenguangliang.com/posts/blog097_hash-generator-guide/) | [工具指南11-JSON转TypeScript](https://chenguangliang.com/posts/blog099_json-to-typescript-guide/) | [工具指南12-Cron解析器](https://chenguangliang.com/posts/blog100_cron-parser-guide/) | [工具指南13-颜色转换](https://chenguangliang.com/posts/blog102_color-converter-guide/) | [工具指南14-SQL格式化](https://chenguangliang.com/posts/blog103_sql-formatter-guide/) | [工具指南15-Markdown预览](https://chenguangliang.com/posts/blog104_markdown-preview-guide/) | [工具指南16-JSON对比](https://chenguangliang.com/posts/blog106_json-diff-guide/) | [工具指南17-Token计数器](https://chenguangliang.com/posts/blog107_token-counter-guide/) | [工具指南18-OCR文字识别](https://chenguangliang.com/posts/blog108_ocr-tool-guide/) | [工具指南19-CSS渐变生成器](https://chenguangliang.com/posts/blog110_css-gradient-guide/) | [工具指南20-UUID生成器](https://chenguangliang.com/posts/blog111_uuid-generator-guide/) | [工具指南21-HTML转JSX](https://chenguangliang.com/posts/blog112_html-to-jsx-guide/) | [工具指南22-WebSocket测试](https://chenguangliang.com/posts/blog114_websocket-tester-guide/) | [工具指南23-CSV转JSON](https://chenguangliang.com/posts/blog116_csv-to-json-guide/) | [工具指南24-Box Shadow生成器](https://chenguangliang.com/posts/blog118_box-shadow-guide/) | [工具指南25-Favicon生成器](https://chenguangliang.com/posts/blog120_favicon-generator-guide/) | [工具指南26-子网计算器](https://chenguangliang.com/posts/blog121_subnet-calculator-guide/) | [工具指南27-Mock数据生成器](https://chenguangliang.com/posts/blog123_mock-data-guide/) | [工具指南28-TOTP验证码](https://chenguangliang.com/posts/blog125_totp-generator-guide/) | [工具指南29-AES加密](https://chenguangliang.com/posts/blog127_aes-encryption-guide/) | [工具指南30-毛玻璃效果](https://chenguangliang.com/posts/blog128_glassmorphism-guide/) | [工具指南31-IP地址查询](https://chenguangliang.com/posts/blog130_ip-lookup-guide/) | [工具指南32-RSA密钥生成器](https://chenguangliang.com/posts/blog131_rsa-keygen-guide/) | [工具指南33-颜色对比度](https://chenguangliang.com/posts/blog133_color-contrast-guide/) | [工具指南37-单位转换器](https://chenguangliang.com/posts/blog132_unit-converter-guide/)
