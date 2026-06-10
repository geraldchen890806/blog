---
author: Gerald Chen
pubDatetime: 2026-02-13T16:00:00+08:00
title: "Safely Exposing a Local AI Assistant to the Internet: SSH Reverse Tunnels in Practice"
slug: ssh-reverse-tunnel-expose-local-ai
featured: true
draft: false
tags:
  - AI
  - 安全
  - 自动化
description: "Expose a locally running OpenClaw Gateway to the public internet with an SSH reverse tunnel plus an Nginx reverse proxy, accessible via your own domain. All data stays local, with multiple layers of security — at zero cost."
---

## Why This Setup

I run an OpenClaw Gateway (an AI assistant framework) on my local Mac, listening on `192.168.50.3:18789`. Here's what I wanted:

- Access it from my phone or tablet while away from home
- Avoid deploying the Gateway to a cloud server (data security concerns)
- Access it through a domain name instead of IP + port
- Ideally free, or at least with predictable costs

There are a few common approaches:

**Option 1: Deploy directly on a cloud server**
- ❌ All your data lives on the server, with leak risk
- ❌ If the server gets compromised, all sensitive data is gone

**Option 2: Tunnel services like Ngrok / Cloudflare Tunnel**
- ❌ Traffic flows through third-party servers
- ❌ Free tiers are limited, paid plans run tens of dollars a month
- ❌ You depend on a third party's reliability

**Option 3: Tailscale Funnel**
- ❌ Requires installing extra software
- ❌ Relatively complex to configure
- ❌ Depends on the Tailscale service

**What I went with: an SSH reverse tunnel**
- ✅ Fully under your control, no third-party dependency
- ✅ SSH's battle-tested encryption, secure and reliable
- ✅ Zero cost (all you need is a server with a public IP)
- ✅ Data stays entirely on your local machine

## Architecture

How traffic flows through the whole setup:

```
User's browser
    ↓ HTTPS (SSL encrypted)
Cloudflare DNS (chat.example.com)
    ↓
Vultr server (your-server-ip)
    ↓ Nginx reverse proxy
SSH reverse tunnel (localhost:18789)
    ↓ SSH encrypted tunnel
Local Mac (192.168.50.3:18789)
    ↓
OpenClaw Gateway
```

**How it works**:
1. The local Mac uses an SSH reverse tunnel to map its local port 18789 to port 18789 on the server
2. A user visits `chat.example.com`, and the traffic reaches the server
3. Nginx forwards the traffic to `localhost:18789` (the server-side end of the SSH tunnel)
4. Traffic travels back through the encrypted SSH tunnel to the local Mac

The result: the server is just a relay — all data processing happens locally.

## Setup Steps

### 1. Configure Cloudflare DNS

First, add an A record for your domain pointing at the server IP:

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

Note that `proxied: false` matters here — we'll handle SSL ourselves and don't want Cloudflare's proxy in the path.

### 2. Update the Gateway Config

Allow the Gateway to accept LAN connections (by default it only listens on localhost):

```json
{
  "gateway": {
    "bind": "lan"
  }
}
```

After restarting, the Gateway listens on `192.168.50.3:18789`.

### 3. Establish the SSH Reverse Tunnel

This is the heart of the whole setup. On the local Mac, run:

```bash
ssh -f -N -R 18789:localhost:18789 -p 34567 root@your-server-ip \
  -o ServerAliveInterval=60 \
  -o ServerAliveCountMax=3
```

**Flag breakdown**:
- `-R 18789:localhost:18789`: the reverse tunnel — maps port 18789 on the server to port 18789 locally
- `-f`: run the SSH connection in the background
- `-N`: don't execute remote commands, just hold the tunnel open
- `ServerAliveInterval=60`: send a keepalive every 60 seconds to prevent timeouts
- `ServerAliveCountMax=3`: disconnect after 3 missed keepalives

Once it's running, test from the server:

```bash
curl http://localhost:18789
# 应该能看到 Gateway 的响应
```

### 4. Configure the Nginx Reverse Proxy

On the server, create the Nginx config file `/etc/nginx/sites-available/chat.example.com`:

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

Enable the config:

```bash
ln -s /etc/nginx/sites-available/chat.example.com /etc/nginx/sites-enabled/
nginx -t  # 测试配置
nginx -s reload
```

### 5. Set Up the SSL Certificate

Use a free Let's Encrypt certificate:

```bash
certbot --nginx -d chat.example.com \
  --non-interactive \
  --agree-tos \
  --email your@email.com \
  --redirect
```

