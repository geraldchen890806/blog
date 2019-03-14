### CommonJS (nodejs)
  同步加载，适合服务器端使用
  模块输出的是一个值的拷贝
```
  // foo.js
  // 定义我们希望暴露的更多行为
  function foobar(){
          this.foo = function(){
                  console.log('Hello foo');
          }
  
          this.bar = function(){
                  console.log('Hello bar');
          }
  }
  
  // 把 foobar 暴露给其它模块
  exports.foobar = foobar;
  
  // main.js
  // 相对于使用文件与模块文件所在的同一目录路径获取模块  
  var foobar = require('./foobar').foobar,
      test   = new foobar();
  
  test.bar(); // 'Hello bar'
```
### AMD (require.js)
异步加载，初始定义所以依赖模块
```
  // foo.js
  define(function ( require ) {
      var isReady = false, foobar;
  
      // 请注意在模块定义内部内联的 require 语句
      require(['foo', 'bar'], function (foo, bar) {
          isReady = true;
          foobar = foo() + bar();
      });
  
      // 我们仍可以返回一个模块
      return {
          isReady: isReady,
          foobar: foobar
      };
  });
  // main.js
  require(['foo', 'bar'], function ( foo, bar ) {
    // 这里写其余的代码
    foo.doSomething();
  });
```
### CMD (seajs)
  CMD则是依赖就近，用的时候再require
  AMD和CMD最大的区别是对依赖模块的执行时机处理不同，而不是加载的时机或者方式不同，二者皆为异步加载模块。

```
  define(function(require, exports, module) {
    var clock = require('clock');
    clock.start();
  });
```
### ES6 import/export
  模块输出的是值的引用, 编译时输出接口
  CommonJS 加载的是一个对象（即module.exports属性），该对象只有在脚本运行完才会生成。而 ES6 模块不是对象，它的对外接口只是一种静态定义，在代码静态解析阶段就会生成

```
  const foo = 10;
  // foo更新会影响default值
  export { foo as default }
  // foo更新不会影响default值
  export default foo;
  foo = 11;
```