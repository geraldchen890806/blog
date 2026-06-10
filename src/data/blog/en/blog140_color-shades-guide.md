---
author: Gerald Chen
pubDatetime: 2026-04-21T10:00:00+08:00
title: "Tool Guide 41: Online Color Shades Generator"
slug: blog140_color-shades-guide
featured: false
draft: true
reviewed: false
approved: false
tags:
  - 工具指南
  - 工具
  - 前端
  - CSS
description: "How to use the online color shades generator: a breakdown of the HSL color space and how light/dark gradients are produced, with practical code examples for design system color tokens, custom Tailwind palettes, and CSS variables."
---

A designer picks a primary color, `#3b82f6`, and now the developer needs to derive a full scale from it — from nearly white to nearly black — to cover button hover states, disabled states, background fills, text colors, and more. Tweaking lightness and saturation by hand is slow, and keeping the results visually consistent is even harder.

[The online color shades generator](https://anyfreetools.com/tools/color-shades) takes any color and automatically produces a coordinated light-to-dark scale, from 50 all the way to 950, ready to copy as CSS variables or a Tailwind config.

## How Shade Generation Works

### The HSL Color Space

Colors can be represented in many ways, but for generating shades the most common starting point is HSL (Hue, Saturation, Lightness):

- **H (Hue)**: 0-360°, the position on the color wheel — red at 0°, green at 120°, blue at 240°
- **S (Saturation)**: 0-100%, where 0% is gray and 100% is the most vivid version of the color
- **L (Lightness)**: 0-100%, where 0% is pure black, 100% is pure white, and 50% is the "standard" color

`#3b82f6` in HSL is `hsl(217, 91%, 60%)` — a blue hue, highly saturated, slightly on the bright side.

### The Shade Algorithm

The core idea is to **keep the hue fixed and adjust lightness and saturation proportionally**:

```javascript
function generateShades(baseColor) {
  const hsl = hexToHsl(baseColor);
  const { h, s, l } = hsl;

  // 定义 10 个色阶的明度和饱和度调整比例
  const stops = [
    { name: "50",  lightness: 97, saturation: s * 0.3 },
    { name: "100", lightness: 94, saturation: s * 0.4 },
    { name: "200", lightness: 86, saturation: s * 0.6 },
    { name: "300", lightness: 74, saturation: s * 0.75 },
    { name: "400", lightness: 62, saturation: s * 0.88 },
    { name: "500", lightness: l,  saturation: s },        // 基准色
    { name: "600", lightness: l * 0.85, saturation: s * 1.05 },
    { name: "700", lightness: l * 0.7,  saturation: s * 1.1 },
    { name: "800", lightness: l * 0.55, saturation: s * 1.08 },
    { name: "900", lightness: l * 0.4,  saturation: s * 1.0 },
    { name: "950", lightness: l * 0.3,  saturation: s * 0.9 },
  ];

  return stops.map(stop => ({
    name: stop.name,
    color: hslToHex(h, stop.saturation, stop.lightness),
  }));
}
```

Real implementations are more nuanced than this. On the light end (50-200), lightness uses **absolute values** (97, 94, 86…) rather than relative ratios, because no matter how dark the base color is, the light shades need to approach white to maintain a consistent visual hierarchy. On the dark end (600-950), relative ratios are used instead, to preserve the original color's sense of depth. Tailwind CSS's palette was hand-calibrated following essentially this logic.

### The Perceptual Uniformity Problem

Linearly interpolating lightness produces a scale that looks uneven — the human eye is more sensitive to changes at the light end, so the same lightness gap looks like a bigger jump among the light shades. High-quality shade generators interpolate in the **Oklch or Lab color spaces**, both of which are much closer to human perception:

```javascript
// 在 Oklch 空间插值（感知更均匀）
import { oklch, formatHex } from "culori";

function generatePerceptualShade(baseHex, targetLightness) {
  const color = oklch(baseHex);
  // 极端明度时彩度趋近 0：l 越靠近 0 或 1，彩度越低
  const chromaScale = 1 - Math.pow(Math.abs(targetLightness * 2 - 1), 2);
  return formatHex({
    mode: "oklch",
    l: targetLightness,
    c: color.c * chromaScale,
    h: color.h,
  });
}
```

The `l` component in Oklch is perceptually uniform lightness: equal differences in `l` look like roughly equal visual steps.

## Tool Features

Open [https://anyfreetools.com/tools/color-shades](https://anyfreetools.com/tools/color-shades):

**Color input**: accepts HEX, RGB, and HSL formats, or pick a color with the built-in color picker.

**Full scale preview**: automatically generates all 11 steps from 50 to 950, each showing a swatch and its HEX value, so you can see at a glance whether the light-to-dark distribution feels coherent.

**Export formats**:
- CSS variables (`--color-primary-500: #3b82f6`)
- Tailwind config object
- SCSS variables
- JSON, for plugging into design system tooling

**Multi-color comparison**: generate several scales at once (e.g. primary, secondary, danger) and view them side by side to check the visual consistency of the whole palette.

## Code in Practice

### Design System CSS Variables

Drop the generated scale straight into CSS custom properties, available globally:

```css
:root {
  /* 主色（蓝色）*/
  --color-primary-50:  #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-200: #bfdbfe;
  --color-primary-300: #93c5fd;
  --color-primary-400: #60a5fa;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;
  --color-primary-800: #1e40af;
  --color-primary-900: #1e3a8a;
  --color-primary-950: #172554;
}
```

When using them, pick shades by semantic role instead of hard-coding color values:

```css
.btn-primary {
  background: var(--color-primary-500);
  border-color: var(--color-primary-600);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-600);
}

.btn-primary:disabled {
  background: var(--color-primary-200);
  color: var(--color-primary-400);
}
```

### Custom Tailwind Palette

Wire the generated scale into your Tailwind config:

```javascript
// tailwind.config.js（Tailwind v3 写法；v4 使用 CSS-based 配置，参考官方文档）
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50:  "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
      },
    },
  },
};
```

After that, just use class names like `bg-primary-500`, `text-primary-700`, and `border-primary-300`.

### Generating Shades Dynamically in JavaScript

If you need to generate shades at runtime from a user-chosen primary color (e.g. a theme customization feature):

```typescript
import { formatHex, oklch } from "culori";

interface ColorShade {
  name: string;
  hex: string;
}

function generateColorShades(baseHex: string): ColorShade[] {
  const base = oklch(baseHex);  // oklch() 直接接受字符串，无需先 parse()
  if (!base) throw new Error(`Invalid color: ${baseHex}`);

  const lightnessStops = [
    { name: "50",  l: 0.975 },
    { name: "100", l: 0.950 },
    { name: "200", l: 0.900 },
    { name: "300", l: 0.825 },
    { name: "400", l: 0.730 },
    { name: "500", l: base.l },  // 保持原色
    { name: "600", l: base.l * 0.88 },
    { name: "700", l: base.l * 0.75 },
    { name: "800", l: base.l * 0.62 },
    { name: "900", l: base.l * 0.50 },
    { name: "950", l: base.l * 0.40 },
  ];

  return lightnessStops.map(({ name, l }) => {
    const clampedL = Math.max(0, Math.min(1, l));
    // 极端明度时降低彩度，防止产生超出色域的颜色
    const chromaScale = 1 - Math.pow(Math.abs(clampedL * 2 - 1), 2);
    return {
      name,
      hex: formatHex({
        mode: "oklch",
        l: clampedL,
        c: (base.c ?? 0) * chromaScale,
        h: base.h ?? 0,
      }) ?? "#000000",
    };
  });
}

// 生成 CSS 变量字符串
function shadesToCssVars(shades: ColorShade[], prefix = "color-primary"): string {
  return shades
    .map(s => `  --${prefix}-${s.name}: ${s.hex};`)
    .join("\n");
}

// 动态注入到 :root
function applyColorShades(baseHex: string, prefix = "color-primary"): void {
  const shades = generateColorShades(baseHex);
  const cssVars = shadesToCssVars(shades, prefix);
  let style = document.getElementById("dynamic-color-vars");
  if (!style) {
    style = document.createElement("style");
    style.id = "dynamic-color-vars";
    document.head.appendChild(style);
  }
  style.textContent = `:root {\n${cssVars}\n}`;
}

// 使用
applyColorShades("#3b82f6");           // 蓝色主题
applyColorShades("#10b981", "color-success");  // 绿色成功色
```

### React Theme Switcher Component

```tsx
import { useState } from "react";

function ThemeColorPicker() {
  const [baseColor, setBaseColor] = useState("#3b82f6");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setBaseColor(color);
    applyColorShades(color);  // 来自上面的函数
  };

  return (
    <div>
      <label htmlFor="theme-color">主题色</label>
      <input
        id="theme-color"
        type="color"
        value={baseColor}
        onChange={handleChange}
      />
      <span style={{ color: "var(--color-primary-500)" }}>
        预览文字颜色
      </span>
    </div>
  );
}
```

## Guidelines for Using the Scale

A generated scale needs usage conventions — otherwise it degenerates into a grab bag of colors instead of a design system:

**Map shades to use cases** (using a blue primary as the example):

| Use case | Recommended shades | Notes |
|------|----------|------|
| Primary button background | 500-600 | High saturation, visually prominent |
| Primary button hover | 600-700 | One step darker than the default state |
| Link text | 600-700 | Meets contrast requirements on a white background |
| Light background fill | 50-100 | Distinguishes sections without stealing attention |
| Borders / dividers | 200-300 | Present but not intrusive |
| Disabled state | 200-300 (background) + 400 (text) | Visibly reduced visual weight |
| Dark text | 700-900 | High-contrast text |

**Dark mode adaptation**: the simplest approach is to flip the scale — light mode uses a 500 background with white text; dark mode switches to an 800-900 background with 100-200 text. Note that a straight inversion doesn't always meet contrast requirements; rigorous design systems (such as Radix Colors) generate a separate scale for dark mode to get more accurate visual results.

---

A good color scale isn't a handful of similar-looking colors picked at random — it's a set of colors that's perceptually evenly distributed and functionally covers every use case. Feed your primary color into the [online color shades generator](https://anyfreetools.com/tools/color-shades) and get the full 11-step scale in seconds; export it as CSS variables or a Tailwind config and drop it straight into your project.

---

**Tool Guide Series**

[Tool Guide 1: Online Image Compression](/en/posts/blog084_image-compress-guide/) | [Tool Guide #2: Online JSON Formatter](/en/posts/blog085_json-formatter-guide/) | [Tool Guide #3: Online Regex Tester](/en/posts/blog086_regex-tester-guide/) | [Tool Guide 4: QR Code Generator](/en/posts/blog089_qrcode-generator-guide/) | [Tool Guide 5: Base64 Encoder/Decoder](/en/posts/blog090_base64-tool-guide/) | [Tool Guide 6: Online JWT Decoder](/en/posts/blog092_jwt-decoder-guide/) | [Tool Guide 7: Unix Timestamp Converter](/en/posts/blog094_timestamp-tool-guide/) | [Tool Guide 8: Online Password Generator](/en/posts/blog095_password-generator-guide/) | [Tool Guide 9: URL Encoder/Decoder](/en/posts/blog096_url-encoder-guide/) | [Tool Guide 10: Online Hash Generator](/en/posts/blog097_hash-generator-guide/) | [Tool Guide 11: JSON to TypeScript Type Generator](/en/posts/blog099_json-to-typescript-guide/) | [Tool Guide 12: Online Cron Expression Parser](/en/posts/blog100_cron-parser-guide/) | [Tool Guide 13: Online Color Converter](/en/posts/blog102_color-converter-guide/) | [Tool Guide 14: Online SQL Formatter](/en/posts/blog103_sql-formatter-guide/) | [Tool Guide 15: Online Markdown Live Preview Tool](/en/posts/blog104_markdown-preview-guide/) | [Tool Guide 16: Online JSON Diff Tool](/en/posts/blog106_json-diff-guide/) | [Tool Guide 17: AI Token Counter](/en/posts/blog107_token-counter-guide/) | [Tool Guide 18: Online OCR Text Recognition](/en/posts/blog108_ocr-tool-guide/) | [Tool Guide 19: Online CSS Gradient Generator](/en/posts/blog110_css-gradient-guide/) | [Tool Guide 20 - Online UUID Generator](/en/posts/blog111_uuid-generator-guide/) | [Tool Guide 21: HTML to JSX Online Converter](/en/posts/blog112_html-to-jsx-guide/) | [Tool Guide 22: Online WebSocket Tester](/en/posts/blog114_websocket-tester-guide/) | [Tool Guide 23: Free Online CSV to JSON Converter](/en/posts/blog116_csv-to-json-guide/) | [Tool Guide 24: Online CSS Box Shadow Generator](/en/posts/blog118_box-shadow-guide/) | [Tool Guide 25: Online Favicon Generator](/en/posts/blog120_favicon-generator-guide/) | [Tool Guide 26: Online Subnet Calculator](/en/posts/blog121_subnet-calculator-guide/) | [Tool Guide 27: Online Mock Data Generator](/en/posts/blog123_mock-data-guide/) | [Tool Guide 28: Online TOTP Code Generator](/en/posts/blog125_totp-generator-guide/) | [Tool Guide 29: Online AES Encryption & Decryption Tool](/en/posts/blog127_aes-encryption-guide/) | [Tool Guide 30: Online Glassmorphism Generator](/en/posts/blog128_glassmorphism-guide/) | [Tool Guide 31: Online IP Address Lookup Tool](/en/posts/blog130_ip-lookup-guide/) | [Tool Guide 32: Online RSA Key Generator](/en/posts/blog131_rsa-keygen-guide/) | [Tool Guide 33: Online Color Contrast Checker](/en/posts/blog133_color-contrast-guide/) | [Tool Guide 37: Online Unit Converter](/en/posts/blog132_unit-converter-guide/) | [Tool Guide 38: Online User-Agent Parser](/en/posts/blog135_user-agent-guide/) | [Tool Guide 39: Online Code Minifier](/en/posts/blog136_code-minifier-guide/) | [Tool Guide 40 - Online CSS Border Radius Generator](/en/posts/blog137_border-radius-guide/)
