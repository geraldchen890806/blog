(window.webpackJsonp=window.webpackJsonp||[]).push([[18],{FpcE:function(n,r,e){"use strict";Object.defineProperty(r,"__esModule",{value:!0}),r.default=function(){return a.default.createElement(c.default,{source:i.default,htmlMode:"raw"})};var a=t(e("q1tI")),c=t(e("IujW")),i=t(e("xQMj"));function t(n){return n&&n.__esModule?n:{default:n}}},xQMj:function(n,r){n.exports="函数可以将先前操作的结果记录在某个对象里，从而避免无谓的重复运算。这种优化被称为记忆(memoization)\n\n一个阶乘函数\n```\nfunction factorial (n) {\n  if (n == 0) {\n    return 1;\n  } else {\n    return n * arguments.callee(n-1); //arguments.callee 防止函数重命名（严格模式不可用）\n  }\n}\n\nfor (var i =0; i < 10; i++) {\n  factorial(i); // factorial函数共运行55次\n}\n```\n\n一个带有记忆功能的factorial函数\n```\nvar factorial = function () {\n  var cache =[1];\n  var fac = function (n) {\n    if (!cache.hasOwnProperty(n)) {\n      cache[n] = n * fac(n-1);\n    }\n    return cache[n];\n  }\n  return fac;\n}();\nfor (var i =0; i < 10; i++) {\n  factorial(i); // factorial函数共运行19次，直接调用10次，自调用9次查询之前结果\n}\n```\n然后我们可以写一个函数来帮我们构造带记忆功能的函数\n```\nvar memoizer = function (cache, fn) {\n  var cache = cache || [];\n  var recur = function (n) {\n    if (!cache.hasOwnProperty(n)) {\n      cache[n] = fn(recur, n);\n    }\n    return cache[n]\n  }\n  return recur;\n}\nvar factorial = memoizer([1,1], function (recur, n) {\n  return n * recur (n -1);\n})\n//裴波那契函数\nvar fibonacci = memoizer([0,1], function (recur, n) {\n  return recur(n - 1) + recur(n-2);\n})\n```\n\nmemeoizer函数有点复杂，需要改写原来的递归函数，我们可以写一个函数只是保存以运算过的值，防止重复运算可以这样写\n```\nfunction memoize(fn, cache){\n  var cache = cache || {}; // {} []都可以用来存储\n  var recur = function(arg){\n    if (!cache.hasOwnProperty(arg)){\n      cache[arg] = fn(arg);\n    }\n    return cache[arg];\n  };\n  return recur;\n}\nfunction factorial (n) {\n  if (n == 0) {\n    return 1;\n  } else {\n    return n * arguments.callee(n-1);\n  }\n}\nvar ff = memoize(factorial);\nfor (var i =0; i < 10; i++) {\n  ff(i); // factorial函数共运行55次\n}\nfor (var i =0; i < 10; i++) {\n  ff(i); // factorial函数无需运行\n}\n```"}}]);