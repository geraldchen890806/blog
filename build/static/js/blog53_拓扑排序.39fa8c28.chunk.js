(window.webpackJsonp=window.webpackJsonp||[]).push([[53],{ifoL:function(n,r,t){"use strict";t.r(r);var e=t("q1tI"),s=t.n(e),a=t("IujW"),i=t.n(a);r.default=function(){return s.a.createElement(i.a,{source:'对一个有向无环图(Directed Acyclic Graph简称DAG)G进行拓扑排序，是将G中所有顶点排成一个线性序列，使得图中任意一对顶点u和v，若边(u,v)∈E(G)，则u在线性序列中出现在v之前。 通常，这样的线性序列称为满足拓扑次序(Topological Order)的序列，简称拓扑序列\n\n例：给定一些计算机课程，每个课程都有前置课程，只有完成了前置课程才可以开始当前课程的学习；我们的目标是选择出一组课程，这组课程必须确保按顺序学习时，能全部被完成。每个课程的前置课程如下：\n```\n// prereqs记录了每个课程的前置课程\nvar prereqs = map[string][]string{\n    "algorithms": {"data structures"},\n    "calculus": {"linear algebra"},\n    "compilers": {\n        "data structures",\n        "formal languages",\n        "computer organization",\n    },\n    "data structures":       {"discrete math"},\n    "databases":             {"data structures"},\n    "discrete math":         {"intro to programming"},\n    "formal languages":      {"discrete math"},\n    "networks":              {"operating systems"},\n    "operating systems":     {"data structures", "computer organization"},\n    "programming languages": {"data structures", "computer organization"},\n}\n```\n下面的代码用深度优先搜索了整张图，获得了符合要求的课程序列\n```\nfunc main() {\n    for i, course := range topoSort(prereqs) {\n        fmt.Printf("%d:\\t%s\\n", i+1, course)\n    }\n}\n\nfunc topoSort(m map[string][]string) []string {\n    var order []string\n    seen := make(map[string]bool)\n    var visitAll func(items []string)\n    visitAll = func(items []string) {\n        for _, item := range items {\n            if !seen[item] { \n                seen[item] = true // 标记已遍历节点\n                visitAll(m[item]) // 遍历节点之前节点\n                order = append(order, item) // 记录最优先节点\n            }\n        }\n    }\n    var keys []string\n    for key := range m {\n        keys = append(keys, key)\n    }\n    sort.Strings(keys)\n    visitAll(keys)\n    return order\n}\n```\n\n#### 深度优先搜索算法（英语：Depth-First-Search，DFS）是一种用于遍历或搜索树或图的算法。沿着树的深度遍历树的节点，尽可能深的搜索树的分支。当节点v的所在边都己被探寻过，搜索将回溯到发现节点v的那条边的起始节点。这一过程一直进行到已发现从源节点可达的所有节点为止。如果还存在未被发现的节点，则选择其中一个作为源节点并重复以上过程，整个进程反复进行直到所有节点都被访问为止。属于盲目搜索。\n\n参考：\n\n[Go语言圣经](https://docs.hacknode.org/gopl-zh/ch5/ch5-06.html)',htmlMode:"raw"})}}}]);