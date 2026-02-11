#!/bin/bash

echo "🚀 生产环境部署流程..."

# 1. 本地构建
echo "📦 本地构建..."
npm run build

# 检查构建是否成功
if [ $? -eq 0 ]; then
    echo "✅ 本地构建成功"
else
    echo "❌ 本地构建失败"
    exit 1
fi

# 2. 提交到 GitHub
echo "📤 提交到 GitHub..."
git add .
git commit -m "Auto deploy: $(date '+%Y-%m-%d %H:%M:%S')" || echo "No changes to commit"
git push origin main

if [ $? -eq 0 ]; then
    echo "✅ GitHub 推送成功"
else
    echo "❌ GitHub 推送失败"
    exit 1
fi

# 3. 服务器更新部署
echo "🚚 服务器更新部署..."
sshpass -p 'datayes@123' ssh -p 34567 -o StrictHostKeyChecking=no root@45.63.22.102 << 'EOF'
    cd /var/www/chenguangliang.com-source
    
    # 拉取最新代码
    echo "🔄 拉取最新代码..."
    git pull origin main
    
    # 复制构建好的文件到网站目录
    echo "📋 复制文件到网站目录..."
    cp -r dist/* /var/www/chenguangliang.com/
    
    echo "✅ 服务器更新完成"
EOF

# 检查服务器更新是否成功
if [ $? -eq 0 ]; then
    echo "✅ 生产环境部署成功！"
    echo "🌍 网站已更新: https://chenguangliang.com"
else
    echo "❌ 服务器部署失败"
    exit 1
fi