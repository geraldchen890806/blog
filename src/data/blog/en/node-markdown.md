---
author: Gerald Chen
pubDatetime: 2015-06-15T10:00:00+08:00
title: "Using Markdown with highlight.js in Node"
slug: node-markdown
featured: false
draft: true
tags:
  - Node.js
  - Markdown
description: "Parse Markdown in Node.js with marked, and add code syntax highlighting with highlight.js."
---

## Basics: using marked

```js
var md = require("marked");
blogs.forEach(function (v, i) {
  v.content = md(v.content);
});
```

## Adding highlight.js

Following the official marked example, wire in highlight.js:

```js
marked.setOptions({
  highlight: function (code) {
    return require("highlight.js").highlightAuto(code).value;
  },
});
```

## Adding line numbers (borrowed from the hexo source)

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
