要求实现正则表达式的复制
```
RegExp.clone(/regex/)
(/regex/).clone()
```
做法不难，只是为RegExp及其原型添加clone方法，不过有个问题需要注意。。

先看实现方法
```
RegExp.prototype.clone = function() {
  var ret = new RegExp(this);
  ret.lastIndex = this.lastIndex;
  return ret;
};

RegExp.clone = function(regex) {
  return regex.clone(); //直接调用下面的原型方法
};

```
需要注意的就是lastIndex这个属性,下面介绍下这个属性

只有当正则表达式设置了全局搜索标志g的时候才会有这个属性,表示从字符串的第几个字符开始匹配正则表达式

遵循以下几个规则

1. 如果lastIndex值大于匹配字符串的长度，test和exec方法失败，lastIndex置为0
```
var re = /te/g;
console.log(re.lastIndex); //0
re.test("test"); //true
console.log(re.lastIndex); //2
re.test("test"); //false
console.log(re.lastIndex); //0
re.test("test"); //true
```

2. 如果lastIndex值等于匹配字符串的长度并且正则表达式可以匹配空字符串，从lastIndex值处开始匹配
```
var re = /$/g; //可以匹配任意字符串
console.log(re.lastIndex); //0
re.lastIndex = 2;
console.log(re.lastIndex); //2
re.test("te"); //true
console.log(re.lastIndex); //2
re.test("test"); //true
console.log(re.lastIndex); //4
```

3. 如果lastIndex值等于匹配字符串的长度并且正则表达式不能匹配空字符串，匹配失败，lastIndex置为0
```
var re = /\\w+/g; 
console.log(re.lastIndex); //0
re.lastIndex = 2;
console.log(re.lastIndex); //2
re.test("te"); //false
console.log(re.lastIndex); //0
```

4. 其他情况，lastIndex设为最后一次匹配成功的最后一个字符位置
```
var re = /te/g; 
console.log(re.lastIndex); //0
re.test("te1");            //true
console.log(re.lastIndex); //2
re.test("te1te2te3");      //true
console.log(re.lastIndex); //5
re.test("te1te2te3");      //true
console.log(re.lastIndex); //8
```

所以复制正则表达式时需要复制lastIndex属性,否则会影响使用