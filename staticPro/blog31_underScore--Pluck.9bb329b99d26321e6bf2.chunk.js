(window.webpackJsonp=window.webpackJsonp||[]).push([[27],{"9gkY":function(n,e,a){"use strict";a.r(e);var o=a("q1tI"),r=a.n(o),s=a("IujW"),c=a.n(s);e.default=function(){return r.a.createElement(c.a,{source:"[underscore](http://underscorejs.org/)一个js工具集 主要是Array以及collections的扩展\n\n我等屌丝还是看[中文API](http://www.css88.com/doc/underscore/#)...\n\n首先介绍个很有用的方法pluck\n\n例如有个array \n```\nvar stooges = [{name: 'moe', age: 40}, {name: 'larry', age: 50}, \n    {name: 'curly', age: 60}, ...];\n```\n要求取这所有人的最大岁数\n\n```\n_.pluck(stooges, \"age\"); // [40, 50, 60, ...]\n\n_.max(_.pluck(stooges,\"age\")); // 60\n\n//当然也可以这样\n_.max(stooges, \"age\"); // {name: 'currly', age: 60}\n```",htmlMode:"raw"})}}}]);