(window.webpackJsonp=window.webpackJsonp||[]).push([[42],{465:function(n,e,r){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.default=function(){return t.default.createElement(a.default,{source:o.default,htmlMode:"raw"})};var t=s(r(2)),a=s(r(506)),o=s(r(787));function s(n){return n&&n.__esModule?n:{default:n}}},787:function(n,e){n.exports="ES7有一个提案，将Rest解构赋值/扩展运算符（...）引入对象。Babel转码器已经支持这项功能。\r\n```\r\nlet { x, y, ...z } = { x: 1, y: 2, a: 3, b: 4 };\r\nx // 1\r\ny // 2\r\nz // { a: 3, b: 4 }\r\n\r\n```\r\n类似于一个遍历操作\r\n\r\n最近在学习redux时，看实例发现一个神奇的用法\r\n```\r\nlet state = { a: 1, b: 1 }\r\nconsole.log({ ...state, b: 2 }) // {a: 1, b: 2}\r\nconsole.log(state) // {a: 1, b: 1}\r\n\r\n// 等价于\r\nObject.assign({}, state, { b: 2 })\r\n```\r\n初见该使用方法还以为是es7的特殊语法，其实是很简单的应用\r\n\r\n```\r\n { ...state, b: 2 } ==> { a: 1, b: 1, b: 2 } == > { a: 1, b: 2}\r\n```\r\n"}}]);