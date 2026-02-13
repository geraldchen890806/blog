#!/bin/bash

# 测试社交媒体发布工作流
# 用法: bash test-workflow.sh <文章路径>

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 测试社交媒体发布工作流"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $# -eq 0 ]; then
    echo -e "${RED}❌ 请提供文章路径${NC}"
    echo ""
    echo "用法："
    echo "  bash test-workflow.sh src/data/blog/文章.md"
    echo ""
    echo "示例："
    echo "  bash test-workflow.sh src/data/blog/ai-agent-tools-landscape-2026.md"
    exit 1
fi

POST_PATH="$1"

if [ ! -f "$POST_PATH" ]; then
    echo -e "${RED}❌ 文件不存在: $POST_PATH${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 找到文章: $POST_PATH${NC}"
echo ""

# 测试1：生成摘要
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 测试1：生成推文和掘金摘要"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

node /Users/geraldchen/ai/twitter/generate-post-summary.cjs "$POST_PATH"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 摘要生成成功${NC}"
else
    echo -e "${RED}❌ 摘要生成失败${NC}"
    exit 1
fi
echo ""

# 测试2：检查临时文件
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 测试2：检查临时文件"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f ".deploy-temp/summary.json" ]; then
    echo -e "${GREEN}✅ summary.json 存在${NC}"
else
    echo -e "${RED}❌ summary.json 不存在${NC}"
    exit 1
fi

if [ -f ".deploy-temp/juejin.json" ]; then
    echo -e "${GREEN}✅ juejin.json 存在${NC}"
else
    echo -e "${RED}❌ juejin.json 不存在${NC}"
    exit 1
fi
echo ""

# 测试3：验证推文长度
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📏 测试3：验证推文长度"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

CHAR_COUNT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('.deploy-temp/summary.json')).charCount)")

if [ "$CHAR_COUNT" -le 280 ]; then
    echo -e "${GREEN}✅ 推文长度合格: $CHAR_COUNT/280 字符${NC}"
else
    echo -e "${RED}❌ 推文过长: $CHAR_COUNT/280 字符${NC}"
    exit 1
fi
echo ""

# 测试4：Telegram消息准备
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 测试4：Telegram消息准备"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

node /Users/geraldchen/ai/twitter/send-summary-to-telegram.cjs

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Telegram消息准备成功${NC}"
else
    echo -e "${RED}❌ Telegram消息准备失败${NC}"
    exit 1
fi
echo ""

# 总结
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 所有测试通过！${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 生成的文件："
echo "  • .deploy-temp/summary.json"
echo "  • .deploy-temp/juejin.json"
echo "  • .deploy-temp/telegram-message.txt"
echo ""
echo "💡 下一步："
echo "  1. 查看Telegram消息: cat .deploy-temp/telegram-message.txt"
echo "  2. 确认后发布: node /Users/geraldchen/ai/twitter/publish-to-social.cjs"
echo "  3. 清理测试文件: rm -rf .deploy-temp"
echo ""
