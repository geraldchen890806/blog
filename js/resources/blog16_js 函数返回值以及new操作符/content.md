我们都知道使用构造函数模式创建对象，但是构造函数返回值对创建对象的影响确少有被关注

首先介绍下使用new操作符创建一个实例的步骤：

1. 创建一个新对象

2. 将构造函数的作用域赋给新对象

3. 执行构造函数中的代码

4, 返回新对象

举例说明
```
function Person(name, age) { // 约定构造函数首字母大写
  this.name = name;
  this.age = age;
}
var p = new Person("a",1);

//这里的new操作符可以理解为以下操作
var p = {};
Person.call(p,"a",1);
```

至于返回值的影响：如果函数调用时在前面加上了 new前缀，且返回值不是一个对象，则返回this(该新对象);

```
function T() {
  this.a = 1;
  return 1; // 或者其他几种基本类型 "1",true,null,undefined
}
var s = new T(); // s: T {a: 1}
```
所以如果构造函数返回值为 String/Boolean/Number/Null/Undefined 之一 不影响new操作符创建实例

```
function T() {
  this.a = 1;
  return new Date(); //return /tt/; return function(){}; return {}； return [1,2]
}
var s = new T(); // s为return语句内容
```
如果构造函数返回值为引用类型 Object/Array/Date/RegExp/Function 则new操作返回的就是返回值 而不是一个新的实例T {}

特别注意：
```
function T() {
  this.a = 1;
  return new Boolean(true); // return new Number(1); return new String("a") 
}
var s = new T();// s也为返回值
```

所以创建构造函数 应当注意返回值的问题 其实不加返回值就行了。。。