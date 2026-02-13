---
author: 陈广亮
pubDatetime: 2026-02-13T16:00:00+08:00
title: 本地 AI 助手如何安全暴露到公网？SSH 反向隧道实战
slug: ssh-reverse-tunnel-expose-local-ai
featured: false
draft: false
tags:
  - SSH
  - 安全
  - 运维
  - AI
description: 通过 SSH 反向隧道 + Nginx 反向代理，将本地运行的 OpenClaw Gateway 安全暴露到公网，实现域名访问。数据完全本地化，多层安全防护，成本为零。
---

## 为什么需要这个方案

我在本地 Mac 上运行了一个 OpenClaw Gateway（一个 AI 助手框架），它监听在 `192.168.50.3:18789`。现在想实现：

- 在外面用手机或平板访问它
- 不想把 Gateway 部署到云服务器（数据安全考虑）
- 希望通过一个域名访问，而不是 IP + 端口
- 最好不花钱，或者成本可控

市面上有几种常见方案：

**方案 1：直接在云服务器部署**
- ❌ 所有数据都在服务器上，存在泄露风险
- ❌ 服务器被攻破，敏感数据全丢

**方案 2：Ngrok / Cloudflare Tunnel 等隧道服务**
- ❌ 流量经过第三方服务器
- ❌ 免费版有限制，付费版每月几十美元
- ❌ 依赖第三方服务稳定性

**方案 3：Tailscale Funnel**
- ❌ 需要额外安装软件
- ❌ 配置相对复杂
- ❌ 依赖 Tailscale 服务

**最终选择：SSH 反向隧道**
- ✅ 完全自主控制，不依赖第三方
- ✅ SSH 军事级加密，安全可靠
- ✅ 成本为零（只需要一台有公网 IP 的服务器）
- ✅ 数据完全保留在本地

## 技术架构

整个方案的数据流向：

```
用户浏览器
    ↓ HTTPS (SSL 加密)
Cloudflare DNS (chat.example.com)
    ↓
Vultr 服务器 (your-server-ip)
    ↓ Nginx 反向代理
SSH 反向隧道 (localhost:18789)
    ↓ SSH 加密隧道
本地 Mac (192.168.50.3:18789)
    ↓
OpenClaw Gateway
```

**核心原理**：
1. 本地 Mac 通过 SSH 反向隧道，将本地的 18789 端口映射到服务器的 18789 端口
2. 用户访问 `chat.example.com`，流量到达服务器
3. Nginx 将流量转发到 `localhost:18789`（SSH 隧道的另一端）
4. 流量通过 SSH 加密隧道回到本地 Mac

这样就实现了：服务器只是一个"中转站"，所有数据处理都在本地完成。

## 实现步骤

### 1. 配置 Cloudflare DNS

首先给域名添加一条 A 记录，指向服务器 IP：

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records" \
  -H "Authorization: Bearer {api_token}" \
  --data '{
    "type": "A",
    "name": "chat",
    "content": "your-server-ip",
    "proxied": false
  }'
```

注意 `proxied: false` 很重要，因为我们要自己配置 SSL，不需要 Cloudflare 的代理。

### 2. 修改 Gateway 配置

让 Gateway 允许局域网访问（默认只监听 localhost）：

```json
{
  "gateway": {
    "bind": "lan"
  }
}
```

重启 Gateway 后，它会监听在 `192.168.50.3:18789`。

### 3. 建立 SSH 反向隧道

这是整个方案的核心。在本地 Mac 执行：

```bash
ssh -f -N -R 18789:localhost:18789 -p 34567 root@your-server-ip \
  -o ServerAliveInterval=60 \
  -o ServerAliveCountMax=3
```

**参数解释**：
- `-R 18789:localhost:18789`：反向隧道。把服务器的 18789 端口映射到本地的 18789 端口
- `-f`：SSH 连接在后台运行
- `-N`：不执行远程命令，只建立隧道
- `ServerAliveInterval=60`：每 60 秒发送一次心跳，防止连接超时
- `ServerAliveCountMax=3`：3 次心跳失败后断开连接

执行后，可以在服务器上测试：

```bash
curl http://localhost:18789
# 应该能看到 Gateway 的响应
```

### 4. 配置 Nginx 反向代理

在服务器上创建 Nginx 配置文件 `/etc/nginx/sites-available/chat.example.com`：

```nginx
server {
    listen 443 ssl;
    server_name chat.example.com;

    ssl_certificate /etc/letsencrypt/live/chat.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chat.example.com/privkey.pem;

    # HTTP Basic Auth 密码保护
    auth_basic "OpenClaw WebChat";
    auth_basic_user_file /etc/nginx/.htpasswd;

    location / {
        proxy_pass http://localhost:18789;
        proxy_http_version 1.1;
        
        # WebSocket 支持（AI 对话需要）
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # 代理头信息
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 长连接超时（AI 对话可能持续较长时间）
        proxy_read_timeout 86400;
    }
}
```

启用配置：

```bash
ln -s /etc/nginx/sites-available/chat.example.com /etc/nginx/sites-enabled/
nginx -t  # 测试配置
nginx -s reload
```

### 5. 配置 SSL 证书

使用 Let's Encrypt 免费证书：

```bash
certbot --nginx -d chat.example.com \
  --non-interactive \
  --agree-tos \
  --email your@email.com \
  --redirect
