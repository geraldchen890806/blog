#!/bin/bash

# 博客文章发布 - 带进度通知
# 使用方法：./publish-with-notifications.sh [article-slug]

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

ARTICLE_SLUG="$1"
if [ -z "$ARTICLE_SLUG" ]; then
    echo "用法: $0 <article-slug>"
    exit 1
fi

# 检查文章文件是否存在
ARTICLE_FILE="src/data/blog/${ARTICLE_SLUG}.md"
if [ ! -f "$ARTICLE_FILE" ]; then
    echo "错误: 文章文件 $ARTICLE_FILE 不存在"
    exit 1
fi

echo "🚀 开始发布文章: $ARTICLE_SLUG"

# 第1步：将文章设为发布状态
echo "📝 设置文章为发布状态..."
sed -i.bak 's/draft: true/draft: false/' "$ARTICLE_FILE"

# 第2步：开始构建
echo "📦 开始本地构建..."

npm run build > build.log 2>&1 &
BUILD_PID=$!

# 等待构建开始
sleep 5

# 第3步：等待构建完成
echo "⏳ 构建进行中..."
wait $BUILD_PID
BUILD_STATUS=$?

if [ $BUILD_STATUS -eq 0 ]; then
    echo "✅ 本地构建完成"
else
    echo "❌ 构建失败"
    # 恢复文章状态
    mv "$ARTICLE_FILE.bak" "$ARTICLE_FILE"
    exit 1
fi

# 第4步：推送到 GitHub
echo "📤 推送到 GitHub..."
git add .
git commit -m "Publish article: $ARTICLE_SLUG"
git push origin main

if [ $? -eq 0 ]; then
    echo "✅ GitHub 上传完成"
else
    echo "❌ GitHub 推送失败"
    exit 1
fi

# 第5步：服务器部署
echo "🚚 服务器部署中..."
sshpass -p "$SERVER_PASSWORD" ssh -p "$SERVER_PORT" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" << 'EOF'
    cd /var/www/chenguangliang.com-source
    git pull origin main
    cp -r dist/* /var/www/chenguangliang.com/
EOF

if [ $? -eq 0 ]; then
    echo "✅ 服务器部署完成"
else
    echo "❌ 服务器部署失败"
    exit 1
fi

# 第6步：验证网站
echo "🔍 验证网站访问..."
sleep 3
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://chenguangliang.com/posts/$ARTICLE_SLUG")

if [ "$HTTP_STATUS" == "200" ]; then
    echo "🎉 发布成功！"
    echo "🔗 文章链接: https://chenguangliang.com/posts/$ARTICLE_SLUG"
    
    # 清理临时文件
    rm -f "$ARTICLE_FILE.bak" build.log
else
    echo "⚠️ 网站验证异常，状态码: $HTTP_STATUS"
fi

echo "📊 发布完成时间: $(date '+%Y-%m-%d %H:%M:%S')"