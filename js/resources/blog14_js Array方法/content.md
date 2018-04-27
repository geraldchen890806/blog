首先来个介绍一个js[测试](https://github.com/rmurphey/js-assessment) 要求先安装nodejs

里面有个array的test 要求写一个remove fn去重数组中指定元素 
```
var a = [1, 2, 2, 3, 4, 5, 2]
var s = remove(a, 2); //[1, 3, 4, 5]
console.log(a); // [1, 2, 2, 3, 4, 5, 2]
```
这个问题很好解决
```
function remove (arr, item) {
  return arr.fliter(function (v, i) {
    return v != item;
  })
}
```
不过里面还有一个要求 写一个removeWithoutCopy方法 要求原数组同样改变,即直接操作原数组
```
var a = [1, 2, 2, 3, 4, 5, 2]
var s = removeWithoutCopy(a, 2);//[1, 3, 4, 5]
console.log(a); //[1, 3, 4, 5]
```
解决方法
```
function removeWithoutCopy (arr, item) {
  while(arr.indexOf(item) > -1) {
    arr.splice(arr.indexOf(item), 1);
  }
  return arr;
}
```
这2个测试用到了filter及splice方法，这2个方法区别就是是否改变原数组

下面就列一下Array的各种方法,举例说明对原数组的操作以及返回值
```
//每次操作中a = [1,2,3,4]
//栈、队列方法
s = a.push(5, 6); // a: [1,2,3,4,5,6] s: 6 /== a.length
s = a.pop(); // a: [1,2,3] s: 4 /==移出的项
s = a.unshift(5, 6); // a: [5,6,1,2,3,4] s: 6 /==a.length
s = a.shift(); //a: [2,3,4] s: 1

//重排序方法
a = [4,3,2,1]
s = a.reverse(); //a: [1,2,3,4] s: [1,2,3,4]
s = a.sort(); //a: [1,2,3,4] s: [1,2,3,4]

//操作方法
a=[4,3,2,1]
s = a.concat([5]); //a: [4,3,2,1] s: [4,3,2,1,5]
s = a.slice(1); //a: [4] s: [3,2,1]
s = a.splice(0, 1); //a: [3,2,1] s: [4] 删除操作
s = a.splice(1, 0, "a") //a: [4,'a',3,2,1] s:[] 插入操作
s = a.splice(1, 1, "a", "b") //a: [4,'a','b',2,1] s:[3] 替换操作

//位置方法 ie9+,ff,chrome...
a=[4,3,2,1,4]
s = a.indexOf(4); //a: [4,3,2,1] s: 0
s = a.lastIndexOf(4); //a: [4,3,2,1] s: 4

//迭代方法 ie9+,ff,chrome...
forEach: 对数组中每一项运行给定函数, 无返回值, 对原数组也不会产生影响 相当于for循环
s = a.forEach(function (v, i) {
  console.log(v)
}) // a: [4,3,2,1] s: undifined

every: 对数组中每一项运行给定函数，如果该函数对每一项都返回true, 则返回true
var a = [4,3,2,1]
s = a.every(function (v, i) {
  return v > 0;
}) // a: [4,3,2,1] s: true

some: 对数组中每一项运行给定函数，如果该函数对任一项返回true，则返回true
s = a.some(function (v, i) {
  return v > 3;
}) // a: [4,3,2,1] s: true

filter: 对数组中每一项运行给定函数，返回该函数会返回true的项组成的数组
s = a.filter(function (v, i) {
  return v > 2;
}) // a: [4,3,2,1] s: [4,3]


map: 对数组中每一项运行给定函数，返回每次函数调用返回值组成的数组
s = a.map(function (v, i) {
  return v * 2;
}) // a: [4,3,2,1] s: [8,6,4,1]

//归并方法 //ie9+,ff,chrome...
reduce: 迭代数组所有想，返回构建一个最终返回值
a = [1,2,3,4]
s = a.reduce(function(prev, cur, index, array) {
  console.log(prev, cur)
  return prev +　cur
}, 5) 
// 5 1
// 6 2
// 8 3
// 11 4
// 15
// a: [1,2,3,4] s:15 5为初始值 是第一次迭代时prev的值 prev为前一个值 cur为当前值

reduceRight 为从最后一项往前开始迭代
```

总结 array的操作方法中 会改动原数组的方法有pop,push,shift,unshift,splice这几个方法