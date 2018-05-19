/* eslint-disable */
var path = require("path");
var webpack = require("webpack");
var HtmlWebpackPlugin = require("html-webpack-plugin");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var CopyWebpackPlugin = require("copy-webpack-plugin");
var OfflinePlugin = require('offline-plugin');
var UglifyJSPlugin = require('uglifyjs-webpack-plugin');

// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  entry: {
    main: ['babel-polyfill', "./js/index"],
  },
  output: {
    filename: "main.[chunkHash].js",
    path: path.join(__dirname, "/static"),
    chunkFilename: '[name].[chunkhash].chunk.js',
    publicPath: "/"
  },
  resolve: {
    modules: ['node_modules'],
    alias: {
      business: process.cwd(),
      js: path.resolve("js"),
      img: path.resolve("img"),
      resources: path.resolve("js/resources"),
      apps: path.resolve("js/apps")
    },
    extensions: [".js"]
  },
  plugins: [
    // new BundleAnalyzerPlugin(),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'main',
      children: true,
      async: true,
      minChunks: function(module) {
        return module.context && module.context.indexOf('node_modules') !== -1;
      }
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'main',
      async: 'chunk-vendor',
      children: true,
      minChunks: function(module, count) {
        return count >= 2;
      }
    }),

    new ExtractTextPlugin("css/main.[contentHash].css"),
    new HtmlWebpackPlugin({
      filename: "index.html",
      template: "index.html"
    }),
    new UglifyJSPlugin({
      // 最紧凑的输出
      beautify: false,
      // 删除所有的注释
      comments: false,
      compress: {
        // 在UglifyJs删除没有用到的代码时不输出警告
        warnings: false,
        // 删除所有的 `console` 语句
        // 还可以兼容ie浏览器
        drop_console: true,
        // 内嵌定义了但是只用到一次的变量
        collapse_vars: true,
        // 提取出出现多次但是没有定义成变量去引用的静态值
        reduce_vars: true
      }
    }),
    new CopyWebpackPlugin([
      {
        from: "img",
        to: "img"
      },
      {
        from: "manifest.json"
      }
    ]),
    new webpack.DefinePlugin({
      __DEVELOPMENT__: false,
      __DEVTOOLS__: false,
      "process.env": {
        NODE_ENV: JSON.stringify("production")
      }
    }),
    new OfflinePlugin({
      relativePaths: false,
      publicPath: '/',
      ServiceWorker: {
        events: true
      },
      caches: {
        main: [':rest:'],

        additional: ['*.chunk.js']
      },
      AppCache: false
    })
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader',
          options: {
            plugins: [
              [
                'import',
                {
                  libraryName: 'antd',
                  style: true
                }
              ]
            ]
          }
        },
        exclude: /node_modules/,
        include: path.join(__dirname, 'js')
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'raw-loader'],
        include: __dirname
      },
      {
        test: /\.less$/,
        use: [
          'style-loader',
          'css-loader',
          'less-loader'
        ],
        include: __dirname
      },
      {
        test: /\.(jpeg|png|jpg|gif|pdf|mp3|ogg|wav)$/,
        use: ['file-loader?name=[path][name].[ext]']
      },
      {
        test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        use: ['url-loader?limit=10000&mimetype=application/font-woff']
      },
      {
        test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        use: ['file-loader']
      },
      {
        test: /\.md$/,
        loader: ["html-loader", 'markdown-loader']
      }
    ]
  }
};
