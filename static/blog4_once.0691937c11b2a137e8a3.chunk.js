(window.webpackJsonp=window.webpackJsonp||[]).push([[7],{500:function(n,e,t){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.default=function(){return o.default.createElement(a.default,{source:u.default,htmlMode:"raw"})};var o=r(t(2)),a=r(t(506)),u=r(t(822));function r(n){return n&&n.__esModule?n:{default:n}}},822:function(n,e){n.exports='###Description:\n\nYou\'ll implement once, a function that takes another function as an argument, and returns a new version of that function that can only be called once.\n\nSubsequent calls to the resulting function should have no effect (and should return undefined).\n\nFor example:\n\n    logOnce = once(console.log)\n    logOnce("foo") // -> "foo"\n    logOnce("bar") // -> no effect\n\n就是写一个函数，可以生成只能调用一次的函数，一个简单的闭包的应用\n\nsolution:\n\n    function once(fn) {\n        var flag = true;\n        return function(){\n          if(flag) {\n            flag = false;\n            return fn.apply(this, arguments);\n          }\n          return;\n        };\n    }\n\nfrom http://www.codewars.com/kata/once/solutions/javascript'}}]);