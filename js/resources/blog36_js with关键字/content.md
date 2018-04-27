with通常被当作重复引用同一个对象中的多个属性的快捷方式，可以不需要重复引用对象本身。

通常使用
```
// 单调乏味的重复"obj"
obj.a = 2;
obj.b = 3;
obj.c = 4;

// 简单的快捷方式
with (obj) {
    a = 3;
    b = 4;
    c = 5;
}
```

下面看一个特殊的例子
```
function foo(obj) {
    with (obj) {
        a = 2;
    }
}

var o1 = {
    a: 3
};

var o2 = {
    b: 3
};

foo( o1 );
console.log( o1.a ); // 2

foo( o2 );
console.log( o2.a ); // undefined
console.log( a ); // 2—— a被泄漏到全局作用域上了！

```

结论：with实际是在当前位置建立一个新的词法作用域，所以不会在o2中新建a属性

最好不要使用with，额外的性能消耗不说，在严格模式下还完全不起作用。。