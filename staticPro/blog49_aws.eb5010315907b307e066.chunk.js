(window.webpackJsonp=window.webpackJsonp||[]).push([[45],{aWDl:function(s,t,n){"use strict";n.r(t);var o=n("q1tI"),e=n.n(o),a=n("IujW"),c=n.n(a);t.default=function(){return e.a.createElement(c.a,{source:'### 1. 注册 https://aws.amazon.com\n### 2. 创建实例 ubuntu 18\n### 3. 连接服务器\n  - chmod 400 xx.pem\n  - ssh -i "xx.pem" ubuntu@ec2-52-196-107-224.ap-northeast-1.compute.amazonaws.com\n### 4. 修改使用ssh登录 \n  - sudu su\n  - vim /etc/ssh/sshd_config，注释掉 Port 22，新增一个 Port 1234（你自己喜欢的端口号），再找到"PasswordAuthentication no"， 改为"PasswordAuthentication yes"，保存退出\n  - service ssh restart\n  - 可以使用ssh登录 ssh ubuntu@111.111.111.111 -p 1234\n### 5. 安装[shadowsocks](https://github.com/shadowsocks/shadowsocks-libev#debian--ubuntu)\n  - sudo apt update\n  - sudo apt install shadowsocks-libev\n  - sudo vim /etc/shadowsocks-libev/config.json\n  ```\n    {\n      "server": "0.0.0.0", //内网IP\n      "server_port": 你自己喜欢的端口号,\n      "local_address": "127.0.0.1",\n      "local_port":1080,\n      "password":"你自己喜欢的密码",\n      "timeout":300,\n      "method":"aes-256-cfb"\n    }\n  ```\n  - sudo /etc/init.d/shadowsocks-libev start\n### 6. [bbr加速](http://freetribe.me/?p=546)\n  wget "https://github.com/chiakge/Linux-NetSpeed/raw/master/tcp.sh" && chmod +x tcp.sh && ./tcp.sh\n### 7. 电脑安装[ShadowsocksX-NG](https://github.com/shadowsocks/ShadowsocksX-NG/releases/)\n### 8. chrome安装SwitchyOmega',htmlMode:"raw"})}}}]);