---
author: Gerald Chen
pubDatetime: 2026-04-18T14:00:00+08:00
title: "Tool Guide 37: Online Unit Converter"
slug: blog132_unit-converter-guide
featured: false
draft: true
reviewed: true
approved: false
tags:
  - 工具指南
  - 工具
  - 前端
description: "From the SI system to engineering practice: a breakdown of the core logic behind unit conversion, precision pitfalls, and implementation approaches, covering length, weight, temperature, and other common categories."
---

Unit problems come up constantly in frontend work: the design spec is in px but your CSS uses rem; the backend returns bytes but the UI shows MB; in internationalized apps, US users see Fahrenheit and miles while European users see Celsius and kilometers.

Unit conversion looks trivial, but in practice it's full of traps—floating-point precision, the non-linear math of temperature, and the quirks of converting between measurement systems. This article starts from first principles, walks through the conversion logic for each unit category, and covers the unit-related issues you'll actually hit in development.

## Why Unit Conversion Isn't Just "Look Up a Factor and Multiply"

Most people think of unit conversion as looking up a coefficient and multiplying. 1 inch = 2.54 cm, 1 pound = 0.4536 kg. In real engineering, it's not that simple.

**Problem 1: Floating-point precision**

Try a simple length conversion in JavaScript:

```javascript
// 1 英里转公里
const miles = 1;
const km = miles * 1.609344;
console.log(km); // 1.609344 — 这个没问题

// 浮点精度问题的真实示例
console.log(0.1 + 0.2);  // 0.30000000000000004
console.log(1.005 * 100); // 100.49999999999999
// 在单位转换中也会遇到类似问题
```

The classic 0.1 + 0.2 !== 0.3 problem shows up everywhere in unit conversion. It gets especially bad with chained conversions (inches → centimeters → millimeters → micrometers), where errors accumulate step by step.

**Problem 2: Non-linear conversions**

Temperature conversion is not a simple multiplication:

```javascript
// 摄氏度 → 华氏度
function celsiusToFahrenheit(c) {
  return c * 9 / 5 + 32;
}

// 华氏度 → 摄氏度
function fahrenheitToCelsius(f) {
  return (f - 32) * 5 / 9;
}

// 摄氏度 → 开尔文
function celsiusToKelvin(c) {
  return c + 273.15;
}
```

There's a mix of addition and multiplication here, so a single conversion factor like the one used for length won't cut it.

**Problem 3: System differences**

The word "ounce" means completely different things for weight and volume. 1 fluid ounce (fl oz) ≈ 29.5735 ml, while 1 weight ounce (oz) ≈ 28.3495 g. And the imperial fluid ounce differs from the US one—1 imperial fl oz ≈ 28.4131 ml.

These details matter a lot in internationalized products. Mixing them up means a production bug.

## Common Unit Categories and Conversion Logic

### Length

Length is the most straightforward linear conversion. The SI system uses the meter (m) as the base, so every conversion can be done in two steps: convert to meters, then convert to the target unit.

```typescript
const lengthToMeter: Record<string, number> = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  km: 1000,
  inch: 0.0254,
  foot: 0.3048,
  yard: 0.9144,
  mile: 1609.344,
  // 中国传统单位（现代市制）
  li: 500,        // 市里
  zhang: 10 / 3,  // 丈 = 10 尺 = 10/3 米
  chi: 1 / 3,     // 市尺 = 1/3 米
  cun: 1 / 30,    // 市寸 = 1/30 米
};

function convertLength(value: number, from: string, to: string): number {
  const meters = value * lengthToMeter[from];
  return meters / lengthToMeter[to];
}

// 使用示例
console.log(convertLength(1, "mile", "km"));   // 1.609344
console.log(convertLength(5, "chi", "m"));     // 1.6666...
console.log(convertLength(100, "cm", "inch")); // 39.3700787...
```

This "intermediate unit" pattern is the core idea behind any unit converter. Adding a new unit is just one new entry in the lookup table—no need to write a dedicated conversion function for every pair of units.

