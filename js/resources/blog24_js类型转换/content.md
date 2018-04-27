js数据类型有2种，原始值(undefined, null, 布尔值, 数字和字符串)与对象(数组与函数)。

类型转换分为3种，原始值互转，原始值转换成对象，对象转换成原始值

原始值互转相对简单,比如true转换成字符串为"true",转换成数字为1

原始值转换成对象也很简单,就是通过调用String(),Number()或Boolean()构造函数, 如Bolean(true),Number(3),Boolean([])也可以使用Object(3)

这里主要讲一下对象转换成原始值

对象转换成原始值过程如下
1. 如果对象有valueOf()方法，并且返回一个原始值，则调用这个方法并转换成需要的原始值(数字,字符串..)
2. 否则，如果对象有toString()方法，并且返回一个原始值，则调用这个方法并转换成需要的原始值(数字,字符串..)
3. 否则，js抛出类型异常错误


```
function t(){};
t.prototype.valueOf = function(){ return "a"; };

new t == "a"; // true

t.prototype.valueOf = function(){ return {}; };
t.prototype.toString = function(){ return "b"; };

new t == true; // true  "b" == true

//在比较Date类型是，Date类型转换成原始值只使用toSting()方法
new Date("1/1/2015") == "Thu Jan 01 2015 00:00:00 GMT+0800 (中国标准时间)" // true
new Date("1/1/2015").valueOf(); // 1420041600000
```
参考[另一篇](http://renjm.com/blog/12)