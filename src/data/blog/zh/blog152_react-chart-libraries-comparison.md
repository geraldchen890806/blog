---
author: 陈广亮
pubDatetime: 2026-04-27T14:00:00+08:00
title: React 图表库选型指南：Recharts、ECharts、Nivo、Lightweight Charts 深度对比
slug: blog152_react-chart-libraries-comparison
featured: true
draft: false
reviewed: true
approved: true
tags:
  - 前端
  - 工具
  - 开发效率
description: 深度对比 2026 年 React 主流图表库：Recharts、Apache ECharts、Nivo、TradingView Lightweight Charts，覆盖 K 线图、柱状图、Treemap 三种核心场景，从性能、bundle 大小、易用性给出选型建议。
---

选图表库之前，先明确你最需要哪种图表——因为不同库的设计重心差异很大，没有一个"全能冠军"。

这篇文章针对三种最常用的图表类型：**K 线图**（金融场景核心）、**柱状图**（通用仪表盘标配）、**Treemap**（层级数据展示），逐一给出各主流库的真实能力评估，以及具体的选型建议。数据来自 2026 年 4 月的 npm/GitHub 公开数据。

## 市场格局：七个主流选项

| 库 | 定位 | GitHub Stars | 周下载量 |
|----|------|-------------|---------|
| Recharts | React 声明式图表 | 27k | 3.6M |
| Apache ECharts (echarts-for-react) | 功能最全的配置式图表 | 64k | 800k |
| Nivo | 精致动画 + 无障碍 | 13.6k | 450k |
| TradingView Lightweight Charts | 专业金融/K线 | 15k | 560k |
| Visx (Airbnb) | D3 原语封装 | 20k | 300k |
| Victory | React Native 兼容（主要卖点） | 11.2k | 272k |
| Chart.js (react-chartjs-2) | 通用 Canvas 图表 | Chart.js 65k | react-chartjs-2 ~2.5M / chart.js ~4.1M |

> **Victory** 的核心卖点是 React Native 兼容——同一套组件可以同时用于 Web 和 React Native App。纯 Web 场景下，Recharts 或 Nivo 通常是更好的选择；本文后续章节不展开 Victory，专注于 Web 场景更常用的库。

## 综合对比表

| 维度 | Recharts | ECharts | Nivo | Lightweight Charts | Visx | Chart.js |
|------|----------|---------|------|-------------------|------|---------|
| **K 线图** | 变通实现 | 原生支持 | 不支持 | 专为此设计 | 需组合 | 需插件 |
| **柱状图** | 完整 | 最完整 | 完整 + Canvas 版 | 仅基础 | 完全自定义 | 完整 |
| **Treemap** | 基础支持 | 支持 + 层级钻取 | 三渲染模式 | 不支持 | `@visx/hierarchy` | 不支持 |
| **渲染方式** | SVG | Canvas / WebGL | SVG + Canvas | Canvas | SVG + Canvas | Canvas |
| **大数据性能** | 1k+ 有感知卡顿 | 百万级数据点 | Canvas 版较好 | 金融实时优化 | 取决于实现 | 百万级 |
| **Bundle（gzip）** | ~50 KB | 按需 ~80-130 KB | ~82 KB | **~12 KB**（gzip） | ~30-50 KB | ~66 KB |
| **学习曲线** | 低 | 中高 | 中 | 中（金融专用） | 高（需 D3 知识） | 低 |
| **TypeScript** | v3 后良好 | 良好 | 良好 | 优秀（TS 编写） | 优秀（TS 编写） | 良好 |
| **SSR 支持** | 有限制 | 有限制 | 原生支持 | 不支持 | 需配置 | 不支持 |
| **维护状态** | 活跃 | 非常活跃 | 活跃 | 非常活跃 | 更新节奏慢 | 活跃 |

---

## K 线图：哪个库真正好用？

### TradingView Lightweight Charts — 唯一专业选择