### Weight / Mass

Weight conversion is also linear, with the kilogram (kg) as the base:

```typescript
const weightToKg: Record<string, number> = {
  mg: 0.000001,
  g: 0.001,
  kg: 1,
  ton: 1000,           // 公吨
  lb: 0.45359237,      // 磅
  oz: 0.028349523125,  // 盎司
  // 中国单位
  jin: 0.5,            // 斤
  liang: 0.05,         // 两
  qian: 0.005,         // 钱
};

function convertWeight(value: number, from: string, to: string): number {
  const kg = value * weightToKg[from];
  return kg / weightToKg[to];
}

// 体重换算是最常见的场景
console.log(convertWeight(150, "lb", "kg"));   // 68.0388...
console.log(convertWeight(70, "kg", "jin"));   // 140
```

Note that the exact factor for the pound (lb) is 0.45359237—the defined value of the international pound (source: NIST Handbook 44), not an approximation. Using the rounded 0.4536 produces noticeable error after repeated conversions.

### Temperature

Temperature is non-linear and needs special handling:

```typescript
type TempUnit = "C" | "F" | "K";

function convertTemperature(value: number, from: TempUnit, to: TempUnit): number {
  // 先转成摄氏度
  let celsius: number;
  switch (from) {
    case "C": celsius = value; break;
    case "F": celsius = (value - 32) * 5 / 9; break;
    case "K": celsius = value - 273.15; break;
    default: throw new Error(`Unknown temperature unit: ${from}`);
  }
  
  // 再转成目标单位
  switch (to) {
    case "C": return celsius;
    case "F": return celsius * 9 / 5 + 32;
    case "K": return celsius + 273.15;
    default: throw new Error(`Unknown temperature unit: ${to}`);
  }
}

// 经典面试题：什么温度下摄氏度和华氏度数值相同？
// 答案：-40度。验证一下：
console.log(convertTemperature(-40, "C", "F")); // -40
console.log(convertTemperature(-40, "F", "C")); // -40
```

### Data Storage

This is the conversion developers deal with most often—and the easiest one to get wrong:

```typescript
// 注意：1 KB 到底是 1000 字节还是 1024 字节？
// 国际电工委员会 (IEC) 标准：
// KB = 1000 bytes（SI 前缀）
// KiB = 1024 bytes（二进制前缀）
// 但实际上，大多数操作系统和开发工具混用这两套标准

const dataToBytes: Record<string, number> = {
  bit: 1 / 8,
  byte: 1,
  // SI 标准（硬盘厂商、网络带宽）
  KB: 1000,
  MB: 1000 ** 2,
  GB: 1000 ** 3,
  TB: 1000 ** 4,
  // 二进制标准（内存、操作系统文件大小）
  KiB: 1024,
  MiB: 1024 ** 2,
  GiB: 1024 ** 3,
  TiB: 1024 ** 4,
};

function convertData(value: number, from: string, to: string): number {
  const bytes = value * dataToBytes[from];
  return bytes / dataToBytes[to];
}

// 经典困惑：为什么买了 1TB 硬盘，系统显示只有 931GB？
console.log(convertData(1, "TB", "GiB")); // 931.32... GiB
// 硬盘厂商用 SI 标准（1 TB = 10^12 bytes）
// 操作系统用二进制标准（1 GiB = 2^30 bytes）
// 差了约 7%
```

That 7% gap isn't your hard drive shrinking—it's the conversion difference between two standards. Once you understand this, you'll stop feeling cheated by the vendor.

### Area

Area conversions use the square meter as the base, but some of the factors are far from intuitive:

```typescript
const areaToSqM: Record<string, number> = {
  sqmm: 0.000001,
  sqcm: 0.0001,
  sqm: 1,
  hectare: 10000,
  sqkm: 1000000,
  sqinch: 0.00064516,
  sqfoot: 0.09290304,
  acre: 4046.8564224,
  // 中国单位
  mu: 2000 / 3,     // 亩 = 2000/3 平方米
  qing: 200000 / 3, // 顷 = 100 亩
};

function convertArea(value: number, from: string, to: string): number {
  const sqm = value * areaToSqM[from];
  return sqm / areaToSqM[to];
}

// 实用场景：看房时经常需要平方米和平方英尺的换算
console.log(convertArea(100, "sqm", "sqfoot")); // 1076.39...
// 100 平米 ≈ 1076 平方英尺
```

