要求写一个方法解析罗马数字
```
solution('XXI'); // should return 21
```

看上去很简单，将罗马数字分割后对应数字加上就行，不过有点要注意的是
```
1000 == M, 900 == CM, 90 == XC, 4 == IV
```

解法如下
```
function solution (roman) {
  var res= {I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000};
  return roman.split("").reduce(function(p, v, i, arr) {
      return  (arr[i + 1] && res[arr[i + 1]] > res[v]) ? p -= res[v] : p += res[v]
  }, 0);
}
```

好吧 还有更简单的解法, 因为罗马数字总数从大到小写的
```
var res= {M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50,
            XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1};
function solution (s) {
  var v = 0;
  for(var i in res) {
    while (s.substr(0, i.length) == i) {
      s = s.substr(i.length);
      v += res[i];
    }
  }
  return v;
}
//那么数字转换成罗马数字就简单了。。
function toRoman (v) {
  var s = ';
  for (var i in res){
    while (v >= res[i]) {
      s += i;
      v -= res[i]; 
    }
  }
  return s;
}
```