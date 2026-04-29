# 博客发布完整流程

## 每次发布文章必须完成的五步（写完先审核，再发布）

### 第零步：子 Agent 审核（写完 MD 后立即做）

文章写完（`draft: true`）后，启动子 Agent 对文章做结构化审核，审核通过或用户确认后再进入发布流程。

子 Agent 审核内容：
1. **frontmatter 合规性**：featured 字段是否正确（工具指南 false，技术文章 true）、tags ≤4 个且来自标准集、draft/reviewed/approved 状态、description 字数（50-150字）
2. **文章结构完整性**：背景引入、技术原理拆解、可运行代码示例、总结或实践建议
3. **内容质量**：技术内容是否准确、有无明显事实错误或逻辑漏洞、内容深度是否达到技术博客标准
4. **推文草稿**：格式「正文 + 空行 + URL + 空行 + #标签」，总长 ≤280 字符

审核 Prompt 模板（发给子 Agent）：

```
请审核博客文章 /Users/geraldchen/ai/blog/src/data/blog/[文件名].md，给出结构化审核报告。

审核维度：
1. frontmatter 合规性：featured（工具指南 false/技术文章 true）、tags ≤4 个且来自标准集（工具指南,工具,AI,AI Agent,前端,安全,自动化,开发效率,开源,CSS,JavaScript,TypeScript,LLM,MCP,Claude Code,Claude）、draft:true/reviewed:false/approved:false、description 50-150 字
2. 文章结构：背景引入、技术原理、代码示例、总结建议、标题层次
3. 内容质量：技术准确性、事实错误、内容深度
4. 推文草稿：正文(1-2句) + 空行 + https://chenguangliang.com/posts/[slug]/ + 空行 + #标签，≤280字符

给出通过/需修改结论和具体修改建议。
```

### 第一步：构建 + 提交 + 推送 GitHub

```bash
cd /Users/geraldchen/ai/blog
npm run build
git add src/data/blog/<新文章>.md dist/
git commit -m "Publish blogXXX: 文章标题"
git push origin main
```

### 第二步：部署到服务器

**git push 之后必须执行这一步，否则网站不会更新。**

```bash
source /Users/geraldchen/ai/.server-config
sshpass -p "$SERVER_PASSWORD" rsync -avz --delete \
  -e "ssh -p $SERVER_PORT -o StrictHostKeyChecking=no -o PubkeyAuthentication=no" \
  /Users/geraldchen/ai/blog/dist/ "$SERVER_USER@$SERVER_HOST:/usr/share/nginx/html/"
```

### 第三步：生成掘金 MD 文件 + 发推文

每篇新文章都需要：
1. 生成掘金 MD 文件（去掉 frontmatter，加引流链接）
2. 写 summary.json 和 juejin.json 到 `.deploy-temp/`
3. 调用 `publish-to-social.cjs` 发布推文并生成掘金文件

**生成掘金 MD 的方法（以文章 slug 为例）：**

掘金 MD 格式要求：第一行必须是 `# 文章标题`，然后空一行，再接正文内容，末尾加引流链接。

```bash
cd /Users/geraldchen/ai/blog
slug="blogXXX_your-slug"
title=$(grep "^title:" src/data/blog/${slug}.md | sed 's/^title: //')
url_slug=$(grep "^slug:" src/data/blog/${slug}.md | sed 's/^slug: //')
content=$(awk '/^---/{if(++c==2){found=1;next}} found{print}' src/data/blog/${slug}.md)

{
  echo "# ${title}"
  echo ""
  echo "${content}"
  echo ""
  echo "---"
  echo ""
  echo "> 原文发布于 [陈广亮的技术博客](https://chenguangliang.com/posts/${url_slug}/)，欢迎关注获取更多前端与 AI 开发内容。"
} > "/Users/geraldchen/ai/juejin/${title}.md"
```

**发推文的方法：**

```bash
python3 -c "
import json
tweet = '推文内容（≤280字符）\nhttps://chenguangliang.com/posts/xxx/\n#标签1 #标签2'
juejin_path = '/Users/geraldchen/ai/juejin/文章标题.md'
with open(juejin_path, 'r') as f:
    content = f.read()
summary = {
    'article': {'title': '文章标题', 'url': 'https://chenguangliang.com/posts/xxx/'},
    'tweet': tweet.strip(),
    'charCount': len(tweet.strip())
}
juejin = {'path': juejin_path, 'content': content}
with open('.deploy-temp/summary.json', 'w') as f:
    json.dump(summary, f, ensure_ascii=False)
with open('.deploy-temp/juejin.json', 'w') as f:
    json.dump(juejin, f, ensure_ascii=False)
"

node /Users/geraldchen/ai/twitter/publish-to-social.cjs
```

### 第四步：更新 last-deploy-commit

```bash
git rev-parse HEAD > /Users/geraldchen/ai/blog/.last-deploy-commit
```

---

## 推文写作规范

- 长度：≤280 字符（含 URL 和标签，URL 约占 23 字符）
- 格式：正文 + 空行 + URL + 空行 + #标签
- 正文：用一两句话说清楚"这篇文章解决了什么问题"，不要只写标题
- 标签：2-3 个，工具类用 `#开发工具`，AI 类用 `#AI #Agent`，前端类用 `#前端开发`

**示例：**
```
CSS box-shadow 多层阴影参数太繁琐？在线 Box Shadow 生成器帮你可视化调参，实时预览 + 一键复制代码。附性能优化和常用阴影设计模式。
https://chenguangliang.com/posts/blog118_box-shadow-guide/
#CSS #前端开发 #开发工具
```

---

## 掘金发布（手动）

掘金 MD 文件生成到 `/Users/geraldchen/ai/juejin/`，需要人工登录掘金手动发布。

---

## 关键文件说明

| 文件 | 用途 |
|------|------|
| `.last-deploy-commit` | 记录上次部署的 commit，用于检测新文章 |
| `.deploy-temp/summary.json` | 临时：推文内容，发布后自动删除 |
| `.deploy-temp/juejin.json` | 临时：掘金 MD 内容，发布后自动删除 |
| `/Users/geraldchen/ai/juejin/` | 掘金 MD 文件存放目录 |
| `/Users/geraldchen/ai/twitter/publish-to-social.cjs` | 发推文 + 生成掘金 MD |

---

## 工具指南文章规范

工具指南系列（"工具指南N-xxx"）有额外要求：

- `featured: false`（不在首页显示，只在 /posts/ 页面可见）
- 其他技术文章保持 `featured: true`

---

## 注意事项

1. **git push 和服务器部署是两步**，缺一不可。只 push 到 GitHub，网站不会更新。
2. **每篇新文章都要做推文和掘金**，不能批量积压后补——推文发出去是按时间排的，积压太多会一次性刷屏。
3. **`deploy-production.sh` 脚本**包含完整流程（含服务器部署），但社交媒体发布部分需要 Agent 手动完成（脚本只输出提示，不会自动生成推文）。
4. **掘金 MD 第一行必须是 `# 文章标题`**，否则掘金编辑器不识别文章标题。
