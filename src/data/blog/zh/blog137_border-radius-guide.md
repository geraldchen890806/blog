---
author: 陈广亮
pubDatetime: 2026-04-20T10:00:00+08:00
title: 工具指南40-在线CSS Border Radius生成器
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
description: 介绍在线 CSS Border Radius 生成器的使用方法，深入拆解 border-radius 语法和椭圆圆角原理，附实战代码示例和常见使用场景。
---

`border-radius: 50% 20% / 10% 40%` 和 `border-radius: 50%` 都是合法的 CSS，但前者会让你一头雾水。border-radius 的完整语法远比大多数人认为的复杂，但掌握它之后可以实现波浪、水滴、有机形状等各种不规则图形，无需 SVG。

[在线 CSS Border Radius 生成器](https://anyfreetools.com/tools/border-radius) 提供可视化拖拽界面，实时预览圆角效果，不需要手动推算数值。

## border-radius 语法全解

### 基础语法：四个角

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

顺序是顺时针从左上角开始，和 `margin`/`padding` 一样是顺时针，但起点不同——`margin`/`padding` 从"上边"开始，`border-radius` 从"左上角"开始。

### 独立属性写法

```css
border-top-left-radius: 8px;
border-top-right-radius: 16px;
border-bottom-right-radius: 24px;
border-bottom-left-radius: 4px;
```

### 椭圆圆角：斜杠语法

这是 border-radius 最容易被忽略的部分。斜杠（`/`）把水平半径和垂直半径分开设置：

```css
/* 水平半径 / 垂直半径 */
border-radius: 40px / 20px;

/* 四个角的水平半径 / 四个角的垂直半径 */
border-radius: 40px 20px 60px 10px / 20px 30px 10px 40px;
```

斜杠前是四个角的**水平方向**椭圆半径，斜杠后是**垂直方向**椭圆半径。两个独立的轴，合起来形成椭圆弧线。

以 `border-radius: 60px 40px / 20px 80px` 为例（两值展开规则：第1值→左上+右下，第2值→右上+左下）：

```
左上角：水平半径 60px，垂直半径 20px → 扁椭圆弧
右上角：水平半径 40px，垂直半径 80px → 高椭圆弧
右下角：水平半径 60px，垂直半径 20px → 与左上角相同
左下角：水平半径 40px，垂直半径 80px → 与右上角相同
```

## 百分比值的计算方式

用百分比设置 border-radius 时，水平方向相对于**元素宽度**，垂直方向相对于**元素高度**：

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

正圆的写法是 `border-radius: 50%`，适用于正方形元素。如果元素不是正方形，50% 得到的是椭圆而非圆形。

## 工具功能

打开 [https://anyfreetools.com/tools/border-radius](https://anyfreetools.com/tools/border-radius)：

**可视化调节**：通过滑块或直接拖拽控制点，调整每个角的水平和垂直半径，实时预览变化。

**椭圆模式**：切换水平/垂直独立控制，支持生成斜杠语法的椭圆圆角值，直观调节有机形状。

**预设模板**：内置常用圆角组合（圆形、胶囊形、单角圆角、水滴形等），一键加载后再微调。

**CSS 代码输出**：实时生成简化后的 CSS 代码，去除冗余值（如四个角相同时自动合并），直接复制粘贴。

## 常见形状代码

### 圆形

```css
.circle {
  width: 100px;
  height: 100px;
  border-radius: 50%;
}
```

### 胶囊/药丸形

```css
.pill {
  padding: 8px 20px;
  border-radius: 999px;  /* 足够大的值，自动适应高度 */
}
```

用 `999px`（或 `100vmax`）而非 `50%`，避免宽高不等时出现方形边角。

### 单角圆角

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

### 叶形/水滴形

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

### 有机形状（Blob）

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

动态变形的 Blob 效果常用于装饰元素，背后就是对 border-radius 做过渡动画。

## 开发场景

### 设计系统中的圆角 Token

大多数设计系统会把圆角值定义为 token，方便全局管理：

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

Tailwind CSS 的 `rounded-sm`/`rounded-md`/`rounded-full` 等类名背后就是这套规则。

### Tailwind 圆角速查

以下为 Tailwind CSS v3 默认值：

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

单角控制：`rounded-tl-lg`（左上）、`rounded-tr-lg`（右上）、`rounded-br-lg`（右下）、`rounded-bl-lg`（左下）。

### React 中动态圆角

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

### 用 clip-path 替代复杂圆角

当 border-radius 无法满足需求时（比如凹形、锯齿边），可以用 `clip-path`：

```css
/* border-radius 只能做凸形圆角 */
/* clip-path 可以做任意多边形 */
.arrow {
  clip-path: polygon(0 0, 80% 0, 100% 50%, 80% 100%, 0 100%);
}
```

两者的区别：border-radius 修改的是盒模型边框，clip-path 是剪裁区域，对背景、阴影的表现不同。

## 兼容性和注意事项

**现代浏览器支持完整**：border-radius 全语法（包括斜杠椭圆语法）在 Chrome 5+、Firefox 4+、Safari 5+、IE 9+ 均支持，无需前缀。

**border-radius 和 overflow**：给父元素加 border-radius 后，需要同时设置 `overflow: hidden` 才能让子元素（如图片）跟随圆角裁切：

```css
.card {
  border-radius: 12px;
  overflow: hidden;  /* 缺少这行，内部图片会超出圆角 */
}
```

**transform 和 border-radius 的渲染层**：频繁动画的圆角元素可以加 `will-change: border-radius` 提示浏览器创建独立合成层，避免重绘影响性能。但 `will-change` 会持续占用额外内存，建议只在动画触发时（如 hover 或 JS 控制）临时添加，动画结束后移除：

```css
/* 推荐：仅在 hover 时启用 */
.blob:hover {
  will-change: border-radius;
}
```

**border-radius 和 background-clip**：当元素有 border 时，`background-clip` 控制背景是延伸到 border 下还是只在 padding 区域内，影响圆角的视觉效果：

```css
.card {
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  background-clip: padding-box;  /* 背景不延伸到 border 下 */
}
```

---

border-radius 的完整语法（水平/垂直双轴、百分比相对计算）在刚接触时确实不直观。用 [在线 Border Radius 生成器](https://anyfreetools.com/tools/border-radius) 拖拽调整，同时观察生成的 CSS 代码，是理解这个属性最快的方式。

---

**工具指南系列**

[工具指南1-在线图片压缩](https://chenguangliang.com/posts/blog084_image-compress-guide/) | [工具指南2-JSON格式化](https://chenguangliang.com/posts/blog085_json-formatter-guide/) | [工具指南3-正则测试](https://chenguangliang.com/posts/blog086_regex-tester-guide/) | [工具指南4-二维码生成](https://chenguangliang.com/posts/blog089_qrcode-generator-guide/) | [工具指南5-Base64](https://chenguangliang.com/posts/blog090_base64-tool-guide/) | [工具指南6-JWT解码](https://chenguangliang.com/posts/blog092_jwt-decoder-guide/) | [工具指南7-时间戳转换](https://chenguangliang.com/posts/blog094_timestamp-tool-guide/) | [工具指南8-密码生成器](https://chenguangliang.com/posts/blog095_password-generator-guide/) | [工具指南9-URL编解码](https://chenguangliang.com/posts/blog096_url-encoder-guide/) | [工具指南10-哈希生成器](https://chenguangliang.com/posts/blog097_hash-generator-guide/) | [工具指南11-JSON转TypeScript](https://chenguangliang.com/posts/blog099_json-to-typescript-guide/) | [工具指南12-Cron解析器](https://chenguangliang.com/posts/blog100_cron-parser-guide/) | [工具指南13-颜色转换](https://chenguangliang.com/posts/blog102_color-converter-guide/) | [工具指南14-SQL格式化](https://chenguangliang.com/posts/blog103_sql-formatter-guide/) | [工具指南15-Markdown预览](https://chenguangliang.com/posts/blog104_markdown-preview-guide/) | [工具指南16-JSON对比](https://chenguangliang.com/posts/blog106_json-diff-guide/) | [工具指南17-Token计数器](https://chenguangliang.com/posts/blog107_token-counter-guide/) | [工具指南18-OCR文字识别](https://chenguangliang.com/posts/blog108_ocr-tool-guide/) | [工具指南19-CSS渐变生成器](https://chenguangliang.com/posts/blog110_css-gradient-guide/) | [工具指南20-UUID生成器](https://chenguangliang.com/posts/blog111_uuid-generator-guide/) | [工具指南21-HTML转JSX](https://chenguangliang.com/posts/blog112_html-to-jsx-guide/) | [工具指南22-WebSocket测试](https://chenguangliang.com/posts/blog114_websocket-tester-guide/) | [工具指南23-CSV转JSON](https://chenguangliang.com/posts/blog116_csv-to-json-guide/) | [工具指南24-Box Shadow生成器](https://chenguangliang.com/posts/blog118_box-shadow-guide/) | [工具指南25-Favicon生成器](https://chenguangliang.com/posts/blog120_favicon-generator-guide/) | [工具指南26-子网计算器](https://chenguangliang.com/posts/blog121_subnet-calculator-guide/) | [工具指南27-Mock数据生成器](https://chenguangliang.com/posts/blog123_mock-data-guide/) | [工具指南28-TOTP验证码](https://chenguangliang.com/posts/blog125_totp-generator-guide/) | [工具指南29-AES加密](https://chenguangliang.com/posts/blog127_aes-encryption-guide/) | [工具指南30-毛玻璃效果](https://chenguangliang.com/posts/blog128_glassmorphism-guide/) | [工具指南31-IP地址查询](https://chenguangliang.com/posts/blog130_ip-lookup-guide/) | [工具指南32-RSA密钥生成器](https://chenguangliang.com/posts/blog131_rsa-keygen-guide/) | [工具指南33-颜色对比度](https://chenguangliang.com/posts/blog133_color-contrast-guide/) | [工具指南37-单位转换器](https://chenguangliang.com/posts/blog132_unit-converter-guide/) | [工具指南38-User-Agent解析器](https://chenguangliang.com/posts/blog135_user-agent-guide/) | [工具指南39-代码压缩工具](https://chenguangliang.com/posts/blog136_code-minifier-guide/)
