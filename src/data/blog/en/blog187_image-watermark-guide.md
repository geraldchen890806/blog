---
author: Gerald Chen
pubDatetime: 2026-06-09T14:00:00+08:00
title: "Tool Guide 65: Online Image Watermark Tool"
slug: blog187_image-watermark-guide
featured: true
draft: true
reviewed: true
approved: false
tags:
  - 工具指南
  - 工具
  - 图片处理
  - 水印
description: "Watermarking is a basic way for content creators to protect their original work. This article dives into how text watermarks are implemented under the hood and introduces a fully browser-based online image watermark tool."
---

You publish a carefully shot photo on social media, and the next day you find someone stripped the EXIF data and reposted it as their own — a story many photographers and designers know all too well. A watermark won't stop image theft 100% of the time, but it preserves attribution as the image gets reshared and raises the cost of stealing it.

In this article, we'll look at how image watermarks work from a technical angle, and why "browser-side processing" matters for privacy.

## The Two Schools of Watermarking

### Visible Watermark

Overlay text or a logo directly on the image. The upside is that it's obvious; the downside is that it affects how the image looks. Common strategies:

- **Small text in a corner**: minimal visual impact, but easy to crop out
- **Large diagonal text**: covers a wide area and is hard to remove, but looks bad
- **Semi-transparent tiling**: the middle ground — broad coverage without obscuring too much content

### Invisible Watermark

Embed information by modifying the least significant bits (LSB) of pixel values or via frequency-domain transforms, invisible to the naked eye. This approach is better suited for forensics and provenance tracking, but it's complex to implement and easily destroyed by screenshots, compression, and similar operations.

For everyday content protection, visible watermarks remain the most practical option.

## Canvas API: The Core of Browser-Side Image Processing

The core technology for adding watermarks in the browser is the Canvas API. The overall flow is straightforward:

```typescript
async function addWatermark(
  imageFile: File,
  text: string,
  options: WatermarkOptions
): Promise<Blob> {
  const img = await createImageBitmap(imageFile);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not available");

  // 1. 绘制原图
  ctx.drawImage(img, 0, 0);

  // 2. 设置水印样式
  ctx.font = `${options.fontSize}px ${options.fontFamily}`;
  ctx.fillStyle = `rgba(${options.color}, ${options.opacity})`;

  // 3. 旋转画布并绘制文字
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((options.angle * Math.PI) / 180);
  ctx.fillText(text, 0, 0);
  ctx.restore();

  // 4. 导出结果 (保持原始格式，避免 PNG 导致文件体积暴增)
  const outputFormat = imageFile.type.startsWith("image/") ? imageFile.type : "image/png";
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), outputFormat);
  });
}
```

This code shows the most basic single-pass watermark draw. A real product also needs to handle tiling, spacing, font loading, and other details.

## Implementing a Tiled Watermark

A tiled watermark repeats the text across the entire canvas. The key is computing the row and column spacing:

```typescript
function drawTiledWatermark(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
  gap: number,
  angle: number
) {
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate((angle * Math.PI) / 180);

  // 旋转后需要更大的覆盖范围
  const diagonal = Math.sqrt(width * width + height * height);
  const startX = -diagonal / 2;
  const startY = -diagonal / 2;

  const textWidth = ctx.measureText(text).width;
  const stepX = textWidth + gap;
  // 从字体字符串中提取字号，更健壮的方式
  const fontSize = parseFloat(ctx.font.match(/(\d+)px/)?.[1] ?? "16");
  const stepY = fontSize + gap;

  for (let y = startY; y < diagonal; y += stepY) {
    for (let x = startX; x < diagonal; x += stepX) {
      ctx.fillText(text, x, y);
    }
  }

  ctx.restore();
}
```

There's a detail here that's easy to miss: after rotating the canvas, the drawing area needs to extend out to the diagonal length, otherwise the four corners end up blank.

## Why Browser-Side Processing Matters

Many online watermark tools require uploading your image to a server for processing. That creates two problems:

1. **Privacy risk**: your image passes through a third-party server, and you can't be sure whether it gets stored or analyzed
2. **Speed bottleneck**: uploading a large image takes time, and then you have to download the result back

Pure browser-side processing means the image never leaves your device — it doesn't touch any server. The Canvas API is plenty fast for common image sizes: adding a tiled watermark to a 4000x3000 photo typically finishes within 200ms (measured on an M1 MacBook in Chrome).

