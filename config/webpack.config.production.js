/* eslint-disable */
var path = require('path');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
var OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
var OfflinePlugin = require('offline-plugin');
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer')
// .BundleAnalyzerPlugin;
const theme = require('./theme');
const joinRootPath = (p) => path.join(process.cwd(), p);

module.exports = {
  mode: 'production',
  entry: path.join(process.cwd(), 'js/index'),
  output: {
    filename: 'static/js/[name].[chunkhash:8].js',
    chunkFilename: 'static/js/[name].[chunkhash:8].chunk.js',
    path: path.join(process.cwd(), 'build'),
    publicPath: '/',
  },
  resolve: {
    modules: ['node_modules'],
    alias: {
      business: process.cwd(),
      moment$: 'moment/moment.js',
      js: path.resolve('js'),
      resources: path.resolve('js/resources'),
      img: path.resolve('img'),
      apps: path.resolve('js/apps'),
      moment: path.resolve(path.join(process.cwd(), 'node_modules', 'moment')),
    },
    extensions: ['.js'],
  },
  optimization: {
    runtimeChunk: 'single',
    moduleIds: 'hashed',
    splitChunks: {
      chunks: 'all',
      name: true,
    },
  },
  plugins: [
    // new BundleAnalyzerPlugin(),
    new webpack.ContextReplacementPlugin(/moment[\/\\]locale$/, /zh-cn/),
    new MiniCssExtractPlugin({
      filename: 'static/css/[name].[contenthash:8].css',
      chunkFilename: 'static/css/[name].[contenthash:8].chunk.css',
    }),
    new OptimizeCssAssetsPlugin({
      assetNameRegExp: /\.css$/g,
      cssProcessor: require('cssnano'),
      cssProcessorOptions: {
        safe: true,
        autoprefixer: { disable: true },
        discardComments: { removeAll: true },
      },
      canPrint: true,
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: path.join(process.cwd(), 'public/index.html'),
      favicon: path.join(process.cwd(), 'public/favicon.ico'),
      chunksSortMode: 'none',
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true,
      },
    }),
    new webpack.DefinePlugin({
      __DEVELOPMENT__: false,
      __DEVTOOLS__: false,
      'process.env': {
        NODE_ENV: JSON.stringify('production'),
      },
    }),
    new CopyWebpackPlugin([
      {
        from: 'img/icon.png',
        to: 'static/images',
      },
      {
        from: 'public/manifest.json',
      },
    ]),
    new OfflinePlugin({
      relativePaths: false,
      version: '',
      ServiceWorker: {
        events: true,
        output: 'service-worker.js',
      },
      caches: {
        main: [':rest:'],
        additional: ['static/**/*.chunk.js'],
        optional: ['static/images/*'],
      },
      excludes: ['index.html'],
      AppCache: false,
    }),
  ],
  node: {
    fs: false,
  },
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
                  libraryName: 'antd-mobile',
                },
              ],
            ],
          },
        },
        include: [
          path.resolve('js'),
          path.resolve('node_modules/@scatterjs/core'),
          path.resolve('node_modules/base-x'),
        ],
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              publicPath: '../../',
            },
          },
          'css-loader',
        ],
      },
      {
        test: /\.less$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              publicPath: '../../',
            },
          },
          'css-loader',
          {
            loader: 'less-loader',
            options: {
              javascriptEnabled: true,
              modifyVars: theme,
            },
          },
        ],
      },
      {
        test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
        use: {
          loader: 'url-loader',
          options: {
            limit: 10 * 1024,
            name: 'static/images/[name].[hash:8].[ext]',
          },
        },
      },

      {
        test: /\.(eot|otf|ttf|woff|woff2)$/,
        use: {
          loader: 'file-loader',
          options: {
            name: 'static/fonts/[name].[hash:8].[ext]',
          },
        },
      },
      {
        test: /\.(mp3|ogg|wav|svg)$/,
        use: {
          loader: 'file-loader',
          options: {
            name: 'static/media/[name].[hash:8].[ext]',
          },
        },
      },
      {
        test: /\.md$/,
        loader: ['raw-loader'],
      },
    ],
  },
};
