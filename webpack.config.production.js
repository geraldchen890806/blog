/* eslint-disable */
var path = require("path");
var webpack = require("webpack");
var HtmlWebpackPlugin = require("html-webpack-plugin");
var CopyWebpackPlugin = require("copy-webpack-plugin");
var OfflinePlugin = require("offline-plugin");
var MiniCssExtractPlugin = require("mini-css-extract-plugin");
var OptimizeCssAssetsPlugin = require("optimize-css-assets-webpack-plugin");

// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  mode: "production",
  entry: {
    main: "./js/index"
  },
  output: {
    filename: "main.[chunkHash].js",
    path: path.join(__dirname, "/static"),
    chunkFilename: "[name].[chunkhash].chunk.js",
    publicPath: "/"
  },
  resolve: {
    modules: ["node_modules"],
    alias: {
      business: process.cwd(),
      js: path.resolve("js"),
      img: path.resolve("img"),
      resources: path.resolve("js/resources"),
      apps: path.resolve("js/apps")
    },
    extensions: [".js"]
  },
  optimization: {
    splitChunks: {
      chunks: "async",
      minSize: 30000,
      minChunks: 1,
      maxAsyncRequests: 5,
      maxInitialRequests: 3,
      automaticNameDelimiter: "~",
      name: true,
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10
        },
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true
        }
      }
    }
  },
  plugins: [
    // new BundleAnalyzerPlugin(),

    new MiniCssExtractPlugin({
      filename: "[name].css",
      chunkFilename: "[id].css"
    }),
    new OptimizeCssAssetsPlugin({
      assetNameRegExp: /\.optimize\.css$/g,
      cssProcessor: require("cssnano"),
      cssProcessorOptions: { safe: true, discardComments: { removeAll: true } },
      canPrint: true
    }),
    new HtmlWebpackPlugin({
      filename: "index.html",
      template: "index.html"
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
      publicPath: "/",
      ServiceWorker: {
        events: true
      },
      caches: {
        main: [":rest:"],

        additional: ["*.chunk.js"]
      },
      AppCache: false
    })
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: "babel-loader",
          options: {
            plugins: [
              [
                "import",
                {
                  libraryName: "antd",
                  style: true
                }
              ]
            ]
          }
        },
        exclude: /node_modules/,
        include: path.join(__dirname, "js")
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader
          },
          "css-loader"
        ],
        include: __dirname
      },
      {
        test: /\.less$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader
          },
          "css-loader",
          { loader: "less-loader", options: { javascriptEnabled: true } }
        ],
        include: __dirname
      },
      {
        test: /\.(jpeg|png|jpg|gif|pdf|mp3|ogg|wav)$/,
        use: ["file-loader?name=[path][name].[ext]"]
      },
      {
        test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        use: ["url-loader?limit=10000&mimetype=application/font-woff"]
      },
      {
        test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        use: ["file-loader"]
      },
      {
        test: /\.md$/,
        loader: ["raw-loader"]
      }
    ]
  }
};
