###Description:

You'll implement once, a function that takes another function as an argument, and returns a new version of that function that can only be called once.

Subsequent calls to the resulting function should have no effect (and should return undefined).

For example:

    logOnce = once(console.log)
    logOnce("foo") // -> "foo"
    logOnce("bar") // -> no effect

就是写一个函数，可以生成只能调用一次的函数，一个简单的闭包的应用

solution:

    function once(fn) {
        var flag = true;
        return function(){
          if(flag) {
            flag = false;
            return fn.apply(this, arguments);
          }
          return;
        };
    }

from http://www.codewars.com/kata/once/solutions/javascript