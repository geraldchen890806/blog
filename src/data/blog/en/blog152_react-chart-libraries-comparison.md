---
author: Gerald Chen
pubDatetime: 2026-04-27T14:00:00+08:00
title: "Choosing a React Chart Library: Recharts vs. ECharts vs. Nivo vs. Lightweight Charts"
slug: blog152_react-chart-libraries-comparison
featured: true
draft: false
reviewed: true
approved: true
tags:
  - 前端
  - 工具
  - 开发效率
description: "An in-depth comparison of the leading React chart libraries in 2026—Recharts, Apache ECharts, Nivo, and TradingView Lightweight Charts—across three core scenarios (candlestick charts, bar charts, treemaps), with recommendations based on performance, bundle size, and ease of use."
---

Before picking a chart library, figure out which chart type matters most to you—the design priorities of these libraries differ wildly, and there is no single all-around champion.

This article looks at the three most common chart types: **candlestick charts** (the heart of financial apps), **bar charts** (the staple of every dashboard), and **treemaps** (hierarchical data visualization). For each one, I assess what the major libraries can actually do and give concrete recommendations. The data comes from public npm/GitHub stats as of April 2026.

## The Landscape: Seven Mainstream Options

| Library | Positioning | GitHub Stars | Weekly Downloads |
|----|------|-------------|---------|
| Recharts | Declarative charts for React | 27k | 3.6M |
| Apache ECharts (echarts-for-react) | Most feature-complete, config-driven | 64k | 800k |
| Nivo | Polished animations + accessibility | 13.6k | 450k |
| TradingView Lightweight Charts | Professional finance/candlesticks | 15k | 560k |
| Visx (Airbnb) | Thin wrappers over D3 primitives | 20k | 300k |
| Victory | React Native compatibility (main selling point) | 11.2k | 272k |
| Chart.js (react-chartjs-2) | General-purpose Canvas charts | Chart.js 65k | react-chartjs-2 ~2.5M / chart.js ~4.1M |

> **Victory**'s core selling point is React Native compatibility—the same components work on both the web and in React Native apps. For web-only projects, Recharts or Nivo is usually a better choice; the rest of this article skips Victory and focuses on the libraries more commonly used on the web.

## Overall Comparison

| Dimension | Recharts | ECharts | Nivo | Lightweight Charts | Visx | Chart.js |
|------|----------|---------|------|-------------------|------|---------|
| **Candlestick** | Workaround | Native support | Not supported | Purpose-built | Compose yourself | Needs a plugin |
| **Bar charts** | Full | Most complete | Full + Canvas variant | Basic only | Fully custom | Full |
| **Treemap** | Basic support | Supported + drill-down | Three render modes | Not supported | `@visx/hierarchy` | Not supported |
| **Rendering** | SVG | Canvas / WebGL | SVG + Canvas | Canvas | SVG + Canvas | Canvas |
| **Large datasets** | Noticeable jank at 1k+ | Millions of points | Canvas variant decent | Optimized for real-time finance | Depends on implementation | Millions |
| **Bundle (gzip)** | ~50 KB | ~80-130 KB (à la carte) | ~82 KB | **~12 KB** (gzip) | ~30-50 KB | ~66 KB |
| **Learning curve** | Low | Medium-high | Medium | Medium (finance-specific) | High (requires D3 knowledge) | Low |
| **TypeScript** | Good since v3 | Good | Good | Excellent (written in TS) | Excellent (written in TS) | Good |
| **SSR support** | Limited | Limited | Native | Not supported | Needs configuration | Not supported |
| **Maintenance** | Active | Very active | Active | Very active | Slow release cadence | Active |

---

## Candlestick Charts: Which Library Actually Works?

### TradingView Lightweight Charts — The Only Professional Choice

If candlestick charts are central to your project, Lightweight Charts is the only option that requires no compromises.

It's purpose-built for financial time-series data: candlesticks, lines, areas, and volume histograms are all first-class citizens. The data format is minimal:

