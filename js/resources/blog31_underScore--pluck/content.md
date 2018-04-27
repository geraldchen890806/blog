[underscore](http://underscorejs.org/)一个js工具集 主要是Array以及collections的扩展

我等屌丝还是看[中文API](http://www.css88.com/doc/underscore/#)...

首先介绍个很有用的方法pluck

例如有个array 
```
var stooges = [{name: 'moe', age: 40}, {name: 'larry', age: 50}, 
    {name: 'curly', age: 60}, ...];
```
要求取这所有人的最大岁数

```
_.pluck(stooges, "age"); // [40, 50, 60, ...]

_.max(_.pluck(stooges,"age")); // 60

//当然也可以这样
_.max(stooges, "age"); // {name: 'currly', age: 60}
```