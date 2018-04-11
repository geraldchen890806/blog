/* eslint-disable */
var path = require("path");
var webpack = require("webpack");
var HtmlWebpackPlugin = require("html-webpack-plugin");
var OfflinePlugin = require('offline-plugin');
var CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  devtool: "source-map",
  entry: {
    app: [
      "eventsource-polyfill",
      "webpack-hot-middleware/client",
      "./js/index"
    ],
    vendor: [
      "eventsource-polyfill",
      "webpack-hot-middleware/client",
      "jquery",
      "lodash",
      "moment",
      "react",
      "react-dom",
      "react-redux",
      "redux",
      "redux-thunk"
    ]
  },
  output: {
    filename: "main.js",
    path: path.join(__dirname, "static"),
    publicPath: "/static/"
  },
  plugins: [
    new webpack.optimize.CommonsChunkPlugin(
      /* chunkName= */ "vendor",
      /* filename= */ "vendor.[hash].js"
    ),
    new HtmlWebpackPlugin({
      filename: "index.html",
      template: "index.html"
    }),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoErrorsPlugin(),
    new webpack.DefinePlugin({
      __DEVELOPMENT__: true,
      __DEVTOOLS__: true
    }),
    new CopyWebpackPlugin([
      {
        from: "img",
        to: "img"
      },
      {
        from: "mainfest.json"
      }
    ]),
    new webpack.ProvidePlugin({
      jQuery: "jquery"
    })
  ],
  resolve: {
    alias: {
      business: process.cwd(),
      js: path.resolve("js"),
      resources: path.resolve("js/resources"),
      apps: path.resolve("js/apps")
      // 'redux': path.join(__dirname, 'node_modules/redux')
    },
    extensions: ["", ".js"]
  },
  module: {
    loaders: [
      {
        test: /\.json$/,
        loader: "json-loader"
      },
      {
        test: /\.js$/,
        loader: "babel",
        exclude: /node_modules/,
        include: path.join(__dirname, "js")
      },
      {
        test: /\.css$/,
        loaders: ["style", "raw"],
        include: __dirname
      },
      {
        test: /\.less$/,
        loaders: ["style", "css", "less"],
        include: __dirname
      },
      {
        test: /\.(jpeg|png|jpg|gif|pdf)$/,
        loader: "file?name=[path][name].[ext]"
      },
      {
        test: /\.woff|\.woff2$/,
        loader: "url?limit=10000&mimetype=application/font-woff"
      },
      {
        test: /\.ttf$/,
        loader: "url?limit=10000&mimetype=application/octet-stream"
      },
      {
        test: /\.(tpl|html)$/,
        loader: "ejs"
      },
      {
        test: /\.eot$/,
        loader: "file"
      },
      {
        test: /\.svg$/,
        loader: "url?limit=10000&mimetype=image/svg+xml"
      },
      {
        test: /\.json$/,
        loader: 'json-loader',
        exclude: /node_modules/
      },
      {
        test: /\.md$/,
        loader: "html!markdown"
      }
    ]
  }
};
