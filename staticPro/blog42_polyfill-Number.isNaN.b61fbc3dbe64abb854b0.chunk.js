(window.webpackJsonp=window.webpackJsonp||[]).push([[38],{ImWS:function(n,e){n.exports="## 通过[polyfill](/tag/polyfill)学习 js -- Number.isNaN\n\n### Number.isNaN\n\n```\n  if(!Number.isNaN) {\n    Number.isNaN = function(n) {\n      return n !== n;\n    }\n  }\n\n  // window.isNaN('a') true\n  if(!Number.isNaN) {\n    Number.isNaN = function(n) {\n      return (\n\n        typeof n === 'number' &&\n        window.isNaN(n)\n      )\n    }\n  }\n```"},jp8A:function(n,e,i){"use strict";i.r(e);var N=i("q1tI"),r=i.n(N),u=i("IujW"),a=i.n(u),t=i("ImWS"),o=i.n(t);e.default=function(){return r.a.createElement(a.a,{source:o.a,htmlMode:"raw"})}}}]);