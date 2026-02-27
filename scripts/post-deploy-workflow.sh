#!/bin/bash

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
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

# 记录本次部署的commit
CURRENT_COMMIT=$(git rev-parse HEAD)
echo "$CURRENT_COMMIT" > /Users/geraldchen/ai/blog/.last-deploy-commit
echo "📌 已记录部署commit: $CURRENT_COMMIT"
echo ""

# Agent 模式提示
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}🤖 Agent 模式：需要 Agent 生成社交媒体摘要${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 输出第一篇新文章路径（通常只有一篇）
FIRST_POST=$(echo "$NEW_POSTS" | head -n 1)
POST_PATH="/Users/geraldchen/ai/blog/$FIRST_POST"

echo "📋 新文章路径:"
echo "   $POST_PATH"
echo ""
echo -e "${YELLOW}⏸️  等待 Agent 执行以下操作：${NC}"
echo ""
echo "   1️⃣  读取文章内容"
echo "   2️⃣  生成推文（≤280字符，含URL和标签）"
echo "   3️⃣  生成推文核心内容（~80-100字）"
echo "   4️⃣  生成掘金摘要（复用推文核心内容）"
echo "   5️⃣  写入 .deploy-temp/summary.json 和 juejin.json"
echo "   6️⃣  通过 Telegram 发送确认消息给大人"
echo "   7️⃣  等待大人回复\"确认\""
echo "   8️⃣  执行 publish-to-social.cjs 发布"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit 0
