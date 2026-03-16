---
author: 陈广亮
pubDatetime: 2026-03-16T10:00:00+08:00
title: 工具指南4-二维码生成工具
slug: blog088_qrcode-generator-guide
featured: true
draft: false
tags:
  - 工具指南
  - 工具
  - 二维码
  - 前端
description: 从二维码编码原理到前端生成方案，详解 QR Code 的技术细节和实际应用场景，附带 qrcode.js 实战代码和常见踩坑记录。
---

二维码这东西，简单到扫一下就完事，但背后的技术细节比大多数人想象的要复杂得多。

日常开发中，生成二维码的需求随处可见：支付页面要展示收款码，App 下载页要放个扫码链接，后台管理系统要批量生成设备绑定码，甚至连 Wi-Fi 分享都可以用二维码搞定。大部分情况下，我们会直接调一个库就完事了——但如果遇到扫不出来、内容太长放不下、或者样式需要定制的情况，不了解底层原理就很难排查问题。

这篇文章从二维码的编码原理讲起，然后看前端怎么实现生成，最后聊聊实际项目中的常见坑。

## 二维码的编码原理

QR Code（Quick Response Code）是 1994 年由日本 Denso Wave 公司发明的，最初用于汽车零件追踪。它比传统条形码强在哪？条形码是一维的，只能存几十个字符；二维码在水平和垂直两个方向都编码数据，容量大了一个数量级。

### 数据容量

QR Code 有 40 个版本（Version 1 到 Version 40），版本越高，模块数越多，能存的数据也越多：

- **Version 1**：21×21 模块，最多存 41 个数字或 25 个字母
- **Version 10**：57×57 模块，最多存 652 个数字或 395 个字母
- **Version 40**：177×177 模块，最多存 7089 个数字或 4296 个字母

实际能存多少还取决于纠错等级。QR Code 定义了四种纠错级别：

| 纠错等级 | 容错率 | 适用场景 |
|---------|--------|---------|
| L (Low) | ~7% | 数据量大、环境干净 |
| M (Medium) | ~15% | 通用场景（默认） |
| Q (Quartile) | ~25% | 工业环境 |
| H (High) | ~30% | 可能被遮挡（如带 Logo） |

容错率的意思是：即使二维码有这么大比例的区域损坏或被遮挡，依然能正确扫描。这就是为什么很多二维码中间放了 Logo 还能扫出来——它靠的是 H 级别纠错。

### 编码流程

一个字符串变成二维码图案，大致经过这几步：

1. **数据分析**：根据输入内容选择编码模式（数字模式、字母数字模式、字节模式、汉字模式）
2. **数据编码**：把字符转成二进制比特流
3. **纠错编码**：用 Reed-Solomon 算法生成纠错码字
4. **数据排列**：把数据和纠错码字填入矩阵
5. **掩模处理**：选择最优掩模图案，避免出现大面积同色区域（影响扫描识别）
6. **格式信息**：写入纠错等级和掩模编号

其中 Reed-Solomon 纠错编码是核心。它属于前向纠错（FEC）算法，不需要重传就能恢复损坏的数据。这和 CD/DVD 用的纠错技术是同一类。

### 定位图案

每个 QR Code 都有三个角上的"回"字形图案，叫做 Position Detection Pattern（定位图案）。扫描器通过这三个图案确定二维码的方向和大小。这也是为什么二维码旋转任意角度都能扫——三个定位点确定了一个平面坐标系。

Version 2 及以上还会有 Alignment Pattern（校正图案），用来修正透视变形。

## 使用场景

说完原理，看看实际开发中二维码用在哪些地方。

### 链接跳转

最常见的用法。把一个 URL 编码成二维码，用户扫码后跳转到目标页面：

- App 下载页
- 活动推广页
- 产品说明书上的在线文档链接

### Wi-Fi 分享

Android 和 iOS 都支持扫码连接 Wi-Fi，格式是：

```text
WIFI:T:WPA;S:网络名称;P:密码;;
```

会议室、咖啡厅、酒店经常用这种方式，省去了手动输入密码的麻烦。

### 电子名片（vCard）

把联系人信息编码成二维码：

```text
BEGIN:VCARD
VERSION:3.0
N:张;三
TEL:+8613800138000
EMAIL:zhangsan@example.com
END:VCARD
```

扫码后直接添加联系人，比手动输入快得多。

