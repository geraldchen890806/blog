const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
  output: {
    path: path.join(__dirname, 'vender'),
    // filename: "vender.[hash].js",
    filename: 'vender.js',
    library: 'vender',
    publicPath: '/vender/',
  },
  entry: {
    lib: [
      'antd',
      'axios',
      'history',
      'lodash',
      'moment',
      'prop-types',
      'query-string',
      'react',
      'react-audio-player',
      'react-dom',
      'react-markdown',
      'react-redux',
      'react-router',
      'react-router-dom',
      'connected-react-router',
      'redux',
      'redux-thunk',
      'styled-components',
    ],
  },
  plugins: [
    new webpack.DllPlugin({
      path: path.join(__dirname, 'dll.json'),
      name: 'vender',
      context: path.join(__dirname, 'vender'),
    }),
  ],
  resolve: {
    modules: ['node_modules'],
    extensions: ['.js'],
  },
};
