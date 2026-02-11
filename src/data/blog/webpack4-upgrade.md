---
author: 陈广亮
pubDatetime: 2018-09-10T10:00:00+08:00
title: Webpack 4 升级指南
slug: webpack4-upgrade
featured: false
draft: false
tags:
  - Webpack
  - 前端工程化
description: Webpack 3 升级到 Webpack 4 的关键改动整理。
---

## 推荐工具

- [npm check](https://segmentfault.com/a/1190000011085967) — 检查依赖更新
- [npm outdated](https://docs.npmjs.com/cli/outdated) — 查看过时依赖

## 关键改动

### 1. 新增 mode 配置

通过 `mode` 参数设置为 `development`、`production` 或 `none`，启用对应环境下的内置优化。默认值为 `production`。

### 2. CommonsChunkPlugin → splitChunks

```js
optimization: {
  splitChunks: {
    chunks: 'all'
  }
}
```

### 3. 优化 chunk 打包 hash

```js
optimization: {
  runtimeChunk: 'single',
},
plugins: [
  new webpack.HashedModuleIdsPlugin(),
]
```

### 4. extract-text-webpack-plugin → mini-css-extract-plugin

```js
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const devMode = process.env.NODE_ENV !== "production";

module.exports = {
  plugins: [
    new MiniCssExtractPlugin({
      filename: devMode ? "[name].css" : "[name].[contenthash].css",
      chunkFilename: devMode ? "[id].css" : "[id].[contenthash].css",
    }),
  ],
  module: {
    rules: [
      {
        test: /\.(sa|sc|c)ss$/,
        use: [
          devMode ? "style-loader" : MiniCssExtractPlugin.loader,
          "css-loader",
          "postcss-loader",
          "sass-loader",
        ],
      },
    ],
  },
};
```

> **注意**：不能同时使用 `style-loader` 和 `MiniCssExtractPlugin.loader`。
