(window.webpackJsonp=window.webpackJsonp||[]).push([[32],{488:function(n,e,t){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.default=function(){return u.default.createElement(a.default,{source:r.default,htmlMode:"raw"})};var u=o(t(2)),a=o(t(508)),r=o(t(811));function o(n){return n&&n.__esModule?n:{default:n}}},811:function(n,e){n.exports="咱就看2个IIFE\n\n```\n!function (a, b) {\n  arguments[0] = 11;\n  alert(a)\n} (1, 2)\n// 11\n\n!function (a, b) {\narguments[1] = 11;\nalert(b)\n} (1)\n\n// undefined\n```\n\n结论就是arguments会在函数调用时与输入参数做匹配，值同步，但arguments扩展不会影响原没有匹配的参数"}}]);