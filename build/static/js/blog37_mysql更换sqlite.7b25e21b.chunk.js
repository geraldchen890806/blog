(window.webpackJsonp=window.webpackJsonp||[]).push([[37],{"80I7":function(e,n,r){"use strict";r.r(n);var t=r("q1tI"),l=r.n(t),o=r("IujW"),s=r.n(o);n.default=function(){return l.a.createElement(s.a,{source:"本人的这个小博客是部署在阿里云上的，还用了阿里的mysql。最近mysql到期了，续费要48一个月，用不起了，所以决定更换成sqlite\r\n\r\n下面记录下本次更换的全过程\r\n\r\n1、安装sqlite(我用的mac，无需安装 ^_^)\r\n2、将阿里上的实例备份下来 是个sql文件\r\n3、对sql里的SQL语句做处理，就说换换类型之类的\r\n4、生成sqlite db文件\r\n\r\n````\r\nvar sqlite3 = require(\"sqlite3\").verbose();\r\nvar _ = require(\"lodash\");\r\nvar path = 'db/blogs.db';\r\nvar db = new sqlite3.Database(path);\r\n//sql命令每次执行一个，所以我是每次注解其他命令，留一个运行。。。\r\nfs.readFile('sql/sql.sql', 'utf8', function(a, data) {\r\n    console.log(data.split('===').length);\r\n    db.run(data);\r\n})\r\n\r\n````\r\n5、改项目中的sql语句\r\n\r\n````\r\n//我用的koa框架\r\nvar res = yield new Promise(function(resolve, reject) {\r\n    self.db.run(\"insert into comments values (?,?,?,?,?,?,?)\", [null, comment.blogID, comment.name, comment.email, comment.content, comment.addTime, comment.relID]);\r\n    self.db.get('select * from comments where blogID = ? and name = ?', [comment.blogID, comment.name], function(err, rows) {\r\n        resolve(rows);\r\n    });\r\n});\r\n//update语句\r\nvar res = yield new Promise(function(resolve, reject) {\r\n    self.db.run(\"update blogs set title = ?, url =?,content=?,editTime=?,isRecommend=?,isDraft=? where id = ?\", [blog.title, blog.url, blog.content, blog.editTime, blog.isRecommend, blog.isDraft, data.id]);\r\n    self.db.get('select * from blogs where url = ?', [blog.url], function(err, rows) {\r\n        resolve(rows);\r\n    });\r\n});\r\n\r\n````\r\n\r\n还是挺简单的，省了48一个月 ^_^",htmlMode:"raw"})}}}]);