#!/bin/bash

echo "🚀 开始部署博客..."

# 构建项目
echo "📦 构建项目..."
npm run build

# 检查构建是否成功
if [ $? -eq 0 ]; then
    echo "✅ 构建成功"
else
    echo "❌ 构建失败"
    exit 1
fi

# 部署到服务器
echo "🚚 部署到服务器..."
sshpass -p 'datayes@123' rsync -avz --delete -e "ssh -p 34567 -o StrictHostKeyChecking=no" dist/ root@45.63.22.102:/var/www/chenguangliang.com/

# 检查部署是否成功
if [ $? -eq 0 ]; then
    echo "✅ 部署成功！"
    echo "🌍 网站已更新: https://chenguangliang.com"
else
    echo "❌ 部署失败"
    exit 1
fi