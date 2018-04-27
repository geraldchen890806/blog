我想关注生成器的应该都会知道tj大神的co模块，下面是我在学习co时的一点心得

举个例子：

    function * foo() {
      yield 4;
      var res = yield 2;
      console.log("res:",res)
      return 5;
    }
    
    var g = foo();
    g.next(1); // { value: 4, done: false }
    g.next(2); // { value: 2, done: false }
    g.next(3); // res:3 { value: 5, done: true }
    
这个例子反映了生成器的基本特性，有以下几点值得注意：

  1.在调用foo()时，函数体中的逻辑并不会执行，直接调用g.next()时才会执行
  
  2.调用g.next()时，函数体中的逻辑才开始真正执行，返回结果{ value: \\*, done: \\* }
  
  3.当done属性为false时，表示该函数逻辑还未执行完，可以调用a.next()继续执行，否则不可继续调用
  
  4.最后一次返回的结果为return语句返回的结果，且done值为true。如果不写return，则值为undefined
  
  5.var res = yield 2这句是指，这一段逻辑返回2，在下一次调用g.next(3)时，res = 3。换句话说，这句只执行了后面半段就暂停了，等到再次调用g.next()时才会将参数赋给res并继续执行下面的逻辑
    
tj大神的co模块就是建立在这些特性上的

    function * genFn(){
      console.log('start');
      var s = yield function test(fn) {
        $.get("http://www.baidu.com", fn)
      }
      console.log("s", s.statusCode)
    }
    
    var gen = genFn();
    var ret = gen.next();
    ret.value(p);

    function p(err, args) {
      if (gen.next) {
        var nextGen = gen.next(args)
        if (nextGen.done) {
          console.log('done');
        } else {
          nextGen.value(p)
        }
      }
    }
输出：
    
    start
    s 200
    done
    
这里的ret.value(p) 就是运行test函数并且将p作为参数。那么test函数就会是这样的

    function test(fn){
        $.get("http://www.baidu.com", function(err, args) {
          if (gen.next) {
            var ret = gen.next(args);
            //根据第5条特性，在这里会将args赋值给genFn里的s
            if (ret.done) {
              console.log('done');
            } else {
              ret.value()
            }
          }
        })
    }
    
根据生成器的特性，第一次调用gen.next()时会返回test函数，这时ret.value == test，然后使用ret.value(p)调用test函数，在get的callback里运行gen.next，并将get返回值赋值给ret

    

参考 http://bg.biedalian.com/2013/12/21/harmony-generator.html
        http://huangj.in/765
