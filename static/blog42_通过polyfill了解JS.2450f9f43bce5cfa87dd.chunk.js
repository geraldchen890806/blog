(window.webpackJsonp=window.webpackJsonp||[]).push([[45],{501:function(n,e,t){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.default=function(){return u.default.createElement(i.default,{source:r.default,htmlMode:"raw"})};var u=o(t(2)),i=o(t(508)),r=o(t(824));function o(n){return n&&n.__esModule?n:{default:n}}},824:function(n,e){n.exports="## 本篇博客通过一下 js polyfill 来了解 JS（持续更新...）\n\n### Number.isNaN\n\n```\n  // window.isNaN('a') true\n  if(!Number.isNaN) {\n    Number.isNaN = function(n) {\n      return (\n\n        typeof n === 'number' &&\n        window.isNaN(n)\n      )\n    }\n  }\n```\n\n### Object.is\n\n```\n  object.is = function(v1, v2) {\n    // 0 === -0 Infinity !== -Infinity\n    if (v1 === 0 && v2 === 0) {\n      retuen 1 / v1 === 1 / v2;\n    }\n    // NaN !== NaN\n    if (v2 !== v2) {\n      return v2 !== v2;\n    }\n    return v1 === v2;\n  }\n```\n"}}]);