(window.webpackJsonp=window.webpackJsonp||[]).push([[12],{459:function(e,n,t){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.default=function(){return u.default.createElement(a.default,{source:r.default,htmlMode:"raw"})};var u=l(t(2)),a=l(t(493)),r=l(t(860));function l(e){return e&&e.__esModule?e:{default:e}}},860:function(e,n){e.exports='"=="运算符遵循几个规则：\n\n1. 如果有一个操作数是布尔值，则在比较前将其转换为数值 false => 0,true => 1\n```\ntrue == 1 // true \nfalse == 0 // true\n```\n2. 如果有一个操作数为字符串，另一个操作数为数值，则在比较前将字符串转换为数值(更正下应该是用Number转换)\n```\n"1" == 1 => Nunber("1") == 1 => 1 == 1\n"1" == true => "1" == 1 => Number("1") == 1 \n"1a" == 1 => Number("1a") == 1 => NaN == 1 // false parseInt("1a") => 1\n```\n3. 如果有一个操作数是对象，另一个不是，则调用对象的valueOf()方法，在按前2条规则比较\n   如果valueOf()不返回一个原始值则调用toString() 注: Date类型直接调用toString()\n```\nfunction test(){}\ntest.prototype.valueOf = function(){ return 1; }\nvar t = new test();\nt == 1 => t.valueOf() == 1 =>  1 == 1\n```\n所以得注意对象的valueOf方法了。。。默认的是继承的Object的valueOf方法\n\n还有一些特殊的规则\n1. null == undifined //true\n2. null和undifined比较前不转换\n3. 如果有一个操作数是NaN则恒返回false,即使NaN == NaN也返回false\n4. 如果2个操作数都是对象，则比较是不是同一个对象，如果指向通一个对象则返回true。\n```\ntrue == true // true\nnew Boolean(true) == true // true 调用Boolean.valueOf 方法\nnew Boolean(true) == new Boolean(true) // false 比较是不是同一个对象\n```\n\n"==="就是不转换比较数值。。'}}]);