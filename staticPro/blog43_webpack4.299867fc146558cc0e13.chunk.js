(window.webpackJsonp=window.webpackJsonp||[]).push([[44],{N9sa:function(n,s,e){"use strict";e.r(s);var t=e("q1tI"),o=e.n(t),i=e("IujW"),c=e.n(i),a=e("rxIh"),p=e.n(a);s.default=function(){return o.a.createElement(c.a,{source:p.a,htmlMode:"raw"})}},rxIh:function(n,s){n.exports="## 升级 webpack4\n\n推荐 2 个命令\n\n- [npm check](https://segmentfault.com/a/1190000011085967)\n- [npm outdated](https://docs.npmjs.com/cli/outdated)\n\n### 下面列一下要修改的地方\n\n1 新增[mode](https://webpack.docschina.org/concepts/mode/)配置\n通过将 mode 参数设置为 development, production 或 none，可以启用对应环境下 webpack 内置的优化。默认值为 production。\n\n2 CommonsChunkPlugin 替换使用 [splitChunks](https://webpack.docschina.org/plugins/split-chunks-plugin/)\n\n3 [优化 chunk 打包 hash](https://webpack.docschina.org/configuration/optimization/#optimization-runtimechunk) 以及 [HashedModuleIdsPlugin](https://webpack.docschina.org/plugins/hashed-module-ids-plugin/#src/components/Sidebar/Sidebar.jsx)\n\n```\n  optimization: {\n    runtimeChunk: 'single',\n  },\n  plugins: [\n    new webpack.HashedModuleIdsPlugin(),\n  ]\n```\n\n4 extract-text-webpack-plugin 替换使用 [mini-css-extract-plugin](https://webpack.js.org/plugins/mini-css-extract-plugin/#src/components/Sidebar/Sidebar.jsx)\n\n```\n  // [注意不能同时使用style-loader](https://github.com/webpack-contrib/mini-css-extract-plugin/issues/173)\n  const MiniCssExtractPlugin = require(\"mini-css-extract-plugin\");\n  const devMode = process.env.NODE_ENV !== 'production'\n  module.exports = {\n    plugins: [\n      new MiniCssExtractPlugin({\n        // Options similar to the same options in webpackOptions.output\n        // both options are optional\n        filename: devMode ? '[name].css' : '[name].[contenthash].css', // 使用contenthash\n        chunkFilename: devMode ? '[id].css' : '[id].[contenthash].css',\n      })\n    ],\n    module: {\n      rules: [\n        {\n          test: /\\.(sa|sc|c)ss$/,\n          use: [\n            devMode ? 'style-loader' : MiniCssExtractPlugin.loader,\n            'css-loader',\n            'postcss-loader',\n            'sass-loader',\n          ],\n        }\n      ]\n    }\n  }\n```\n\n推荐添加[optimize-css-assets-webpack-plugin](https://github.com/NMFR/optimize-css-assets-webpack-plugin)\n\n5 md 文件的 loader 使用'row-loader' 原来使用的`[\"html-loader\", 'markdown-loader']`无效了。。\n\n参考：[Webpack 4 如何优雅打包缓存文件](http://imweb.io/topic/5b6f224a3cb5a02f33c013ba)\n[手摸手，带你用合理的姿势使用 webpack4（上）](https://juejin.im/post/5b56909a518825195f499806)\n"}}]);