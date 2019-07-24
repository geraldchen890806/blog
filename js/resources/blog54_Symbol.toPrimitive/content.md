### Symbol.toPrimitive 是一个内置的 Symbol 值，它是作为对象的函数值属性存在的，当一个对象转换为对应的原始值时，会调用此函数。

在 Symbol.toPrimitive 属性(用作函数值)的帮助下，一个对象可被转换为原始值。该函数被调用时，会被传递一个字符串参数 hint ，表示要转换到的原始值的预期类型。

hint 参数的取值是 "number"、"string" 和 "default" 中的任意一个。
转换过程如下

number: val → val.valueOf() → val.toString() → error

string: val → val.toString() → val.valueOf() → error

default: 同 number

```
// 一个没有提供 Symbol.toPrimitive 属性的对象，参与运算时的输出结果
var obj1 = {};
console.log(+obj1);     // NaN
console.log(`${obj1}`); // "[object Object]"
console.log(obj1 + ""); // "[object Object]"

// 接下面声明一个对象，手动赋予了 Symbol.toPrimitive 属性，再来查看输出结果
var obj2 = {
  [Symbol.toPrimitive](hint) {
    if (hint == "number") {
      return 10;
    }
    if (hint == "string") {
      return "hello";
    }
    return true;
  }
};
console.log(+obj2);     // 10      -- hint 参数值是 "number"
console.log(`${obj2}`); // "hello" -- hint 参数值是 "string"
console.log(obj2 + ""); // "true"  -- hint 参数值是 "default"
```

### JS 中的加法运算

1、使用 ToPrimitive 运算转换左右运算元为原始数据类型（primitive）。

2、在转换后，如果其中一个运算元出现原始数据类型是“字符串”类型值时，则另一运算元强制转换为字符串，然后做字符串的连接运算。

3、在其他情况时，所有运算元都会转换为原始数据类型的“数字”类型值，然后作数字的相加。

### 然后我们看下 [] + {} == {} + []

1、`{} + [] == 0`

其实{}只是一个代码块

```
{} + [] =>
[] =>
([]).valueOf() =>
+ "" =>
0
```

2、`[] + {} == "[object Object]"`

```
([]).valueOf() + ({}).valueOf() =>
[] + {} =>
([]).toString() + ({}).toString =>
"" + "[object Object]" =>
"[object Object]"
```

3、`[] + {} == {} + []`

解析为 "[object Object]" == "[object Object]"

4、`{} + [] != [] + {}` 注：[chrome 中 {} + [] == [] + {}](https://stackoverflow.com/questions/36438034/why-is-no-longer-nan-in-chrome-console?noredirect=1&lq=1)

```
{} + [] != [] + {} =>
+ [] != [] + {} =>
0 != "[object Object]"
```

参考:

[Symbol.toPrimitive](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toPrimitive)

[JS 加法运算全解析](https://www.jianshu.com/p/f4f2a57b0cfd)
