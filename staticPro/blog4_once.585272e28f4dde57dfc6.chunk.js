(window.webpackJsonp=window.webpackJsonp||[]).push([[10],{"sW+d":function(n,e,t){"use strict";t.r(e);var o=t("q1tI"),a=t.n(o),c=t("IujW"),r=t.n(c),u=t("tEGK"),l=t.n(u);e.default=function(){return a.a.createElement(r.a,{source:l.a,htmlMode:"raw"})}},tEGK:function(n,e){n.exports='###Description:\n\nYou\'ll implement once, a function that takes another function as an argument, and returns a new version of that function that can only be called once.\n\nSubsequent calls to the resulting function should have no effect (and should return undefined).\n\nFor example:\n\n    logOnce = once(console.log)\n    logOnce("foo") // -> "foo"\n    logOnce("bar") // -> no effect\n\n就是写一个函数，可以生成只能调用一次的函数，一个简单的闭包的应用\n\nsolution:\n\n    function once(fn) {\n        var flag = true;\n        return function(){\n          if(flag) {\n            flag = false;\n            return fn.apply(this, arguments);\n          }\n          return;\n        };\n    }\n\nfrom http://www.codewars.com/kata/once/solutions/javascript'}}]);