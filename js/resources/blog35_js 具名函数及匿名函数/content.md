下面2个函数console的差异。。
```
(function A() {
    console.log(A); // [Function A]
    A = 1;
    console.log(window.A); // undefined
    console.log(A); // [Function A]
}());

function A() {
    console.log(A); // [Function A]
    A = 1;
    console.log(window.A); // 1
    console.log(A); // 1
}
A();
```
原理解释: http://segmentfault.com/q/1010000002810093