如果 K 线图是项目的核心需求，Lightweight Charts 是唯一不需要妥协的选择。

它是专为金融时序数据设计的，K 线（Candlestick）、折线（Line）、面积（Area）、成交量柱（Histogram）都是第一公民。数据格式极简：

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

在 React 中使用（useRef + useEffect 模式）：

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

v5（2026 年 4 月最新）base bundle 35 KB（未压缩），gzip 后约 **12 KB**，是所有图表库里最小的。Canvas 渲染，实时 tick 级更新（每秒数百次数据刷新）依然流畅。

**局限**：只做金融图表。如果仪表盘还需要饼图、热力图、散点图，需要引入另一个库。

### Apache ECharts — K 线 + 量价混合场景

量价图（K 线 + 柱状成交量）在金融产品里极常见，ECharts 的 candlestick series 和 bar series 可以直接叠加在同一个图表实例里：

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

内置的 `dataZoom` 组件（鼠标滚轮缩放、滑动条范围选择）在金融场景里非常实用，无需额外开发。

### Recharts — K 线图的陷阱

Recharts 官方示例展示了用 `<Bar>` + `<ErrorBar>` 模拟 K 线图，但这只是近似实现：

```tsx
// 这种实现的问题：
// 1. 阳线/阴线颜色需要用 Cell 逐个设置，数据量大时性能差
// 2. 影线（上下 wick）和实体颜色联动逻辑需要手写
// 3. 没有金融图表需要的十字光标、价格标签等组件
// 4. 代码量是 Lightweight Charts 的 3-5 倍
```

如果项目只是偶尔展示一个 K 线图，可以接受这种实现。但如果 K 线图是核心功能，维护成本会很高。

---

## 柱状图：Recharts 为什么是默认选择

### Recharts — React 友好的首选

Recharts 是下载量最高的 React 专属图表库（3.6M 周下载），核心原因是它与 React 的组合方式高度一致：

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

`stackId` 实现堆叠、`Cell` 自定义颜色、`LabelList` 显示数值标签，都是声明式写法，不需要记配置项路径。

**限制**：SVG 渲染，数据量超过 1000 个数据点时会有感知卡顿。柱状图 bar 数量很多（如时序数据按分钟统计 24 小时 = 1440 个点）时，应考虑切换到 ECharts 或 Chart.js。

### Apache ECharts — 大数据 + 高级交互

数据量超 1 万，或者需要 brush 选择、动态排序等高级交互时，ECharts 是更合适的选择：

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

ECharts v6（2025 年 7 月发布）新增矩阵坐标系，进一步扩展了柱状图的展示能力。

### Nivo — 视觉精致和无障碍

如果产品有无障碍要求（WCAG 2.1 AA），Nivo 是主流 React 图表库中开箱即用无障碍支持最完整的选择之一。动画效果基于 `@react-spring`，过渡效果最精致：

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

数据量大时切换到 `<BarCanvas>`，用 Canvas 渲染替代 SVG，API 保持一致。

---

## Treemap：Nivo 领先

### Nivo @nivo/treemap — 三渲染模式

Nivo 的 Treemap 支持 SVG、Canvas、HTML 三种渲染方式，通过 `nodeComponent` 可以完全自定义每个节点：

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

