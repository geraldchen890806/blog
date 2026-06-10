---
author: Gerald Chen
pubDatetime: 2019-08-01T10:00:00+08:00
title: "Go Learning Notes"
slug: go-learning-notes
featured: false
draft: true
tags:
  - Go
description: "Go language fundamentals: variable declarations, arrays, slices, maps, and other core concepts."
---

## Environment Setup

```bash
export GOPATH=$HOME/go
export GOBIN=$HOME/go/bin
export PATH="$GOPATH/bin:$PATH"
```

## Variable Declarations

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

A slice is a reference type—modifying it affects every reference to the underlying array:

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

Maps are unordered, are reference types, and are not thread-safe.
