var DB = require("./db");
var db = new DB("blogs");
var mm = require("moment");

exports.sqlBlogs = function(callback) {
  // var blogs = this.queryStr("SELECT * FROM blogs left join (select blog_tag.blogID,blog_tag.tagID,name as tagName from tags left join blog_tag on tags.id = blog_tag.tagID ) b on blogs.id = b.blogID order by blogs.addTime DESC");
  db.queryStr(
    "SELECT * FROM blogs left join (select blog_tag.blogID,blog_tag.tagID,name as tagName from tags left join blog_tag on tags.id = blog_tag.tagID ) b on blogs.id = b.blogID order by blogs.addTime DESC",
    {},
    function(blogs) {
      var res = [];
      blogs.forEach(function(v, i) {
        var id = parseInt(v.id);
        if (res[id]) {
          res[id].tags.push({
            id: v.tagID,
            name: v.tagName
          });
        } else {
          var date = mm(v.addTime);
          v.pubDate = date.format();
          v.addTime = date.format("LL");
          v.tags = [];
          if (v.tagID) {
            v.tags.push({
              id: v.tagID,
              name: v.tagName
            });
          }
          res[id] = v;
        }
        // console.log(res[id]);
      });
      res = res
        .filter(function(v, i) {
          return !!v;
        })
        .reverse();
      callback(res);
    }
  );
};
