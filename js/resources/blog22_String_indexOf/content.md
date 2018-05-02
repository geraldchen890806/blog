indexOf 方法返回指定值在字符串对象中首次出现的位置。从 fromIndex 位置开始查找，如果不存在，则返回 -1
```
str.indexOf(searchValue[, fromIndex])
```

正常情况下 我们用来判断指定值是否在字符串中 与-1比较

```
//常用写法
if ("abc".indexOf("b") > -1) {}
```

今天介绍个判断方法 用到按位非操作符 " ~ "

~ : 对任一数值 x 进行按位非操作的结果为 -(x + 1)。例如，~5 结果为 -6。

```
if(~"abc".indexOf("b")) {}

```

