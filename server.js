/* eslint-disable */
var isDev = process.env.NODE_ENV !== "production";
var webpack = require("webpack");
var express = require("express");
var http = require('http');
var https = require('https');
var fs = require('fs');
var path = require("path");
var app = express();
var favicon = require("serve-favicon");

app.use(function(req, res, next) {
  if (!/https/.test(req.protocol) && process.env.SSLPORT) {
    res.redirect("http://chenguangliang.com/blog/react-router4");
    return;
  } else {
    return next();
  }
});
app.use(express.static(__dirname +'/static'));
app.use('/img', express.static(__dirname + '/img'));
app.use("/mp", express.static(__dirname + "/mp"));
app.use("/.well-known", express.static(__dirname + "/.well-known"));
app.use(
  "/MP_verify_JDni6b15rFNM6wto.txt",
  express.static(__dirname + "/mp/MP_verify_JDni6b15rFNM6wto.txt")
);
if (!isDev) {
  app.use(favicon(__dirname + "/favicon.ico"));
  var static_path = path.join(__dirname);
  app.get("*", function(req, res) {
    res.sendFile("/static/index.html", {
      root: static_path
    });
  });
} else {
  app.use('/vender', express.static(__dirname + '/vender'));
  app.use('/manifest.json', express.static(__dirname + '/manifest.json'));
  var config = require("./webpack.config");
  var compiler = webpack(config);
  app.use(
    require("webpack-dev-middleware")(compiler, {
      noInfo: true,
      publicPath: config.output.publicPath
    })
  );
  app.use(require("webpack-hot-middleware")(compiler));
}

var httpServer = http.createServer(app);

httpServer.listen(process.env.PORT || 3022, function(err) {
  if (err) {
    console.log(err);
    return;
  }
  console.log('HTTP Server is running on: http://localhost:%s', process.env.PORT || 3022);
});

if(!isDev){
  var privateKey  = fs.readFileSync(__dirname + '/sslforfree/private.key', 'utf8');
  var certificate = fs.readFileSync(__dirname + '/sslforfree/certificate.crt', 'utf8');
  var credentials = {key: privateKey, cert: certificate};
  var httpsServer = https.createServer(credentials, app);
  httpsServer.listen(process.env.SSLPORT || 3021, function(err) {
    if (err) {
      console.log(err);
      return;
    }
    console.log('HTTPS Server is running on: https://localhost:%s', process.env.SSLPORT || 3021);
  });
}