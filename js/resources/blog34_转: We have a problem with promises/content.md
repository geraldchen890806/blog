下面4种promise的区别是什么
```
doSomething().then(function () {
  return doSomethingElse();
});

doSomething().then(function () {
  doSomethingElse();
});

doSomething().then(doSomethingElse());

doSomething().then(doSomethingElse);
```

[中文版](http://fex.baidu.com/blog/2015/07/we-have-a-problem-with-promises/)
[原文](http://pouchdb.com/2015/05/18/we-have-a-problem-with-promises.html)