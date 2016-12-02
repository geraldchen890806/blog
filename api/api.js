var express = require("express");
var blog = require("./blog");

module.exports = function (app) {

    var allowCrossDomain = function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
        res.header("Access-Control-Allow-Headers", "Content-Type");

        next();
    };
    app.use(allowCrossDomain);

    app.all("/api/*", function (req, res, next) {
        blog.sqlBlogs(function (data) {
            res.send(data);
        });
    });
};