### 支付场景

支付宝、微信支付的收款码本质上就是一个二维码，内容是支付链接加上商户标识。不过支付类二维码有安全要求，生成逻辑通常由后端完成，前端只负责展示。

### 设备绑定 / 物联网

IoT 场景中，每个设备出厂时印一个二维码，包含设备序列号。用户扫码就能把设备绑定到自己的账户，省去了手动输入长串序列号的麻烦。

## 前端生成方案

前端生成二维码的库有好几个，主流的是 `qrcode` 和 `qrcode-generator`。

### qrcode.js（推荐）

npm 包名叫 `qrcode`（注意不是 `qrcodejs`，那个是另一个库，已经很久不维护了）。

安装：

```bash
npm install qrcode
```

基础用法——生成到 Canvas：

```typescript
import QRCode from "qrcode";

const canvas = document.getElementById("qrCanvas") as HTMLCanvasElement;

QRCode.toCanvas(canvas, "https://example.com", {
  width: 256,
  margin: 2,
  color: {
    dark: "#000000",
    light: "#ffffff",
  },
  errorCorrectionLevel: "M",
}, (error: Error | null) => {
  if (error) {
    console.error("生成失败:", error);
    return;
  }
  console.log("二维码生成成功");
});
```

生成 Data URL（可直接赋值给 `<img>` 的 src）：

```typescript
import QRCode from "qrcode";

async function generateQRDataURL(text: string): Promise<string> {
  try {
    const dataURL = await QRCode.toDataURL(text, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: "H", // 高纠错，支持中间放 Logo
    });
    return dataURL;
  } catch (error) {
    console.error("生成二维码失败:", error);
    throw error;
  }
}

// 使用
const img = document.createElement("img");
img.src = await generateQRDataURL("https://example.com");
document.body.appendChild(img);
```

生成 SVG 字符串（适合需要无损缩放的场景）：

```typescript
import QRCode from "qrcode";

async function generateQRSVG(text: string): Promise<string> {
  const svgString = await QRCode.toString(text, {
    type: "svg",
    width: 256,
    margin: 2,
    errorCorrectionLevel: "M",
  });
  return svgString;
}
```

### 在 React 中使用

```tsx
import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface QRCodeProps {
  text: string;
  size?: number;
  level?: "L" | "M" | "Q" | "H";
}

function QRCodeCanvas({ text, size = 256, level = "M" }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !text) return;

    QRCode.toCanvas(canvasRef.current, text, {
      width: size,
      margin: 2,
      errorCorrectionLevel: level,
    }).catch((err: Error) => {
      console.error("QR Code 生成失败:", err);
    });
  }, [text, size, level]);

  return <canvas ref={canvasRef} />;
}

// 使用
function App() {
  return <QRCodeCanvas text="https://example.com" size={300} level="H" />;
}
```

### 带 Logo 的二维码

很多产品需要在二维码中间放品牌 Logo。思路是：先生成二维码到 Canvas，再把 Logo 画上去。前提是纠错等级要设成 H，否则 Logo 遮挡的区域会导致扫码失败。

```typescript
async function generateQRWithLogo(
  text: string,
  logoSrc: string,
  size: number = 300
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  // 第一步：生成二维码
  await QRCode.toCanvas(canvas, text, {
    width: size,
    margin: 2,
    errorCorrectionLevel: "H", // 必须用 H 级别
  });

  // 第二步：叠加 Logo
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not available");

  const logo = new Image();
  logo.crossOrigin = "anonymous";

  return new Promise((resolve, reject) => {
    logo.onload = () => {
      const logoSize = size * 0.2; // Logo 占二维码的 20%
      const logoX = (size - logoSize) / 2;
      const logoY = (size - logoSize) / 2;

      // 画白色背景（让 Logo 区域更清晰）
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(logoX - 4, logoY - 4, logoSize + 8, logoSize + 8);

      // 画 Logo
      ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
      resolve(canvas);
    };
    logo.onerror = reject;
    logo.src = logoSrc;
  });
}
```

Logo 面积不要超过二维码总面积的 25%，否则即使用 H 级纠错也可能扫不出来。实测 15%-20% 是比较安全的范围。

## 不想自己写？用在线工具

