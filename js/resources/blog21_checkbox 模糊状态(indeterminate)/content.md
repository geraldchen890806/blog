我们在用邮箱的时候可能有注意过checkbox有个模糊状态 就是上面是一条横线

这个状态就是用indeterminate来实现的

indeterminate属性只能使用js来设置

```
input.indeterminate = true;

//jQuery
input.prop("indeterminate", true);
```

[插件](/plugin)模块中有个[例子](/plugin#pluginCheckAll)可以参考下

参考 https://developer.mozilla.org/en-US/docs/Web/CSS/:indeterminate