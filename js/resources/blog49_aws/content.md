### 
1. 注册 https://aws.amazon.com
2. 创建实例 ubuntu 18
2. 连接服务器
  1. chmod 400 xx.pem
  2. ssh -i "xx.pem" ubuntu@ec2-52-196-107-224.ap-northeast-1.compute.amazonaws.com
3. 修改使用ssh登录 
  1. sudu su
  2. vim /etc/ssh/sshd_config，注释掉 Port 22，新增一个 Port 1234（你自己喜欢的端口号），再找到"PasswordAuthentication no"， 改为"PasswordAuthentication yes"，保存退出
  3. service ssh restart
  4. 可以使用ssh登录 ssh ubuntu@111.111.111.111 -p 1234
4. 安装[shadowsocks](https://github.com/shadowsocks/shadowsocks-libev#debian--ubuntu)
  1. sudo apt update
  2. sudo apt install shadowsocks-libev
  3. sudo vim /etc/shadowsocks-libev/config.json
  ```
    {
      "server": "0.0.0.0", //内网IP
      "server_port": 你自己喜欢的端口号,
      "local_address": "127.0.0.1",
      "local_port":1080,
      "password":"你自己喜欢的密码",
      "timeout":300,
      "method":"aes-256-cfb"
    }
  ```
  4. sudo /etc/init.d/shadowsocks-libev start
5. [bbr加速](http://freetribe.me/?p=546)
  wget "https://github.com/chiakge/Linux-NetSpeed/raw/master/tcp.sh" && chmod +x tcp.sh && ./tcp.sh
6. 电脑安装[ShadowsocksX-NG](https://github.com/shadowsocks/ShadowsocksX-NG/releases/)
7. chrome安装SwitchyOmega