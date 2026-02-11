---
author: 陈广亮
pubDatetime: 2015-07-20T10:00:00+08:00
title: "JS 解析 XML 兼容 IE 与其他浏览器"
slug: js-xml-parse
featured: false
draft: false
tags:
  - JavaScript
  - 兼容性
description: "IE 使用 ActiveXObject，其他浏览器使用 DOMParser 解析 XML 的兼容方案。"
---

IE 中使用 `ActiveXObject` 的 `loadXML` 方法解析 XML，其他浏览器可以使用 `DOMParser`。

```js
function loadXml(text) {
  var XMLDoc = null;
  if (window.ActiveXObject) {
    XMLDoc = new ActiveXObject("MSXML2.DOMDocument.6.0");
    XMLDoc.async = false;
    XMLDoc.validateOnParse = true;
    XMLDoc.loadXML(text);
  } else {
    var parseXml = new DOMParser();
    XMLDoc = parseXml.parseFromString(text, "text/xml");
    Node.prototype.selectSingleNode = function (node) {
      if (this.getElementsByTagName(node).length) {
        var child = this.getElementsByTagName(node)[0];
        child.text = child.innerHTML;
        return child;
      }
      return null;
    };
  }
  return XMLDoc;
}

var XMLDoc = loadXml("<doc><test>ttt</test></doc>");
var text = XMLDoc.documentElement.selectSingleNode("test").text; // "ttt"
```
