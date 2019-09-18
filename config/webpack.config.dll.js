const path = require('path');
const webpack = require('webpack');
const pullAll = require('lodash/pullAll');
const pkg = require(path.join(process.cwd(), 'package.json'));

const exclude = [];
const outputPath = path.join(process.cwd(), 'node_modules/vender-dll');

module.exports = {
  mode: 'development',

  devtool: 'eval',

  entry: {
    vender: pullAll(Object.keys(pkg.dependencies), exclude),
  },

  output: {
    path: outputPath,
    filename: '[name].dll.js',
    library: '[name]',
    libraryTarget: 'var',
  },

  optimization: {
    minimize: false,
  },

  plugins: [
    new webpack.DllPlugin({
      name: '[name]',
      path: path.join(outputPath, 'manifest.json'),
    }),
  ],

  performance: {
    hints: false,
  },
};
