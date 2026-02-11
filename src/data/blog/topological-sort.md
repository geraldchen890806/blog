---
author: 陈广亮
pubDatetime: 2019-09-01T10:00:00+08:00
title: "拓扑排序"
slug: topological-sort
featured: false
draft: false
tags:
  - Go
  - 算法
description: "用 Go 语言深度优先搜索实现拓扑排序。"
---

拓扑排序是将有向无环图（DAG）的所有顶点排成线性序列，使得边 (u,v) 中 u 出现在 v 之前。

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

深度优先搜索：沿着树的深度遍历节点，尽可能深地搜索分支。当所有边都已探寻，搜索回溯到起始节点。
