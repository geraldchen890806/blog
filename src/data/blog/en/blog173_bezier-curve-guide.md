---
author: Gerald Chen
pubDatetime: 2026-05-29T14:00:00+08:00
title: "Tool Guide 57: Online CSS Bezier Curve Editor"
slug: blog173_bezier-curve-guide
featured: true
draft: true
reviewed: false
approved: false
tags:
  - 工具指南
  - 工具
  - CSS
  - 动画
description: "How smooth a CSS animation feels comes down to the easing function, and Bezier curves are the heart of custom easing. This article shows how to tune cubic-bezier parameters visually with an online Bezier curve editor, and digs into the math behind easing functions along with practical tuning tips."
---

When writing CSS animations, most people's first instinct is to slap on `transition: all 0.3s ease` and call it a day. It works, but something always feels off—button hover transitions feel flat, modals pop in abruptly, list items enter without any rhythm.

The culprit is `ease`. It's the browser's default easing function—broadly applicable but devoid of personality. What really brings an animation to life is a custom Bezier curve. But hand-writing parameters like `cubic-bezier(0.68, -0.55, 0.27, 1.55)` without a visual tool is basically tuning blind.

This article introduces an online Bezier curve editor, and along the way explains the math behind `cubic-bezier` and how to actually tune it in practice.

## The Tool

The [CSS Bezier Curve Editor](https://anyfreetools.com/tools/bezier-curve) provides a visual curve-editing interface. Core features:

- **Draggable control points**: Drag the P1 and P2 control points directly to reshape the curve in real time
- **Live preview**: Watch the animation as you edit the curve—what you see is what you get
- **Curve presets**: Built-in presets for ease, ease-in, ease-out, ease-in-out, and more
- **Code output**: Automatically generates `cubic-bezier(x1, y1, x2, y2)` code, ready to copy and paste

The workflow is straightforward: pick a preset close to what you want, drag the control points to fine-tune, watch the preview, and copy the CSS once you're happy. The whole process takes under 30 seconds.

## What Is a Bezier Curve

Before talking about CSS easing, let's understand the Bezier curve itself.

The Bezier curve is a foundational curve in computer graphics, developed by French engineer Pierre Bezier in the 1960s for automobile body design. It defines a smooth curve with a small number of control points, and is widely used in font rendering, vector graphics, path animation, and more.

CSS uses the cubic Bezier curve, defined by 4 points:

- **P0 (0, 0)**: The start point, fixed
- **P1 (x1, y1)**: The first control point, freely adjustable
- **P2 (x2, y2)**: The second control point, freely adjustable
- **P3 (1, 1)**: The end point, fixed

The curve's mathematical expression is:

```
B(t) = (1-t)^3 * P0 + 3(1-t)^2 * t * P1 + 3(1-t) * t^2 * P2 + t^3 * P3
```

where `t` ranges over [0, 1] and represents the progression of time.

In CSS, the start and end points are fixed at (0,0) and (1,1), which is why `cubic-bezier()` only needs 4 parameters: the coordinates of P1 and P2.

### What the Coordinate System Means

The curve describes a time-to-progress mapping:

- **X axis**: Time, from 0 (animation start) to 1 (animation end)
- **Y axis**: Property progress, from 0 (initial value) to 1 (target value)

A 45-degree straight line means constant speed (`linear`). The steeper the curve, the faster the property changes during that stretch; the flatter the curve, the slower it changes.

## Breaking Down CSS's Built-in Easing Functions

With the coordinate system in mind, the built-in CSS easing functions become easy to read:

### ease - The Default

```css
/* 等价于 cubic-bezier(0.25, 0.1, 0.25, 1.0) */
transition-timing-function: ease;
```

Characteristics: quick start, gentle deceleration. The first 30% of the time covers roughly 60% of the progress, with the remaining 70% of the time covering the last 40%. Fine for most general scenarios, but it's so common that it tends to look "undesigned."

### ease-in - Accelerating Entry

```css
/* 等价于 cubic-bezier(0.42, 0, 1.0, 1.0) */
transition-timing-function: ease-in;
```

Characteristics: slow start, gradual acceleration. Good for elements *leaving* the viewport—the object speeds up as it goes and is moving fastest as it exits the frame, which matches physical intuition.

### ease-out - Decelerating Exit

```css
/* 等价于 cubic-bezier(0, 0, 0.58, 1.0) */
transition-timing-function: ease-out;
```

Characteristics: quick start, gradual deceleration. Good for elements *entering* the viewport—the object rushes in and eases to a stop, giving a sense of "arrival."

### ease-in-out - Accelerate Then Decelerate

```css
/* 等价于 cubic-bezier(0.42, 0, 0.58, 1.0) */
transition-timing-function: ease-in-out;
```

Characteristics: slow at both ends, fast in the middle, with a symmetrical curve. Good for looping animations or state toggles—it has a breathing quality.

### linear - Constant Speed

```css
/* 等价于 cubic-bezier(0, 0, 1, 1) */
transition-timing-function: linear;
```

Characteristics: constant velocity. Good for progress bars, spinning loaders, and other cases that genuinely need uniform speed. On UI transitions it tends to feel mechanical.

## Custom Curves in Practice

The built-in presets can't cover everything. Here are custom curve recipes for several common needs.

### Elastic Bounce

A button that scales past its target size on click, then springs back:

```css
.button:active {
  transform: scale(0.95);
  transition: transform 0.1s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.button {
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

The key parameter: P2's Y value (1.56) is greater than 1, which means the property will "overshoot"—exceeding the target value before bouncing back. That's where the elastic feel comes from.

When adjusting in the tool, drag the second control point above the coordinate area (Y > 1) and you'll see the preview animation bounce. The larger the Y value, the more pronounced the bounce.

### Fast Response + Graceful Stop

User actions need instant feedback, but the ending shouldn't feel abrupt:

```css
.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transition: all 0.25s cubic-bezier(0.2, 0, 0, 1);
}
```

What makes `cubic-bezier(0.2, 0, 0, 1)` special: the first 10% of the time covers about 50% of the displacement, giving the user a sense of instant response; the second half is very gentle, gliding gracefully to the end point. Google Material Design 3's standard easing follows a similar idea (the official docs give the value as `cubic-bezier(0.2, 0, 0, 1)`).

### Expand/Collapse Animations

Expanding and collapsing a sidebar or accordion component:

```css
.panel-enter {
  /* 展开：快速出现，平滑到位 */
  transition: height 0.3s cubic-bezier(0.0, 0.0, 0.2, 1);
}

