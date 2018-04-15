/* eslint-disable */
var path = require("path");
var webpack = require("webpack");
var HtmlWebpackPlugin = require("html-webpack-plugin");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var CopyWebpackPlugin = require("copy-webpack-plugin");
var OfflinePlugin = require('offline-plugin');

module.exports = {
  entry: {
    app: "./js/index",
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
      js: path.resolve("js"),
      resources: path.resolve("js/resources"),
      apps: path.resolve("js/apps")
    },
    extensions: ["", ".js"]
  },
  plugins: [
    new ExtractTextPlugin("css/main.[contentHash].css"),
    new webpack.optimize.CommonsChunkPlugin(
      /* chunkName= */ "vendor",
      /* filename= */ "vendor.[hash].js"
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
        from: "img",
        to: "img"
      },
      {
        from: "manifest.json"
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
    }),
    new OfflinePlugin({
      relativePaths: false,
      publicPath: '/static/',

      // No need to cache .htaccess. See http://mxs.is/googmp,
      // this is applied before any match in `caches` section
      // excludes: ['.htaccess'],

      caches: {
        main: [':rest:'],

        // All chunks marked as `additional`, loaded after main section
        // and do not prevent SW to install. Change to `optional` if
        // do not want them to be preloaded at all (cached only when first loaded)
        // additional: ['*.chunk.js']
      },

      // Removes warning for about `additional` section usage
      safeToUseOptionalCaches: true,

      AppCache: false
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
        include: path.join(__dirname, "js")
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
        test: /\.json$/,
        loader: 'json-loader',
        exclude: /node_modules/
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
