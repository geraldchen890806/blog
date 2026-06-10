---
author: Gerald Chen
pubDatetime: 2026-02-11T21:00:00+08:00
title: "Optimizing My Blog Deployment: From Server-Side Builds to Local Builds"
slug: blog-deploy-optimization
featured: true
draft: true
tags:
  - 自动化
  - 开发效率
description: "How I moved my blog deployment from building on the server to building locally and shipping via GitHub, solving the problem of an underpowered server."
---

## Background

While maintaining my Astro blog recently, I ran into a problem: the server didn't have enough resources, and builds were flat-out failing.

### What Was Wrong with the Old Flow

```bash
# 旧流程：直接服务器构建
本地修改 → rsync 源码到服务器 → 服务器 npm run build → 部署
```

Specifically:
- The server only has 1GB of RAM
- Astro builds generate OG images, which are memory-hungry
- Builds kept crashing or timing out
- Deployments rarely succeeded

## The Solution

### New Flow Design

```bash
# 新流程：本地构建 + GitHub 传输
本地构建 → 推送到 GitHub（含构建产物） → 服务器拉取并部署
```

### Implementation

**1. Update .gitignore**
```bash
# 允许构建产物进入版本控制
# dist/ -- 注释掉，允许提交构建产物到 GitHub
```

**2. Improve the deploy script**
```bash
#!/bin/bash
echo "🚀 生产环境部署流程（本地构建→GitHub→服务器）..."

# 1. 本地构建
npm run build

# 2. 提交构建产物到 GitHub
git add .
git commit -m "Auto deploy with build: $(date '+%Y-%m-%d %H:%M:%S')"
git push origin main

# 3. 服务器拉取并部署
ssh server << 'EOF'
    cd /var/www/source
    git pull origin main
    cp -r dist/* /var/www/html/
EOF
```

## Results

After the change:
- Builds run on my local Mac with all the memory they need — no more crashes
- The server only copies files, so deployment finishes in seconds
- Build artifacts are fully backed up on GitHub, so rolling back is always an option
- Even if the server dies, a fresh `git pull` brings everything back

### One-Command Deploys
```bash
# 一键部署
./deploy-production.sh

# 自动完成：
# 1. ✅ 本地构建完成
# 2. ✅ 构建产物已推送到 GitHub  
# 3. ✅ 服务器已拉取并部署
```

## Technical Details

### What the Astro Build Actually Does
- Pre-renders every page into static HTML
- Generates an Open Graph image for each post (this is the big memory hog)
- Builds the search index with Pagefind
- Minifies and bundles static assets

### Server Configuration
```nginx
# Nginx 配置优化
location / {
    try_files $uri $uri/ =404;
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|webp|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Bonus Optimization

While I was at it, I also set up the caching strategy. Cloudflare serves as the CDN, static assets get a 1-year expiry (filenames are hashed anyway), and I just purge the Cloudflare cache after each deploy.

### Verification
```bash
# 部署状态检查
curl -I https://chenguangliang.com
# 性能监控  
lighthouse https://chenguangliang.com
```

## Takeaways

It boils down to one thing: if your server is too weak to build on, don't build on it — build locally and push the result. Git handles incremental transfers, GitHub handles versioning, and the server just serves static files.

The simple solution is usually the most reliable one.
