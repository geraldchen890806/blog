(window.webpackJsonp=window.webpackJsonp||[]).push([[24],{"Q9/W":function(n,t,e){"use strict";e.r(t);var u=e("q1tI"),r=e.n(u),a=e("IujW"),o=e.n(a),f=e("ytHC"),d=e.n(f);t.default=function(){return r.a.createElement(o.a,{source:d.a,htmlMode:"raw"})}},ytHC:function(n,t){n.exports='写一个链式函数add() 要求实现以下效果\n```\nadd(1) == 1\nadd(1)(2) == 3\nadd(1)(2)(3) == 6\n```\n\n好吧看到这个需求，第一反应肯定知道add(1)必须返回一个函数，才能有后续的链式调用\n\n那么一个函数有怎么会 == 1\n\n好吧，function也是一个对象，在做比较时转换成原始值会调用valueOf(), 参考[这篇](http://renjm.com/blog/25)\n\n```\nfunction test () {}\ntest;// function test () {}\ntest.valueOf = function () { return "test" }\ntest;// "test"\n```\n所以可以使用这个特性来实现add()\n\n```\nfunction add (n) {\n  function te (m) {\n    n += m;\n    return te;\n  }\n  te.valueOf = function () {\n    return n;\n  }\n  return te;\n}\n```\n当然也可以简单一点\n```\nfunction add (n) {\n  var fn = function (x) {\n    return add(n + x);\n  };\n  fn.valueOf = function () {\n    return n;\n  };\n  return fn;\n}\n```\n\n还有其实在valueOf为定义时，会尝试调用toString方法，所以上面的解法中valueOf改成toString也可以\n\n'}}]);