## 环境配置

export GOPATH=$HOME/go
export GOBIN=$HOME/go/bin
export PATH="$GOPATH/bin:$PATH"

### (Go 命令)[https://github.com/astaxie/build-web-application-with-golang/blob/master/zh/01.3.md]

#### package main

go build(go/pkg)
go install(go/bin)
go get

## Go 语言基础

### 定义变量 (Boolean,数值类型,字符串,error, iota)

```
1. var vname1, vname2, vname3 type
2. var vname1, vname2, vname3 type= v1, v2, v3
3. vname1, vname2, vname3 := v1, v2, v3
// Go里面有一个关键字iota，这个关键字用来声明enum的时候采用，它默认开始值是0，const中每增加一行加1：
4.
  const (
    a       = iota //a=0
    b       = "B"
    c       = iota             //c=2
    d, e, f = iota, iota, iota //d=3,e=3,f=3
    g       = iota             //g = 4
  )
```

#### array

```
1. var arr [10]int
2. b := [10]int{1, 2, 3} // 声明了一个长度为10的int数组，其中前三个元素初始化为1、2、3，其它默认为0
3. c := [...]int{4, 5, 6} // 可以省略长度而采用`...`的方式，Go会自动根据元素个数来计算长度
4. // 声明了一个二维数组，该数组以两个数组作为元素，其中每个数组中又有4个int类型的元素
  doubleArray := [2][4]int{[4]int{1, 2, 3, 4}, [4]int{5, 6, 7, 8}}
```

#### slice

slice 是引用类型，所以当引用改变其中元素的值时，其它的所有引用都会改变该值，例如上面的 aSlice 和 bSlice，如果修改了 aSlice 中元素的值，那么 bSlice 相对应的值也会改变。

```
// 声明一个数组
var array = [10]byte{'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'}
// 声明两个slice
var aSlice, bSlice []byte

// 演示一些简便操作
aSlice = array[:3] // 等价于aSlice = array[0:3] aSlice包含元素: a,b,c
aSlice = array[5:] // 等价于aSlice = array[5:10] aSlice包含元素: f,g,h,i,j
aSlice = array[:]  // 等价于aSlice = array[0:10] 这样aSlice包含了全部的元素

// 从slice中获取slice
aSlice = array[3:7]  // aSlice包含元素: d,e,f,g，len=4，cap=7
bSlice = aSlice[1:3] // bSlice 包含aSlice[1], aSlice[2] 也就是含有: e,f
bSlice = aSlice[:3]  // bSlice 包含 aSlice[0], aSlice[1], aSlice[2] 也就是含有: d,e,f
bSlice = aSlice[0:5] // 对slice的slice可以在cap范围内扩展，此时bSlice包含：d,e,f,g,h
bSlice = aSlice[:]   // bSlice包含所有aSlice的元素: d,e,f,g

// 从Go1.2开始slice支持了三个参数的slice，之前我们一直采用这种方式在slice或者array基础上来获取一个slice
var array [10]int
slice := array[2:4] slice的容量是8
slice = array[2:4:7] 新版本里面可以指定这个容量, 容量就是7-2，即5。这样这个产生的新的slice就没办法访问最后的三个元素。
```

#### map

map 的读取和设置也类似 slice 一样，通过 key 来操作，只是 slice 的 index 只能是｀ int ｀类型，而 map 多了很多类型，可以是 int，可以是 string 及所有完全定义了==与!=操作的类型。

1. map 是无序的，每次打印出来的 map 都会不一样，它不能通过 index 获取，而必须通过 key 获取
2. map 的长度是不固定的，也就是和 slice 一样，也是一种引用类型
3. 内置的 len 函数同样适用于 map，返回 map 拥有的 key 的数量
4. map 的值可以很方便的修改，通过 numbers["one"]=11 可以很容易的把 key 为 one 的字典值改为 11
5. map 和其他基本型别不同，它不是 thread-safe，在多个 go-routine 存取时，必须使用 mutex lock 机制

```
  // 声明一个key是字符串，值为int的字典,这种方式的声明需要在使用之前使用make初始化
var numbers map[string]int
// 另一种map的声明方式
numbers = make(map[string]int)
numbers["one"] = 1  //赋值
numbers["ten"] = 10 //赋值
numbers["three"] = 3

fmt.Println("第三个数字是: ", numbers["three"]) // 读取数据
// 打印出来如:第三个数字是: 3
```

#### make、new操作


#### 小技巧
1. 字符串大写
```
func main() {
    x := "hello!"
    for i := 0; i < len(x); i++ {
        x := x[i]
        if x != '!' {
            x := x + 'A' - 'a'
            fmt.Printf("%c", x) // "HELLO"
        }
    }
}
```