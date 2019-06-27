(window.webpackJsonp=window.webpackJsonp||[]).push([[19],{"64SO":function(n,r,a){"use strict";a.r(r);var c=a("q1tI"),t=a.n(c),o=a("IujW"),e=a.n(o);r.default=function(){return t.a.createElement(e.a,{source:'concat 方法将一个或多个字符串与原字符串连接合并，形成一个新的字符串并返回\n\n```\nstring.concat(string2, string3[, ..., stringN])\n\ns = "a".concat("b");//"ab"\n```\n如果有个需求字符串"a"链接数组arr = ["b", "c"]里的所有字符串\n```\n// 文艺解法\narr = ["b", "c"];\nString.prototype.concat.apply("a", arr); // "abc"\n// 普通解法\narr.unshift("a")\narr.join("");// "abc"\n// **解法\nvar res = "a"\nfor(var i in arr) {\n  res = res.concat(arr[i])\n}\n//或者\narr.forEach(function (v, i) { //ie9+\n  res = res.concat(v);\n})\nres; // "abc"\n```\n',htmlMode:"raw"})}}}]);