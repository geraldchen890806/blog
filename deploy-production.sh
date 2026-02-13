#!/bin/bash

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🚀 博客生产环境部署流程"
echo "================================"
echo ""

# ==================== 阶段1：部署前检查 ====================
echo "📋 阶段1：部署前检查"
echo ""

# 1.1 检查当前分支
echo "🔍 检查当前分支..."
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${RED}❌ 错误：当前分支为 $CURRENT_BRANCH，不是 main 分支${NC}"
    echo "请先切换到 main 分支："
    echo "  git checkout main"
    exit 1
fi
echo -e "${GREEN}✅ 当前分支：main${NC}"
echo ""

# 1.2 检查是否有未提交的源码改动（不包括dist）
echo "🔍 检查是否有未提交的源码改动..."
# 暂存当前dist的改动，只检查源码
git diff --quiet src/ public/ astro.config.ts package.json tsconfig.json 2>/dev/null || {
    echo -e "${YELLOW}⚠️  发现未提交的源码改动：${NC}"
    git status --short src/ public/ astro.config.ts package.json tsconfig.json 2>/dev/null || true
    echo ""
    read -p "是否继续部署？(y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ 部署已取消${NC}"
        exit 1
    fi
}
echo -e "${GREEN}✅ 源码检查完成${NC}"
echo ""

# 1.3 拉取最新代码，确保与远程同步
echo "🔄 同步远程仓库..."
git pull origin main
echo -e "${GREEN}✅ 远程代码已同步${NC}"
echo ""

# ==================== 阶段2：本地构建 ====================
echo "📋 阶段2：本地构建"
echo ""

echo "📦 开始构建..."
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 构建成功${NC}"
else
    echo -e "${RED}❌ 构建失败，部署中止${NC}"
    exit 1
fi
echo ""

# ==================== 阶段3：提交到GitHub ====================
echo "📋 阶段3：提交构建产物到GitHub"
echo ""

# 3.1 确认要提交的分支
echo "🔍 确认推送目标分支..."
PUSH_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$PUSH_BRANCH" != "main" ]; then
    echo -e "${RED}❌ 错误：推送目标分支为 $PUSH_BRANCH，不是 main${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 推送目标分支：main${NC}"
echo ""

# 3.2 检查并提交改动
echo "📝 检查改动..."
if git diff --quiet && git diff --cached --quiet; then
    echo -e "${YELLOW}⚠️  没有需要提交的改动${NC}"
    echo ""
    read -p "是否继续部署（服务器会拉取最新版本）？(y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ 部署已取消${NC}"
        exit 1
    fi
else
    echo "发现以下改动："
    git status --short
    echo ""
    
    # 提交所有改动（包括dist）
    git add .
    
    COMMIT_MSG="Auto deploy: $(date '+%Y-%m-%d %H:%M:%S')"
    git commit -m "$COMMIT_MSG"
    echo -e "${GREEN}✅ 改动已提交：$COMMIT_MSG${NC}"
fi
echo ""

# 3.3 推送到GitHub
echo "📤 推送到GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ GitHub推送成功${NC}"
    
    # 记录本次部署的commit hash
    DEPLOYED_COMMIT=$(git rev-parse HEAD)
    echo "📌 部署commit: $DEPLOYED_COMMIT"
else
    echo -e "${RED}❌ GitHub推送失败，部署中止${NC}"
    exit 1
fi
echo ""

# ==================== 阶段4：服务器部署 ====================
echo "📋 阶段4：服务器部署"
echo ""

echo "🚚 服务器拉取并部署..."
sshpass -p 'datayes@123' ssh -p 34567 root@45.63.22.102 << EOF
    cd /root/blog
    
    # 拉取最新代码
    echo "📥 拉取最新代码..."
    git pull origin main
    
    # 记录服务器上的commit
    SERVER_COMMIT=\$(git rev-parse HEAD)
    echo "📌 服务器commit: \$SERVER_COMMIT"
    
    # 部署到nginx目录
    echo "📋 部署到nginx..."
    rm -rf /usr/share/nginx/html/*
    cp -r /root/blog/dist/* /usr/share/nginx/html/
    
    echo "✅ 服务器部署完成"
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 服务器部署成功${NC}"
else
    echo -e "${RED}❌ 服务器部署失败${NC}"
    exit 1
fi
echo ""

# ==================== 阶段5：部署后验证 ====================
echo "📋 阶段5：部署验证"
echo ""

# 5.1 检查网站访问状态
echo "🔍 检查网站访问状态..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://chenguangliang.com")

if [ "$HTTP_STATUS" == "200" ]; then
    echo -e "${GREEN}✅ 网站访问正常 (HTTP $HTTP_STATUS)${NC}"
else
    echo -e "${RED}❌ 网站访问异常 (HTTP $HTTP_STATUS)${NC}"
    exit 1
fi
echo ""

# 5.2 检查首页内容是否更新（通过检查响应头的Last-Modified）
echo "🔍 检查内容更新状态..."
LAST_MODIFIED=$(curl -sI "https://chenguangliang.com" | grep -i "Last-Modified" | cut -d' ' -f2-)
if [ -n "$LAST_MODIFIED" ]; then
    echo "📅 最后修改时间: $LAST_MODIFIED"
fi

# 5.3 随机检查几个关键页面
echo "🔍 检查关键页面..."
PAGES=(
    "https://chenguangliang.com/"
    "https://chenguangliang.com/posts/"
    "https://chenguangliang.com/about/"
)

for PAGE in "${PAGES[@]}"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PAGE")
    if [ "$STATUS" == "200" ]; then
        echo -e "  ${GREEN}✅${NC} $PAGE"
    else
        echo -e "  ${RED}❌${NC} $PAGE (HTTP $STATUS)"
    fi
done
echo ""

# ==================== 部署完成 ====================
echo "================================"
echo -e "${GREEN}🎉 部署成功！${NC}"
echo ""
echo "📊 部署摘要："
echo "  • 部署时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "  • 部署分支: main"
echo "  • 部署commit: $DEPLOYED_COMMIT"
echo "  • 网站地址: https://chenguangliang.com"
echo ""
echo "✅ 建议手动访问网站确认内容已更新："
echo "   https://chenguangliang.com"
echo ""