```typescript
import { createChart } from "lightweight-charts";

const chart = createChart(document.getElementById("chart"), {
  width: 800,
  height: 400,
});

const candleSeries = chart.addCandlestickSeries({
  upColor: "#26a69a",
  downColor: "#ef5350",
  borderVisible: false,
  wickUpColor: "#26a69a",
  wickDownColor: "#ef5350",
});

candleSeries.setData([
  { time: "2024-01-01", open: 100, high: 110, low: 95, close: 105 },
  { time: "2024-01-02", open: 105, high: 115, low: 100, close: 98 },
  { time: "2024-01-03", open: 98, high: 108, low: 92, close: 103 },
]);
```

Using it in React (the useRef + useEffect pattern):

```tsx
import { useEffect, useRef } from "react";
import { createChart, IChartApi } from "lightweight-charts";

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export function CandlestickChart({ data }: { data: CandleData[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { color: "#1a1a2e" }, textColor: "#d1d4dc" },
      grid: { vertLines: { color: "#2a2a3c" }, horzLines: { color: "#2a2a3c" } },
      width: containerRef.current.clientWidth,
      height: 400,
    });

    const series = chart.addCandlestickSeries();
    series.setData(data);
    chart.timeScale().fitContent();

    chartRef.current = chart;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data]);

  return <div ref={containerRef} />;
}
```

v5 (the latest as of April 2026) has a 35 KB base bundle (uncompressed), about **12 KB** gzipped—the smallest of any chart library. It renders to Canvas and stays smooth even with real-time tick-level updates (hundreds of data refreshes per second).

**The limitation**: it only does financial charts. If your dashboard also needs pie charts, heatmaps, or scatter plots, you'll have to pull in a second library.

### Apache ECharts — Candlesticks Plus Volume

Price-volume charts (candlesticks stacked with volume bars) are extremely common in financial products, and ECharts lets you overlay a candlestick series and a bar series in the same chart instance directly:

```typescript
import * as echarts from "echarts/core";
import { CandlestickChart, BarChart } from "echarts/charts";
import { GridComponent, TooltipComponent, DataZoomComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([CandlestickChart, BarChart, GridComponent, TooltipComponent, DataZoomComponent, CanvasRenderer]);

const option = {
  xAxis: { data: dates },
  yAxis: [
    { scale: true },           // K 线坐标轴
    { scale: true, show: false }, // 成交量坐标轴（隐藏）
  ],
  series: [
    {
      type: "candlestick",
      data: klineData, // [open, close, low, high]
      yAxisIndex: 0,
    },
    {
      type: "bar",
      data: volumeData,
      yAxisIndex: 1,
      itemStyle: {
        color: (params: any) => params.data[1] >= params.data[0] ? "#26a69a" : "#ef5350",
      },
    },
  ],
  dataZoom: [{ type: "inside" }, { type: "slider" }],
};
```

The built-in `dataZoom` component (mouse-wheel zooming, slider-based range selection) is genuinely useful in financial scenarios and requires no extra development.

### Recharts — The Candlestick Trap

The official Recharts examples show how to fake a candlestick chart with `<Bar>` + `<ErrorBar>`, but it's only an approximation:

```tsx
// 这种实现的问题：
// 1. 阳线/阴线颜色需要用 Cell 逐个设置，数据量大时性能差
// 2. 影线（上下 wick）和实体颜色联动逻辑需要手写
// 3. 没有金融图表需要的十字光标、价格标签等组件
// 4. 代码量是 Lightweight Charts 的 3-5 倍
```

If your project only occasionally shows a candlestick chart, this is acceptable. But if candlesticks are a core feature, the maintenance cost will be steep.

---

## Bar Charts: Why Recharts Is the Default Choice

### Recharts — The React-Friendly Pick

Recharts is the most-downloaded React-specific chart library (3.6M weekly downloads), and the main reason is that its composition model matches React's perfectly:

```tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, LabelList } from "recharts";

const data = [
  { month: "Jan", revenue: 4200, cost: 2400 },
  { month: "Feb", revenue: 3800, cost: 1900 },
  { month: "Mar", revenue: 5100, cost: 2800 },
  { month: "Apr", revenue: 4700, cost: 2200 },
];

// 堆叠柱状图
export function StackedBar() {
  return (
    <BarChart width={600} height={300} data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="month" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Bar dataKey="revenue" stackId="a" fill="#6366f1" />
      <Bar dataKey="cost" stackId="a" fill="#f43f5e" />
    </BarChart>
  );
}

// 单个柱子自定义颜色（Cell）
export function CustomColorBar() {
  const colors = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd"];
  return (
    <BarChart width={600} height={300} data={data}>
      <Bar dataKey="revenue">
        {data.map((_, index) => (
          <Cell key={index} fill={colors[index % colors.length]} />
        ))}
        <LabelList dataKey="revenue" position="top" />
      </Bar>
    </BarChart>
  );
}
```

