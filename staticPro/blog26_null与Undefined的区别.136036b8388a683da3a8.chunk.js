(window.webpackJsonp=window.webpackJsonp||[]).push([[23],{c8Dc:function(n,e){n.exports='### 一 定义\n\nnull 是 javascript 的关键字，表示一个特殊值，常用来描述"空值"，typeof 运算返回"object"，所以可以将 null 认为是一个特殊的对象值，含义是"非对象"。\n\nundefined 是预定义的全局变量，他的值就是"未定义"， typeof 运算返回 "undefined"\n\n```\ntypeof null; // "object"\ntypeof undefined; // "undefined"\n```\n\n### 二 转义\n\n转换成 Boolean 时均为 false，转换成 Number 时有所不同\n\n```\n!!(null); // false\n!!(undefined); // false\nNumber(null); // 0\nNumber(undefined); // NaN\n\nnull == undefined; //true\nnull === undefined; //false\n```\n\n### 三 判定\n\n```\nisNull = function (obj) {\n  return obj === null;\n}\nisUndefined = function (obj) {\n  return obj === void 0;\n}\n```\n\n### 四 用法\n\nnull 常用来定义一个空值\n\nundefined 典型用法是：\n\n1. 变量被声明了，但没有赋值时，就等于 undefined。\n\n```\nvar test;\nconsole.log(test); //undefined\n```\n\n2. 调用函数时，应该提供的参数没有提供，该参数等于 undefined。\n\n```\n//类如jQuery最外层IIFE用法\n//这里是为确保undefined的值，因为es3中undefined可以赋值，es5才做了修正,变为只读\n\n(function( window, undefined) {\n\n})(window)\n```\n\n3. 对象没有赋值的属性，该属性的值为 undefined。\n\n```\nvar test = {}\nconsole.log(test.a); // undefined\n```\n\n4. 函数没有返回值时，默认返回 undefined。\n\n```\nfunction test(){}\ntest(); //undefined\n```\n\n参考 http://www.ruanyifeng.com/blog/2014/03/undefined-vs-null.html\n'},ceOW:function(n,e,u){"use strict";u.r(e);var d=u("q1tI"),t=u.n(d),f=u("IujW"),i=u.n(f),o=u("c8Dc"),l=u.n(o);e.default=function(){return t.a.createElement(i.a,{source:l.a,htmlMode:"raw"})}}}]);