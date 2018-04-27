去除以空格分割的字符串重复部分

方法一: 正则去重
```
function removeRepeat(str) {
  return str.replace(/(^|\\s)(\\S+)(?=\\s(?:\\S+\\s)*\\2(?:\\s|$))/g,"").trim()
}
removeRepeat("a b c a b e") //"c a b e"

```
方法二: hash去重
```
function removeRepeat (str) {
  var obj = {}, set = "";
  str.replace(/\\S+/g, function(w) {
    if (!obj[w]) {
      set += w + " ";
      obj[w] = 1;
    }
  });
  return set;
}
removeRepeat("a b c a b e") //"a b c e"
```
方法三: 数组去重
```
function removeRepeat (str) {
  var a = str.match(/\\S+/g);// == str.split(/\\s+/g)
  a.sort();
  for (var i = a.length -1; i > 0; --i) {
   if (a[i] == a[i-1]) a.splice(i, 1);
  }
  return a.join(" ");
}
removeRepeat("a b c a b e") //"a b c e"
```