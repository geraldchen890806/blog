(window.webpackJsonp=window.webpackJsonp||[]).push([[28],{vAHK:function(n,r,e){"use strict";e.r(r);var s=e("q1tI"),i=e.n(s),t=e("IujW"),o=e.n(t);r.default=function(){return i.a.createElement(o.a,{source:"要求写一个方法解析罗马数字\n```\nsolution('XXI'); // should return 21\n```\n\n看上去很简单，将罗马数字分割后对应数字加上就行，不过有点要注意的是\n```\n1000 == M, 900 == CM, 90 == XC, 4 == IV\n```\n\n解法如下\n```\nfunction solution (roman) {\n  var res= {I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000};\n  return roman.split(\"\").reduce(function(p, v, i, arr) {\n      return  (arr[i + 1] && res[arr[i + 1]] > res[v]) ? p -= res[v] : p += res[v]\n  }, 0);\n}\n```\n\n好吧 还有更简单的解法, 因为罗马数字总数从大到小写的\n```\nvar res= {M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50,\n            XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1};\nfunction solution (s) {\n  var v = 0;\n  for(var i in res) {\n    while (s.substr(0, i.length) == i) {\n      s = s.substr(i.length);\n      v += res[i];\n    }\n  }\n  return v;\n}\n//那么数字转换成罗马数字就简单了。。\nfunction toRoman (v) {\n  var s = ';\n  for (var i in res){\n    while (v >= res[i]) {\n      s += i;\n      v -= res[i]; \n    }\n  }\n  return s;\n}\n```",htmlMode:"raw"})}}}]);