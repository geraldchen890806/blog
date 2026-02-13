#!/bin/bash

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📢 部署后工作流：社交媒体发布"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检测新文章
echo "🔍 检测新发布的文章..."
NEW_POSTS=$(bash /Users/geraldchen/ai/blog/scripts/detect-new-posts.sh)

if [ -z "$NEW_POSTS" ]; then
    echo -e "${YELLOW}⚠️  未检测到新文章${NC}"
    echo "   跳过社交媒体发布流程"
    exit 0
fi

echo -e "${GREEN}✅ 检测到新文章：${NC}"
echo "$NEW_POSTS" | while read post; do
    echo "   • $post"
done
echo ""

# 为每篇新文章生成摘要
echo "$NEW_POSTS" | while read post; do
    if [ -z "$post" ]; then
        continue
    fi
    
    POST_PATH="/Users/geraldchen/ai/blog/$post"
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📝 处理文章: $(basename $post)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # 生成摘要
    node /Users/geraldchen/ai/twitter/generate-post-summary.cjs "$POST_PATH"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}⏸️  等待大人确认...${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo "📋 请查看上方生成的推文和掘金摘要"
        echo ""
        echo "确认后输入以下命令发布："
        echo -e "${GREEN}  node /Users/geraldchen/ai/twitter/publish-to-social.cjs${NC}"
        echo ""
        echo "如需修改，请编辑文件后重新生成："
        echo "  node /Users/geraldchen/ai/twitter/generate-post-summary.cjs $POST_PATH"
        echo ""
    else
        echo -e "${RED}❌ 摘要生成失败${NC}"
    fi
done

# 记录本次部署的commit
CURRENT_COMMIT=$(git rev-parse HEAD)
echo "$CURRENT_COMMIT" > /Users/geraldchen/ai/blog/.last-deploy-commit
echo ""
echo "📌 已记录部署commit: $CURRENT_COMMIT"
echo ""
