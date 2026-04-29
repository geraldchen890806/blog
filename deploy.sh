#!/bin/bash

# 加载服务器配置
CONFIG_FILE="$(dirname "$0")/../.server-config"
if [ ! -f "$CONFIG_FILE" ]; then
    CONFIG_FILE="/Users/geraldchen/ai/.server-config"
fi
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ 找不到 .server-config，请检查路径"
    exit 1
fi
# shellcheck source=/dev/null
source "$CONFIG_FILE"

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
sshpass -p "$SERVER_PASSWORD" rsync -avz --delete -e "ssh -p $SERVER_PORT -o StrictHostKeyChecking=no -o PubkeyAuthentication=no" dist/ "$SERVER_USER@$SERVER_HOST:/usr/share/nginx/html/"

# 检查部署是否成功
if [ $? -eq 0 ]; then
    echo "✅ 部署成功！"
    echo "🌍 网站已更新: https://chenguangliang.com"
else
    echo "❌ 部署失败"
    exit 1
fi