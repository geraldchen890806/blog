---
author: Gerald Chen
pubDatetime: 2026-03-16T10:00:00+08:00
title: "Tool Guide 4: QR Code Generator"
slug: blog089_qrcode-generator-guide
featured: false
draft: true
tags:
  - 工具指南
  - 工具
  - 前端
description: "From QR code encoding fundamentals to frontend generation: a deep dive into how QR codes work and where they're used, with hands-on qrcode.js code and lessons learned from real-world pitfalls."
---

QR codes seem trivial — point your camera, scan, done. But the technology behind them is far more involved than most people realize.

The need to generate QR codes comes up everywhere in day-to-day development: payment pages need a checkout code, app landing pages need a scan-to-download link, admin dashboards need batch-generated device binding codes, and you can even share Wi-Fi credentials through a QR code. Most of the time we just pull in a library and call it a day — but when a code won't scan, the content is too long to fit, or the design needs customization, debugging is hard without understanding what's happening underneath.

This post starts with how QR codes are encoded, then covers frontend generation, and wraps up with the common pitfalls you'll hit in real projects.

## How QR Codes Are Encoded

QR Code (Quick Response Code) was invented in 1994 by Denso Wave in Japan, originally for tracking automotive parts. What makes it better than a traditional barcode? Barcodes are one-dimensional and hold only a few dozen characters; QR codes encode data both horizontally and vertically, increasing capacity by an order of magnitude.

### Data Capacity

QR Code has 40 versions (Version 1 through Version 40). Higher versions mean more modules and more storage:

The figures below are for error correction level L (maximum capacity):

- **Version 1**: 21×21 modules, up to 41 digits or 25 alphanumeric characters
- **Version 10**: 57×57 modules, up to 652 digits or 395 alphanumeric characters
- **Version 40**: 177×177 modules, up to 7089 digits or 4296 alphanumeric characters

Actual capacity depends on the error correction level (higher levels mean stronger error recovery but less usable capacity). QR Code defines four error correction levels:

| Error Correction Level | Damage Tolerance | Typical Use Case |
|---------|--------|---------|
| L (Low) | ~7% | Large payloads, clean environments |
| M (Medium) | ~15% | General purpose (default) |
| Q (Quartile) | ~25% | Industrial environments |
| H (High) | ~30% | Codes that may be partially covered (e.g. with a logo) |

Damage tolerance means the code can still be scanned correctly even when that fraction of its area is damaged or obscured. This is why so many QR codes with a logo in the middle still scan fine — they rely on level H error correction.

### The Encoding Pipeline

Turning a string into a QR code pattern roughly takes these steps:

1. **Data analysis**: pick an encoding mode based on the input (numeric, alphanumeric, byte, or Kanji mode)
2. **Data encoding**: convert characters into a binary bitstream
3. **Error correction encoding**: generate error correction codewords using the Reed-Solomon algorithm
4. **Data placement**: lay out the data and error correction codewords in the matrix
5. **Masking**: choose the optimal mask pattern to avoid large same-color regions (which hurt scan recognition)
6. **Format information**: write the error correction level and mask number

Reed-Solomon error correction is the heart of it. It's a forward error correction (FEC) algorithm — it recovers damaged data without retransmission. It belongs to the same family of error correction used by CDs and DVDs.

### Finder Patterns

Every QR code has those square-in-square shapes in three corners, called Position Detection Patterns. The scanner uses them to determine the code's orientation and size. That's why a QR code scans at any rotation — three anchor points define a planar coordinate system.

Version 2 and above also include Alignment Patterns, used to correct perspective distortion.

## Use Cases

With the theory out of the way, let's look at where QR codes actually show up in development.

### URL Redirection

The most common use. Encode a URL into a QR code, and users land on the target page after scanning:

- App download pages
- Promotional campaign pages
- Links to online docs on a product manual

### Wi-Fi Sharing

Both Android and iOS support joining Wi-Fi via QR scan. The format is:

```text
WIFI:T:WPA;S:NetworkName;P:Password;;
```

Meeting rooms, coffee shops, and hotels often use this — no more typing passwords by hand.

### Digital Business Cards (vCard)

Encode contact information into a QR code:

```text
BEGIN:VCARD
VERSION:3.0
N:张;三
TEL:+8613800138000
EMAIL:zhangsan@example.com
END:VCARD
```

Scan to add the contact directly — much faster than manual entry.

### Payments

Alipay and WeChat Pay collection codes are essentially QR codes whose content is a payment link plus a merchant identifier. Payment QR codes have security requirements, though, so generation typically happens on the backend; the frontend only displays them.