.panel-exit {
  /* 收起：平滑启动，快速消失 */
  transition: height 0.25s cubic-bezier(0.4, 0.0, 1, 1);
}
```

Use different easing curves for expanding and collapsing—an ease-out style on expand so the content "flows out," and an ease-in style on collapse so the content "tucks away." This detail is common in large applications, yet many developers use the same easing for both directions.

### Smooth Scroll Snapping

Custom scrolling behavior with easing (requires JavaScript):

```javascript
function smoothScrollTo(target, duration = 600) {
  const start = window.scrollY;
  const distance = target - start;
  let startTime = null;

  // cubic-bezier(0.25, 0.46, 0.45, 0.94) 的近似实现
  function easing(t) {
    return t * (2 - t); // 简化的ease-out
  }

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    window.scrollTo(0, start + distance * easing(progress));
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}
```

The above uses a simplified formula. If you need to reproduce `cubic-bezier` behavior exactly, you can use the De Casteljau algorithm or a precomputed lookup table—but for scroll animations, a quadratic ease-out is plenty.

## Tuning Tips

A few practical rules of thumb when adjusting curves in the tool.

### How Control Point Position Maps to Effect

| Control point position | Effect |
|---|---|
| P1 toward bottom-left | Slow start (ease-in style) |
| P1 toward top-right | Fast start |
| P2 toward bottom-left | Fast finish |
| P2 toward top-right | Slow finish (ease-out style) |
| Y value > 1 | Overshoot and bounce back |
| Y value < 0 | Reverse bounce (pull back before moving forward) |

### Matching Duration to Easing

An easing function doesn't live in isolation—it needs a matching duration:

```css
/* 微交互：100-200ms，用快速响应的曲线 */
.toggle {
  transition: background-color 0.15s cubic-bezier(0.2, 0, 0, 1);
}

/* 中等过渡：200-400ms，标准缓动 */
.dropdown {
  transition: opacity 0.3s ease-out, transform 0.3s ease-out;
}

