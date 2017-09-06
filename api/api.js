var express = require("express");
var blog = require("./blog");
const request = require("superagent");
var _ = require("lodash");

const secret = "3f4c554304b13b6d8d3229dffc17a6f0";
var sign = require("./sign.js");

let ticket;

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
    console.log(query);
    if (
      ticket &&
      query.appId == ticket.appId &&
      ticket.time - new Date() > -7200000
    ) {
      res.send(
        _.assignIn(sign(ticket.ticket, query.url), ticket, { url: query.url })
      );
      return;
    }

    request
      .get(
        `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${query.appId}&secret=${secret}`
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
            ticket = _.assignIn(resp2.body, { time: new Date() }, query);
            res.send(
              _.assignIn(sign(ticket.ticket, query.url), ticket, {
                url: query.url
              })
            );
          });
      });
  });
};
