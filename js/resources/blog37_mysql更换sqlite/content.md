本人的这个小博客是部署在阿里云上的，还用了阿里的mysql。最近mysql到期了，续费要48一个月，用不起了，所以决定更换成sqlite

下面记录下本次更换的全过程

1、安装sqlite(我用的mac，无需安装 ^_^)
2、将阿里上的实例备份下来 是个sql文件
3、对sql里的SQL语句做处理，就说换换类型之类的
4、生成sqlite db文件

````
var sqlite3 = require("sqlite3").verbose();
var _ = require("lodash");
var path = 'db/blogs.db';
var db = new sqlite3.Database(path);
//sql命令每次执行一个，所以我是每次注解其他命令，留一个运行。。。
fs.readFile('sql/sql.sql', 'utf8', function(a, data) {
    console.log(data.split('===').length);
    db.run(data);
})

````
5、改项目中的sql语句

````
//我用的koa框架
var res = yield new Promise(function(resolve, reject) {
    self.db.run("insert into comments values (?,?,?,?,?,?,?)", [null, comment.blogID, comment.name, comment.email, comment.content, comment.addTime, comment.relID]);
    self.db.get('select * from comments where blogID = ? and name = ?', [comment.blogID, comment.name], function(err, rows) {
        resolve(rows);
    });
});
//update语句
var res = yield new Promise(function(resolve, reject) {
    self.db.run("update blogs set title = ?, url =?,content=?,editTime=?,isRecommend=?,isDraft=? where id = ?", [blog.title, blog.url, blog.content, blog.editTime, blog.isRecommend, blog.isDraft, data.id]);
    self.db.get('select * from blogs where url = ?', [blog.url], function(err, rows) {
        resolve(rows);
    });
});

````

还是挺简单的，省了48一个月 ^_^