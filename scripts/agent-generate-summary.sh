#!/bin/bash

# Agent 自动生成社交媒体摘要
# 用法: ./agent-generate-summary.sh <文章路径>
#
# Agent 应该：
# 1. 读取文章内容
# 2. 生成推文（≤280字符，含URL和标签）
# 3. 生成推文核心内容（~80-100字，不含URL和标签）
# 4. 生成掘金摘要（复用推文核心内容）
# 5. 写入 .deploy-temp/summary.json 和 .deploy-temp/juejin.json
# 6. 发送 Telegram 消息给大人确认
# 7. 等待大人回复"确认"
# 8. 执行 publish-to-social.cjs

set -e

if [ -z "$1" ]; then
    echo "❌ 用法: $0 <文章路径>"
    exit 1
fi

POST_PATH="$1"

if [ ! -f "$POST_PATH" ]; then
    echo "❌ 文件不存在: $POST_PATH"
    exit 1
fi

echo "📝 Agent 模式：需要 Agent 手动生成摘要"
echo ""
echo "📋 文章路径: $POST_PATH"
echo ""
echo "🤖 Agent 应该执行以下步骤："
echo "   1. 读取文章内容"
echo "   2. 生成推文（≤280字符）"
echo "   3. 生成推文核心内容（~80-100字）"
echo "   4. 生成掘金摘要（复用推文核心内容）"
echo "   5. 写入 summary.json 和 juejin.json"
echo "   6. 通过 Telegram 发送确认消息"
echo "   7. 等待大人确认后执行发布"
echo ""
echo "⏸️  等待 Agent 处理..."
echo ""

exit 0