### Device Binding / IoT

In IoT scenarios, every device ships with a QR code containing its serial number. Users scan it to bind the device to their account, sparing them from typing a long serial number by hand.

## Frontend Generation Options

There are several libraries for generating QR codes on the frontend; the mainstream ones are `qrcode` and `qrcode-generator`.

### qrcode.js (Recommended)

The npm package is named `qrcode` (note: not `qrcodejs` — that's a different library that hasn't been maintained in years).

Install:

```bash
npm install qrcode
```

Basic usage — render to a Canvas:

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

Generate a Data URL (can be assigned directly to an `<img>` src):

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

Generate an SVG string (ideal when you need lossless scaling):

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

### Using It in React

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

### QR Codes with a Logo

Many products want a brand logo in the center of the QR code. The approach: render the QR code to a Canvas first, then draw the logo on top. The prerequisite is setting the error correction level to H — otherwise the area the logo covers will break scanning.

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

Keep the logo under 25% of the QR code's total area — beyond that, even level H error correction may not save you. In my testing, 15%-20% is the safe range.

## Don't Want to Write Code? Use an Online Tool

If you just need a few QR codes once, or a non-developer needs to generate them, writing code is overkill. The [AnyFreeTools QR Code Generator](https://anyfreetools.com/tools/qrcode) lets you type your content right in the browser and generate a QR code, with adjustable size and error correction level, then download the image directly. It runs entirely on the frontend — your data never leaves the browser.

For developers, this kind of tool is also handy for quick verification: say you want to confirm a URL scans properly once encoded, or test how different error correction levels affect scannability — trying it in an online tool is much faster than writing code.

## Common Pitfalls

### Pitfall 1: Content Too Long, QR Code Too Dense

The module count grows with the amount of data. A 500-character URL produces an extremely dense QR code that's nearly impossible to scan at small sizes.

Solutions:

- Use a URL shortener
- Keep the encoded content lean — drop any URL parameters you can
- If you must encode lots of data, increase the QR code's physical size

### Pitfall 2: QR Codes on Dark Backgrounds Won't Scan

Some scanners handle inverted QR codes (anything other than dark modules on a light background) poorly. Scanning fails easily when there isn't enough contrast between foreground and background.

Recommendations:

- Stick with the classic dark modules on a light background
- Keep at least a 40% brightness difference between foreground and background
- Avoid gradient colors for the modules

### Pitfall 3: Blurry Images Exported from Canvas

Canvas renders at 1x by default on high-DPI screens, so exported images come out blurry. The fix:

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

That said, if you're using the `qrcode` library's `toCanvas` method, just set `width` to the target pixel value — the library handles it internally. Note that when exporting, `canvas.toBlob()` or `canvas.toDataURL()` gives you an image at the actual pixel dimensions.

### Pitfall 4: Flicker from Frequently Updated Dynamic Content

If the QR code content changes dynamically (say, a payment code on a countdown), re-rendering the Canvas on every update causes flicker. Use a double-buffering approach: draw to an offscreen Canvas first, then swap it in all at once.

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

## Performance Considerations for Batch Generation

If you need to generate hundreds of QR codes at once (e.g. batch-exporting device binding codes), synchronous generation blocks the main thread. Two ways to optimize:

1. **Batching**: generate in chunks using `requestIdleCallback` or `setTimeout` to avoid hogging the main thread
2. **Web Worker**: run the `qrcode` library in a Worker, generate Data URLs, and send them back to the main thread for display

A simple batching implementation:

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

## Summary

QR code generation looks simple, but there are plenty of details worth knowing, from encoding theory to engineering practice. Key takeaways:

- The error correction level directly affects usability: use H if you're adding a logo, M is fine for plain links
- Keep the encoded content short — too much data makes the code overly dense
- On the frontend, the `qrcode` library (the npm package name) is the path of least resistance, with Canvas/SVG/Data URL all supported
- Ensure sufficient color contrast — don't sacrifice scannability for looks
- Watch performance in batch scenarios and keep the main thread free

---

**Other posts in this series**:
- [Tool Guide 1: Online Image Compression](/en/posts/blog084_image-compress-guide/) - Frontend image compression theory and practice
- [Tool Guide 2: JSON Formatter](/en/posts/blog085_json-formatter-guide/) - JSON parsing, formatting, and validation
- [Tool Guide 3: Online Regex Tester](/en/posts/blog086_regex-tester-guide/) - Regex debugging tips and common patterns

---

**Related reading**:
- [AnyFreeTools QR Code Generator](https://anyfreetools.com/tools/qrcode) - Generate QR codes online, fully client-side, no data uploaded
