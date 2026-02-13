#!/bin/bash

# 检测本次提交中新增或修改的文章
# 返回：文章文件路径（每行一个）

# 获取上次部署的commit（如果存在）
LAST_DEPLOY_COMMIT_FILE="/Users/geraldchen/ai/blog/.last-deploy-commit"

if [ -f "$LAST_DEPLOY_COMMIT_FILE" ]; then
    LAST_COMMIT=$(cat "$LAST_DEPLOY_COMMIT_FILE")
    # 获取从上次部署到现在，新增或修改的文章
    git diff --name-only --diff-filter=AM "$LAST_COMMIT" HEAD | grep "^src/data/blog/.*\.md$" || true
else
    # 首次部署，获取最近一次提交中的文章
    git diff --name-only --diff-filter=AM HEAD~1 HEAD | grep "^src/data/blog/.*\.md$" || true
fi