For ultra-large images beyond 8K, Canvas may hit memory limits. Maximum canvas size varies by browser: Chrome supports roughly 16384x16384, while Safari on mobile depends on the device (around 4096x4096 on older devices, up to 16384x16384 on newer ones). Beyond those limits, you need to process in tiles or reduce the resolution.

## Choosing Watermark Parameters

A few parameters need balancing when adding a watermark:

**Opacity**: 10%-30% is recommended. Too high seriously degrades the image; too low and the watermark won't be noticeable. 20% is a good starting point.

**Font size**: set it relative to the image dimensions. A good rule of thumb is 3%-5% of the image's shorter side. For a 1920x1080 image, that means a font size of 32-54px.

**Rotation angle**: -45 degrees is the most common choice, because it's the hardest to remove by cropping. 0 degrees (horizontal) looks nicer but is easier for tools to detect and remove automatically.

**Watermark content**: besides your name or brand, adding a date is a good habit. Even if the watermark is partially destroyed, the remaining portion still carries timestamp information.

## A Practical Tool

If you'd rather not write the code yourself, try [AnyFreeTools' online image watermark tool](https://anyfreetools.com/tools/image-watermark). It supports:

- Custom watermark text, font, and color
- Adjustable opacity and rotation angle
- Single watermark or tiled mode
- Pure browser-side processing — images are never uploaded to a server
- Direct download once processing is done

The whole workflow is simple: upload the image → set watermark parameters → preview the result → download. More than enough for everyday use.

## Batch Processing

If you need to watermark a large number of images, a browser-based tool may not be efficient enough. In that case, use Node.js with the Sharp library for batch processing:

```bash
npm install sharp
```

```typescript
import sharp from "sharp";
import path from "path";
import fs from "fs";

async function batchWatermark(inputDir: string, outputDir: string, text: string) {
  // 确保输出目录存在
  fs.mkdirSync(outputDir, { recursive: true });
  
  const files = fs.readdirSync(inputDir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));

  // 创建水印 SVG (注意：生产环境需对文本做 XML 转义处理)
  const escapeXml = (str: string) => str.replace(/[<>&'"]/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&#39;', '"': '&quot;'
  }[c] || c));
  
  const watermarkSvg = Buffer.from(`
    <svg width="400" height="100">
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
            font-size="36" fill="rgba(255,255,255,0.3)" font-family="sans-serif"
            transform="rotate(-30, 200, 50)">
        ${escapeXml(text)}
      </text>
    </svg>
  `);

  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, file);

    await sharp(inputPath)
      .composite([{ input: watermarkSvg, tile: true, blend: "over" }])
      .toFile(outputPath);

    console.log(`Done: ${file}`);
  }
}

// 使用示例
batchWatermark("./photos", "./watermarked", "My Brand 2026");
```

Sharp is built on libvips and processes images several times faster than Canvas, making it well suited for batch scenarios.

## The Limits of Watermarking

Finally, an honest note: watermarks are not a silver bullet.

- **Screenshots** bypass any client-side protection
- **AI watermark removal tools** (such as inpainting-based approaches) can already remove visible watermarks fairly well
- **Social platform compression** can blur watermarks beyond recognition

A watermark is more about "raising the cost of theft" than "preventing theft". For truly valuable images, combine watermarking with low-resolution publishing and a copyright notice for layered protection.

---

**Related reading**:
- [Tool Guide 58: Online Image Crop Tool](/en/posts/blog174_image-crop-guide/) - Image cropping
- [Tool Guide 62: Online Image to Base64 Converter](/en/posts/blog183_image-to-base64-guide/) - Image encoding
- [Tool Guide 63: Online Image Format Converter](/en/posts/blog184_image-convert-guide/) - Image format conversion

**More in this series**:
- [Tool Guide 1: Online Image Compression](/en/posts/blog084_image-compress-guide/)
- [Tool Guide #2: Online JSON Formatter](/en/posts/blog085_json-formatter-guide/)
- [Tool Guide #3: Online Regex Tester](/en/posts/blog086_regex-tester-guide/)
- [Tool Guide 4: QR Code Generator](/en/posts/blog089_qrcode-generator-guide/)
- [Tool Guide 5: Base64 Encoder/Decoder](/en/posts/blog090_base64-tool-guide/)
- [Tool Guide 60: Online SVG Optimizer](/en/posts/blog179_svg-optimizer-guide/)
- [Tool Guide 64 - Online Date Calculator](/en/posts/blog185_date-calculator-guide/)
