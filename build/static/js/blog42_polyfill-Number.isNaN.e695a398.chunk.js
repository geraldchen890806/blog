(window.webpackJsonp=window.webpackJsonp||[]).push([[42],{jp8A:function(n,e,N){"use strict";N.r(e);var i=N("q1tI"),r=N.n(i),u=N("IujW"),a=N.n(u);e.default=function(){return r.a.createElement(a.a,{source:"## 通过[polyfill](/tag/polyfill)学习 js -- Number.isNaN\n\n### Number.isNaN\n\n```\n  if(!Number.isNaN) {\n    Number.isNaN = function(n) {\n      return n !== n;\n    }\n  }\n\n  // window.isNaN('a') true\n  if(!Number.isNaN) {\n    Number.isNaN = function(n) {\n      return (\n\n        typeof n === 'number' &&\n        window.isNaN(n)\n      )\n    }\n  }\n```",htmlMode:"raw"})}}}]);