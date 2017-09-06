/* eslint-disable */
var isDev = process.env.NODE_ENV !== "production";
var webpack = require("webpack");
var express = require("express");
var path = require("path");
var app = express();
var favicon = require("serve-favicon");
var routes = require("./api/api");

routes(app);

if (!isDev) {
  app.use(favicon(__dirname + "/favicon.ico"));
  var static_path = path.join(__dirname);
  app.use("/static", express.static(__dirname + "/static"));
  app.use("/mp", express.static(__dirname + "/mp"));
  app.use(
    "/MP_verify_JDni6b15rFNM6wto.txt",
    express.static(__dirname + "/mp/MP_verify_JDni6b15rFNM6wto.txt")
  );
  app.get("*", function(req, res) {
    res.sendFile("/static/index.html", {
      root: static_path
    });
  });
  app.listen(80, function(err) {
    if (err) {
      console.log(err);
    }
    console.log("Listening at localhost:80");
  });
}

if (isDev) {
  var config = require("./webpack.config");
  var compiler = webpack(config);
  app.use("/static/img", express.static(__dirname + "/fe/img"));
  app.use("/mp", express.static(__dirname + "/mp"));
  app.use(
    "/MP_verify_JDni6b15rFNM6wto.txt",
    express.static(__dirname + "/mp/MP_verify_JDni6b15rFNM6wto.txt")
  );

  app.use(
    require("webpack-dev-middleware")(compiler, {
      noInfo: true,
      publicPath: config.output.publicPath
    })
  );

  app.use(require("webpack-hot-middleware")(compiler));

  app.use("/", function(req, res, next) {
    var filename = path.join(compiler.outputPath, "index.html");
    compiler.outputFileSystem.readFile(filename, function(err, result) {
      if (err) {
        return next(err);
      }
      res.set("content-type", "text/html");
      res.send(result);
      res.end();
    });
  });

  app.listen(3010, "0.0.0.0", function(err) {
    if (err) {
      console.log(err);
      return;
    }
    console.log("Listening at localhost:3010");
  });
}