Stacking with `stackId`, per-bar colors with `Cell`, value labels with `LabelList`—everything is declarative, with no config-object paths to memorize.

**The limitation**: SVG rendering means noticeable jank once you exceed roughly 1,000 data points. When a bar chart has lots of bars (e.g., per-minute time-series over 24 hours = 1,440 points), consider switching to ECharts or Chart.js.

### Apache ECharts — Big Data and Advanced Interactions

When your dataset exceeds 10k points, or you need brush selection, animated re-sorting, and other advanced interactions, ECharts is the better fit:

```typescript
// 动态排序柱状图（ECharts 内置功能，Recharts 需要自实现）
const option = {
  xAxis: { max: "dataMax" },
  yAxis: { type: "category", data: categories, animationEasing: "linear" },
  series: [{
    type: "bar",
    data: values,
    realtimeSort: true,  // 实时排序动画
    label: { show: true, position: "right" },
  }],
  animationDuration: 0,
  animationDurationUpdate: 2000,
};
```

ECharts v6 (released in July 2025) added a matrix coordinate system, further extending what bar charts can express.

### Nivo — Visual Polish and Accessibility

If your product has accessibility requirements (WCAG 2.1 AA), Nivo offers some of the most complete out-of-the-box accessibility support among mainstream React chart libraries. Its animations are powered by `@react-spring`, and the transitions are the most polished:

```tsx
import { ResponsiveBar } from "@nivo/bar";

<ResponsiveBar
  data={data}
  keys={["revenue", "cost"]}
  indexBy="month"
  margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
  padding={0.3}
  colors={{ scheme: "nivo" }}
  animate={true}          // 基于 @react-spring 的动画
  motionConfig="gentle"   // 动画缓动配置
  role="application"      // 无障碍 ARIA
  ariaLabel="Revenue and cost by month"
/>
```

For larger datasets, switch to `<BarCanvas>` to render with Canvas instead of SVG—the API stays the same.

---

## Treemaps: Nivo Leads

### Nivo @nivo/treemap — Three Render Modes

Nivo's treemap supports SVG, Canvas, and HTML rendering, and `nodeComponent` lets you fully customize each node:

```tsx
import { ResponsiveTreeMap } from "@nivo/treemap";

const data = {
  name: "root",
  children: [
    {
      name: "Frontend",
      children: [
        { name: "React", size: 85000 },
        { name: "Vue", size: 42000 },
        { name: "Angular", size: 38000 },
      ],
    },
    {
      name: "Backend",
      children: [
        { name: "Node.js", size: 62000 },
        { name: "Python", size: 71000 },
      ],
    },
  ],
};

<ResponsiveTreeMap
  data={data}
  identity="name"
  value="size"
  valueFormat=".02s"
  margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
  labelSkipSize={12}
  labelTextColor={{ from: "color", modifiers: [["darker", 1.2]] }}
  parentLabelPosition="left"
  parentLabelTextColor={{ from: "color", modifiers: [["darker", 2]] }}
  colors={{ scheme: "tableau10" }}
/>
```

