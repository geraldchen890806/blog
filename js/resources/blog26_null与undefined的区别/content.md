### 一 定义

null 是 javascript 的关键字，表示一个特殊值，常用来描述"空值"，typeof 运算返回"object"，所以可以将 null 认为是一个特殊的对象值，含义是"非对象"。

undefined 是预定义的全局变量，他的值就是"未定义"， typeof 运算返回 "undefined"

```
typeof null; // "object"
typeof undefined; // "undefined"
```

### 二 转义

转换成 Boolean 时均为 false，转换成 Number 时有所不同

```
!!(null); // false
!!(undefined); // false
Number(null); // 0
Number(undefined); // NaN

null == undefined; //true
null === undefined; //false
```

### 三 判定

```
isNull = function (obj) {
  return obj === null;
}
isUndefined = function (obj) {
  return obj === void 0;
}
```

### 四 用法

null 常用来定义一个空值

undefined 典型用法是：

1. 变量被声明了，但没有赋值时，就等于 undefined。

```
var test;
console.log(test); //undefined
```

2. 调用函数时，应该提供的参数没有提供，该参数等于 undefined。

```
//类如jQuery最外层IIFE用法
//这里是为确保undefined的值，因为es3中undefined可以赋值，es5才做了修正,变为只读

(function( window, undefined) {

})(window)
```

3. 对象没有赋值的属性，该属性的值为 undefined。

```
var test = {}
console.log(test.a); // undefined
```

4. 函数没有返回值时，默认返回 undefined。

```
function test(){}
test(); //undefined
```

参考 http://www.ruanyifeng.com/blog/2014/03/undefined-vs-null.html
