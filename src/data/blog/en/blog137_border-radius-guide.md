---
author: Gerald Chen
pubDatetime: 2026-04-20T10:00:00+08:00
title: "Tool Guide 40 - Online CSS Border Radius Generator"
slug: blog137_border-radius-guide
featured: false
draft: true
reviewed: false
approved: false
tags:
  - 工具指南
  - 工具
  - 前端
  - CSS
description: "How to use the online CSS Border Radius generator, with a deep dive into border-radius syntax and elliptical corners, plus practical code examples and common use cases."
---

`border-radius: 50% 20% / 10% 40%` and `border-radius: 50%` are both valid CSS, but the first one leaves most people scratching their heads. The full border-radius syntax is far more complex than most developers realize—but once you master it, you can create waves, teardrops, organic blobs, and all kinds of irregular shapes without touching SVG.

The [online CSS Border Radius generator](https://anyfreetools.com/tools/border-radius) gives you a visual drag-and-drop interface with a live preview, so you never have to work out the values by hand.

## border-radius Syntax, Fully Explained

### The Basics: Four Corners

```css
/* 四个角统一 */
border-radius: 8px;

/* 对角线分别设置：左上右下 / 右上左下 */
border-radius: 8px 16px;

/* 三个值：左上 / 右上左下 / 右下 */
border-radius: 8px 16px 4px;

/* 四个值：左上 右上 右下 左下（顺时针） */
border-radius: 8px 16px 24px 4px;
```

The order goes clockwise starting from the top-left corner. Like `margin`/`padding` it's clockwise, but the starting point differs—`margin`/`padding` start from the "top edge," while `border-radius` starts from the "top-left corner."

### Longhand Properties

```css
border-top-left-radius: 8px;
border-top-right-radius: 16px;
border-bottom-right-radius: 24px;
border-bottom-left-radius: 4px;
```

### Elliptical Corners: The Slash Syntax

This is the most commonly overlooked part of border-radius. The slash (`/`) lets you set the horizontal and vertical radii separately:

```css
/* 水平半径 / 垂直半径 */
border-radius: 40px / 20px;

/* 四个角的水平半径 / 四个角的垂直半径 */
border-radius: 40px 20px 60px 10px / 20px 30px 10px 40px;
```

Everything before the slash is the **horizontal** elliptical radius for each corner; everything after it is the **vertical** elliptical radius. Two independent axes combine to form an elliptical arc.

Take `border-radius: 60px 40px / 20px 80px` as an example (two-value expansion rule: 1st value → top-left + bottom-right, 2nd value → top-right + bottom-left):

```
Top-left:     horizontal radius 60px, vertical radius 20px → flat elliptical arc
Top-right:    horizontal radius 40px, vertical radius 80px → tall elliptical arc
Bottom-right: horizontal radius 60px, vertical radius 20px → same as top-left
Bottom-left:  horizontal radius 40px, vertical radius 80px → same as top-right
```

## How Percentage Values Are Calculated

When you use percentages for border-radius, the horizontal radius is relative to the **element's width** and the vertical radius is relative to the **element's height**:

```css
/* 宽 200px 高 100px 的元素 */
.card {
  width: 200px;
  height: 100px;
  border-radius: 50%;
  /* 等同于：border-radius: 100px / 50px */
  /* 得到一个完整的椭圆 */
}
```

A perfect circle is written as `border-radius: 50%`, which works for square elements. If the element isn't square, 50% gives you an ellipse, not a circle.

## Tool Features

Open [https://anyfreetools.com/tools/border-radius](https://anyfreetools.com/tools/border-radius):

**Visual controls**: Adjust each corner's horizontal and vertical radius with sliders or by dragging control points directly, with the preview updating in real time.

**Ellipse mode**: Toggle independent horizontal/vertical control to generate slash-syntax elliptical radii, making it easy to shape organic forms by eye.

**Preset templates**: Built-in common radius combinations (circle, pill, single rounded corner, teardrop, and more)—load one with a click, then fine-tune.

**CSS code output**: Generates simplified CSS in real time, stripping redundant values (e.g., automatically merging when all four corners match), ready to copy and paste.

## Code for Common Shapes

### Circle

```css
.circle {
  width: 100px;
  height: 100px;
  border-radius: 50%;
}
```

### Capsule / Pill

```css
.pill {
  padding: 8px 20px;
  border-radius: 999px;  /* 足够大的值，自动适应高度 */
}
```

Use `999px` (or `100vmax`) instead of `50%` to avoid squared-off corners when width and height differ.

### Single Rounded Corner

```css
/* 对话气泡：左下角为尖角，其余三角有圆角 */
.bubble {
  border-radius: 20px 20px 20px 0;  /* 左上 右上 右下 左下 */
}

/* 只有上方两角圆角，如卡片顶部 */
.card-top {
  border-radius: 12px 12px 0 0;
}
```

### Leaf / Teardrop

```css
/* 叶形：对角方向圆角 */
.leaf {
  width: 100px;
  height: 100px;
  border-radius: 0 50% 0 50%;
}

/* 水滴形（需要旋转） */
.teardrop {
  width: 80px;
  height: 80px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
}
```

### Organic Shapes (Blob)

```css
/* 不对称椭圆圆角，形成有机感 */
.blob {
  border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
  animation: morph 8s ease-in-out infinite;
}

@keyframes morph {
  0%, 100% {
    border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
  }
  50% {
    border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%;
  }
}
```

The morphing blob effect you often see in decorative elements is nothing more than a transition animation on border-radius.

## Development Scenarios

### Radius Tokens in Design Systems

Most design systems define radius values as tokens so they can be managed globally:

```css
:root {
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
}

.btn {
  border-radius: var(--radius-md);
}

.badge {
  border-radius: var(--radius-full);
}
```

Tailwind CSS class names like `rounded-sm`/`rounded-md`/`rounded-full` are built on exactly this pattern.

### Tailwind Radius Cheat Sheet

Default values in Tailwind CSS v3:

```
rounded-none   → border-radius: 0
rounded-sm     → border-radius: 0.125rem (2px)
rounded        → border-radius: 0.25rem  (4px)
rounded-md     → border-radius: 0.375rem (6px)
rounded-lg     → border-radius: 0.5rem   (8px)
rounded-xl     → border-radius: 0.75rem  (12px)
rounded-2xl    → border-radius: 1rem     (16px)
rounded-3xl    → border-radius: 1.5rem   (24px)
rounded-full   → border-radius: 9999px
```

Per-corner control: `rounded-tl-lg` (top-left), `rounded-tr-lg` (top-right), `rounded-br-lg` (bottom-right), `rounded-bl-lg` (bottom-left).

### Dynamic Radii in React

```tsx
interface CardProps {
  radius?: "sm" | "md" | "lg" | "full";
  children: React.ReactNode;
}

const radiusMap = {
  sm: "4px",
  md: "8px",
  lg: "16px",
  full: "9999px",
};

function Card({ radius = "md", children }: CardProps) {
  return (
    <div style={{ borderRadius: radiusMap[radius] }}>
      {children}
    </div>
  );
}
```

### Using clip-path When border-radius Falls Short

When border-radius can't get you there (concave shapes, jagged edges), reach for `clip-path`:

```css
/* border-radius 只能做凸形圆角 */
/* clip-path 可以做任意多边形 */
.arrow {
  clip-path: polygon(0 0, 80% 0, 100% 50%, 80% 100%, 0 100%);
}
```

The difference: border-radius modifies the box model's border, while clip-path is a clipping region—they behave differently with backgrounds and shadows.

## Compatibility and Caveats

**Fully supported in modern browsers**: The complete border-radius syntax (including the slash-based elliptical syntax) works in Chrome 5+, Firefox 4+, Safari 5+, and IE 9+, no prefixes needed.

**border-radius and overflow**: After adding border-radius to a parent element, you also need `overflow: hidden` for children (like images) to be clipped to the rounded corners:

```css
.card {
  border-radius: 12px;
  overflow: hidden;  /* 缺少这行，内部图片会超出圆角 */
}
```

**transform and the border-radius rendering layer**: For elements with frequently animated radii, `will-change: border-radius` hints the browser to create a separate compositing layer, keeping repaints from hurting performance. But `will-change` continuously consumes extra memory, so only add it when the animation is about to fire (e.g., on hover or via JS) and remove it afterward:

```css
/* 推荐：仅在 hover 时启用 */
.blob:hover {
  will-change: border-radius;
}
```

**border-radius and background-clip**: When an element has a border, `background-clip` controls whether the background extends under the border or stays within the padding area, which affects how the rounded corners look:

```css
.card {
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  background-clip: padding-box;  /* 背景不延伸到 border 下 */
}
```

---

The full border-radius syntax (dual horizontal/vertical axes, percentage-relative calculations) genuinely isn't intuitive at first. Dragging the controls in the [online Border Radius generator](https://anyfreetools.com/tools/border-radius) while watching the generated CSS is the fastest way to internalize how this property works.

---

**Tool Guide Series**

[Tool Guide 1: Online Image Compression](/en/posts/blog084_image-compress-guide/) | [Tool Guide #2: Online JSON Formatter](/en/posts/blog085_json-formatter-guide/) | [Tool Guide #3: Online Regex Tester](/en/posts/blog086_regex-tester-guide/) | [Tool Guide 4: QR Code Generator](/en/posts/blog089_qrcode-generator-guide/) | [Tool Guide 5: Base64 Encoder/Decoder](/en/posts/blog090_base64-tool-guide/) | [Tool Guide 6: Online JWT Decoder](/en/posts/blog092_jwt-decoder-guide/) | [Tool Guide 7: Unix Timestamp Converter](/en/posts/blog094_timestamp-tool-guide/) | [Tool Guide 8: Online Password Generator](/en/posts/blog095_password-generator-guide/) | [Tool Guide 9: URL Encoder/Decoder](/en/posts/blog096_url-encoder-guide/) | [Tool Guide 10: Online Hash Generator](/en/posts/blog097_hash-generator-guide/) | [Tool Guide 11: JSON to TypeScript Type Generator](/en/posts/blog099_json-to-typescript-guide/) | [Tool Guide 12: Online Cron Expression Parser](/en/posts/blog100_cron-parser-guide/) | [Tool Guide 13: Online Color Converter](/en/posts/blog102_color-converter-guide/) | [Tool Guide 14: Online SQL Formatter](/en/posts/blog103_sql-formatter-guide/) | [Tool Guide 15: Online Markdown Live Preview Tool](/en/posts/blog104_markdown-preview-guide/) | [Tool Guide 16: Online JSON Diff Tool](/en/posts/blog106_json-diff-guide/) | [Tool Guide 17: AI Token Counter](/en/posts/blog107_token-counter-guide/) | [Tool Guide 18: Online OCR Text Recognition](/en/posts/blog108_ocr-tool-guide/) | [Tool Guide 19: Online CSS Gradient Generator](/en/posts/blog110_css-gradient-guide/) | [Tool Guide 20 - Online UUID Generator](/en/posts/blog111_uuid-generator-guide/) | [Tool Guide 21: HTML to JSX Online Converter](/en/posts/blog112_html-to-jsx-guide/) | [Tool Guide 22: Online WebSocket Tester](/en/posts/blog114_websocket-tester-guide/) | [Tool Guide 23: Free Online CSV to JSON Converter](/en/posts/blog116_csv-to-json-guide/) | [Tool Guide 24: Online CSS Box Shadow Generator](/en/posts/blog118_box-shadow-guide/) | [Tool Guide 25: Online Favicon Generator](/en/posts/blog120_favicon-generator-guide/) | [Tool Guide 26: Online Subnet Calculator](/en/posts/blog121_subnet-calculator-guide/) | [Tool Guide 27: Online Mock Data Generator](/en/posts/blog123_mock-data-guide/) | [Tool Guide 28: Online TOTP Code Generator](/en/posts/blog125_totp-generator-guide/) | [Tool Guide 29: Online AES Encryption & Decryption Tool](/en/posts/blog127_aes-encryption-guide/) | [Tool Guide 30: Online Glassmorphism Generator](/en/posts/blog128_glassmorphism-guide/) | [Tool Guide 31: Online IP Address Lookup Tool](/en/posts/blog130_ip-lookup-guide/) | [Tool Guide 32: Online RSA Key Generator](/en/posts/blog131_rsa-keygen-guide/) | [Tool Guide 33: Online Color Contrast Checker](/en/posts/blog133_color-contrast-guide/) | [Tool Guide 37: Online Unit Converter](/en/posts/blog132_unit-converter-guide/) | [Tool Guide 38: Online User-Agent Parser](/en/posts/blog135_user-agent-guide/) | [Tool Guide 39: Online Code Minifier](/en/posts/blog136_code-minifier-guide/)
