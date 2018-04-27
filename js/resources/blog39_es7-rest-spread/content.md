ES7有一个提案，将Rest解构赋值/扩展运算符（...）引入对象。Babel转码器已经支持这项功能。
```
let { x, y, ...z } = { x: 1, y: 2, a: 3, b: 4 };
x // 1
y // 2
z // { a: 3, b: 4 }

```
类似于一个遍历操作

最近在学习redux时，看实例发现一个神奇的用法
```
let state = { a: 1, b: 1 }
console.log({ ...state, b: 2 }) // {a: 1, b: 2}
console.log(state) // {a: 1, b: 1}

// 等价于
Object.assign({}, state, { b: 2 })
```
初见该使用方法还以为是es7的特殊语法，其实是很简单的应用

```
 { ...state, b: 2 } ==> { a: 1, b: 1, b: 2 } == > { a: 1, b: 2}
```
