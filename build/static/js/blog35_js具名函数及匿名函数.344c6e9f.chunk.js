(window.webpackJsonp=window.webpackJsonp||[]).push([[35],{dE92:function(n,o,e){"use strict";e.r(o);var c=e("q1tI"),t=e.n(c),l=e("IujW"),u=e.n(l);o.default=function(){return t.a.createElement(u.a,{source:"下面2个函数console的差异。。\n```\n(function A() {\n    console.log(A); // [Function A]\n    A = 1;\n    console.log(window.A); // undefined\n    console.log(A); // [Function A]\n}());\n\nfunction A() {\n    console.log(A); // [Function A]\n    A = 1;\n    console.log(window.A); // 1\n    console.log(A); // 1\n}\nA();\n```\n原理解释: http://segmentfault.com/q/1010000002810093",htmlMode:"raw"})}}}]);