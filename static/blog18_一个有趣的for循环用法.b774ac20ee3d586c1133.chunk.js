(window.webpackJsonp=window.webpackJsonp||[]).push([[21],{477:function(e,n,t){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.default=function(){return r.default.createElement(a.default,{source:o.default,htmlMode:"raw"})};var r=u(t(2)),a=u(t(508)),o=u(t(800));function u(e){return e&&e.__esModule?e:{default:e}}},800:function(e,n){e.exports='Object.keys 用来获取对象所有可枚举属性\n\n```\n//Object.keys 兼容ie8-\nObject.keys = Object.keys || function (obj) {\n  var a = [];\n  for (a[a.length] in  obj); //for 的特殊用法\n  return a;\n}\n```\n\n顺便介绍一个方法 Object.getOwnPropertyNames(obj) 用来获取所有实例属性，无论是否可枚举\n```\nArray.test = function(){}\nObject.keys(Array); // ["test"]\nObject.getOwnPropertyNames(Array); //["length", "name", "arguments",...,"test"]\n```'}}]);