## Precision: The Real Engineering Challenge

The conversion logic itself isn't complicated. Precision handling is where the actual difficulty lies.

### The Floating-Point Trap

IEEE 754 double-precision floats carry 53 significand bits, roughly 15–17 decimal digits of precision. In chained conversions, errors accumulate:

```javascript
// 坏的做法：逐步转换
let value = 1; // 英里
value = value * 5280;   // → 英尺
value = value * 12;     // → 英寸
value = value * 2.54;   // → 厘米
value = value / 100;    // → 米
value = value / 1000;   // → 公里
console.log(value);     // 1.609344000000000x — 有精度误差

// 好的做法：一步到位
const km = 1 * 1.609344; // 直接用精确系数
console.log(km);          // 1.609344 — 精确
```

### A Sensible Rounding Strategy

Different scenarios call for different precision:

```typescript
function formatResult(value: number, precision: number = 6): string {
  // 如果结果是整数或接近整数，不显示小数
  if (Math.abs(value - Math.round(value)) < Number.EPSILON) {
    return Math.round(value).toString();
  }
  
  // 去掉末尾多余的零（注意：极端数值会用科学计数法表示）
  return parseFloat(value.toPrecision(precision)).toString();
}

console.log(formatResult(1.609344));        // "1.60934"
console.log(formatResult(100));             // "100"
console.log(formatResult(0.000001));        // "0.000001"
console.log(formatResult(25.400000000002)); // "25.4"
```

For most everyday purposes, 6 significant digits are plenty. Scientific computing may need more, in which case consider a `BigDecimal`-style library or `decimal.js`.

## Unit Problems in Frontend Development

Unit conversion isn't just for scientific computing—frontend work involves plenty of it too.

### CSS Unit Conversion

The most common unit problem in frontend work is converting between px, rem, and em:

```css
/* 假设根元素 font-size: 16px（浏览器默认值） */
/* 那么 1rem = 16px */

/* 设计稿标注 14px，转成 rem */
.text {
  font-size: 0.875rem; /* 14 / 16 = 0.875 */
}

/* 常用的 px 到 rem 速查（基于 16px） */
/* 12px = 0.75rem */
/* 14px = 0.875rem */
/* 16px = 1rem */
/* 18px = 1.125rem */
/* 20px = 1.25rem */
/* 24px = 1.5rem */
/* 32px = 2rem */
```

```typescript
// px 到 rem 的转换函数
function pxToRem(px: number, baseFontSize: number = 16): string {
  return `${px / baseFontSize}rem`;
}

// 在 Tailwind CSS 中，间距单位是 4px 的倍数
// p-1 = 0.25rem = 4px
// p-2 = 0.5rem = 8px
// p-4 = 1rem = 16px
```

### Human-Readable File Sizes

The backend returns bytes; the frontend needs to display something humans can read:

