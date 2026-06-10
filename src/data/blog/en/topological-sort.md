---
author: Gerald Chen
pubDatetime: 2019-09-01T10:00:00+08:00
title: "Topological Sort"
slug: topological-sort
featured: false
draft: true
tags:
  - Go
  - 算法
description: "Implementing topological sort in Go with depth-first search."
---

Topological sorting arranges all vertices of a directed acyclic graph (DAG) into a linear sequence such that for every edge (u,v), u appears before v.

```go
func topoSort(m map[string][]string) []string {
    var order []string
    seen := make(map[string]bool)
    var visitAll func(items []string)
    visitAll = func(items []string) {
        for _, item := range items {
            if !seen[item] {
                seen[item] = true
                visitAll(m[item])
                order = append(order, item)
            }
        }
    }
    var keys []string
    for key := range m {
        keys = append(keys, key)
    }
    sort.Strings(keys)
    visitAll(keys)
    return order
}
```

Depth-first search traverses nodes along the depth of the tree, exploring each branch as deeply as possible. Once all edges have been explored, the search backtracks to the starting node.
