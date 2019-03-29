### 通过[polyfill](/tag/polyfill)学习 js -- Object.is

Object.is 是 Es6 新增用来检查两个值严格相等的工具

js 中有 [===](/blog/js运算符“==”与“===”) 用来判断恒等的，那为什么要新增 Object.is

主要坑有 2 个：

```
 0 === -0 // true
 NaN === NaN // false
```

所以 Object.is 的 polyfill

```
  if (!Object.is) {
    Object.is = function(v2, v2) {
      // 检查 -0
      if (v1 === 0 && v2 === 0) {
        return 1 / v1 === 1 / v2;
      }
      // 检查 NaN
      if (v1 !== v1) {
        return v2 !== v2;
      }
      // 其他所有情况
      return v1 === v2;
    }
  }
```

参考：

[你不知道的 JavaScript](https://github.com/getify/You-Dont-Know-JS/blob/master/es6%20%26%20beyond/ch1.md)

[mozilla polyfill](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/is)
