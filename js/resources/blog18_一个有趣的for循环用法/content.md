Object.keys 用来获取对象所有可枚举属性

```
//Object.keys 兼容ie8-
Object.keys = Object.keys || function (obj) {
  var a = [];
  for (a[a.length] in  obj); //for 的特殊用法
  return a;
}
```

顺便介绍一个方法 Object.getOwnPropertyNames(obj) 用来获取所有实例属性，无论是否可枚举
```
Array.test = function(){}
Object.keys(Array); // ["test"]
Object.getOwnPropertyNames(Array); //["length", "name", "arguments",...,"test"]
```