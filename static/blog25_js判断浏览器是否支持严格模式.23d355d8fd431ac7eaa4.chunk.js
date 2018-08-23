(window.webpackJsonp=window.webpackJsonp||[]).push([[28],{484:function(n,e,t){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.default=function(){return u.default.createElement(i.default,{source:a.default,htmlMode:"raw"})};var u=o(t(2)),i=o(t(508)),a=o(t(807));function o(n){return n&&n.__esModule?n:{default:n}}},807:function(n,e){n.exports='js构造函数类似于\n```\nfunction P (name, age) {\n  this.name = name;\n  this.age = age;\n}\n```\n\n使用new操作符则返回一个新的对象，如果没有加new操作符则函数内this指向全局对象window,而在严格模式中则为undefined，借此我们可以判断浏览器是否支持严格模式\n\n```\nvar hasStrictMode = (function(){ \n  "use strict";\n  return this == undefined;\n}())\n```\n\n这里介绍一个方法，可以忽略new操作符\n\n```\nfunction P () {\n  if (!(this instanceof P)) return new P();\n}\n```\n'}}]);