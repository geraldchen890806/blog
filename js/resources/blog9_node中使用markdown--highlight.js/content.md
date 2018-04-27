之前的一篇文章有写过node中使用marked，不过代码虽然有黑色背景突出显示，但是实在太丑。。。

参照marked[官方示例](https://www.npmjs.com/package/marked)引入[highlight.js](https://highlightjs.org/) "8.4.0"

```
marked.setOptions({
  highlight: function (code) {
    return require('highlight.js').highlightAuto(code).value;
  }
});
```

虽然关键字都有特殊颜色标识了 还是太丑。。。

然后想起hexo的代码式样，果断copy下[式样](https://github.com/geraldchen890806/blog_nodejs/blob/master/public/stylesheets/style.css)，不过hexo的className 有点区别 没有"hljs-"前缀 
需要加个配置

```
var highlight = require("highlight.js");
highlight.configure({
  classPrefix: '
})

marked.setOptions({
  highlight: function (code) {
    return highlight.highlightAuto(code).value;
  }
});
```

然后发现hexo的代码line number也挺帅 看下hexo的[源码](https://github.com/hexojs/hexo/blob/master/lib/util/highlight.js) copy下~~

核心代码就是改写highlight方法

```
highlight: function (code) {
  var compiled = require('highlight.js').highlightAuto(code).value;

  var lines = compiled.split('\\n'),
    numbers = ',
    content = ';

  lines.forEach(function(item, i){
    numbers += '<div class="line">' + (i + 1) + '</div>';
    content += '<div class="line">' + item + '</div>';
  });

  var result = '<figure class="highlight">' + '<table><tr>' +
      '<td class="gutter"><pre>' + numbers + '</pre></td>' +
      '<td class="code"><pre>' + content + '</pre></td>' +
      '</tr></table>'+
      '</figure>';
  return result;
}
```

当然因为hexo的代码式样中没有pre code这2个外层tag 所以代码式样有点问题

不知道hexo怎么做的，没翻到源码。。。

我的做法是重新实现marked的code方法

```
var md = require("marked");
var render = new md.Renderer();
render.code = function(code, lang, escaped) {
  if (this.options.highlight) {
    var out = this.options.highlight(code, lang);
    if (out != null && out !== code) {
      escaped = true;
      code = out;
    }
  }

  if (!lang) {
    return (escaped ? code : escape(code, true));
  }

  return '<pre><code class="'
    + this.options.langPrefix
    + escape(lang, true)
    + '">'
    + (escaped ? code : escape(code, true))
    + '\\n</code></pre>\\n';
}
md.setOptions({
  renderer: render,
  highlight: function(code){
    ....
  }
});

```
