  遍历器（Iterator）是一种接口，为各种不同的数据结构提供统一的访问机制。

  对于可迭代的数据解构，ES6在内部部署了一个[Symbol.iterator]属性，它是一个函数，执行后会返回iterator对象（也叫迭代器对象，也叫iterator接口），拥有[Symbol.iterator]属性的对象即被视为可迭代的
  
  Iterator也是另外4个ES6常用特性的实现基础（解构赋值，剩余/扩展运算符，生成器，for of循环)
### Iterator 的遍历过程
  1. 创建一个指针对象，指向当前数据结构的起始位置。也就是说，遍历器对象本质上，就是一个指针对象。

  2. 第一次调用指针对象的next方法，可以将指针指向数据结构的第一个成员。

  3. 第二次调用指针对象的next方法，指针就指向数据结构的第二个成员。

  4. 不断调用指针对象的next方法，直到它指向数据结构的结束位置。

```
var it = makeIterator(['a', 'b']);

it.next() // { value: "a", done: false }
it.next() // { value: "b", done: false }
it.next() // { value: undefined, done: true }

function makeIterator(array) {
  var nextIndex = 0;
  return {
    next: function() {
      return nextIndex < array.length ?
        {value: array[nextIndex++], done: false} :
        {value: undefined, done: true};
    }
  };
}
  
```
## for...of
  Iterator 接口的目的，就是为所有数据结构，提供了一种统一的访问机制，即for...of循环。当使用for...of循环遍历某种数据结构时，该循环会自动去寻找 Iterator 接口。  

### 原生具备 Iterator 接口的数据结构如下。
  - Array
  - Map
  - Set
  - String
  - TypedArray
  - 函数的 arguments 对象
  - NodeList 对象

### object使用for...of
1. 为object添加[Symbol.iterator]和next方法
```
class RangeIterator {
  constructor(start, stop) {
    this.value = start;
    this.stop = stop;
  }

  [Symbol.iterator]() { return this; }

  next() {
    var value = this.value;
    if (value < this.stop) {
      this.value++;
      return {done: false, value: value};
    }
    return {done: true, value: undefined};
  }
}

function range(start, stop) {
  return new RangeIterator(start, stop);
}

for (var value of range(0, 3)) {
  console.log(value); // 0, 1, 2
}
```
2. 借用Array的Symbol.iterator
```
let iterable = {
  0: 'a',
  1: 'b',
  2: 'c',
  length: 3,
  [Symbol.iterator]: Array.prototype[Symbol.iterator] // [][Symbol.iterator];
};
for (let item of iterable) {
  console.log(item); // 'a', 'b', 'c'
}
```
3. 使用generator函数
```
let obj = {
  * [Symbol.iterator]() {
    yield 'hello';
    yield 'world';
  }
};

for (let x of obj) {
  console.log(x);
}
// "hello"
// "world"


function* entries(obj) {
  for (let key of Object.keys(obj)) {
    yield [key, obj[key]];
  }
}

for (let [key, value] of entries(obj)) {
  console.log(key, '->', value);
}
// a -> 1
// b -> 2
// c -> 3
```
4. 使用Object.keys方法将对象的键名生成一个数组，然后遍历这个数组。
```
for (var key of Object.keys(someObject)) {
  console.log(key + ': ' + someObject[key]);
}
```
## yield*
  yield*后面跟的是一个可遍历的结构，它会调用该结构的遍历器接口。
```
  let generator = function* () {
    yield 1;
    yield* [2,3,4];
    yield 5;
  };

  var iterator = generator();

  iterator.next() // { value: 1, done: false }
  iterator.next() // { value: 2, done: false }
  iterator.next() // { value: 3, done: false }
  iterator.next() // { value: 4, done: false }
  iterator.next() // { value: 5, done: false }
  iterator.next() // { value: undefined, done: true }
```

参考： [阮一峰：ES6标准入门](http://es6.ruanyifeng.com/)