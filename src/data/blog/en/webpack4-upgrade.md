---
author: Gerald Chen
pubDatetime: 2018-09-10T10:00:00+08:00
title: Webpack 4 Upgrade Guide
slug: webpack4-upgrade
featured: false
draft: true
tags:
  - Webpack
  - 前端工程化
description: Key changes to know when upgrading from Webpack 3 to Webpack 4.
---

## Recommended Tools

- [npm check](https://segmentfault.com/a/1190000011085967) — check for dependency updates
- [npm outdated](https://docs.npmjs.com/cli/outdated) — list outdated dependencies

## Key Changes

### 1. New mode option

Set the `mode` option to `development`, `production`, or `none` to enable the built-in optimizations for that environment. The default is `production`.

### 2. CommonsChunkPlugin → splitChunks

```js
optimization: {
  splitChunks: {
    chunks: 'all'
  }
}
```

### 3. Better chunk hashing

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

> **Note**: `style-loader` and `MiniCssExtractPlugin.loader` cannot be used at the same time.
