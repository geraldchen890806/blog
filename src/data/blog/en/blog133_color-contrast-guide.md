---
author: Gerald Chen
pubDatetime: 2026-04-18T09:00:00+08:00
title: "Tool Guide 33: Online Color Contrast Checker"
slug: blog133_color-contrast-guide
featured: false
draft: true
reviewed: false
approved: false
tags:
  - 工具指南
  - 工具
  - 前端
description: "A guide to the online color contrast checker: how WCAG 2.1 contrast standards work, how the ratio is calculated, and how frontend developers and designers can quickly verify the accessibility of a color scheme, with CSS and JavaScript code examples."
---

You picked a gray text color that looks fine on your own screen—but for users in bright sunlight, on aging displays, or with mild visual impairments, it may be completely unreadable. This is not a niche problem: roughly 253 million people worldwide have a visual impairment, and another 300 million or so have a color vision deficiency.

Color contrast is the most quantifiable metric in accessibility design. The [online color contrast checker](https://anyfreetools.com/tools/color-contrast) lets you verify any color combination against the WCAG standard in seconds—no formulas to memorize, nothing to install.

## WCAG Contrast Standards

WCAG (Web Content Accessibility Guidelines) is the W3C's accessibility guideline for web content. The contrast requirements are defined in WCAG 2.1 under SC 1.4.3 and SC 1.4.6:

| Level | Normal text | Large text | UI components/graphics |
|------|---------|---------|------------|
| AA (minimum compliance) | 4.5:1 | 3:1 | 3:1 |
| AAA (enhanced) | 7:1 | 4.5:1 | — |

**Large text** is defined as regular-weight text at 18pt (about 24px) or larger, or bold text at 14pt (about 18.67px) or larger.

In practice, **AA is the legal compliance floor** (regulations like the US ADA and the EU EAA all reference WCAG AA), and most products target it. AAA is for scenarios with extremely high readability demands, such as healthcare and government services.

## How Contrast Is Calculated

Contrast is not a simple light-vs-dark comparison—it's a relative calculation based on how the human eye perceives luminance.

**Step 1: Compute relative luminance**

Normalize each RGB channel to 0-1, then apply gamma correction:

```javascript
function getLinear(c) {
  // c 是 0-1 之间的归一化通道值
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function getLuminance(r, g, b) {
  // r, g, b 为 0-255
  const rL = getLinear(r / 255);
  const gL = getLinear(g / 255);
  const bL = getLinear(b / 255);
  // 使用 ITU-R BT.709 权重（人眼对绿色最敏感）
  return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
}
```

**Step 2: Compute the contrast ratio**

```javascript
function getContrastRatio(l1, l2) {
  // l1 是较亮颜色的亮度，l2 是较暗颜色的亮度
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
```

The added 0.05 handles the edge case of pure black (luminance 0), and it's required by the WCAG spec.

**Example**: black `#000000` against white `#ffffff` has a contrast ratio of 21:1—the theoretical maximum. Gray `#777777` text on a pure white background comes out to about 4.48:1, just below the AA threshold (4.5:1), so it fails.

## How to Use the Tool

Open [https://anyfreetools.com/tools/color-contrast](https://anyfreetools.com/tools/color-contrast):

**Enter colors**: supports hex (`#3b82f6`), RGB (`rgb(59, 130, 246)`), and HSL formats, or pick colors directly with the color picker.

**Live preview**: the page immediately shows how the text looks on the background color, along with the contrast ratio and AA/AAA pass status.

**Batch checking**: check multiple foreground/background combinations at once—handy for validating an entire design system's palette.

**Suggested colors**: if the current color fails, the tool automatically recommends the nearest compliant color—the smallest possible adjustment, visually closest to the original.

## Common Color Pitfalls

These are the most common contrast issues in frontend projects:

**Light gray placeholder text**: form placeholder text typically uses `#999` or `#aaa`, which is about 2.85:1 on a white background—far below the AA requirement.

```css
/* 常见的不合规写法 */
::placeholder {
  color: #999;  /* 对比度 2.85:1，不合规 */
}

/* 合规写法：至少 4.5:1 */
::placeholder {
  color: #767676;  /* 对比度 4.54:1，刚好过 AA */
}
```

**Disabled buttons**: disabled buttons deliberately reduce contrast to signal unavailability. WCAG 2.1 explicitly exempts "purely decorative" and "inactive" components from contrast requirements, so disabled buttons are allowed to fall below 4.5:1.

**Text on gradient backgrounds**: contrast on a gradient varies by position. Verify at the lowest-contrast point, or add a text shadow or a semi-transparent backing layer to guarantee readability.

**Brand color constraints**: many design teams are required to use brand colors strictly, but brand colors are usually chosen for marketing, not contrast. Use the tool's "suggested colors" feature to find an alternative that looks closest to the original while meeting the standard.

## Code Integration: Automated Contrast Checks

### Checking CSS in CI/CD

Use [axe-core](https://github.com/dequelabs/axe-core) to automatically scan for contrast issues in tests:

```javascript
// Jest + axe-core 示例
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

test("按钮颜色符合 WCAG AA", async () => {
  document.body.innerHTML = `
    <button style="background: #3b82f6; color: #ffffff;">
      提交
    </button>
  `;
  const results = await axe(document.body);
  expect(results).toHaveNoViolations();
});
```

### Runtime Contrast Checks

Add contrast validation to color tokens in your design system:

```typescript
function getContrastRatio(hex1: string, hex2: string): number {
  const getLuminance = (hex: string): number => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const toLinear = (c: number) =>
      c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

    return (
      0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
    );
  };

  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function isWCAGCompliant(
  fgColor: string,
  bgColor: string,
  level: "AA" | "AAA" = "AA",
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(fgColor, bgColor);
  if (level === "AAA") return ratio >= (isLargeText ? 4.5 : 7);
  return ratio >= (isLargeText ? 3 : 4.5);
}

// 使用示例
console.log(isWCAGCompliant("#3b82f6", "#ffffff")); // false（3.68:1）
console.log(isWCAGCompliant("#1d4ed8", "#ffffff")); // true（6.70:1）
```

### Tailwind CSS Palette Reference

Tailwind's palette is already graded by lightness, so you can rely on these patterns directly:

```
On a white background:
- text-gray-400 (#9ca3af) → 2.5:1 ❌
- text-gray-500 (#6b7280) → 4.8:1 ✅ AA
- text-gray-600 (#4b5563) → 7.6:1 ✅ AAA
- text-gray-700 (#374151) → 10.3:1 ✅ AAA

On a blue background bg-blue-500 (#3b82f6):
- text-white (#ffffff) → 3.7:1 ✅ AA for large text, ❌ for normal text
- text-blue-900 (#1e3a8a) → 4.8:1 ✅ AA (passes for both large and normal text)
```

What this means in practice: small white text on `bg-blue-500` is non-compliant—use darker blue text or switch to a darker background.

## Managing Contrast in a Design System

If you maintain a design system, bake contrast checks into the token definition stage instead of discovering problems during component development:

```json
// 设计 token 示例，记录对比度信息
{
  "color": {
    "text": {
      "primary": {
        "value": "#111827",
        "contrastOnWhite": "17.7:1",
        "wcagLevel": "AAA"
      },
      "secondary": {
        "value": "#6b7280",
        "contrastOnWhite": "4.8:1",
        "wcagLevel": "AA"
      },
      "placeholder": {
        "value": "#9ca3af",
        "contrastOnWhite": "2.5:1",
        "wcagLevel": "FAIL",
        "note": "仅用于真正的 placeholder，不可用于任何正文"
      }
    }
  }
}
```

Re-verify with the tool every time a token changes, so contrast doesn't quietly degrade as the design iterates.

---

Color contrast is not a nice-to-have polish—it's the baseline for whether your content can be read at all. The 4.5:1 number is backed by a large body of visual perception research. You don't need to memorize the formula: just paste your colors into the [online color contrast checker](https://anyfreetools.com/tools/color-contrast) and get a verdict in seconds.

---

**Tool Guide Series**

[Tool Guide 1: Online Image Compression](/en/posts/blog084_image-compress-guide/) | [Tool Guide #2: Online JSON Formatter](/en/posts/blog085_json-formatter-guide/) | [Tool Guide #3: Online Regex Tester](/en/posts/blog086_regex-tester-guide/) | [Tool Guide 4: QR Code Generator](/en/posts/blog089_qrcode-generator-guide/) | [Tool Guide 5: Base64 Encoder/Decoder](/en/posts/blog090_base64-tool-guide/) | [Tool Guide 6: Online JWT Decoder](/en/posts/blog092_jwt-decoder-guide/) | [Tool Guide 7: Unix Timestamp Converter](/en/posts/blog094_timestamp-tool-guide/) | [Tool Guide 8: Online Password Generator](/en/posts/blog095_password-generator-guide/) | [Tool Guide 9: URL Encoder/Decoder](/en/posts/blog096_url-encoder-guide/) | [Tool Guide 10: Online Hash Generator](/en/posts/blog097_hash-generator-guide/) | [Tool Guide 11: JSON to TypeScript Type Generator](/en/posts/blog099_json-to-typescript-guide/) | [Tool Guide 12: Online Cron Expression Parser](/en/posts/blog100_cron-parser-guide/) | [Tool Guide 13: Online Color Converter](/en/posts/blog102_color-converter-guide/) | [Tool Guide 14: Online SQL Formatter](/en/posts/blog103_sql-formatter-guide/) | [Tool Guide 15: Online Markdown Live Preview Tool](/en/posts/blog104_markdown-preview-guide/) | [Tool Guide 16: Online JSON Diff Tool](/en/posts/blog106_json-diff-guide/) | [Tool Guide 17: AI Token Counter](/en/posts/blog107_token-counter-guide/) | [Tool Guide 18: Online OCR Text Recognition](/en/posts/blog108_ocr-tool-guide/) | [Tool Guide 19: Online CSS Gradient Generator](/en/posts/blog110_css-gradient-guide/) | [Tool Guide 20 - Online UUID Generator](/en/posts/blog111_uuid-generator-guide/) | [Tool Guide 21: HTML to JSX Online Converter](/en/posts/blog112_html-to-jsx-guide/) | [Tool Guide 22: Online WebSocket Tester](/en/posts/blog114_websocket-tester-guide/) | [Tool Guide 23: Free Online CSV to JSON Converter](/en/posts/blog116_csv-to-json-guide/) | [Tool Guide 24: Online CSS Box Shadow Generator](/en/posts/blog118_box-shadow-guide/) | [Tool Guide 25: Online Favicon Generator](/en/posts/blog120_favicon-generator-guide/) | [Tool Guide 26: Online Subnet Calculator](/en/posts/blog121_subnet-calculator-guide/) | [Tool Guide 27: Online Mock Data Generator](/en/posts/blog123_mock-data-guide/) | [Tool Guide 28: Online TOTP Code Generator](/en/posts/blog125_totp-generator-guide/) | [Tool Guide 29: Online AES Encryption & Decryption Tool](/en/posts/blog127_aes-encryption-guide/) | [Tool Guide 30: Online Glassmorphism Generator](/en/posts/blog128_glassmorphism-guide/) | [Tool Guide 31: Online IP Address Lookup Tool](/en/posts/blog130_ip-lookup-guide/) | [Tool Guide 32: Online RSA Key Generator](/en/posts/blog131_rsa-keygen-guide/)
