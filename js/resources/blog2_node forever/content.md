forever是node用来启动，停止服务的一个小工具 url:https://www.npmjs.org/package/forever

####安装 
    npm install forever -g
####启动
    forever app.js
####koa启动
由于koa需要‘和谐’启动

    node --harmony app.js
    forever start -c "node --harmony" app.js

####tips
    Error: listen EADDRINUSE
是由于对应的端口已经有进程占用,使用下面2个命令查看,停止进程

    forever list
    forever stop app.js