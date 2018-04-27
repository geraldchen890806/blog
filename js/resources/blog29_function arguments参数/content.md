咱就看2个IIFE

```
!function (a, b) {
  arguments[0] = 11;
  alert(a)
} (1, 2)
// 11

!function (a, b) {
arguments[1] = 11;
alert(b)
} (1)

// undefined
```

结论就是arguments会在函数调用时与输入参数做匹配，值同步，但arguments扩展不会影响原没有匹配的参数