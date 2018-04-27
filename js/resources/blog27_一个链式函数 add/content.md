写一个链式函数add() 要求实现以下效果
```
add(1) == 1
add(1)(2) == 3
add(1)(2)(3) == 6
```

好吧看到这个需求，第一反应肯定知道add(1)必须返回一个函数，才能有后续的链式调用

那么一个函数有怎么会 == 1

好吧，function也是一个对象，在做比较时转换成原始值会调用valueOf(), 参考[这篇](http://renjm.com/blog/25)

```
function test () {}
test;// function test () {}
test.valueOf = function () { return "test" }
test;// "test"
```
所以可以使用这个特性来实现add()

```
function add (n) {
  function te (m) {
    n += m;
    return te;
  }
  te.valueOf = function () {
    return n;
  }
  return te;
}
```
当然也可以简单一点
```
function add (n) {
  var fn = function (x) {
    return add(n + x);
  };
  fn.valueOf = function () {
    return n;
  };
  return fn;
}
```

还有其实在valueOf为定义时，会尝试调用toString方法，所以上面的解法中valueOf改成toString也可以

