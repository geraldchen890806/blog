#!/bin/bash

# Telegram Bot 配置 - 用于发送进度通知
TELEGRAM_BOT_TOKEN="YOUR_BOT_TOKEN"  # 需要配置实际的 bot token
TELEGRAM_CHAT_ID="1638777420"  # 陈广亮的 Telegram ID

# 发送 Telegram 消息的函数
send_telegram_message() {
    local message="$1"
    # 这里使用 OpenClaw 的 message 工具发送消息
    echo "📢 $message"
}

echo "🚀 生产环境部署流程（本地构建→GitHub→服务器）..."
send_telegram_message "🚀 开始部署博客文章..."

# 1. 本地构建
echo "📦 本地构建中..."
send_telegram_message "📦 正在本地打包构建..."
npm run build

# 检查构建是否成功
if [ $? -eq 0 ]; then
    echo "✅ 本地构建成功"
    send_telegram_message "✅ 本地构建完成，正在准备上传..."
else
    echo "❌ 本地构建失败"
    send_telegram_message "❌ 本地构建失败，部署中止"
    exit 1
fi

# 2. 提交构建产物到 GitHub
echo "📤 提交构建产物到 GitHub..."
send_telegram_message "📤 正在上传到 GitHub..."
git add .
git commit -m "Auto deploy with build: $(date '+%Y-%m-%d %H:%M:%S')" || echo "No changes to commit"
git push origin main

if [ $? -eq 0 ]; then
    echo "✅ GitHub 推送成功（包含构建产物）"
    send_telegram_message "✅ GitHub 上传完成，通知服务器更新..."
else
    echo "❌ GitHub 推送失败"
    send_telegram_message "❌ GitHub 上传失败，部署中止"
    exit 1
fi

# 3. 服务器拉取并部署
echo "🚚 服务器拉取构建产物并部署..."
send_telegram_message "🚚 服务器正在获取最新文件..."

sshpass -p 'datayes@123' ssh -p 34567 -o StrictHostKeyChecking=no root@45.63.22.102 << 'EOF'
    cd /var/www/chenguangliang.com-source
    
    # 拉取最新代码（包含构建产物）
    echo "📥 拉取最新代码（含构建产物）..."
    git pull origin main
    
    # 复制构建产物到网站目录
    echo "📋 复制构建产物到网站目录..."
    if [ -d "dist" ]; then
        cp -r dist/* /var/www/chenguangliang.com/
        echo "✅ 构建产物复制成功"
    else
        echo "❌ dist 目录不存在"
        exit 1
    fi
    
    echo "✅ 服务器部署完成"
EOF

# 检查服务器部署是否成功
if [ $? -eq 0 ]; then
    echo "✅ 服务器部署完成"
    send_telegram_message "✅ 服务器已更新，正在检查网站状态..."
    
    # 4. 检查网站是否正常访问
    echo "🔍 检查网站访问状态..."
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://chenguangliang.com")
    
    if [ "$HTTP_STATUS" == "200" ]; then
        echo "✅ 网站访问正常"
        send_telegram_message "🎉 发布成功！网站已更新并正常运行
        
🌍 访问地址：https://chenguangliang.com
📊 部署完成时间：$(date '+%Y-%m-%d %H:%M:%S')
        
📋 部署流程：
✅ 本地构建完成
✅ GitHub 上传完成  
✅ 服务器获取最新文件
✅ 服务器部署完成
✅ 网站访问正常"
    else
        echo "⚠️ 网站访问异常，状态码: $HTTP_STATUS"
        send_telegram_message "⚠️ 部署完成但网站访问异常
        
HTTP状态码：$HTTP_STATUS
请检查网站配置或稍后重试"
    fi
    
    echo "✅ 生产环境部署完成！"
    echo "🌍 网站已更新: https://chenguangliang.com"
    echo ""
    echo "📋 部署流程："
    echo "   1. ✅ 本地构建完成"
    echo "   2. ✅ 构建产物已推送到 GitHub" 
    echo "   3. ✅ 服务器已拉取并部署"
    echo "   4. ✅ 网站访问状态检查完成"
else
    echo "❌ 服务器部署失败"
    send_telegram_message "❌ 服务器部署失败
    
请检查服务器状态和网络连接
部署已中止"
    exit 1
fi