This command will:
1. Automatically request an SSL certificate
2. Update the Nginx config with the SSL settings
3. Set up an automatic HTTP-to-HTTPS redirect

### 6. Set Up HTTP Basic Auth

Add an extra layer of password protection:

```bash
htpasswd -cb /etc/nginx/.htpasswd openclaw 'your_password'
```

Now visiting `https://chat.example.com` prompts for a username and password first.

### 7. Auto-Reconnect

The SSH tunnel can drop due to network hiccups, so you'll want automatic reconnection.

On macOS, create `~/Library/LaunchAgents/com.openclaw.ssh-tunnel.plist`:

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

Load it:

```bash
launchctl load ~/Library/LaunchAgents/com.openclaw.ssh-tunnel.plist
```

With this in place, the SSH tunnel comes up automatically after a Mac reboot, and launchd restarts it whenever the tunnel drops.

## Defense in Depth

This setup has 6 layers of security:

1. **HTTPS encryption**: Let's Encrypt SSL certificate, preventing man-in-the-middle attacks
2. **SSH tunnel encryption**: all traffic travels through the encrypted SSH tunnel — even if the server is being snooped on, it can't be decrypted
3. **HTTP Basic Auth**: the web interface requires a username and password
4. **Device pairing**: OpenClaw requires local approval on first access
5. **Gateway Token**: connecting to the Gateway requires token authentication
6. **Local data**: all sensitive data stays on the local Mac — there's nothing on the server

Even if an attacker fully compromises the server, all they'd find is:
- An Nginx reverse proxy config
- A forwarding rule pointing at localhost:18789

No conversation history, no API keys, no sensitive data of any kind.

## Real-World Results

After everything was configured, here's how it performs in practice:

- ✅ Accessible from the office, a coffee shop, or anywhere else via `https://chat.example.com`
- ✅ No VPN or proxy needed
- ✅ Response times nearly identical to local access
- ✅ WebSocket connections stay stable; AI conversations flow smoothly
- ✅ After a week of running, the SSH tunnel never dropped once

**Costs**:
- Domain: already owned
- SSL certificate: free (Let's Encrypt)
- Server: already owned (a $6/month Vultr VPS)
- SSH tunnel: free

Total: **zero cost**.

## More Use Cases

This pattern works for far more than AI assistants:

**1. Exposing a dev environment**
A locally developed web app needs a client demo, or you need to test WeChat Pay callbacks:
```bash
ssh -R 3000:localhost:3000 user@your-server.com
```

**2. Exposing internal services**
A home NAS, Jellyfin media server, or similar that needs external access:
```bash
ssh -R 8096:192.168.1.100:8096 user@your-server.com
```

**3. Quick file sharing**
Spin up a simple HTTP server locally and share files through the tunnel:
```bash
python3 -m http.server 8000
ssh -R 8000:localhost:8000 user@your-server.com
```

## Caveats

**1. SSH key authentication is safer**

For production use, prefer SSH keys over password login:

```bash
# 生成密钥对
ssh-keygen -t ed25519 -C "openclaw-tunnel"

# 复制公钥到服务器
ssh-copy-id -i ~/.ssh/id_ed25519.pub -p 34567 root@your-server-ip
```

**2. Firewall configuration**

Only open the ports you actually need on the server:
- 80/443 (HTTPS)
- The SSH port (move it to a non-standard port, e.g. 34567)

**3. Certificate renewal**

Let's Encrypt certificates expire after 90 days, so set up auto-renewal:

```bash
# 测试自动续期
certbot renew --dry-run

# Crontab 定时任务
0 3 * * * certbot renew --quiet && nginx -s reload
```

**4. Tunnel monitoring**

A simple monitoring script can alert you when the tunnel goes down:

```bash
#!/bin/bash
if ! curl -s http://localhost:18789 > /dev/null; then
    echo "SSH tunnel down!" | mail -s "Alert" your@email.com
fi
```

## Wrapping Up

With an SSH reverse tunnel plus an Nginx reverse proxy, we got:

1. **Secure and reliable**: multiple layers of encryption, data fully local
2. **Zero cost**: all it takes is a server with a public IP
3. **Fully self-hosted**: no dependency on any third-party service
4. **Simple setup**: standard SSH + Nginx, mature and stable
5. **Auto-reconnect**: launchd keeps the tunnel alive and recovers from drops automatically

Compared with cloud deployment or third-party tunnel services, this approach wins clearly on data security, cost, and flexibility.

If you have a similar need — a locally running service that should be reachable from the internet, without putting your data in the cloud — give this setup a try.
