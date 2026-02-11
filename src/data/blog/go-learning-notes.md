---
author: 陈广亮
pubDatetime: 2019-08-01T10:00:00+08:00
title: "Go 学习笔记"
slug: go-learning-notes
featured: false
draft: false
tags:
  - Go
description: "Go 语言基础：变量定义、array、slice、map 等核心概念。"
---

## 环境配置

```bash
export GOPATH=$HOME/go
export GOBIN=$HOME/go/bin
export PATH="$GOPATH/bin:$PATH"
```

## 变量定义

```go
var vname1, vname2 type
vname1, vname2 := v1, v2  // 简短声明

// iota 枚举
const (
    a = iota  // 0
    b = "B"
    c = iota  // 2
)
```

## Slice

slice 是引用类型，修改会影响所有引用：

```go
array := [10]byte{'a','b','c','d','e','f','g','h','i','j'}
aSlice := array[:3]  // a,b,c
bSlice := array[5:]  // f,g,h,i,j
```

## Map

```go
numbers := make(map[string]int)
numbers["one"] = 1
numbers["ten"] = 10
```

map 是无序的、引用类型，不是 thread-safe。
