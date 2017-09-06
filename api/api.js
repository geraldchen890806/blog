var express = require("express");
var blog = require("./blog");
const request = require("superagent");

const appId = "wx3451a3941b095c75";
const secret = "fba1e9ed15b672f05f45ac4943416105";

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
    request
      .get(
        `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${secret}`
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
