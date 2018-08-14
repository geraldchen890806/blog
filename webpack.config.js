/* eslint-disable */
var path = require("path");
var webpack = require("webpack");
var HtmlWebpackPlugin = require("html-webpack-plugin");
var CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: "development",
  devtool: "source-map",
  entry: {
    app: ["eventsource-polyfill", "webpack-hot-middleware/client", "./js/index"]
  },
  output: {
    filename: "main.[hash].js",
    path: path.join(__dirname, "static"),
    chunkFilename: "[name].[chunkhash].chunk.js",
    publicPath: "/"
  },
  plugins: [
    // new webpack.DllReferencePlugin({
    //   context: path.join(__dirname, 'vender'),
    //   manifest: path.join(__dirname, 'dll.json')
    // }),
    new HtmlWebpackPlugin({
      filename: "index.html",
      template: "index.dev.html"
    }),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.DefinePlugin({
      __DEVELOPMENT__: true,
      __DEVTOOLS__: true
    })
  ],
  resolve: {
    alias: {
      business: process.cwd(),
      js: path.resolve("js"),
      img: path.resolve("img"),
      resources: path.resolve("js/resources"),
      apps: path.resolve("js/apps")
    },
    extensions: [".js"]
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: ["babel-loader?cacheDirectory"],
        exclude: /node_modules/,
        include: path.join(__dirname, "js")
      },
      {
        test: /\.css$/,
        use: ["style-loader", "raw-loader"],
        include: __dirname
      },
      {
        test: /\.less$/,
        use: [
          "style-loader",
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
