这段时间在做ie兼容chrome的工作 碰到一个问题 chrome不支持showModalDialog

这还好 我们可以用window.open代替,兼容代码如下 (其实IE中也支持window.open 只是在跨域处理上window.open比较麻烦)

```   
//父页面
if (window.chrome) {
   window.open(...);
} else if (window.showModalDialog) {
   var str = window.showModalDialog(...)
   //str为returnValue
}

function doReturnValue(str) {
  ...
}    
```

子页面已经returnValue兼容如下

```
if (window.chrome) { 
  window.opener.doReturnValue(str); 
} else {
  window.returnValue = str;
}
window.close();
```

不过最近更奇葩的问题出现,打开的子页面涉及到跨域的问题。。。

这时showModalDialog的returnValue===undifine并且window.opener.doReturnValue方法也不起作用

还好我只要兼容chrome，html5的postMessage可以解决这个问题

```
//父页面
if (window.chrome) {
    window.addEventListener('message', function (e) {
      if(e.data == 'closed') {
       ...
      }
    })
}

//子页面
if (window.chrome) {
  window.opener.postMessage("closed", "*");//* 不太安全 你懂的 应该写上父页面的域名
}
```

Firefox,Safari,Opear,ie9+等支持html5的都可以用postMessage解决window.open跨域的问题

至于ie9以下的 只能用window.showModalDialog了 

其实我还是觉得随他去了 咱就用window.open吧。。。