var sqlite3 = require("sqlite3").verbose();
var fs = require("fs");
var path = require('path');

var p = path.join(__dirname, 'db','blogs.db');
var db = new sqlite3.Database(p);
// fs.readFile('sql/sql.sql', 'utf8', function(a, data) {
//     console.log(data.split('===').length);
//     db.run(data);
// })
if (!fs.existsSync(p)) {
    db.serialize(function() {
        db.run("CREATE TABLE `blog_tag` (`id` INTEGER PRIMARY KEY AUTOINCREMENT,`blogID` INTEGER NOT NULL,`tagID` INTEGER NOT NULL);");
        db.run("CREATE TABLE `blogs` (`id` INTEGER PRIMARY KEY AUTOINCREMENT,`title` TEXT NOT NULL,`url` TEXT NOT NULL,`content` TEXT NOT NULL,`addTime` TEXT NOT NULL,`editTime` TEXT DEFAULT NULL,`userID` INTEGER DEFAULT NULL,`times` INTEGER DEFAULT '0',`reTimes` INTEGER DEFAULT '0',`isLocal` INTEGER DEFAULT NULL,`isRecommend` INTEGER DEFAULT NULL,`isDraft` INTEGER DEFAULT '0')");
        db.run("CREATE TABLE `comments` (`id` INTEGER PRIMARY KEY AUTOINCREMENT,`blogID` INTEGER NOT NULL,`name` TEXT NOT NULL,`email` TEXT NOT NULL,`content` TEXT NOT NULL,`addTime` TEXT NOT NULL,`relID` INTEGER DEFAULT '0')");
        db.run("CREATE TABLE `tags` (`id` INTEGER PRIMARY KEY AUTOINCREMENT,`name` TEXT NOT NULL,`addTime` TEXT NOT NULL)");
        db.run("CREATE TABLE `users` (`userID` INTEGER PRIMARY KEY AUTOINCREMENT,`name` TEXT NOT NULL,`password` TEXT NOT NULL,`email` TEXT NOT NULL)");
        db.run("insert into `users`(`userID`,`name`,`password`,`email`) values('1','admin','admin','admin@test.com');");
    });
}

function Database(file) {
    var self = this;
    self.tabName = file;
    self.db = db;
}

Database.prototype = {
    queryStr: function (str, options, callback) {
        db.serialize(function() {
            db.all(str, options, function(err, rows) {
                callback(rows);
            });
        });
    }
};

// Database.prototype = {
//     queryStr: function*(str, options) {
//         console.log('query db ******  ' + str);
//         return yield new Promise(function(resolve, reject) {
//             db.serialize(function() {
//                 db.all(str, options, function(err, rows) {
//                     // console.log(str)
//                     resolve(rows);
//                 });
//             });
//         });
//     },

//     getList: function() {
//         var queryStr = "SELECT * FROM " + this.tabName;
//         return this.queryStr(queryStr);
//     },

//     findByID: function(id) {
//         var queryStr = "SELECT * FROM " + this.tabName + " where id = " + id;
//         return this.queryStr(queryStr);
//     },
//     saveSql: function*(str, obj) {
//         var keys = _.keys(obj);
//         str = str + "(" + keys.join(',') + ") VALUES (";
//         _.each(keys, function(key) {
//             str += obj[key] + ','
//         });
//         str = str.slice(0, -1) + ')';
//         console.log('query save ******  ' + str);
//         return yield new Promise(function(resolve, reject) {
//             db.serialize(function() {
//                 db.run(str, function(err, rows) {
//                     resolve(rows);
//                 });
//             });
//         });
//     }
// }

// Database.prototype.create = function() {
//     console.log("create database");
//     var db = this.db;
//     db.serialize(function() {
//         db.run('CREATE TABLE items (' +
//             'title TEXT,' +
//             'description TEXT,' +
//             'level INTEGER,' +
//             'id INTEGER PRIMARY KEY AUTOINCREMENT' +
//             ')'
//         );
//     });
// };

// Database.prototype.add = function(title, description) {
//     console.log("insert into database");
//     var db = this.db;
//     db.serialize(function() {
//         var stmt = db.prepare("INSERT INTO items VALUES (?,?,?,?)");
//         stmt.run([title, description, 0]);
//         stmt.finalize();
//     });
// };

// Database.prototype.queryall = function(fn) {
//     console.log("query database");
//     var db = this.db;
//     db.serialize(function() {
//         db.all("SELECT title, description, level, id FROM items ORDER BY level ASC", function(err, rows) {
//             if (err) {
//                 console.log(err)
//             } else {
//                 fn(rows);
//             }
//         });
//     });
// };

// Database.prototype.query = function(id, fn) {
//     console.log("query id database");
//     var db = this.db;
//     db.serialize(function() {
//         db.each("SELECT title, description, level, id FROM items WHERE id=? LIMIT 1", id, function(err, row) {
//             if (err) {
//                 console.log(err)
//             } else {
//                 //console.log(row.title);
//                 fn(row);
//             }
//         });
//     });
// };

// Database.prototype.update = function(title, description, level, id) {
//     var db = this.db;
//     db.serialize(function() {
//         if (title.length) {
//             console.log("update database");
//             db.run("UPDATE items SET title=?, description=?, level=? WHERE id=?", [title, description, level, id]);
//         } else {
//             console.log("delete database row");
//             db.run("DELETE FROM items WHERE id=?", id)
//         }
//     });
// };

// Database.prototype.deleteall = function(fn) {
//     console.log("delete all database");
//     var db = this.db;
//     db.serialize(function() {
//         db.run("DELETE FROM items");
//     });
// }

module.exports = Database;
