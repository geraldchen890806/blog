---
author: 陈广亮
pubDatetime: 2026-04-18T09:00:00+08:00
title: 工具指南33-在线颜色对比度检查器
slug: blog133_color-contrast-guide
featured: false
draft: true
reviewed: false
approved: false
tags:
  - 工具指南
  - 工具
  - 前端
description: 介绍在线颜色对比度检查器的使用方法，拆解 WCAG 2.1 对比度标准和计算原理，帮助前端开发者和设计师快速验证配色方案的可访问性，附 CSS 和 JavaScript 代码示例。
---

你选了一个看起来不错的灰色文字配色，在自己的屏幕上完全没问题——但用户在强光环境下、用老旧屏幕或者轻度视力障碍时，可能完全看不清。这不是小众问题，全球约有 2.53 亿视力障碍人口，另有约 3 亿色觉缺陷者。

颜色对比度是可访问性设计里最可量化的一项指标。[在线颜色对比度检查器](https://anyfreetools.com/tools/color-contrast) 可以让你在几秒内验证任意配色组合是否符合 WCAG 标准，不需要记住公式，也不需要安装任何工具。

## WCAG 对比度标准

WCAG（Web Content Accessibility Guidelines）是 W3C 制定的网页内容可访问性指南，对比度要求在 WCAG 2.1 的 SC 1.4.3 和 SC 1.4.6 中定义：

| 等级 | 普通文本 | 大号文本 | UI 组件/图形 |
|------|---------|---------|------------|
| AA（最低合规） | 4.5:1 | 3:1 | 3:1 |
| AAA（增强） | 7:1 | 4.5:1 | — |

**大号文本**的定义：正常字重 18pt（约 24px）以上，或粗体 14pt（约 18.67px）以上。

实际工作中，**AA 是法律合规的最低门槛**（美国 ADA、欧盟 EAA 等法规均引用 WCAG AA），大多数产品以此为目标。AAA 适用于医疗、政务等对可读性要求极高的场景。

## 对比度计算原理

对比度不是简单的颜色深浅比较，而是基于人眼感知亮度的相对计算。

**第一步：计算相对亮度（Relative Luminance）**

将 RGB 颜色的每个通道值先归一化到 0-1，再做 gamma 矫正：

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

**第二步：计算对比度比**

```javascript
function getContrastRatio(l1, l2) {
  // l1 是较亮颜色的亮度，l2 是较暗颜色的亮度
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
```

加 0.05 是为了处理纯黑色（亮度 0）的边界情况，也是 WCAG 规范要求的。

**示例**：黑色 `#000000` 和白色 `#ffffff` 的对比度是 21:1，是理论最大值。纯白背景上 `#777777` 灰色文字的对比度约为 4.48:1，刚好低于 AA 标准（4.5:1），不合格。

## 工具使用方法

打开 [https://anyfreetools.com/tools/color-contrast](https://anyfreetools.com/tools/color-contrast)：

**输入颜色**：支持十六进制（`#3b82f6`）、RGB（`rgb(59, 130, 246)`）和 HSL 格式，也可以直接用颜色拾取器选色。

**实时预览**：页面会立即显示文字在背景色上的效果，同时给出对比度数值和 AA/AAA 的通过状态。

**批量检查**：可以同时检查多个前景色和背景色的组合，适合验证整套设计系统的配色。

**建议颜色**：如果当前颜色不达标，工具会自动推荐最近的合规颜色——调整幅度最小、视觉效果最接近原始配色。

## 常见配色问题

以下是前端项目里最常见的对比度问题：

**浅灰色占位文字**：表单的 placeholder 文字通常用 `#999` 或 `#aaa`，在白色背景下对比度约 2.85:1，远低于 AA 要求。

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

**禁用状态按钮**：禁用按钮故意降低对比度来表示不可用，但 WCAG 2.1 明确豁免了"纯装饰性"和"不可交互"组件的对比度要求，所以禁用按钮可以低于 4.5:1。

**渐变背景上的文字**：渐变背景的对比度在不同位置不同，需要在最低对比度的位置验证，或者给文字加阴影/半透明背景层来保证可读性。

**品牌色限制**：很多设计团队被要求严格使用品牌色，但品牌色往往是在市场推广中选出的，不一定考虑了对比度。这时候可以用工具的"建议颜色"功能找到视觉最接近、同时符合标准的替代色。

## 代码集成：自动化对比度检查

### 在 CI/CD 中检查 CSS

用 [axe-core](https://github.com/dequelabs/axe-core) 在测试中自动扫描对比度问题：

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

### 运行时对比度检查

在设计系统中给颜色 token 加对比度验证：

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

### Tailwind CSS 配色参考

Tailwind 的调色板已经按亮度分级，可以直接参考以下规律：

```
白色背景上：
- text-gray-400 (#9ca3af) → 2.5:1 ❌
- text-gray-500 (#6b7280) → 4.8:1 ✅ AA
- text-gray-600 (#4b5563) → 7.6:1 ✅ AAA
- text-gray-700 (#374151) → 10.3:1 ✅ AAA

蓝色背景 bg-blue-500 (#3b82f6) 上：
- text-white (#ffffff) → 3.7:1 ✅ 大号文本 AA，小号文本 ❌
- text-blue-900 (#1e3a8a) → 4.8:1 ✅ AA（大小号文本均通过）
```

这个规律的意思是：在 `bg-blue-500` 上写小号白色文字不合规，用更深的蓝色文字或者换更深的背景色。

## 设计系统中的对比度管理

如果你在维护设计系统，建议把对比度检查纳入 token 定义阶段，而不是等到组件开发时才发现问题：

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

每次更新 token 时用工具验证一遍，防止设计迭代中对比度悄悄降级。

---

颜色对比度不是细枝末节的优化，是内容能否被读到的基础。4.5:1 这个数字背后是大量的视觉感知研究，记不住公式没关系，用 [在线颜色对比度检查器](https://anyfreetools.com/tools/color-contrast) 输入颜色即可，几秒钟给出结论。

---

**工具指南系列**

[工具指南1-在线图片压缩](https://chenguangliang.com/posts/blog084_image-compress-guide/) | [工具指南2-JSON格式化](https://chenguangliang.com/posts/blog085_json-formatter-guide/) | [工具指南3-正则测试](https://chenguangliang.com/posts/blog086_regex-tester-guide/) | [工具指南4-二维码生成](https://chenguangliang.com/posts/blog089_qrcode-generator-guide/) | [工具指南5-Base64](https://chenguangliang.com/posts/blog090_base64-tool-guide/) | [工具指南6-JWT解码](https://chenguangliang.com/posts/blog092_jwt-decoder-guide/) | [工具指南7-时间戳转换](https://chenguangliang.com/posts/blog094_timestamp-tool-guide/) | [工具指南8-密码生成器](https://chenguangliang.com/posts/blog095_password-generator-guide/) | [工具指南9-URL编解码](https://chenguangliang.com/posts/blog096_url-encoder-guide/) | [工具指南10-哈希生成器](https://chenguangliang.com/posts/blog097_hash-generator-guide/) | [工具指南11-JSON转TypeScript](https://chenguangliang.com/posts/blog099_json-to-typescript-guide/) | [工具指南12-Cron解析器](https://chenguangliang.com/posts/blog100_cron-parser-guide/) | [工具指南13-颜色转换](https://chenguangliang.com/posts/blog102_color-converter-guide/) | [工具指南14-SQL格式化](https://chenguangliang.com/posts/blog103_sql-formatter-guide/) | [工具指南15-Markdown预览](https://chenguangliang.com/posts/blog104_markdown-preview-guide/) | [工具指南16-JSON对比](https://chenguangliang.com/posts/blog106_json-diff-guide/) | [工具指南17-Token计数器](https://chenguangliang.com/posts/blog107_token-counter-guide/) | [工具指南18-OCR文字识别](https://chenguangliang.com/posts/blog108_ocr-tool-guide/) | [工具指南19-CSS渐变生成器](https://chenguangliang.com/posts/blog110_css-gradient-guide/) | [工具指南20-UUID生成器](https://chenguangliang.com/posts/blog111_uuid-generator-guide/) | [工具指南21-HTML转JSX](https://chenguangliang.com/posts/blog112_html-to-jsx-guide/) | [工具指南22-WebSocket测试](https://chenguangliang.com/posts/blog114_websocket-tester-guide/) | [工具指南23-CSV转JSON](https://chenguangliang.com/posts/blog116_csv-to-json-guide/) | [工具指南24-Box Shadow生成器](https://chenguangliang.com/posts/blog118_box-shadow-guide/) | [工具指南25-Favicon生成器](https://chenguangliang.com/posts/blog120_favicon-generator-guide/) | [工具指南26-子网计算器](https://chenguangliang.com/posts/blog121_subnet-calculator-guide/) | [工具指南27-Mock数据生成器](https://chenguangliang.com/posts/blog123_mock-data-guide/) | [工具指南28-TOTP验证码](https://chenguangliang.com/posts/blog125_totp-generator-guide/) | [工具指南29-AES加密](https://chenguangliang.com/posts/blog127_aes-encryption-guide/) | [工具指南30-毛玻璃效果](https://chenguangliang.com/posts/blog128_glassmorphism-guide/) | [工具指南31-IP地址查询](https://chenguangliang.com/posts/blog130_ip-lookup-guide/) | [工具指南32-RSA密钥生成器](https://chenguangliang.com/posts/blog131_rsa-keygen-guide/)
