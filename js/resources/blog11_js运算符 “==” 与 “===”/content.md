"=="运算符遵循几个规则：

1. 如果有一个操作数是布尔值，则在比较前将其转换为数值 false => 0,true => 1
```
true == 1 // true 
false == 0 // true
```
2. 如果有一个操作数为字符串，另一个操作数为数值，则在比较前将字符串转换为数值(更正下应该是用Number转换)
```
"1" == 1 => Nunber("1") == 1 => 1 == 1
"1" == true => "1" == 1 => Number("1") == 1 
"1a" == 1 => Number("1a") == 1 => NaN == 1 // false parseInt("1a") => 1
```
3. 如果有一个操作数是对象，另一个不是，则调用对象的valueOf()方法，在按前2条规则比较
   如果valueOf()不返回一个原始值则调用toString() 注: Date类型直接调用toString()
```
function test(){}
test.prototype.valueOf = function(){ return 1; }
var t = new test();
t == 1 => t.valueOf() == 1 =>  1 == 1
```
所以得注意对象的valueOf方法了。。。默认的是继承的Object的valueOf方法

还有一些特殊的规则
1. null == undifined //true
2. null和undifined比较前不转换
3. 如果有一个操作数是NaN则恒返回false,即使NaN == NaN也返回false
4. 如果2个操作数都是对象，则比较是不是同一个对象，如果指向通一个对象则返回true。
```
true == true // true
new Boolean(true) == true // true 调用Boolean.valueOf 方法
new Boolean(true) == new Boolean(true) // false 比较是不是同一个对象
```

"==="就是不转换比较数值。。