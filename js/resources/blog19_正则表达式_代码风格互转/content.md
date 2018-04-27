代码书写风格通常有3中
驼峰风格：testTest
连字风格：test-test
下划线风格: test_test

下划线或连字风格转换成驼峰风格

```
function camelize (target) {
  return target.replace(/[_-][^_-]/g, function(match) {
    return match.charAt(1).toUpperCase();
  });
}

camelize("te-pp"); // tePp  replace中match为"-p"
```
连字或驼峰转换成下划线风格
```
function underscored (target) {
  return target.replace(/([a-z\\d])([A-Z])/g, '$1_$2').
         replace(/\\-/g, '_').toLowerCase();
}
```
装换成连字风格
```
function dasherize (target) {
  return target.replace(/([a-z\\d])([A-Z])/g, '$1_$2').
         replace(/\\_/g, '-').toLowerCase();
}
```