如果只是临时生成几个二维码，或者非开发人员需要用，手写代码就太重了。[AnyFreeTools 的二维码生成器](https://anyfreetools.com/tools/qrcode)可以直接在浏览器里输入内容生成二维码，支持调整大小和纠错等级，生成后直接下载图片。纯前端实现，数据不会上传到服务器。

对于开发者来说，这类工具也可以用来快速验证：比如你想确认某个 URL 编码成二维码后能不能正常扫描，或者测试不同纠错等级对可扫描性的影响，直接用在线工具试比写代码快得多。

## 常见踩坑记录

### 坑一：内容太长，生成的二维码太密

二维码的模块数随数据量增长而增加。一个 500 字符的 URL 生成的二维码会非常密集，在小尺寸下几乎无法扫描。

解决方案：

- 用短链接服务缩短 URL
- 控制编码内容的长度，URL 参数能省则省
- 如果必须编码大量数据，增大二维码的物理尺寸

### 坑二：深色背景上的二维码扫不出来

部分扫码器对反色二维码（白底黑码以外的配色）支持不好。特别是前景色和背景色对比度不够的时候，很容易扫描失败。

建议：

- 保持经典的深色模块 + 浅色背景
- 前景和背景的亮度差至少要 40%以上
- 避免使用渐变色作为模块颜色

### 坑三：Canvas 导出的图片模糊

Canvas 在高 DPI 屏幕上默认按 1x 渲染，导出的图片会模糊。解决方法：

```typescript
function createHiDPICanvas(width: number, height: number): HTMLCanvasElement {
  const ratio = window.devicePixelRatio || 1;
  const canvas = document.createElement("canvas");
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";

  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.scale(ratio, ratio);
  }
  return canvas;
}
```

不过如果是用 `qrcode` 库的 `toCanvas` 方法，直接设置 `width` 为目标像素值就行，库内部会处理。需要注意的是导出图片时用 `canvas.toBlob()` 或 `canvas.toDataURL()` 拿到的是实际像素大小的图片。

### 坑四：动态内容频繁更新导致闪烁

如果二维码内容是动态变化的（比如倒计时付款码），每次更新都重新渲染 Canvas 会导致闪烁。可以用双缓冲的思路：在离屏 Canvas 上画好，再一次性替换。

```typescript
function updateQRCode(
  displayCanvas: HTMLCanvasElement,
  text: string,
  size: number
): void {
  const offscreen = document.createElement("canvas");
  offscreen.width = size;
  offscreen.height = size;

  QRCode.toCanvas(offscreen, text, { width: size }, () => {
    const ctx = displayCanvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(offscreen, 0, 0);
    }
  });
}
```

## 批量生成的性能考虑

如果需要一次生成几百个二维码（比如批量导出设备绑定码），同步生成会阻塞主线程。两个优化方向：

1. **分批处理**：用 `requestIdleCallback` 或 `setTimeout` 分批生成，避免长时间占用主线程
2. **Web Worker**：把 `qrcode` 库放到 Worker 里运行，生成 Data URL 后传回主线程显示

分批处理的简单实现：

```typescript
async function batchGenerate(
  items: string[],
  batchSize: number = 10
): Promise<string[]> {
  const results: string[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(item => QRCode.toDataURL(item, { width: 200 }))
    );
    results.push(...batchResults);

    // 让出主线程
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return results;
}
```

## 总结

二维码生成看似简单，但从编码原理到工程实践有不少细节值得注意。核心要点：

- 纠错等级的选择直接影响可用性：要放 Logo 就用 H，纯链接用 M 即可
- 控制编码内容的长度，过长的数据会让二维码密度过高
- 前端用 `qrcode` 库（npm 包名）最省心，Canvas/SVG/Data URL 都支持
- 配色要保证足够的对比度，别为了好看牺牲可扫描性
- 批量场景注意性能，别阻塞主线程

---

**本系列其他文章**：
- [工具指南1-在线图片压缩](/posts/blog084_image-compress-guide/) - 前端图片压缩原理与实践
- [工具指南2-JSON 格式化工具](/posts/blog085_json-formatter-guide/) - JSON 解析、格式化与验证
- [工具指南3-在线正则表达式测试](/posts/blog086_regex-tester-guide/) - 正则调试技巧与常用 pattern

---

**相关阅读**：
- [AnyFreeTools 二维码生成器](https://anyfreetools.com/tools/qrcode) - 在线生成二维码，纯前端实现，数据不上传
