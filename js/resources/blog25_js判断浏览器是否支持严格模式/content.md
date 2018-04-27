js构造函数类似于
```
function P (name, age) {
  this.name = name;
  this.age = age;
}
```

使用new操作符则返回一个新的对象，如果没有加new操作符则函数内this指向全局对象window,而在严格模式中则为undefined，借此我们可以判断浏览器是否支持严格模式

```
var hasStrictMode = (function(){ 
  "use strict";
  return this == undefined;
}())
```

这里介绍一个方法，可以忽略new操作符

```
function P () {
  if (!(this instanceof P)) return new P();
}
```
