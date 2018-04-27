concat 方法将一个或多个字符串与原字符串连接合并，形成一个新的字符串并返回

```
string.concat(string2, string3[, ..., stringN])

s = "a".concat("b");//"ab"
```
如果有个需求字符串"a"链接数组arr = ["b", "c"]里的所有字符串
```
// 文艺解法
arr = ["b", "c"];
String.prototype.concat.apply("a", arr); // "abc"
// 普通解法
arr.unshift("a")
arr.join("");// "abc"
// **解法
var res = "a"
for(var i in arr) {
  res = res.concat(arr[i])
}
//或者
arr.forEach(function (v, i) { //ie9+
  res = res.concat(v);
})
res; // "abc"
```
