(window.webpackJsonp=window.webpackJsonp||[]).push([[49],{aWDl:function(n,s,e){"use strict";e.r(s);var t=e("q1tI"),o=e.n(t),a=e("IujW"),c=e.n(a);s.default=function(){return o.a.createElement(c.a,{source:'### 1. 注册 https://aws.amazon.com\n### 2. 创建实例 ubuntu 18\n### 3. 连接服务器\n```\n  ~ chmod 400 xx.pem\n  ~ ssh -i "xx.pem" ubuntu@ec2-52-196-107-224.ap-northeast-1.compute.amazonaws.com\n```\n### 4. 修改使用ssh登录 \n```\n  ~ sudo su\n  ~ vim /etc/ssh/sshd_config\n    Port 22 => Port 1234\n    PasswordAuthentication no => PasswordAuthentication yes\n  ~ passwd ubuntu \n  ~ service ssh restart\n```\n可以使用ssh登录 ssh ubuntu@111.111.111.111 -p 1234\n\n### 5. 安装[shadowsocks](https://github.com/shadowsocks/shadowsocks-libev#debian--ubuntu)\n```\n  ~ sudo apt update\n  ~ sudo apt install shadowsocks-libev\n  ~ sudo vim /etc/shadowsocks-libev/config.json\n    {\n      "server": "0.0.0.0", //改成私有 IP\n      "server_port": 你自己喜欢的端口号,\n      "local_address": "127.0.0.1",\n      "local_port":1080,\n      "password":"你自己喜欢的密码",\n      "timeout":300,\n      "method":"aes-256-cfb"\n    }\n  ~ sudo /etc/init.d/shadowsocks-libev start\n```\n### 6. [bbr加速](http://freetribe.me/?p=546)\n```\n  wget "https://github.com/chiakge/Linux-NetSpeed/raw/master/tcp.sh" && chmod +x tcp.sh && ./tcp.sh\n```\n### 7. 电脑安装[ShadowsocksX-NG](https://github.com/shadowsocks/ShadowsocksX-NG/releases/)\n### 8. chrome安装SwitchyOmega\n\n\x3c!-- \n### 1.https://www.sslforfree.com/create?generate&domains=chenguangliang.com%20www.chenguangliang.com\n### 2.文件放到/usr/share/nginx/html/.well-known/acme-challenge 确保访问\n### 3./etc/nginx/certificate.crt || private.key\n### 4.nginx -s reload --\x3e',htmlMode:"raw"})}}}]);