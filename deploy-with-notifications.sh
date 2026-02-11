#!/bin/bash

# 部署进度通知脚本
# 使用 OpenClaw 发送实时进度通知

TELEGRAM_CHAT_ID="1638777420"  # 陈广亮的 Telegram ID

echo "🚀 生产环境部署流程（本地构建→GitHub→服务器）..."

# 发送开始部署消息
echo "📢 发送开始部署通知..."

# 1. 本地构建
echo "📦 本地构建中..."
npm run build 2>&1 | tail -10  # 显示构建的最后几行日志

# 检查构建是否成功
if [ $? -eq 0 ]; then
    echo "✅ 本地构建成功"
else
    echo "❌ 本地构建失败"
    exit 1
fi

# 2. 提交构建产物到 GitHub
echo "📤 提交构建产物到 GitHub..."
git add .
git commit -m "Auto deploy with build: $(date '+%Y-%m-%d %H:%M:%S')" || echo "No changes to commit"
git push origin main

if [ $? -eq 0 ]; then
    echo "✅ GitHub 推送成功（包含构建产物）"
else
    echo "❌ GitHub 推送失败"
    exit 1
fi

# 3. 服务器拉取并部署
echo "🚚 服务器拉取构建产物并部署..."

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
    
    # 4. 检查网站是否正常访问
    echo "🔍 检查网站访问状态..."
    sleep 2  # 等待服务器更新
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://chenguangliang.com")
    
    if [ "$HTTP_STATUS" == "200" ]; then
        echo "✅ 网站访问正常"
        
        echo "🎉 发布成功！"
        echo "🌍 网站已更新: https://chenguangliang.com"
        echo "📊 部署完成时间: $(date '+%Y-%m-%d %H:%M:%S')"
        echo ""
        echo "📋 部署流程："
        echo "   1. ✅ 本地构建完成"
        echo "   2. ✅ 构建产物已推送到 GitHub" 
        echo "   3. ✅ 服务器已拉取并部署"
        echo "   4. ✅ 网站访问状态检查完成"
        
    else
        echo "⚠️ 网站访问异常，状态码: $HTTP_STATUS"
    fi
    
else
    echo "❌ 服务器部署失败"
    exit 1
fi