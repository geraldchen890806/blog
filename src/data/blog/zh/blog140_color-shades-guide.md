---
author: 陈广亮
pubDatetime: 2026-04-21T10:00:00+08:00
title: 工具指南41-在线颜色色阶生成器
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
description: 介绍在线颜色色阶生成器的使用方法，拆解 HSL 色彩空间和明暗梯度的生成原理，附设计系统颜色 token、Tailwind 自定义调色板、CSS 变量的实战代码示例。
---

设计师选了一个主色 `#3b82f6`，开发者需要从这个颜色出发，生成一套从极浅到极深的完整色阶——用于按钮 hover 状态、禁用态、背景填充、文字颜色等不同场景。手动调整颜色的明度和饱和度，既耗时又难以保持视觉一致性。

[在线颜色色阶生成器](https://anyfreetools.com/tools/color-shades) 输入任意颜色，自动生成一套协调的明暗梯度，从 50 到 950 的完整色阶，直接复制为 CSS 变量或 Tailwind 配置。

## 色阶生成的原理

### HSL 色彩空间

颜色有多种表示方式，但生成色阶最常用 HSL（Hue 色相、Saturation 饱和度、Lightness 明度）：

- **H（色相）**：0-360°，对应色轮上的位置，红色 0°、绿色 120°、蓝色 240°
- **S（饱和度）**：0-100%，0% 是灰色，100% 是最鲜艳的颜色
- **L（明度）**：0-100%，0% 是纯黑，100% 是纯白，50% 是"标准"颜色

`#3b82f6` 对应 HSL 是 `hsl(217, 91%, 60%)`——蓝色色相，高饱和度，中等偏亮。

### 色阶算法

生成色阶的核心思路是**固定色相，按比例调整明度和饱和度**：

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

实际实现比这更复杂——亮色端（50-200）明度用**绝对值**（97、94、86…）而非相对比例，是因为不管基准色有多深，浅色端都需要接近白色，保证一致的视觉层次；暗色端（600-950）用相对比例，是为了保留原色的相对深度感。Tailwind CSS 的调色板就是按照类似逻辑手工校准后得到的。

### 感知均匀性问题

纯粹按明度线性插值会导致视觉上不均匀——人眼对亮色端的变化更敏感，同样的明度差距在浅色区间看起来变化更大。高质量的色阶生成工具会在 **Oklch 或 Lab 色彩空间**里做插值，这两个空间更接近人眼感知：

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

Oklch 的 `l` 分量是感知均匀的亮度，相同的 `l` 差值在视觉上看起来变化量相近。

## 工具功能

打开 [https://anyfreetools.com/tools/color-shades](https://anyfreetools.com/tools/color-shades)：

**输入颜色**：支持 HEX、RGB、HSL 格式，也可以用颜色拾取器选色。

**完整色阶预览**：自动生成 50 到 950 的 11 档色阶，每档显示色块和对应的 HEX 值，可以直观看到整套颜色的明暗分布是否协调。

**格式导出**：
- CSS 变量（`--color-primary-500: #3b82f6`）
- Tailwind 配置对象
- SCSS 变量
- JSON 格式，便于接入设计系统工具

**多色对比**：同时生成多套色阶（如主色、辅助色、危险色），对比排列检查整体调色板的视觉一致性。

## 实战代码

### 设计系统 CSS 变量

生成的色阶直接写入 CSS 自定义属性，全局可用：

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

使用时按语义选择色阶，而不是直接写颜色值：

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

### Tailwind 自定义调色板

把生成的色阶接入 Tailwind 配置：

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

之后直接使用 `bg-primary-500`、`text-primary-700`、`border-primary-300` 等类名。

### JavaScript 动态生成色阶

如果需要在运行时根据用户选择的主色动态生成色阶（如主题定制功能）：

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

### React 主题切换组件

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

## 色阶使用规范

生成色阶后，需要遵循一定的使用规范，否则色阶会变成颜色的"调色盘"而不是设计系统：

**按场景对应色阶**（以主色蓝色为例）：

| 场景 | 推荐色阶 | 说明 |
|------|----------|------|
| 主按钮背景 | 500-600 | 饱和度高，视觉突出 |
| 主按钮 hover | 600-700 | 比默认态深一档 |
| 链接文字 | 600-700 | 在白色背景上满足对比度要求 |
| 轻背景填充 | 50-100 | 区分区块，不喧宾夺主 |
| 边框/分割线 | 200-300 | 有存在感但不突兀 |
| 禁用态 | 200-300 (背景) + 400 (文字) | 明显降低视觉权重 |
| 深色文字 | 700-900 | 高对比度文字 |

**暗色模式适配**：最简单的方案是反向选取色阶——亮色模式用 500 背景加白色文字，暗色模式改用 800-900 背景加 100-200 文字。注意直接反转不总能保证对比度达标，严格的设计系统（如 Radix Colors）会为暗色模式单独生成一套色阶，以获得更准确的视觉效果。

---

一套好的色阶不是随机选几个相近的颜色，而是在感知上均匀分布、功能上覆盖所有使用场景的颜色集合。用 [在线颜色色阶生成器](https://anyfreetools.com/tools/color-shades) 输入主色，几秒内得到完整的 11 档色阶；导出 CSS 变量或 Tailwind 配置，直接接入项目。

---

**工具指南系列**

[工具指南1-在线图片压缩](https://chenguangliang.com/posts/blog084_image-compress-guide/) | [工具指南2-JSON格式化](https://chenguangliang.com/posts/blog085_json-formatter-guide/) | [工具指南3-正则测试](https://chenguangliang.com/posts/blog086_regex-tester-guide/) | [工具指南4-二维码生成](https://chenguangliang.com/posts/blog089_qrcode-generator-guide/) | [工具指南5-Base64](https://chenguangliang.com/posts/blog090_base64-tool-guide/) | [工具指南6-JWT解码](https://chenguangliang.com/posts/blog092_jwt-decoder-guide/) | [工具指南7-时间戳转换](https://chenguangliang.com/posts/blog094_timestamp-tool-guide/) | [工具指南8-密码生成器](https://chenguangliang.com/posts/blog095_password-generator-guide/) | [工具指南9-URL编解码](https://chenguangliang.com/posts/blog096_url-encoder-guide/) | [工具指南10-哈希生成器](https://chenguangliang.com/posts/blog097_hash-generator-guide/) | [工具指南11-JSON转TypeScript](https://chenguangliang.com/posts/blog099_json-to-typescript-guide/) | [工具指南12-Cron解析器](https://chenguangliang.com/posts/blog100_cron-parser-guide/) | [工具指南13-颜色转换](https://chenguangliang.com/posts/blog102_color-converter-guide/) | [工具指南14-SQL格式化](https://chenguangliang.com/posts/blog103_sql-formatter-guide/) | [工具指南15-Markdown预览](https://chenguangliang.com/posts/blog104_markdown-preview-guide/) | [工具指南16-JSON对比](https://chenguangliang.com/posts/blog106_json-diff-guide/) | [工具指南17-Token计数器](https://chenguangliang.com/posts/blog107_token-counter-guide/) | [工具指南18-OCR文字识别](https://chenguangliang.com/posts/blog108_ocr-tool-guide/) | [工具指南19-CSS渐变生成器](https://chenguangliang.com/posts/blog110_css-gradient-guide/) | [工具指南20-UUID生成器](https://chenguangliang.com/posts/blog111_uuid-generator-guide/) | [工具指南21-HTML转JSX](https://chenguangliang.com/posts/blog112_html-to-jsx-guide/) | [工具指南22-WebSocket测试](https://chenguangliang.com/posts/blog114_websocket-tester-guide/) | [工具指南23-CSV转JSON](https://chenguangliang.com/posts/blog116_csv-to-json-guide/) | [工具指南24-Box Shadow生成器](https://chenguangliang.com/posts/blog118_box-shadow-guide/) | [工具指南25-Favicon生成器](https://chenguangliang.com/posts/blog120_favicon-generator-guide/) | [工具指南26-子网计算器](https://chenguangliang.com/posts/blog121_subnet-calculator-guide/) | [工具指南27-Mock数据生成器](https://chenguangliang.com/posts/blog123_mock-data-guide/) | [工具指南28-TOTP验证码](https://chenguangliang.com/posts/blog125_totp-generator-guide/) | [工具指南29-AES加密](https://chenguangliang.com/posts/blog127_aes-encryption-guide/) | [工具指南30-毛玻璃效果](https://chenguangliang.com/posts/blog128_glassmorphism-guide/) | [工具指南31-IP地址查询](https://chenguangliang.com/posts/blog130_ip-lookup-guide/) | [工具指南32-RSA密钥生成器](https://chenguangliang.com/posts/blog131_rsa-keygen-guide/) | [工具指南33-颜色对比度](https://chenguangliang.com/posts/blog133_color-contrast-guide/) | [工具指南37-单位转换器](https://chenguangliang.com/posts/blog132_unit-converter-guide/) | [工具指南38-User-Agent解析器](https://chenguangliang.com/posts/blog135_user-agent-guide/) | [工具指南39-代码压缩工具](https://chenguangliang.com/posts/blog136_code-minifier-guide/) | [工具指南40-Border Radius生成器](https://chenguangliang.com/posts/blog137_border-radius-guide/)
