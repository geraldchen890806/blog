(window.webpackJsonp=window.webpackJsonp||[]).push([[34],{475:function(e,n,o){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.default=function(){return a.default.createElement(r.default,{source:t.default,htmlMode:"raw"})};var a=s(o(2)),r=s(o(508)),t=s(o(798));function s(e){return e&&e.__esModule?e:{default:e}}},798:function(e,n){e.exports="[underscore](http://underscorejs.org/)一个js工具集 主要是Array以及collections的扩展\n\n我等屌丝还是看[中文API](http://www.css88.com/doc/underscore/#)...\n\n首先介绍个很有用的方法pluck\n\n例如有个array \n```\nvar stooges = [{name: 'moe', age: 40}, {name: 'larry', age: 50}, \n    {name: 'curly', age: 60}, ...];\n```\n要求取这所有人的最大岁数\n\n```\n_.pluck(stooges, \"age\"); // [40, 50, 60, ...]\n\n_.max(_.pluck(stooges,\"age\")); // 60\n\n//当然也可以这样\n_.max(stooges, \"age\"); // {name: 'currly', age: 60}\n```"}}]);