/* 大范围运动：400-700ms，需要明显的加减速 */
.page-transition {
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
```

Rule of thumb: below 100ms, differences in easing are barely perceptible—just use `linear`. Above 500ms, the choice of easing curve heavily shapes how the animation feels and deserves careful tuning.

### Avoiding Common Mistakes

**Don't use the same easing for every property.** `opacity` and `transform` can use different curves and durations:

```css
.modal {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
  transition: opacity 0.2s ease-out,
              transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal.active {
  opacity: 1;
  transform: scale(1) translateY(0);
}
```

Give the opacity change a short duration + ease-out so the element becomes visible quickly; give the translation and scaling a slightly longer duration + an elastic curve for a sense of energy. The two property animations ending at different times actually feels more natural.

**Don't use bounce everywhere.** Overshoot works well on discrete elements like buttons and cards, but on full-screen transitions, scrolling, or size changes it makes people dizzy.

## Performance Considerations

The easing function itself has no performance impact—the cost of the browser evaluating cubic-bezier is negligible. What actually affects performance is which property you animate.

### Prefer Compositor-Friendly Properties

```css
/* 性能好：transform 和 opacity 走 GPU 合成层 */
.card:hover {
  transform: translateY(-4px);
  opacity: 0.9;
}

/* 性能差：width/height/margin 触发重排 */
.card:hover {
  margin-top: -4px;
  height: calc(100% + 4px);
}
```

No matter which easing function you use, animating layout properties like `width`, `height`, `margin`, or `padding` triggers reflow—layout has to be recomputed every frame. `transform` and `opacity` run on a separate compositing layer and leave the document flow alone.

### Using will-change Correctly

```css
/* 鼠标进入父容器时提前声明 */
.card-container:hover .card {
  will-change: transform;
}

/* 动画结束后移除 */
.card {
  will-change: auto;
}
```

`will-change` tells the browser ahead of time that "this element is about to change," prompting it to create a dedicated compositing layer. But don't overuse it—every compositing layer consumes GPU memory, and declaring `will-change: transform` globally will backfire.

## Working with Other CSS Animation Features

### Bezier Curves in @keyframes

```css
@keyframes slideIn {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.slide-enter {
  animation: slideIn 0.4s cubic-bezier(0.0, 0.0, 0.2, 1) forwards;
}
```

### The CSS linear() Function (New)

The newer CSS `linear()` function lets you define multi-segment linear interpolation, which can approximate more complex easing effects (such as spring animations):

```css
/* 弹簧效果：多个关键点模拟阻尼振荡 */
.spring {
  transition: transform 0.6s linear(
    0, 0.22, 0.78, 1.1, 0.95, 1.02, 0.99, 1
  );
}
```

`linear()` is supported in Chrome 113+, Firefox 112+, and Safari 17.2+ (per Can I Use data, global coverage is around 92% as of May 2026). For projects that need to support older browsers, `cubic-bezier` remains the most reliable choice.

## Summary

The "feel" of a CSS animation depends heavily on the easing function. The [online Bezier curve editor](https://anyfreetools.com/tools/bezier-curve) turns what used to be a trial-and-error grind into a visual operation—drag the control points, watch the preview, copy the code, and you're done tuning in 30 seconds.

Key takeaways:

1. **Don't lean on the default ease**—pick or customize easing for each scenario
2. **ease-out for entering, ease-in for leaving**—the most fundamental rule
3. **Control point Y values outside [0,1]** create bounce effects, but don't overdo it
4. **Different properties can use different easings and durations**—it feels more natural
5. **Below 100ms**, easing differences are barely perceptible

---

**Related reading**:
- [Tool Guide 19: Online CSS Gradient Generator](/en/posts/blog110_css-gradient-guide/) - Visual generation of CSS gradients and how they work
- [Tool Guide 24: Online CSS Box Shadow Generator](/en/posts/blog118_box-shadow-guide/) - Visual tuning of CSS shadows
- [Tool Guide 30: Online Glassmorphism Generator](/en/posts/blog128_glassmorphism-guide/) - Implementing and tuning CSS frosted-glass effects
- [Tool Guide 40 - Online CSS Border Radius Generator](/en/posts/blog137_border-radius-guide/) - Independent control of all four CSS corner radii

**More in this series**:
- [Tool Guide 1: Online Image Compression](/en/posts/blog084_image-compress-guide/)
- [Tool Guide #2: Online JSON Formatter](/en/posts/blog085_json-formatter-guide/)
- [Tool Guide #3: Online Regex Tester](/en/posts/blog086_regex-tester-guide/)
- [Tool Guide 5: Base64 Encoder/Decoder](/en/posts/blog090_base64-tool-guide/)
- [Tool Guide 6: Online JWT Decoder](/en/posts/blog092_jwt-decoder-guide/)
- [Tool Guide 7: Unix Timestamp Converter](/en/posts/blog094_timestamp-tool-guide/)
- [Tool Guide 10: Online Hash Generator](/en/posts/blog097_hash-generator-guide/)
- [Tool Guide 12: Online Cron Expression Parser](/en/posts/blog100_cron-parser-guide/)
- [Tool Guide 17: AI Token Counter](/en/posts/blog107_token-counter-guide/)
- [Tool Guide 19: Online CSS Gradient Generator](/en/posts/blog110_css-gradient-guide/)
- [Tool Guide 24: Online CSS Box Shadow Generator](/en/posts/blog118_box-shadow-guide/)
- [Tool Guide 56: Online cURL to Code Converter](/en/posts/blog171_curl-to-code-guide/)
