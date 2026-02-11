---
author: 陈广亮
pubDatetime: 2019-07-01T10:00:00+08:00
title: "AWS 服务器搭建笔记"
slug: aws-setup
featured: false
draft: false
tags:
  - Linux
  - 运维
description: "AWS EC2 实例创建、SSH 配置与基础环境搭建。"
---

## 步骤

1. 注册 AWS，创建 Ubuntu 18 实例
2. 连接：`ssh -i "xx.pem" ubuntu@ec2-xxx.compute.amazonaws.com`
3. 修改 SSH 配置，启用密码登录并更改端口
4. 安装必要软件

```bash
sudo vim /etc/ssh/sshd_config
# Port 22 → Port 1234
# PasswordAuthentication no → yes
passwd ubuntu
service ssh restart
```
