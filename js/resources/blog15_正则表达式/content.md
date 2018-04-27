首先推荐个正则表达式入门[教程](http://www.jb51.net/tools/zhengze.html)

正则表示有个元字符\\b 匹配单词的开始或结束

类如测试字符串是不是只有一个单词
```
/^\\b\\S*$/.test("test"); //true
/^\\b\\S*$/.test("test test"); //false
```
有一点要注意的是 \\b的匹配项是[0-9A-Z_a-z] 就是数字大小写字母以及下划线

所以用\\b时要注意单词前后是否有特殊字符
```
/\\btest\\b/.test("@test")  //true
/\\btest\\b/.test("test")  //true
```