```

这个命令会：
1. 自动申请 SSL 证书
2. 修改 Nginx 配置，添加 SSL 配置
3. 配置 HTTP 自动跳转 HTTPS

### 6. 配置 HTTP Basic Auth

增加一层密码保护：

```bash
htpasswd -cb /etc/nginx/.htpasswd openclaw 'your_password'
```

这样访问 `https://chat.example.com` 时，会先要求输入用户名和密码。

### 7. 自动重连配置

SSH 隧道可能因为网络波动断开，需要配置自动重连。

在 macOS 上，创建 `~/Library/LaunchAgents/com.openclaw.ssh-tunnel.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.openclaw.ssh-tunnel</string>
    <key>ProgramArguments</key>
    <array>
        <string>ssh</string>
        <string>-N</string>
        <string>-R</string>
        <string>18789:localhost:18789</string>
        <string>-p</string>
        <string>34567</string>
        <string>root@your-server-ip</string>
        <string>-o</string>
        <string>ServerAliveInterval=60</string>
        <string>-o</string>
        <string>ServerAliveCountMax=3</string>
    </array>
    <key>KeepAlive</key>
    <true/>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
```

加载配置：

```bash
launchctl load ~/Library/LaunchAgents/com.openclaw.ssh-tunnel.plist
```

这样 Mac 重启后，SSH 隧道会自动建立。隧道断开后，launchd 也会自动重启。

## 多层安全防护

这个方案有 6 层安全防护：

1. **HTTPS 加密**：Let's Encrypt SSL 证书，防止中间人攻击
2. **SSH 隧道加密**：所有流量通过 SSH 加密传输，即使服务器被监听也无法破解
3. **HTTP Basic Auth**：访问界面需要用户名密码
4. **设备配对**：OpenClaw 首次访问需要在本地授权
5. **Gateway Token**：连接 Gateway 需要 Token 认证
6. **数据本地化**：所有敏感数据保留在本地 Mac，服务器上没有任何数据

即使服务器被黑客攻破，他们也只能看到：
- 一个 Nginx 反向代理配置
- 一个指向 localhost:18789 的转发规则

无法获取任何对话记录、API Key 等敏感信息。

## 实战效果

配置完成后，实际使用效果：

- ✅ 在公司、咖啡厅等任何地方，通过 `https://chat.example.com` 访问
- ✅ 不需要翻墙
- ✅ 响应速度和本地访问几乎一样快
- ✅ WebSocket 长连接稳定，AI 对话流畅
- ✅ 运行一周，SSH 隧道没有断过

**成本**：
- 域名：已有
- SSL 证书：免费（Let's Encrypt）
- 服务器：已有（月付 $6 的 Vultr VPS）
- SSH 隧道：免费

总计：**零成本**。

## 扩展应用场景

这个方案不仅适用于 AI 助手，还可以用于：

**1. 开发环境暴露**
本地开发的 Web 应用需要给客户演示，或者需要微信支付回调测试：
```bash
ssh -R 3000:localhost:3000 user@your-server.com
```

**2. 内网服务暴露**
家里的 NAS、Jellyfin 媒体服务器等需要外网访问：
```bash
ssh -R 8096:192.168.1.100:8096 user@your-server.com
```

**3. 临时文件共享**
本地启动一个简单的 HTTP 服务器，通过隧道分享文件：
```bash
python3 -m http.server 8000
ssh -R 8000:localhost:8000 user@your-server.com
```

## 注意事项

**1. SSH 密钥认证更安全**

生产环境建议使用 SSH 密钥而非密码登录：

```bash
# 生成密钥对
ssh-keygen -t ed25519 -C "openclaw-tunnel"

# 复制公钥到服务器
ssh-copy-id -i ~/.ssh/id_ed25519.pub -p 34567 root@your-server-ip
```

**2. 防火墙配置**

服务器只开放必要端口：
- 80/443（HTTPS）
- SSH 端口（改成非标准端口，如 34567）

**3. 定期更新证书**

Let's Encrypt 证书 90 天过期，需要配置自动续期：

```bash
# 测试自动续期
certbot renew --dry-run

# Crontab 定时任务
0 3 * * * certbot renew --quiet && nginx -s reload
```

**4. 监控隧道状态**

可以写一个简单的监控脚本，隧道断开时发送告警：

```bash
#!/bin/bash
if ! curl -s http://localhost:18789 > /dev/null; then
    echo "SSH tunnel down!" | mail -s "Alert" your@email.com
fi
```

## 总结

通过 SSH 反向隧道 + Nginx 反向代理，我们实现了：

1. **安全可靠**：多层加密，数据完全本地化
2. **成本为零**：只需要一台有公网 IP 的服务器
3. **完全自主**：不依赖任何第三方服务
4. **配置简单**：标准 SSH + Nginx，成熟稳定
5. **自动重连**：launchd 守护进程，断线自动恢复

相比云服务器部署或第三方隧道服务，这种方案在数据安全、成本和灵活性方面都有明显优势。

如果你也有类似需求——本地运行的服务需要公网访问，又不想把数据放在云端——不妨试试这个方案。
