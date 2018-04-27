ie中使用ActiveXObject的loadXMl方法解析xml,其他浏览器可以使用DOMParser

```
function loadXml (text) {
  var XMLDoc = null;
  if (window.ActiveXObject) {
    XMLDoc = new ActiveXObject("MSXML2.DOMDocument.6.0");//建议使用6.0版本
    XMLDoc.async = false
    XMLDoc.validateOnParse = true
    XMLDoc.loadXML(text)  
  } else {
    var parseXml = new DOMParser();
    XMLDoc = parseXml.parseFromString(text, "text/xml"); 
  }
  return XMLDoc;
}
```

然后我们就可以使用 loadXMl("...")来解析xml了

但是还有个问题，就是取子节点以及节点值的问题

```
//ie
XMLDoc_doc.selectSingleNode("CreditCardNumber").text
//chrome,firefox...
XMLDoc_doc.getElementsByTagName("CreditCardNumber")[0].innerHTML
```
为了不要每次取都要去判断浏览器 可以扩展下Node
```
function loadXml (text) {
  var XMLDoc = null;
  if (window.ActiveXObject) {
    XMLDoc = new ActiveXObject("MSXML2.DOMDocument.6.0");
    XMLDoc.async = false
    XMLDoc.validateOnParse = true
    XMLDoc.loadXML(text)  
  } else {
    var parseXml = new DOMParser();
    XMLDoc = parseXml.parseFromString(text, "text/xml"); 
    Node.prototype.selectSingleNode = function(node) {
      if (this.getElementsByTagName(node).length) {
        var child = this.getElementsByTagName(node)[0];
        child.text = child.innerHTML;
        return child;
      } else {
        return null;
      }
    }
  }
  return XMLDoc;
}
var XMLDoc = loadXml("<doc><test>ttt</test></doc>");
                    
var text = XMLDoc.documentElement.selectSingleNode("test").text;//ttt

实际上ie9+就已经支持DOMParser 但是为了兼容selectSingleNode方法 所以就在IE中都使用ActiveXObject

```