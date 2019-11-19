(window.webpackJsonp=window.webpackJsonp||[]).push([[32],{j7lb:function(n,i,e){"use strict";e.r(i);var t=e("q1tI"),s=e.n(t),a=e("IujW"),r=e.n(a);i.default=function(){return s.a.createElement(r.a,{source:"简单0/1背包问题 JS实现\n\n假设有物品列表var items = [[2, 5],[3, 1],[5, 4],[6, 10]]; items[x][0]为物品重量，items[x][1]为价值\n\n背包承重10 求最大价值\n\n```\nfunction knapsack1(capacity, items) {\n    var res = [],\n        pp = [];\n    for (var i = -1; i < items.length; i++) {\n        res[i] = []\n        for (var j = 0; j <= capacity; j++) {\n            res[i][j] = 0;\n        }\n    }\n\n    for (var i = 0, length = items.length; i < length; i++) {\n        for (var j = capacity; j >= 0; j--) {\n            res[i][j] = res[i - 1][j];\n            var to = res[i - 1][j - items[i][0]] + items[i][1] || 0;\n            res[i][j] = Math.max(res[i][j], to);\n        }\n    }\n\n    var x = [],\n        j = capacity;\n    for (var i = items.length - 1; i >= 0; i--) {\n        x[i] = x[i] || 0;\n        if (res[i][j] > res[i - 1][j]) {\n            x[i] += 1;\n            j = j - items[i][0]\n        }\n    }\n    console.log(x)\n    return res[items.length-1][capacity]\n}\n\nknaspack(10, items); // 15 x: [1, 0, 0, 1]\n```\n\n如果不需要知道具体放入哪些物品，则有简单解法\n\n```\nfunction knapsack(capacity, items) {\n    var res = [];\n    for (var i = 0; i <= capacity; i++) res[i] = 0;\n    for (var i = 0, length = items.length; i < length; i++) {\n        for (var j = capacity; j > items[i][0]; j--) {\n            if (res[j] < res[j - items[i][0]] + items[i][1]) {\n                res[j] = res[j - items[i][0]] + items[i][1];\n            } else {\n                res[j] = res[j];\n            }\n        }\n    }\n    return res[capacity]\n}\n\nknapsack(10, items);// 10\n```\n\n原理神马的参考 [01背包问题](http://love-oriented.com/pack/P01.html), [动态规划之背包问题](http://www.hawstein.com/posts/dp-knapsack.html) 以及 [动态规划：从新手到专家](http://www.hawstein.com/posts/dp-novice-to-advanced.html)\n",htmlMode:"raw"})}}}]);