---
author: Gerald Chen
pubDatetime: 2019-07-01T10:00:00+08:00
title: "AWS Server Setup Notes"
slug: aws-setup
featured: false
draft: true
tags:
  - Linux
  - 运维
description: "Creating an AWS EC2 instance, configuring SSH, and setting up the base environment."
---

## Steps

1. Sign up for AWS and create an Ubuntu 18 instance
2. Connect: `ssh -i "xx.pem" ubuntu@ec2-xxx.compute.amazonaws.com`
3. Edit the SSH config to enable password login and change the port
4. Install the essentials

```bash
sudo vim /etc/ssh/sshd_config
# Port 22 → Port 1234
# PasswordAuthentication no → yes
passwd ubuntu
service ssh restart
```
