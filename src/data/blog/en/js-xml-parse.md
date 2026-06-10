---
author: Gerald Chen
pubDatetime: 2015-07-20T10:00:00+08:00
title: "Parsing XML in JavaScript: Compatible with IE and Other Browsers"
slug: js-xml-parse
featured: false
draft: true
tags:
  - JavaScript
  - 兼容性
description: "A cross-browser approach to parsing XML: ActiveXObject for IE, DOMParser for everything else."
---

In IE, you parse XML with the `loadXML` method of an `ActiveXObject`; other browsers can use `DOMParser`.

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
