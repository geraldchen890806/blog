const DB = require('./db');
const db = new DB('blogs');
const mm = require('moment');
const scripts = require('./scripts');

exports.sqlBlogs = function (callback) {
  // var blogs = this.queryStr("SELECT * FROM blogs left join (select blog_tag.blogID,blog_tag.tagID,name as tagName from tags left join blog_tag on tags.id = blog_tag.tagID ) b on blogs.id = b.blogID order by blogs.addTime DESC");
  db.queryStr(
    'SELECT * FROM blogs left join (select blog_tag.blogID,blog_tag.tagID,name as tagName from tags left join blog_tag on tags.id = blog_tag.tagID ) b on blogs.id = b.blogID order by blogs.addTime DESC',
    {},
    (blogs) => {
      let res = [];
      blogs.forEach((v, i) => {
        const id = parseInt(v.id);
        if (res[id]) {
          res[id].tags.push({
            id: v.tagID,
            name: v.tagName,
          });
        } else {
          const date = mm(v.addTime);
          v.pubDate = date.format();
          v.addTime = date.format('LL');
          v.tags = [];
          if (v.tagID) {
            v.tags.push({
              id: v.tagID,
              name: v.tagName,
            });
          }
          res[id] = v;
        }
        // console.log(res[id]);
      });

      scripts(res);

      res = res.filter((v, i) => !!v).reverse();
      callback(res);
    }
  );
};
