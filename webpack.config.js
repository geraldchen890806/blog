/* eslint-disable */
var path = require('path');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    devtool: 'source-map',
    entry: {
        app: ['eventsource-polyfill',
            'webpack-hot-middleware/client',
            './fe/js/index'
        ],
        vendor: ['eventsource-polyfill', 'webpack-hot-middleware/client',  "jquery", "lodash", "moment", "react", "react-dom", "react-redux", "react-router", "react-router-redux", "redux", "redux-thunk"]
    },
    output: {
        filename: 'bundle.js',
        path: path.join(__dirname, 'dist'),
        publicPath: '/static/'
    },
    plugins: [
        new webpack.optimize.CommonsChunkPlugin( /* chunkName= */ "vendor", /* filename= */ "vendor.[hash].js"),
        new HtmlWebpackPlugin({
            filename: 'index.html',
            template: 'index.html'
        }),
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NoErrorsPlugin(),
        new webpack.DefinePlugin({
            __DEVELOPMENT__: true,
            __DEVTOOLS__: true
        }),
        new webpack.ProvidePlugin({
            'jQuery': 'jquery'
        })
    ],
    resolve: {
        alias: {
            'business': process.cwd(),
            'js': path.resolve('fe/js'),
            'core': path.resolve('fe/js/core'),
            'apps': path.resolve('fe/js/apps')
                // 'redux': path.join(__dirname, 'node_modules/redux')
        },
        extensions: ['', '.js']
    },
    module: {
        loaders: [{
            test: /\.js$/,
            loader: 'babel',
            exclude: /node_modules/,
            include: path.join(__dirname, 'fe')
        }, {
            test: /\.css$/,
            loaders: ['style', 'raw'],
            include: __dirname
        }, {
            test: /\.less$/,
            loaders: ['style', 'css', 'less'],
            include: __dirname
        }, {
            test: /\.(jpeg|png|jpg|gif|pdf)$/,
            loader: 'file?name=[path][name].[ext]'
        }, {
            test: /\.woff|\.woff2$/,
            loader: "url?limit=10000&mimetype=application/font-woff"
        }, {
            test: /\.ttf$/,
            loader: "url?limit=10000&mimetype=application/octet-stream"
        }, {
            test: /\.(tpl|html)$/,
            loader: 'ejs'
        }, {
            test: /\.eot$/,
            loader: "file"
        }, {
            test: /\.svg$/,
            loader: "url?limit=10000&mimetype=image/svg+xml"
        }]
    }
};
