IE8及以前版本Array中是没有forEach方法的

可以自己给Array.prototype加个扩充
```
if (!Array.prototype.forEach) {

  Array.prototype.forEach = function(callback, thisArg) {
    var T, k;
    if (this == null) {
      throw new TypeError(' this is null or not defined');
    }
    var O = Object(this);
    var len = O.length >>> 0;
    if (typeof callback !== "function") {
      throw new TypeError(callback + ' is not a function');
    }
    if (arguments.length > 1) {
      T = thisArg;
    }
    k = 0;
    while (k < len) {
      var kValue;
      if (k in O) {
        kValue = O[k];
        callback.call(T, kValue, k, O);//主要就是这段代码
      }
      k++;
    }
  };
}
```

再看下jQuery的each方法的实现，扩展了对象的遍历

需要注意的是each方法回调函数的参数与forEach相反 是先index后elem


```
jQuery.each =  function( object, callback, args ) {
    var name, i = 0,
            length = object.length,
            isObj = length === undefined || jQuery.isFunction( object );

    if ( args ) {
        if ( isObj ) {
            for ( name in object ) {
                if ( callback.apply( object[ name ], args ) === false ) {
                    break;
                }
            }
        } else {
            for ( ; i < length; ) {
                if ( callback.apply( object[ i++ ], args ) === false ) {
                    break;
                }
            }
        }

        // A special, fast, case for the most common use of each
    } else {
        if ( isObj ) {
            for ( name in object ) {
                if ( callback.call( object[ name ], name, object[ name ] ) === false ) {
                    break;
                }
            }
        } else {
            for ( ; i < length; ) {
                if ( callback.call( object[ i ], i, object[ i++ ] ) === false ) {
                    break;
                }
            }
        }
    }
    return object;
}
```