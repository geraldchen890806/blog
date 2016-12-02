/* eslint-disable */
var isDev = (process.env.NODE_ENV !== 'production');
var webpack = require('webpack');
var express = require('express');
var path = require('path');
var app = express();

var routes = require('./api/api');

routes(app);

if (!isDev) {
    var static_path = path.join(__dirname);
    app.use('/static', express.static(__dirname + '/static'));
    app.get('/', function (req, res) {
        res.sendFile('/static/index.html', {
            root: static_path
        });
    });
    // app.get('*', function(req, res) {
    //   res.sendFile(path.join(__dirname, 'index.html'));
    // });
    app.listen(process.env.PORT || 3010, function (err) {
        if (err) {
            console.log(err)
        };
        console.log('Listening at localhost:3000');
    });
}

if (isDev) {
    var config = require('./webpack.config');
    var compiler = webpack(config);
    app.use('/static/img', express.static(__dirname + '/fe/img'));

    app.use(require('webpack-dev-middleware')(compiler, {
        noInfo: true,
        publicPath: config.output.publicPath
    }));

    app.use(require('webpack-hot-middleware')(compiler));

    app.use('/', function (req, res, next) {
        var filename = path.join(compiler.outputPath, 'index.html');
        compiler.outputFileSystem.readFile(filename, function (err, result) {
            if (err) {
                return next(err);
            }
            res.set('content-type', 'text/html');
            res.send(result);
            res.end();
        });
    });

    app.listen(3010, 'localhost', function (err) {
        if (err) {
            console.log(err);
            return;
        }
        console.log('Listening at localhost:3010');
    });
}
