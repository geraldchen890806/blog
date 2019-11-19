(window.webpackJsonp=window.webpackJsonp||[]).push([[18],{uiUk:function(n,t,r){"use strict";r.r(t);var e=r("q1tI"),a=r.n(e),o=r("IujW"),u=r.n(o);t.default=function(){return a.a.createElement(u.a,{source:'####在JavaScript框架设计(司徒正美)一书中看到repeate这个方法的演变历史，在此分享下\n\n#####repeat方法：将一个字符串重复自身N次，如repeat("ruby", 2) 得到rubyruby\n\n版本1: 利用空数组join方法\n```\nfunction repeat(target, n) {\n    return (new Array(n + 1)).join(target);\n}\n```\n    \n版本2：版本1的改良版，创建一个对象，拥有length属性，然后利用call方法去调用数组原型的join方法，省去创建数组这一步，性能大为提高。重复次数越多，两者对比越明显。另，之所以要创建一个带length属性的对象，是因为要调用数组的原型方法，需要指定call的第一个参数为数组对象。而类数组对象的必要条件是其length属性的值为非负整数。\n```\nfunction repeat(target, n) {\n    return Array.prototype.join.call({\n        length: n+1\n    }, target);\n}\n```\n\n版本3: 版本2的改良版，利用闭包将类数组对象与数组原型的join方法缓存起来，省得每次都重复创建与寻找方法。\n\n```\nfunction repeat(target, n) {\n    var join = Array.prototype.join, obj = {};\n    return function(target, n) {\n        obj.length = n + 1;\n        return join.call(obj, target);\n    }\n} \n```\n\n版本4：从算法上着手，使用二分法，比如我们将ruby重复5次，其实我们在第二次已得rubyruby，那么3次直接用rubyruby进行操作，而不是ruby。\n\n```\nfunction repeat(target, n) {\n    var s = target, total = [];\n    while (n > 0) {\n        if (n % 2 == 1)\n            total[totl.length] = s;\n        if (n == 1)\n            break;\n        s += s;\n        n = n >> 1;//相当于将n除以2取商，或者说开2二次方\n    }\n    return total.join("");\n}\n```\n\n版本5: 版本4的变种，免去创建数组与使用jion方法。他的悲剧之处在于它在循环中穿件的字符串比要求的还长，需要回减一下。\n\n```\nfunction repeat(target, n) {\n    var s = target, c = s.length * n;\n    do {\n        s += s;\n    } while (n = n >> 1);\n    s = s.substring(0, c);\n    return s;\n}\n```\n\n版本6: 版本4的改良版。\n\n```\nfunction repeat(target, n) {\n    var s = target, total = "";\n    while (n > 0) {\n        if (n % 2 == 1)\n            total += s;\n        if (n == 1)\n            break;\n        s += s;\n        n = n >> 1;\n    }\n    return total;\n}\n```\n\n版本7：与版本6相近，不过递归在浏览器下好像都做了优化(包括IE6)，与其他版本相比，属于上乘方案之一。\n\n```\nfunction repeat(target, n) {\n    if (n == 1)\n        return target;\n    var s = repeat(target, Math.floor(n / 2));\n    s += s;\n    if (n % 2) {\n        s += target;\n    }\n    return s;\n}\n```\n\n版本8：可以说是一个反例，很慢，不过实际上它还是可行的，因为实际上没有人将n设成成百上千。\n\n```\nfunction repeat(target, n) {\n    return (n <= 0) ? "" : target.concat(repeat(target, --n));\n}\n```',escapeHtml:!1})}}}]);