If you need full control over how each tile renders, Nivo's `nodeComponent` prop accepts a custom React component governing each node's appearance and interactions—e.g., embedding a sparkline, a progress bar, or arbitrary SVG inside a tile. See the nodeComponent docs at [nivo.rocks/treemap](https://nivo.rocks/treemap/) for the exact API.

### Apache ECharts — Hierarchical Drill-Down

If your treemap needs click-to-zoom into parent nodes (drill-down) with breadcrumb navigation, ECharts has it built in:

```typescript
const option = {
  series: [{
    type: "treemap",
    data: hierarchicalData,
    leafDepth: 1,     // 默认显示到第几层
    drillDownIcon: "▶",
    breadcrumb: { show: true },  // 显示层级导航
    levels: [
      { itemStyle: { borderWidth: 3, gapWidth: 3 } },
      { itemStyle: { borderWidth: 2, gapWidth: 2 } },
      { colorSaturation: [0.35, 0.5] },
    ],
  }],
};
```

---

## Performance: When Is SVG Not Enough?

The rendering technology sets the performance ceiling:

| Rendering | Suitable Data Volume | Characteristics |
|----------|-----------|------|
| SVG | < 1,000 points | Many DOM nodes, but styleable with CSS and SSR-friendly |
| Canvas 2D | < 1 million points | Strong performance, but no per-element CSS control |
| WebGL | > 1 million points | Extreme performance, supported by ECharts GL |

Recharts uses SVG, and frame rates drop noticeably past 1,000 data points. ECharts defaults to Canvas and renders smoothly even with 100k points.

Reference benchmark (MacBook Pro M3, Chrome 122, bar chart, default configuration):

| Data points | Recharts (SVG) | ECharts (Canvas) | Chart.js (Canvas) |
|--------|----------------|-----------------|------------------|
| 500 | Smooth | Smooth | Smooth |
| 2,000 | Slight jank | Smooth | Smooth |
| 10,000 | Noticeable jank | Smooth | Smooth |
| 100,000 | Unusable | Smooth | Mostly smooth |

> These are reference figures only—actual performance depends on data shape, animation settings, and chart type. Benchmark on your target devices.

---

## Bundle Size Comparison

Importing à la carte is key. The full ECharts package is ~340 KB (gzip); importing only the components you use cuts that down significantly—a BarChart + Tooltip + Grid + DataZoom combination comes to roughly **80-130 KB** (gzip; the exact number depends on the component mix, so measure with bundlejs.com):

```typescript
// 按需引入 ECharts（推荐写法）
import * as echarts from "echarts/core";
import { BarChart, CandlestickChart } from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DataZoomComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  BarChart,
  CandlestickChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DataZoomComponent,
  CanvasRenderer,
]);
```

Recharts v3 sets `sideEffects: false` and ships ES Module output, so Vite/Webpack 5 can tree-shake it—but its core dependencies (d3, victory-vendor, etc.) are heavy, so the real-world gain is limited and the full package still gzips to about 50 KB.

---

## Decision Tree

```
Need candlestick charts?
  ├── Candlesticks are the core feature → Lightweight Charts (purpose-built, smallest bundle)
  └── Candlesticks + other chart types → Apache ECharts (one library for everything)

No candlesticks needed:
  ├── Dataset > 10k points → Apache ECharts (Canvas performance)
  ├── Need treemaps + polished animations → Nivo
  ├── Highly custom visuals (D3 experience) → Visx
  └── General dashboard, fast development → Recharts
```

## Quick Reference by Scenario

| Scenario | Recommendation | Why |
|------|------|------|
| Pure financial candlesticks | **Lightweight Charts** | Purpose-built, ~12 KB gzip, best Canvas performance |
| Candlesticks + volume bars | **Apache ECharts** | Native series overlay, built-in dataZoom |
| General business dashboard | **Recharts** | Lowest learning cost, biggest community |
| Datasets of 10k+ points | **Apache ECharts** | Canvas/WebGL rendering |
| Treemap with drill-down | **Apache ECharts** | Built-in drill-down and breadcrumb navigation |
| Treemap with custom nodes | **Nivo** | Full customization via nodeComponent |
| Accessibility (WCAG 2.1 AA) | **Nivo** | Among the most complete out-of-the-box a11y support |
| Maximum customization | **Visx** | D3 primitives, full control |
| Quick prototyping | **Chart.js** | Most documentation, richest community Q&A |

---

## Conclusion

No single chart library fits every scenario. In real projects, the two most common combinations are:

**Option A (finance/trading products)**: Lightweight Charts (candlesticks) + Recharts or ECharts (everything else)

**Option B (general SaaS dashboards)**: Apache ECharts (the workhorse—fast and feature-complete) or Recharts + Nivo (React-friendly + polished visuals, for moderate data volumes)

If you can only pick one and performance matters, **Apache ECharts** is the single choice with the broadest coverage: candlesticks, bar charts, and treemaps are all natively supported, Canvas rendering handles big data, and à la carte imports keep the bundle in check. If your team is fluent in React and the data volumes are modest, **Recharts** offers a developer experience closest to React idioms with the lowest ramp-up cost.
