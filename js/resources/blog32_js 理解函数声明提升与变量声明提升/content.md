一般开发人员都知道声明提升，这里通过2个例子深入理解下声明提升~~

```
var foo = 1;
(function () {
  console.log(foo);
  var foo = 2; //如果没有这一句运行结果是什么?
})();
//执行结果为输出 undefined

```
另一个例子
```
var a = 1; 
function b() { 
  a = 10;  //正常来说a的值被改变了，并且return后面的语句是不会执行的
  return; 
  function a() {}; //如果没有这一句运行结果是什么？
} 
b(); 
alert(a); // 1
```

看了这2个例子， 你悟了么^_^