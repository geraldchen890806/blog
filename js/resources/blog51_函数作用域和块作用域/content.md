### 作用域：隐藏内部实现

最小授权/最小暴露原则：指在软件设计中，应该最小限度地暴露必 要内容，而将其他内容都“隐藏”起来，比如某个模块或对象的 API 设计

1. 防止某些内部函数被有意或无意地以非预期的方式使用

```
function doSomething(a) {
  function doSomethingElse(a) {
    return a - 1;
  }
  var b;
  b = a + doSomethingElse( a * 2 ); // 放在被错误调用，比如传递无效参数，无法预期结果
  console.log( b * 3 );
}
doSomething( 2 ); // 15
```

2. 避免同名标识符之间的冲突

```
function foo() {
  function bar(a) {
    i = 3;
    console.log( a + i );
  }
  for (var i=0; i<10; i++) {
    bar( i * 2 );
  }
}
foo();
```

#### 比较2个代码
```
var a = 2;

function foo() {
  var a = 3;
  console.log( a ); // 3
}

foo();
console.log( a ); // 2

```

```
var a = 2;

(function foo() {
  var a = 3;
  console.log( a ); // 3
})();

console.log( a ); // 2

```

第一个例子使用 foo 避免了变量名 a 的冲突，但是当前作用域多了个 foo 并且需要显示调用 foo

第二个例子使用一种特殊的函数表达式： 立即执行函数表达式(IIFE)

### 函数表达式

区分函数声明和表达式最简单的方法是看 function 关键字出现在声明中的位 置(不仅仅是一行代码，而是整个声明中的位置)。如果 function 是声明中 的第一个词，那么就是一个函数声明，否则就是一个函数表达式。

IIFE 的 2 种特殊应用场景：

1.重置undefined
  // es3中undefined可以赋值，es5才做了修正,变为只读

```
undefined = true; // 给其他代码挖了一个大坑!绝对不要这样做!
(function IIFE( undefined ) {
  var a;
  if (a === undefined) {
  console.log( "Undefined is safe here!" );
  }
})();

```

2.倒置代码的运行顺序，将需要运行的函数放在第二位

```
var a = 2;
(function IIFE( def ) {
  def( window );
})(function def( global ) {
  var a = 3;
  console.log( a ); // 3
  console.log( global.a ); // 2
});
```

### 另一种函数表达式：匿名函数表达式

最常见的回调参数：

```
setTimeout(function() {
  console.log("I waited 1 second!");
}, 1000 );
```

缺点：

1. 匿名函数在栈追踪中不会显示出有意义的函数名，使得调试很困难
2. 函数需要引用自身时只能使用已经过期的 arguments.callee 引用
3. 匿名函数省略了对于代码可读性/可理解性很重要的函数名




下面介绍除了函数作用域（属于这个函数的全部变量都可以在整个函数的范围内使用及复用）外的另一个作用域单元

## 块作用域
1.with

2.try/catch 的 catch 分句会创建一个块作用域

3.let
// let 关键字可以将变量绑定到所在的任意作用域中(通常是 { 为其声明的变量隐式地劫持了所在的块作用域。
```
if (true) {
  {
    let i = 11;
    var s = 11;
    console.log('i1', i);
  }
  console.log('i2', i);
  console.log('s1', s);
}

console.log('s2', s);
console.log('i3', i);
```

4.const

// 块作用域非常有用的原因和闭包及回收内存垃圾的回收机制相关