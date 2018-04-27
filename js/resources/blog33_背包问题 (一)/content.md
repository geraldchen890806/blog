简单0/1背包问题 JS实现

假设有物品列表var items = [[2, 5],[3, 1],[5, 4],[6, 10]]; items[x][0]为物品重量，items[x][1]为价值

背包承重10 求最大价值

```
function knapsack1(capacity, items) {
    var res = [],
        pp = [];
    for (var i = -1; i < items.length; i++) {
        res[i] = []
        for (var j = 0; j <= capacity; j++) {
            res[i][j] = 0;
        }
    }

    for (var i = 0, length = items.length; i < length; i++) {
        for (var j = capacity; j >= 0; j--) {
            res[i][j] = res[i - 1][j];
            var to = res[i - 1][j - items[i][0]] + items[i][1] || 0;
            res[i][j] = Math.max(res[i][j], to);
        }
    }

    var x = [],
        j = capacity;
    for (var i = items.length - 1; i >= 0; i--) {
        x[i] = x[i] || 0;
        if (res[i][j] > res[i - 1][j]) {
            x[i] += 1;
            j = j - items[i][0]
        }
    }
    console.log(x)
    return res[items.length-1][capacity]
}

knaspack(10, items); // 15 x: [1, 0, 0, 1]
```

如果不需要知道具体放入哪些物品，则有简单解法

```
function knapsack(capacity, items) {
    var res = [];
    for (var i = 0; i <= capacity; i++) res[i] = 0;
    for (var i = 0, length = items.length; i < length; i++) {
        for (var j = capacity; j > items[i][0]; j--) {
            if (res[j] < res[j - items[i][0]] + items[i][1]) {
                res[j] = res[j - items[i][0]] + items[i][1];
            } else {
                res[j] = res[j];
            }
        }
    }
    return res[capacity]
}

knapsack(10, items);// 10
```

原理神马的参考 [01背包问题](http://love-oriented.com/pack/P01.html), [动态规划之背包问题](http://www.hawstein.com/posts/dp-knapsack.html) 以及 [动态规划：从新手到专家](http://www.hawstein.com/posts/dp-novice-to-advanced.html)
