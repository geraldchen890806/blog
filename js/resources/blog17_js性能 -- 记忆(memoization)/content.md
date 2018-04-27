函数可以将先前操作的结果记录在某个对象里，从而避免无谓的重复运算。这种优化被称为记忆(memoization)

一个阶乘函数
```
function factorial (n) {
  if (n == 0) {
    return 1;
  } else {
    return n * arguments.callee(n-1); //arguments.callee 防止函数重命名（严格模式不可用）
  }
}

for (var i =0; i < 10; i++) {
  factorial(i); // factorial函数共运行55次
}
```

一个带有记忆功能的factorial函数
```
var factorial = function () {
  var cache =[1];
  var fac = function (n) {
    if (!cache.hasOwnProperty(n)) {
      cache[n] = n * fac(n-1);
    }
    return cache[n];
  }
  return fac;
}();
for (var i =0; i < 10; i++) {
  factorial(i); // factorial函数共运行19次，直接调用10次，自调用9次查询之前结果
}
```
然后我们可以写一个函数来帮我们构造带记忆功能的函数
```
var memoizer = function (cache, fn) {
  var cache = cache || [];
  var recur = function (n) {
    if (!cache.hasOwnProperty(n)) {
      cache[n] = fn(recur, n);
    }
    return cache[n]
  }
  return recur;
}
var factorial = memoizer([1,1], function (recur, n) {
  return n * recur (n -1);
})
//裴波那契函数
var fibonacci = memoizer([0,1], function (recur, n) {
  return recur(n - 1) + recur(n-2);
})
```

memeoizer函数有点复杂，需要改写原来的递归函数，我们可以写一个函数只是保存以运算过的值，防止重复运算可以这样写
```
function memoize(fn, cache){
  var cache = cache || {}; // {} []都可以用来存储
  var recur = function(arg){
    if (!cache.hasOwnProperty(arg)){
      cache[arg] = fn(arg);
    }
    return cache[arg];
  };
  return recur;
}
function factorial (n) {
  if (n == 0) {
    return 1;
  } else {
    return n * arguments.callee(n-1);
  }
}
var ff = memoize(factorial);
for (var i =0; i < 10; i++) {
  ff(i); // factorial函数共运行55次
}
for (var i =0; i < 10; i++) {
  ff(i); // factorial函数无需运行
}
```