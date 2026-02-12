---
author: 陈广亮
pubDatetime: 2026-02-11T21:00:00+08:00
title: 博客部署流程优化：从服务器构建到本地构建的进化
slug: blog-deploy-optimization
featured: true
draft: false
tags:
  - 运维
  - 前端工程化
  - 自动化
description: 记录博客部署流程从服务器端构建到本地构建+GitHub传输的优化历程，解决服务器资源不足的问题。
---

## 问题背景

最近维护 Astro 博客时碰到一个问题：服务器资源不够，构建直接挂了。

### 原来流程的问题

```bash
# 旧流程：直接服务器构建
本地修改 → rsync 源码到服务器 → 服务器 npm run build → 部署
```

具体来说：
- 服务器只有 1GB RAM
- Astro 构建要生成 OG 图片，吃内存
- 构建动不动就崩溃或超时
- 部署成功率很低

## 解决方案

### 新流程设计

```bash
# 新流程：本地构建 + GitHub 传输
本地构建 → 推送到 GitHub（含构建产物） → 服务器拉取并部署
```

### 具体实现

**1. 修改 .gitignore**
```bash
# 允许构建产物进入版本控制
# dist/ -- 注释掉，允许提交构建产物到 GitHub
```

**2. 部署脚本优化**
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

## 效果

改完之后：
- 构建跑在本地 Mac 上，内存随便用，再也不崩了
- 服务器只做文件复制，部署几秒钟搞定
- 构建产物在 GitHub 上有完整备份，回滚随时可以
- 服务器挂了也不怕，重新 git pull 就恢复

### 一键部署体验
```bash
# 一键部署
./deploy-production.sh

# 自动完成：
# 1. ✅ 本地构建完成
# 2. ✅ 构建产物已推送到 GitHub  
# 3. ✅ 服务器已拉取并部署
```

## 技术细节

### Astro 构建干了什么
- 预渲染所有页面为静态 HTML
- 每篇文章生成 Open Graph 图片（这是吃内存的大头）
- Pagefind 生成搜索索引
- 压缩合并静态资源

### 服务器配置
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

## 顺手做的优化

缓存策略也一起配了。Cloudflare 做 CDN，静态资源设 1 年过期（反正文件名带 hash），部署后 Cloudflare 清一下缓存就行。

### 验证
```bash
# 部署状态检查
curl -I https://chenguangliang.com
# 性能监控  
lighthouse https://chenguangliang.com
```

## 总结

说白了就是一件事：服务器太弱就别在上面构建，本地构建完推上去就行。Git 做增量传输，GitHub 做版本管理，服务器只负责 serve 静态文件。

简单的方案往往最靠谱。