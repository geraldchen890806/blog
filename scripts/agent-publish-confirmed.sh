#!/bin/bash

# Agent确认发布helper脚本
# 当大人通过Telegram回复"确认"后，Agent调用此脚本

set -e

echo "✅ 收到大人确认，开始发布..."
echo ""

# 执行发布
node /Users/geraldchen/ai/twitter/publish-to-social.cjs

if [ $? -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎉 发布完成！"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "✅ 推文已发布到 X (@geraldchen89)"
    echo "✅ 掘金MD文件已生成"
    echo ""
    echo "💡 后续操作："
    echo "  1. 访问 https://x.com/geraldchen89 查看推文"
    echo "  2. 登录掘金手动发布文章"
    echo ""
else
    echo ""
    echo "❌ 发布失败，请检查错误日志"
    exit 1
fi
