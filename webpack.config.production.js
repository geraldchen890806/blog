/* eslint-disable */
var path = require("path");
var webpack = require("webpack");
var HtmlWebpackPlugin = require("html-webpack-plugin");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: {
    app: "./fe/js/index",
    vendor: [
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
    filename: "main.[chunkHash].js",
    path: path.join(__dirname, "/static"),
    publicPath: "/static/"
  },
  resolve: {
    alias: {
      business: process.cwd(),
      js: path.resolve("fe/js"),
      resources: path.resolve("fe/resources"),
      apps: path.resolve("fe/js/apps")
    },
    extensions: ["", ".js"]
  },
  plugins: [
    new ExtractTextPlugin("css/main.[contentHash].css"),
    new webpack.optimize.CommonsChunkPlugin(
      /* chunkName= */ "vendor",
      /* filename= */ "vendor.bundle.js"
    ),
    new HtmlWebpackPlugin({
      filename: "index.html",
      template: "index.html"
    }),
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.optimize.UglifyJsPlugin({
      compressor: {
        warnings: false
      }
    }),
    new CopyWebpackPlugin([
      {
        from: "fe/img",
        to: "img"
      }
    ]),
    new webpack.ProvidePlugin({
      jQuery: "jquery"
    }),
    new webpack.DefinePlugin({
      __DEVELOPMENT__: false,
      __DEVTOOLS__: false,
      "process.env": {
        NODE_ENV: JSON.stringify("production")
      }
    })
  ],
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
        include: path.join(__dirname, "fe/js")
      },
      {
        test: /\.css$/,
        loaders: ["style", "raw"],
        include: __dirname
      },
      {
        test: /\.less$/,
        loader: ExtractTextPlugin.extract(
          "style",
          "raw!autoprefixer?browsers=last 2 version!less"
        ),
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
        test: /\.md$/,
        loader: "html!markdown"
      }
    ]
  }
};