```typescript
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  // 用 1024 作为进制（二进制标准），对应 KiB/MiB/GiB 等二进制前缀
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  
  return `${size.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

console.log(formatFileSize(0));           // "0 B"
console.log(formatFileSize(1023));        // "1023 B"
console.log(formatFileSize(1024));        // "1.00 KiB"
console.log(formatFileSize(1536000));     // "1.46 MiB"
console.log(formatFileSize(1099511627776)); // "1.00 TiB"
```

### Units in Internationalization

If your product serves a global audience, units get even messier:

```typescript
// 使用 Intl API 处理单位格式化
const formatter = new Intl.NumberFormat("en-US", {
  style: "unit",
  unit: "kilometer",
  unitDisplay: "short",
});
console.log(formatter.format(42)); // "42 km"

const formatterZh = new Intl.NumberFormat("zh-CN", {
  style: "unit",
  unit: "kilometer",
  unitDisplay: "long",
});
console.log(formatterZh.format(42)); // "42公里"

// 根据用户地区自动选择单位制（简化示例，实际需要更精确的匹配）
function getPreferredUnit(locale: string): "metric" | "imperial" {
  const imperialLocales = ["en-US", "en-LR"]; // 美国和利比里亚
  return imperialLocales.includes(locale) ? "imperial" : "metric";
}
```

Only the United States and Liberia still officially use imperial-style units, and Myanmar has been gradually moving to metric in recent years. The UK uses imperial units heavily in daily life (miles, pints), but has officially adopted the metric system.

## Using an Online Unit Converter

Writing your own conversion code gives you precise control, but day-to-day you often just need a quick answer. The [online unit converter](https://anyfreetools.com/tools/unit-converter) offers instant conversion across the common categories: length, weight, temperature, area, volume, data storage, and more.

A few practical scenarios:

1. **Verifying units during API integration**: Is the distance the backend returns in meters or kilometers? Is the weight in grams or pounds? A quick sanity check tells you whether the data makes sense
2. **Design spec conversion**: Designers hand off pt, developers use px, print uses mm—you need to convert between all three
3. **Internationalized development**: US users see miles/pounds/Fahrenheit, Chinese users see kilometers/kilograms/Celsius, and you need to confirm the conversion factors
4. **Translating technical docs**: Foreign documentation uses imperial units; writing the Chinese version requires conversion

The upside of an online tool is that you don't need to memorize any factors—type a number, get the result instantly. For complex batch conversions, code is still the better option.

## Building a Generic Unit Conversion Module

If your project does a lot of unit conversion, wrap it in a reusable module:

```typescript
type ConversionMap = Record<string, number>;

class UnitConverter {
  private units: ConversionMap;
  private baseName: string;

  constructor(baseName: string, units: ConversionMap) {
    this.baseName = baseName;
    this.units = units;
  }

  convert(value: number, from: string, to: string): number {
    if (!(from in this.units) || !(to in this.units)) {
      throw new Error(`Unknown unit: ${from} or ${to}`);
    }
    const base = value * this.units[from];
    return base / this.units[to];
  }

  listUnits(): string[] {
    return Object.keys(this.units);
  }
}

// 使用
const length = new UnitConverter("meter", {
  mm: 0.001, cm: 0.01, m: 1, km: 1000,
  inch: 0.0254, foot: 0.3048, mile: 1609.344,
});

const weight = new UnitConverter("kilogram", {
  g: 0.001, kg: 1, ton: 1000,
  lb: 0.45359237, oz: 0.028349523125,
});

console.log(length.convert(5, "mile", "km"));  // 8.04672
console.log(weight.convert(10, "lb", "kg"));    // 4.5359237
```

The big win with this pattern is extensibility. Adding a new unit category (say, speed or pressure) only requires defining a conversion table and a base unit—the conversion logic is fully reused.

## Summary

The core logic of unit conversion is simple: use the "intermediate unit" pattern for linear conversions, and handle non-linear ones (like temperature) separately. The real-world pitfalls cluster in three places:

1. **Floating-point precision**: convert in one step where possible to avoid accumulated error across multiple steps, and round sensibly for display
2. **Mixed standards**: SI vs. binary prefixes (KB vs KiB), US customary vs. imperial—know which standard your scenario uses
3. **Internationalization**: unit conventions differ by region; use the `Intl` API for formatting

For quick day-to-day conversions, use the [online unit converter](https://anyfreetools.com/tools/unit-converter); for conversions in code, wrap the "intermediate unit" pattern from this article into a generic module.

---

**Other articles in this series**:

- [Tool Guide 1: Online Image Compression](/en/posts/blog084_image-compress-guide/) - Image compression principles and practice
- [Tool Guide #2: Online JSON Formatter](/en/posts/blog085_json-formatter-guide/) - JSON parsing and formatting
- [Tool Guide #3: Online Regex Tester](/en/posts/blog086_regex-tester-guide/) - Regular expression debugging
- [Tool Guide 4: QR Code Generator](/en/posts/blog089_qrcode-generator-guide/) - QR code encoding principles
- [Tool Guide 5: Base64 Encoder/Decoder](/en/posts/blog090_base64-tool-guide/) - Base64 encoding explained
- [Tool Guide 7: Unix Timestamp Converter](/en/posts/blog094_timestamp-tool-guide/) - Timestamp handling
- [Tool Guide 6: Online JWT Decoder](/en/posts/blog092_jwt-decoder-guide/) - JWT structure breakdown
- [Tool Guide 8: Online Password Generator](/en/posts/blog095_password-generator-guide/) - Password security
- [Tool Guide 9: URL Encoder/Decoder](/en/posts/blog096_url-encoder-guide/) - URL encoding standards
- [Tool Guide 10: Online Hash Generator](/en/posts/blog097_hash-generator-guide/) - Hash algorithms
- [Tool Guide 11: JSON to TypeScript Type Generator](/en/posts/blog099_json-to-typescript-guide/) - Type inference
- [Tool Guide 12: Online Cron Expression Parser](/en/posts/blog100_cron-parser-guide/) - Scheduled tasks
- [Tool Guide 13: Online Color Converter](/en/posts/blog102_color-converter-guide/) - Color spaces
- [Tool Guide 14: Online SQL Formatter](/en/posts/blog103_sql-formatter-guide/) - SQL beautification
- [Tool Guide 15: Online Markdown Live Preview Tool](/en/posts/blog104_markdown-preview-guide/) - Markdown rendering
- [Tool Guide 16: Online JSON Diff Tool](/en/posts/blog106_json-diff-guide/) - Data comparison
- [Tool Guide 17: AI Token Counter](/en/posts/blog107_token-counter-guide/) - LLM token counting
- [Tool Guide 18: Online OCR Text Recognition](/en/posts/blog108_ocr-tool-guide/) - Text recognition
- [Tool Guide 19: Online CSS Gradient Generator](/en/posts/blog110_css-gradient-guide/) - CSS gradients
- [Tool Guide 20 - Online UUID Generator](/en/posts/blog111_uuid-generator-guide/) - UUID specification
- [Tool Guide 21: HTML to JSX Online Converter](/en/posts/blog112_html-to-jsx-guide/) - React development
- [Tool Guide 22: Online WebSocket Tester](/en/posts/blog114_websocket-tester-guide/) - WebSocket debugging
- [Tool Guide 23: Free Online CSV to JSON Converter](/en/posts/blog116_csv-to-json-guide/) - Data format conversion
- [Tool Guide 24: Online CSS Box Shadow Generator](/en/posts/blog118_box-shadow-guide/) - CSS shadows
- [Tool Guide 25: Online Favicon Generator](/en/posts/blog120_favicon-generator-guide/) - Website icons
- [Tool Guide 26: Online Subnet Calculator](/en/posts/blog121_subnet-calculator-guide/) - Network calculations
- [Tool Guide 27: Online Mock Data Generator](/en/posts/blog123_mock-data-guide/) - Test data
- [Tool Guide 28: Online TOTP Code Generator](/en/posts/blog125_totp-generator-guide/) - Two-factor authentication
- [Tool Guide 29: Online AES Encryption & Decryption Tool](/en/posts/blog127_aes-encryption-guide/) - Symmetric encryption
- [Tool Guide 30: Online Glassmorphism Generator](/en/posts/blog128_glassmorphism-guide/) - CSS frosted glass
- [Tool Guide 31: Online IP Address Lookup Tool](/en/posts/blog130_ip-lookup-guide/) - IP geolocation
- [Tool Guide 32: Online RSA Key Generator](/en/posts/blog131_rsa-keygen-guide/) - RSA keys

---

**Related reading**:
- [Tool Guide 13: Online Color Converter](/en/posts/blog102_color-converter-guide/) - Color space conversion uses a similar "intermediate value" pattern
