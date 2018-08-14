## 升级 webpack4

推荐 2 个命令

- [npm check](https://segmentfault.com/a/1190000011085967)
- [npm outdated](https://docs.npmjs.com/cli/outdated)

### 第一步先把项目启动。。 下面列一下要修改的地方

1 新增[mode](https://webpack.docschina.org/concepts/mode/)配置
通过将 mode 参数设置为 development, production 或 none，可以启用对应环境下 webpack 内置的优化。默认值为 production。

2 CommonsChunkPlugin 替换使用 [splitChunks](https://webpack.docschina.org/plugins/split-chunks-plugin/)

3 extract-text-webpack-plugin 替换使用 [mini-css-extract-plugin](https://webpack.js.org/plugins/mini-css-extract-plugin/#src/components/Sidebar/Sidebar.jsx)

```
  // [注意不能同时使用style-loader](https://github.com/webpack-contrib/mini-css-extract-plugin/issues/173)
  const MiniCssExtractPlugin = require("mini-css-extract-plugin");
  const devMode = process.env.NODE_ENV !== 'production'
  module.exports = {
    plugins: [
      new MiniCssExtractPlugin({
        // Options similar to the same options in webpackOptions.output
        // both options are optional
        filename: devMode ? '[name].css' : '[name].[contenthash].css', // 使用contenthash
        chunkFilename: devMode ? '[id].css' : '[id].[contenthash].css',
      })
    ],
    module: {
      rules: [
        {
          test: /\.(sa|sc|c)ss$/,
          use: [
            devMode ? 'style-loader' : MiniCssExtractPlugin.loader,
            'css-loader',
            'postcss-loader',
            'sass-loader',
          ],
        }
      ]
    }
  }
```

推荐添加[optimize-css-assets-webpack-plugin](https://github.com/NMFR/optimize-css-assets-webpack-plugin)

4 md 文件的 loader 使用'row-loader' 原来使用的`["html-loader", 'markdown-loader']`无效了。。
