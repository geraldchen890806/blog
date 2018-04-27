首先选个自己喜欢的[icon](http://www.feedly.com/factory.html) 

这里的feed url是自己的rss xml的路径 我的是 renjm.com/feed (这个路径就可以用来做RSS订阅 )

然后将生产的a放到自己的网站中

第二步就是在自己的网站中添加路由/feed，并且输出rss xml

先安装[node-rss](https://github.com/dylang/node-rss) 配置好自己的参数 生成xml

我自己的配置
```
exports.feed = function *() {
  var feed = new rss({
    title: '陈佳人',
    description: '人生是一场独自修行的道路',
    feed_url: 'http://renjm.com/feed',
    site_url: 'http://renjm.com',
    image_url : gravatar.url('geraldchen890806@gmail.com', {s: '200', r: 'pg', d: '404'}),
  })
  var blogs = yield blogDB.getBlogs();

  blogs.forEach(function (v, i) {
    feed.item({
      title: v.title,
      description: v.realContent,
      url: "http://renjm.com/blog/" + v.id,
      date: v.addTime
    })
  })
  this.body = feed.xml();
  this.type = 'text/xml' //输出类型为xml
}
```
这样就ok了 点下右下角的图标试试吧

还有其他的配置 关键字绑定等 看[这里](http://www.feedly.com/publishers.html)