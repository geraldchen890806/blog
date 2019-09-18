/* eslint-disable */
var path = require('path');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer')
// .BundleAnalyzerPlugin;
const theme = require('./theme');
const joinRootPath = (p) => path.join(process.cwd(), p);

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  entry: {
    app: [
      'eventsource-polyfill',
      'webpack-hot-middleware/client',
      './js/index',
    ],
  },
  output: {
    filename: 'main.[hash].js',
    path: path.join(process.cwd(), 'build/static'),
    chunkFilename: '[name].[chunkhash].chunk.js',
    publicPath: '/static/',
  },
  node: {
    fs: false,
  },
  resolve: {
    modules: ['node_modules'],
    alias: {
      business: process.cwd(),
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
  },
  plugins: [
    // new BundleAnalyzerPlugin(),
    new webpack.ContextReplacementPlugin(/moment[\/\\]locale$/, /zh-cn/),
    new webpack.DllReferencePlugin({
      context: path.join(process.cwd(), 'vender'),
      manifest: require.resolve(
        path.join(process.cwd(), 'node_modules/vender-dll/manifest.json')
      ),
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: path.join(process.cwd(), 'public/index.html'),
      favicon: path.join(process.cwd(), 'public/favicon.ico'),
      chunksSortMode: 'none',
      minify: {
        collapseWhitespace: true,
      },
    }),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoEmitOnErrorsPlugin(),
    new webpack.DefinePlugin({
      __DEVELOPMENT__: true,
      __DEVTOOLS__: true,
    }),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        use: ['babel-loader?cacheDirectory'],
        include: [
          path.resolve('js'),
          path.resolve('node_modules/proxy-polyfill'),
          path.resolve('node_modules/@scatter'),
          path.resolve('node_modules/base-x'),
        ],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'raw-loader'],
      },
      {
        test: /\.less$/,
        use: [
          'style-loader',
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
        test: /\.(jpeg|png|jpg|gif|pdf|mp3|ogg|wav)$/,
        use: ['file-loader?name=[path][name].[ext]'],
      },
      {
        test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        use: ['url-loader?limit=10000&mimetype=application/font-woff'],
      },
      {
        test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        use: ['file-loader'],
      },
      {
        test: /\.md$/,
        loader: ['raw-loader'],
      },
    ],
  },
};
