#!/bin/bash

# 博客文件命名检查和修复脚本
# 功能：确保所有新创建的 blog 文件都使用 blog{number}_{slug}.md 格式
# i18n 改造后中文文章在 zh/ 子目录,英文译文在 en/ 同名文件;重命名时两边同步

set -e

BLOG_DIR="/Users/geraldchen/ai/blog/src/data/blog/zh"
EN_DIR="/Users/geraldchen/ai/blog/src/data/blog/en"
cd "$BLOG_DIR"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 检查博客文件命名规范..."
echo ""

# 获取当前最大序号
MAX_NUM=$(ls -1 blog[0-9]*.md 2>/dev/null | sed 's/blog0*\([0-9]*\)_.*/\1/' | sort -n | tail -1)
if [ -z "$MAX_NUM" ]; then
    MAX_NUM=67  # 如果没有找到，从 67 开始（已知 blog068 存在）
fi

# 强制十进制（避免前导零被当作八进制）
MAX_NUM=$((10#$MAX_NUM))

echo "📌 当前最大序号: blog${MAX_NUM}"
echo ""

# 检查是否有不符合规范的新文件
# 用 git 状态判断「真正新建」的文件(未跟踪或新加入暂存区),
# 避免老文章被修改后(mtime 变新)误报——老文章重命名会破坏线上 URL
NEW_FILES_WITHOUT_NUMBER=$(git -C "$BLOG_DIR" status --porcelain . 2>/dev/null \
    | grep -E '^(\?\?|A )' | awk '{print $2}' | sed 's|.*/||' \
    | grep '\.md$' | grep -v '^blog[0-9]' | sed 's|^|./|' || true)

if [ -z "$NEW_FILES_WITHOUT_NUMBER" ]; then
    echo -e "${GREEN}✅ 所有文件命名符合规范${NC}"
    exit 0
fi

echo -e "${YELLOW}⚠️  发现未使用序号命名的新文件：${NC}"
echo "$NEW_FILES_WITHOUT_NUMBER"
echo ""

# 提示用户是否需要修复
if [ "$1" != "--fix" ]; then
    echo -e "${YELLOW}提示：运行 $0 --fix 自动修复${NC}"
    exit 1
fi

# 自动修复：为新文件添加序号
echo "🔧 开始自动修复..."
echo ""

NEXT_NUM=$((MAX_NUM + 1))

for file in $NEW_FILES_WITHOUT_NUMBER; do
    OLD_NAME=$(basename "$file")
    SLUG=$(echo "$OLD_NAME" | sed 's/\.md$//')
    
    # 生成新文件名
    NEW_NAME="blog$(printf "%03d" $NEXT_NUM)_${SLUG}.md"
    
    echo -e "${YELLOW}重命名：${NC}"
    echo "  旧文件: $OLD_NAME"
    echo "  新文件: $NEW_NAME"
    
    # 执行重命名(英文译文同名文件同步重命名)
    mv "$OLD_NAME" "$NEW_NAME"
    if [ -f "$EN_DIR/$OLD_NAME" ]; then
        mv "$EN_DIR/$OLD_NAME" "$EN_DIR/$NEW_NAME"
        echo "  同步重命名英文版: en/$NEW_NAME"
    fi

    echo -e "${GREEN}✅ 重命名成功${NC}"
    echo ""

    NEXT_NUM=$((NEXT_NUM + 1))
done

echo -e "${GREEN}🎉 修复完成！${NC}"
echo "下一个可用序号: blog$(printf "%03d" $NEXT_NUM)"
