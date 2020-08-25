### 1. 注册 https://aws.amazon.com
### 2. 创建实例 ubuntu 18
### 3. 连接服务器
```
  ~ chmod 400 xx.pem
  ~ ssh -i "xx.pem" ubuntu@ec2-52-196-107-224.ap-northeast-1.compute.amazonaws.com
```
### 4. 修改使用ssh登录 
```
  ~ sudo su
  ~ vim /etc/ssh/sshd_config
    Port 22 => Port 1234
    PasswordAuthentication no => PasswordAuthentication yes
  ~ passwd ubuntu 
  ~ service ssh restart
```
可以使用ssh登录 ssh ubuntu@111.111.111.111 -p 1234

### 5. 安装[shadowsocks](https://github.com/shadowsocks/shadowsocks-libev#debian--ubuntu)
```
  ~ sudo apt update
  ~ sudo apt install shadowsocks-libev
  ~ sudo vim /etc/shadowsocks-libev/config.json
    {
      "server": "0.0.0.0", //改成私有 IP
      "server_port": 你自己喜欢的端口号,
      "local_address": "127.0.0.1",
      "local_port":1080,
      "password":"你自己喜欢的密码",
      "timeout":300,
      "method":"aes-256-cfb"
    }
  ~ sudo /etc/init.d/shadowsocks-libev start
```
### 6. [bbr加速](http://freetribe.me/?p=546)
```
  wget "https://github.com/chiakge/Linux-NetSpeed/raw/master/tcp.sh" && chmod +x tcp.sh && ./tcp.sh
```
### 7. 电脑安装[ShadowsocksX-NG](https://github.com/shadowsocks/ShadowsocksX-NG/releases/)
### 8. chrome安装SwitchyOmega

<!-- 
### 1.https://www.sslforfree.com/create?generate&domains=chenguangliang.com%20www.chenguangliang.com
### 2.文件放到/usr/share/nginx/html/.well-known/acme-challenge 确保访问
### 3./etc/nginx/certificate.crt || private.key
### 4.nginx -s reload -->