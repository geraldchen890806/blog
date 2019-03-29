## 通过[polyfill](/tag/polyfill)学习 js -- Number.isNaN

### Number.isNaN

```
  if(!Number.isNaN) {
    Number.isNaN = function(n) {
      return n !== n;
    }
  }

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