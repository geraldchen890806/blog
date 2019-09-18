

/* eslint-disable */
var isDev = process.env.NODE_ENV !== 'production';
var webpack = require('webpack');
var express = require('express');
var path = require('path');
var app = express();

if (!isDev) {
  var static_path = path.join(__dirname, 'build');

  app
    .use(express.static(static_path))
    .get('*', function(req, res) {
      res.sendFile('./index.html', {
        root: static_path,
      });
    })
    .listen(process.env.PORT || 3000, function(err) {
      if (err) {
        console.log(err);
      }
      console.log('Listening at localhost:3000');
    });
}

if (isDev) {
  var config = require('./config/webpack.config');
  var compiler = webpack(config);
  app.use('/static/img', express.static(__dirname + '/img'));
  app.use('/node_modules/vender-dll', express.static(__dirname + '/node_modules/vender-dll'));

  app.use(
    require('webpack-dev-middleware')(compiler, {
      noInfo: true,
      publicPath: config.output.publicPath,
      stats: {
        colors: true,
        assets: false,
        modules: false,
        children: false,
      },
    })
  );

  app.use(require('webpack-hot-middleware')(compiler));

  app.get('*', function(req, res, next) {
    var filename = path.join(compiler.outputPath, 'index.html');
    compiler.outputFileSystem.readFile(filename, function(err, result) {
      if (err) {
        return next(err);
      }
      res.set('content-type', 'text/html');
      res.send(result);
      res.end();
    });
  });

  app.listen(process.env.PORT || 3000, '0.0.0.0', function(err) {
    if (err) {
      console.log(err);
      return;
    }
    console.log('Listening at localhost:' + (process.env.PORT || 3000));
  });
}


if (!isDev && process.env.SSLPORT) {
  var privateKey = fs.readFileSync(
    __dirname + '/sslforfree/private.key',
    'utf8'
  );
  var certificate = fs.readFileSync(
    __dirname + '/sslforfree/certificate.crt',
    'utf8'
  );
  var credentials = { key: privateKey, cert: certificate };
  var httpsServer = https.createServer(credentials, app);
  httpsServer.listen(process.env.SSLPORT || 3021, function(err) {
    if (err) {
      console.log(err);
      return;
    }
    console.log(
      'HTTPS Server is running on: https://localhost:%s',
      process.env.SSLPORT || 3021
    );
  });
}
