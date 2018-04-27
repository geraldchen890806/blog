作为一个技术博客，为了文章中代码的呈现，mk是一定要支持的

首先引入 "marked": "0.3.2"

由于以前我的这个blog没有在线编辑功能。。。所以我的文章都是在http://maxiang.info/ 这个网站上写的 然后直接将mk语法的内容插入数据库，然后在node里转换显示，转换也很简单：

```
var md = require("marked");
blogs.forEach(function (v, i) {
  v.content = md(v.content)
}
```

然后再拷贝下式样就ok了

前两天终于将自己的在线编辑搞好了，不用再去马克飞象编辑文章再插入数据库了。。。

实现也很简单，参考了github的编辑式样，添加了预览功能，实际就是ajax讲textarea里内容传到后台，再用marked组件转换下

```
exports.editor = function *() {
  var body = yield parse(this);
  this.body = md(body.data);
}
```

我将会在插件模块中，展示这个简单的编辑器。。

有点不足的是 代码虽然突出显示 但是格式单一 请移步我的另一篇[文章](http://renjm.com/blog/10) 运用highlight.js 改善代码式样