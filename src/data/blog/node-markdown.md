---
author: 陈广亮
pubDatetime: 2015-06-15T10:00:00+08:00
title: "Node 中使用 Markdown 与 highlight.js"
slug: node-markdown
featured: false
draft: false
tags:
  - Node.js
  - Markdown
description: "在 Node.js 中使用 marked 解析 Markdown，配合 highlight.js 实现代码高亮。"
---

## 基础：使用 marked

```js
var md = require("marked");
blogs.forEach(function (v, i) {
  v.content = md(v.content);
});
```

## 引入 highlight.js

参照 marked 官方示例引入 highlight.js：

```js
marked.setOptions({
  highlight: function (code) {
    return require("highlight.js").highlightAuto(code).value;
  },
});
```

## 添加行号（参考 hexo 源码）

```js
highlight: function (code) {
  var compiled = require('highlight.js').highlightAuto(code).value;
  var lines = compiled.split('\n'),
    numbers = '', content = '';

  lines.forEach(function(item, i){
    numbers += '<div class="line">' + (i + 1) + '</div>';
    content += '<div class="line">' + item + '</div>';
  });

  return '<figure class="highlight"><table><tr>' +
    '<td class="gutter"><pre>' + numbers + '</pre></td>' +
    '<td class="code"><pre>' + content + '</pre></td>' +
    '</tr></table></figure>';
}
```
