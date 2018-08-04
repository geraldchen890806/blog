## 本篇博客通过一下 js polyfill 来了解 JS（持续更新...）

### Number.isNaN

```
  // window.isNaN('a') true
  if(!Number.isNaN) {
    Number.isNaN = function(n) {
      return (

        typeof n === 'number' &&
        window.isNaN(n)
      )
    }
  }
```

### Object.is

```
  object.is = function(v1, v2) {
    // 0 === -0 Infinity !== -Infinity
    if (v1 === 0 && v2 === 0) {
      retuen 1 / v1 === 1 / v2;
    }
    // NaN !== NaN
    if (v2 !== v2) {
      return v2 !== v2;
    }
    return v1 === v2;
  }
```
