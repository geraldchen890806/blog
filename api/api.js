var express = require("express");
var blog = require("./blog");
const request = require("superagent");

module.exports = function(app) {
  var allowCrossDomain = function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type");

    next();
  };
  app.use(allowCrossDomain);

  app.all("/api/*", function(req, res, next) {
    blog.sqlBlogs(function(data) {
      res.send(data);
    });
  });

  app.get("/wx/token", function(req, res, next) {
    let query = req.query || {};
    request
      .get(
        `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${query.appId}&secret=${query.secret}`
      )
      .end((err, resp) => {
        // res.send(resp.body);
        // console.log(resp.body);
        request
          .get(
            `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${resp
              .body.access_token}&type=jsapi`
          )
          .end((err, resp2) => {
            res.send(resp2.body);
          });
      });
  });
};