如果需要完全自定义每个格子的渲染，Nivo 提供 `nodeComponent` prop，可以传入自定义 React 组件来控制节点的外观和交互——比如在格子里加 sparkline、progress bar 或任意 SVG 元素。具体 API 参考 [nivo.rocks/treemap](https://nivo.rocks/treemap/) 的 nodeComponent 文档。

### Apache ECharts — 层级钻取

如果 Treemap 需要支持点击父节点放大（drill-down）和面包屑导航，ECharts 内置了这个功能：

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

## 性能对比：何时 SVG 不够用？

渲染方式决定了性能上限：

| 渲染方式 | 适用数据量 | 特点 |
|----------|-----------|------|
| SVG | < 1000 数据点 | DOM 节点多，但可 CSS 控制、支持 SSR |
| Canvas 2D | < 100 万数据点 | 性能强，无法 CSS 控制单个元素 |
| WebGL | > 100 万数据点 | 极限性能，ECharts GL 支持 |

Recharts 使用 SVG，数据点超过 1000 时页面渲染帧率明显下降。ECharts 默认用 Canvas，即使 10 万个数据点也能流畅渲染。

参考基准（MacBook Pro M3，Chrome 122，柱状图，默认配置）：

| 数据量 | Recharts (SVG) | ECharts (Canvas) | Chart.js (Canvas) |
|--------|----------------|-----------------|------------------|
| 500 点 | 流畅 | 流畅 | 流畅 |
| 2000 点 | 轻微卡顿 | 流畅 | 流畅 |
| 10000 点 | 明显卡顿 | 流畅 | 流畅 |
| 100000 点 | 无法使用 | 流畅 | 基本流畅 |

> 以上为参考数据，实际表现与数据结构、动画配置、图表类型相关，建议在目标设备上自行基准测试。

---

## Bundle Size 对比

按需引入是关键。ECharts 全量包 ~340 KB（gzip），按需只引入用到的组件可显著减少体积——以 BarChart + Tooltip + Grid + DataZoom 组合为例，约 **80-130 KB**（gzip，实际取决于组件组合，建议用 bundlejs.com 实测）：

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

Recharts v3 已设置 `sideEffects: false` 并提供 ES Module 输出，Vite/Webpack 5 下可 tree-shake，但其核心依赖（d3、victory-vendor 等）体积较大，实际收益有限，整包 gzip 仍约 50 KB。

---

## 选型决策树

```
需要 K 线图？
  ├── K 线是核心功能 → Lightweight Charts（专业、最小体积）
  └── K 线 + 其他图表混合 → Apache ECharts（一库全搞定）

不需要 K 线图：
  ├── 数据量 > 1 万 → Apache ECharts（Canvas 性能）
  ├── 需要 Treemap + 精致动画 → Nivo
  ├── 视觉高度定制（有 D3 经验）→ Visx
  └── 通用仪表盘，快速开发 → Recharts
```

## 场景推荐速查

| 场景 | 推荐 | 理由 |
|------|------|------|
| 纯金融 K 线图 | **Lightweight Charts** | 专业设计，gzip ~12 KB，Canvas 性能最优 |
| K 线 + 量价柱状图混合 | **Apache ECharts** | 原生支持叠加，内置 dataZoom |
| 通用业务仪表盘 | **Recharts** | 学习成本最低，社区最大 |
| 数据量 10k+ | **Apache ECharts** | Canvas/WebGL 渲染 |
| Treemap + 层级钻取 | **Apache ECharts** | 内置 drill-down，面包屑导航 |
| Treemap + 自定义节点 | **Nivo** | nodeComponent 完全自定义 |
| 无障碍（WCAG 2.1 AA） | **Nivo** | 开箱无障碍支持最完整的选择之一 |
| 极致定制化 | **Visx** | D3 原语，完全控制 |
| 快速原型 | **Chart.js** | 文档最多，社区问答最丰富 |

---

## 结论

没有一个图表库适合所有场景。实际项目中最常见的两种组合方案：

**方案 A（金融/交易类产品）**：Lightweight Charts（K 线） + Recharts 或 ECharts（其他图表）

**方案 B（通用 SaaS 仪表盘）**：Apache ECharts（主力，性能好功能全） 或 Recharts + Nivo（React 友好 + 精致视觉，适合数据量不大的场景）

如果只能选一个并且对性能有要求，**Apache ECharts** 是覆盖最广的单一选择：K 线、柱状图、Treemap 全部原生支持，Canvas 渲染不怕大数据，按需引入后体积可控。如果团队 React 经验丰富且数据量有限，**Recharts** 的开发体验更接近 React 惯例，上手成本最低。
