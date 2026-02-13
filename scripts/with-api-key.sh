#!/bin/bash

# Wrapper脚本：注入ANTHROPIC_API_KEY环境变量
# 用法: bash with-api-key.sh <命令>

# Agent调用时应该从OpenClaw环境获取API key
# 如果未设置，尝试从标准位置读取

if [ -z "$ANTHROPIC_API_KEY" ]; then
    # 尝试从~/.anthropic/api_key读取
    if [ -f ~/.anthropic/api_key ]; then
        export ANTHROPIC_API_KEY=$(cat ~/.anthropic/api_key)
    else
        echo "❌ ANTHROPIC_API_KEY未设置"
        echo "Agent应该在调用时自动传递此环境变量"
        exit 1
    fi
fi

# 执行传入的命令
exec "$@"
