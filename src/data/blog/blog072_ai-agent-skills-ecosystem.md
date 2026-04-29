---
title: 'AI Agent Skills 完全指南：让你的 AI 助手拥有超能力'
pubDatetime: 2026-02-21T20:00:00+08:00
description: 'Skills 是什么？如何在 Claude Code、Codex、OpenClaw 等 AI 工具中安装使用？探索 skills.sh 和 awesome-openclaw-skills，掌握 3000+ 社区 Skills，让你的 AI Agent 从通用助手变身领域专家。'
category: 'AI'
tags: ['AI', 'Agent', 'Skills', 'Claude', 'OpenClaw', 'Automation', '工具']
featured: true
---

## 引言：AI Agent 的能力边界在哪里？

你的 AI 编程助手会写代码，但它懂你公司的特定工作流程吗？它能自动处理你的 CI/CD 流程吗？它了解你使用的特定工具和 API 吗？

**AI Agent Skills** 正是为了解决这个问题而生的——它们是可复用的能力包，让通用 AI 助手变成领域专家。

想象一下：
- 一个 **SEO 专家 Skill** 让 AI 帮你做网站审计
- 一个 **PDF 处理 Skill** 让 AI 提取、编辑、合并 PDF 文档
- 一个 **GitHub 工作流 Skill** 让 AI 自动处理 PR 审查和 CI/CD

这就是 Skills 的力量——**将程序化知识打包成模块，让 AI 在特定领域像人类专家一样工作**。

本文将全面解析 AI Agent Skills 生态：Skills 是什么、如何使用、哪里找、如何创建，以及安全注意事项。

---

## 一、Skills 是什么？

### 1. 定义

**Skills（技能包）** 是一种模块化、自包含的知识包，用于扩展 AI Agent 的能力。它们类似于程序员的函数库，但针对的是 AI Agent。

**官方定义**（来自 Anthropic）：
> Skills are reusable capabilities for AI agents. Install them with a single command to enhance your agents with access to procedural knowledge.

**通俗理解**：
- **对程序员**：Skills 就像 npm 包、Python 库一样，可以安装、卸载、更新
- **对 AI Agent**：Skills 提供领域知识、工作流程、工具使用指南

### 2. Skills 提供什么？

一个 Skill 通常包含：

**① 专业工作流程**
```markdown
## SEO Audit Workflow
1. Fetch page HTML and meta tags
2. Check title tag length (50-60 characters)
3. Verify meta description (150-160 characters)
4. Scan for H1/H2/H3 structure
5. Analyze internal/external links
6. Generate SEO score report
```

**② 工具集成指南**
```markdown
## Using GitHub CLI (gh)
- List PRs: `gh pr list --state open`
- Create PR: `gh pr create --title "..." --body "..."`
- Merge PR: `gh pr merge <number> --squash`
```

**③ 领域专业知识**
```markdown
## React Best Practices
- Use functional components + hooks (not class components)
- Avoid prop drilling: use Context API or state management
- Memoize expensive computations with useMemo
```

**④ 打包资源**
```
skill-folder/
├── SKILL.md          # 主文档
├── scripts/          # 可执行脚本
│   ├── audit.sh
│   └── report.py
└── references/       # 参考资料
    └── checklist.txt
```

### 3. Skills vs 普通提示词

| 维度 | 普通提示词 | Skills |
|------|----------|--------|
| **复用性** | 一次性 | 可安装、跨项目使用 |
| **结构化** | 自由文本 | 结构化 Markdown + 元数据 |
| **资源** | 纯文本 | 可包含脚本、工具、参考文件 |
| **发现性** | 难以分享 | 公开注册表（skills.sh） |
| **版本管理** | 无 | Git + 版本号 |

**示例对比**：

**普通提示词**（每次都要重新输入）：
```
帮我审查这个 PR，检查：代码风格、测试覆盖、安全问题、性能优化
```

**Skill**（安装一次，永久可用）：
```bash
npx skills add obra/pr-reviewer
```

AI 自动执行：拉取 PR → 检查 lint → 运行测试 → 扫描安全漏洞 → 生成报告

---

## 二、Skills 生态全景

### 1. Skills.sh — 官方目录

**网站**：https://skills.sh/

**数据（2026 年 2 月）**：
- **总 Skills 数**：70,184+
- **支持的 AI 工具**：15+（Claude Code、Codex、OpenClaw、Cursor、Windsurf 等）
- **分类**：30+ 个领域

**特点**：
- ✅ 官方维护的公开注册表
- ✅ 一键安装（`npx skills add <owner/repo>`）
- ✅ 实时排行榜（按安装量、趋势、热度）
- ✅ 搜索功能（按名称、标签、描述）

**注**：skills.sh 提供统一的 `npx skills` CLI，支持安装到多种 AI 工具（使用 `-a` 参数指定目标）。

**热门 Skills Top 10**（截至 2026-02-21）：

| 排名 | Skill | 安装量 | 用途 |
|-----|-------|--------|------|
| 1 | find-skills | 282.2K | 发现和推荐 Skills |
| 2 | vercel-react-best-practices | 153.3K | React 最佳实践 |
| 3 | web-design-guidelines | 116.1K | Web 设计指南 |
| 4 | remotion-best-practices | 102.6K | Remotion 视频库最佳实践 |
| 5 | frontend-design | 86.4K | 前端设计模式 |
| 6 | agent-browser | 50.2K | 浏览器自动化 |
| 7 | skill-creator | 41.9K | 创建 Skills |
| 8 | ui-ux-pro-max | 33.2K | UI/UX 设计 |
| 9 | seo-audit | 23.4K | SEO 审计 |
| 10 | pdf | 18.2K | PDF 处理 |

### 2. Awesome-OpenClaw-Skills — 社区精选

**仓库**：https://github.com/VoltAgent/awesome-openclaw-skills

**数据**：
- **精选 Skills**：3,002 个（从 70,184 中筛选）
- **过滤掉**：2,748 个（垃圾邮件、加密货币、恶意软件、重复、非英语）
- **分类**：30+ 个类别

**筛选标准**：
- ❌ 排除：垃圾账号、测试/无用 Skills
- ❌ 排除：加密货币、金融交易类
- ❌ 排除：重复/相似名称
- ❌ 排除：恶意软件（经安全审计识别）
- ❌ 排除：非英语描述

**为什么需要策展列表？**
Skills.sh 上有 7 万+ Skills，质量参差不齐。Awesome 列表通过人工审核，帮你筛选出安全、实用的 Skills。

**热门分类**（Skills 数量）：
1. AI & LLMs（287）
2. Web & Frontend Development（202）
3. DevOps & Cloud（212）
4. Marketing & Sales（143）
5. Browser & Automation（139）
6. Coding Agents & IDEs（133）
7. Communication（132）
8. Productivity & Tasks（135）

---

## 三、支持 Skills 的 AI 工具

### 1. 主流 AI 编程工具

| 工具 | Skills 支持 | 安装方式 |
|------|-----------|---------|
| **Claude Code** | ✅ 原生支持 | `~/.claude/skills/` |
| **Codex (OpenAI)** | ✅ 原生支持 | `~/.codex/skills/` |
| **OpenClaw** | ✅ 原生支持 | `~/.openclaw/skills/` |
| **Cursor** | ✅ 兼容 | 手动复制到 `.cursor/` |
| **Windsurf** | ✅ 兼容 | 手动复制到 `.windsurf/` |
| **Cline** | ✅ 兼容 | VS Code 插件配置 |
| **Goose** | ✅ 兼容 | 参考文档 |
| **Amp Code** | ✅ 原生支持 | 官方 CLI |
| **Roo Code** | ✅ 原生支持 | 官方 CLI |

### 2. OpenClaw — Skills 的最佳载体

**OpenClaw** 是一个本地运行的 AI 助手平台，对 Skills 的支持最完善：

**特点**：
- **三层 Skills 优先级**：
  - Workspace（项目级）> Local（用户级）> Bundled（内置）
- **自动加载**：放入 `~/.openclaw/skills/` 或 `<project>/skills/` 即可
- **官方 CLI 支持**：`npx skills add <skill> -a openclaw` 一键安装
- **Skills 发现**：内置 `find-skills` Skill，AI 自动推荐

**安装 OpenClaw**：
```bash
# macOS/Linux
curl -fsSL https://openclaw.ai/install.sh | bash

# Windows
powershell -c "irm openclaw.ai/install.ps1 | iex"
```

**验证安装**：
```bash
openclaw --version
```

---

## 四、如何安装和使用 Skills

### 1. 方法一：官方 CLI（推荐）

**安装 Skills**：
```bash
# 通用格式
npx skills add <owner>/<repo>/<skill-name>

# 示例：安装 SEO 审计 Skill
npx skills add coreyhaines31/marketingskills/seo-audit

# 简写（如果仓库只有一个 Skill）
npx skills add coreyhaines31/marketingskills

# 指定安装到特定 AI 工具（-a 参数）
npx skills add <owner>/<repo> -a codex      # 安装到 Codex
npx skills add <owner>/<repo> -a claude     # 安装到 Claude Code
npx skills add <owner>/<repo> -a openclaw   # 安装到 OpenClaw
npx skills add <owner>/<repo> -a cursor     # 安装到 Cursor
```

**查看已安装 Skills**：
```bash
# 查看所有已安装的 Skills
npx skills list

# 或直接查看文件夹
ls ~/.openclaw/skills/  # OpenClaw
ls ~/.claude/skills/    # Claude Code
ls ~/.codex/skills/     # Codex
```

**使用 Skill**：
```bash
# 启动 OpenClaw
openclaw

# 在聊天中直接使用
> 帮我审计这个网站的 SEO：example.com
```

AI 会自动检测到 `seo-audit` Skill 并执行审计流程。

### 2. 方法二：手动安装

**步骤**：
1. 从 GitHub 下载 Skill 文件夹
2. 复制到 Skills 目录
3. 重启 AI 工具

**示例**：
```bash
# 克隆仓库
git clone https://github.com/coreyhaines31/marketingskills.git

# 复制 Skill 到全局目录
cp -r marketingskills/seo-audit ~/.openclaw/skills/

# 或复制到项目目录
cp -r marketingskills/seo-audit ./skills/
```

### 3. 方法三：粘贴 GitHub 链接（最简单）

**步骤**：
1. 复制 Skill 的 GitHub 仓库链接
2. 粘贴到 AI 助手聊天窗口
3. 让 AI 自动安装

**示例**：
```
> 安装这个 Skill：https://github.com/coreyhaines31/marketingskills/tree/main/seo-audit

AI 回复：
✅ 已安装 seo-audit Skill
📂 位置：~/.openclaw/skills/seo-audit
🚀 现在可以用它审计网站 SEO 了
```

### 4. Skills 目录结构

**全局 Skills**（所有项目共享）：
```
~/.openclaw/skills/
├── seo-audit/
│   ├── SKILL.md
│   └── scripts/
├── pdf-tools/
│   ├── SKILL.md
│   └── references/
└── github-automation/
    └── SKILL.md
```

**项目级 Skills**（仅当前项目）：
```
my-project/
├── skills/
│   └── company-workflow/
│       ├── SKILL.md
│       └── deploy.sh
├── src/
└── package.json
```

**优先级**：
```
Workspace Skills > Global Skills > Bundled Skills
```

---

## 五、热门 Skills 推荐

### 1. 前端开发

**① vercel-react-best-practices**（153.3K 安装）
- **用途**：React 项目最佳实践
- **功能**：组件设计、性能优化、状态管理
- **安装**：`npx skills add vercel-labs/agent-skills/vercel-react-best-practices`

**② web-design-guidelines**（116.1K 安装）
- **用途**：Web 设计规范
- **功能**：布局、排版、颜色、响应式设计
- **安装**：`npx skills add vercel-labs/agent-skills/web-design-guidelines`

**③ frontend-design**（86.4K 安装）
- **用途**：前端设计模式
- **功能**：UI 组件库、设计系统、Tailwind CSS
- **安装**：`npx skills add anthropics/skills/frontend-design`

### 2. 浏览器自动化

**① agent-browser**（50.2K 安装）
- **用途**：浏览器自动化
- **功能**：页面导航、点击、表单填写、截图
- **安装**：`npx skills add vercel-labs/agent-browser`

**② browser-use**（35.4K 安装）
- **用途**：浏览器控制
- **功能**：Playwright/Puppeteer 封装
- **安装**：`npx skills add browser-use/browser-use`

### 3. 营销 & SEO

**① seo-audit**（23.4K 安装）
- **用途**：网站 SEO 审计
- **功能**：标题、描述、关键词、链接分析
- **安装**：`npx skills add coreyhaines31/marketingskills/seo-audit`

**② copywriting**（17.6K 安装）
- **用途**：营销文案撰写
- **功能**：标题、广告语、邮件模板
- **安装**：`npx skills add coreyhaines31/marketingskills/copywriting`

**③ content-strategy**（11.2K 安装）
- **用途**：内容策略规划
- **功能**：主题研究、受众分析、发布计划
- **安装**：`npx skills add coreyhaines31/marketingskills/content-strategy`

### 4. 开发工具

**① skill-creator**（41.9K 安装）
- **用途**：创建自己的 Skills
- **功能**：Skill 模板、结构指南、发布流程
- **安装**：`npx skills add anthropics/skills/skill-creator`

**② github**（OpenClaw 内置）
- **用途**：GitHub 操作
- **功能**：PR 管理、Issue 处理、CI/CD
- **安装**：OpenClaw 自带

**③ pdf**（18.2K 安装）
- **用途**：PDF 文档处理
- **功能**：提取文本、合并、拆分、编辑
- **安装**：`npx skills add anthropics/skills/pdf`

### 5. AI & LLMs

**① mcp-builder**（11.2K 安装）
- **用途**：构建 MCP (Model Context Protocol) 服务器
- **功能**：MCP 服务开发、工具集成
- **安装**：`npx skills add anthropics/skills/mcp-builder`

**② claude-optimised**（热门）
- **用途**：优化 CLAUDE.md 配置文件
- **功能**：提示词优化、上下文管理
- **安装**：`npx skills add hexnickk/claude-optimised`

---

## 六、如何创建自己的 Skill

### 1. 为什么要创建 Skill？

**适用场景**：
- ✅ 你有公司特定的工作流程（部署脚本、审查流程）
- ✅ 你发现 AI 重复犯同样的错误（需要固定流程）
- ✅ 你想分享知识给社区（开源贡献）
- ✅ 你需要集成特定工具或 API

### 2. Skill 的基本结构

**最小 Skill**（只需一个文件）：
```markdown
---
name: my-first-skill
description: 简短描述这个 Skill 的用途
---

# My First Skill

## 使用场景
当用户需要做 X 时使用此 Skill。

## 工作流程
1. 步骤一
2. 步骤二
3. 步骤三

## 示例
...
```

**完整 Skill**：
```
my-skill/
├── SKILL.md          # 必需：主文档
├── meta.json         # 可选：元数据
├── scripts/          # 可选：可执行脚本
│   ├── setup.sh
│   └── run.py
├── references/       # 可选：参考文件
│   ├── api-docs.md
│   └── checklist.txt
└── assets/           # 可选：图片、配置
    └── config.yaml
```

### 3. SKILL.md 编写规范

**frontmatter**（必需）：
```yaml
---
name: my-skill
description: 一句话描述（<100字符）
---
```

**内容结构**（推荐）：
```markdown
# Skill 名称

## 使用场景
明确说明何时使用此 Skill。

## 前置条件
- 需要安装的工具
- 需要的环境变量
- 权限要求

## 工作流程
1. 步骤一
2. 步骤二
3. 步骤三

## 示例
### 示例 1：...
\`\`\`bash
命令示例
\`\`\`

### 示例 2：...
...

## 注意事项
- 常见错误及解决方法
- 限制和约束
```

### 4. 核心原则

**① 简洁至上**
- **上下文窗口是公共资源**，Skills 与其他内容共享
- **默认假设 AI 很聪明**，只添加 AI 不知道的信息
- **用示例代替冗长解释**

**错误示例**（冗长）：
```markdown
Git 是一个分布式版本控制系统，由 Linus Torvalds 创建于 2005 年。
它允许多个开发者协作开发代码，跟踪文件变更历史，支持分支和合并...
（200 字说明 Git 是什么）

使用 Git 前需要先安装...
```

**正确示例**（简洁）：
```markdown
## 常用 Git 命令
\`\`\`bash
git status              # 查看状态
git add <file>          # 暂存文件
git commit -m "..."     # 提交
git push origin main    # 推送
\`\`\`
```

**② 设置合适的自由度**

| 自由度 | 适用场景 | 示例 |
|--------|---------|------|
| **高** | 多种方法都可行 | "审查代码质量" |
| **中** | 有推荐模式 | "按此模板创建 PR" |
| **低** | 必须精确执行 | "运行此脚本部署" |

**高自由度示例**：
```markdown
## Code Review 检查清单
- 代码风格是否一致？
- 是否有测试覆盖？
- 有无明显性能问题？
（AI 自由判断如何检查）
```

**低自由度示例**：
```markdown
## 部署流程（严格按此顺序）
\`\`\`bash
npm run build
npm run test
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0
./deploy.sh production
\`\`\`
```

### 5. 发布 Skill

**步骤 1：创建 GitHub 仓库**
```bash
mkdir my-skills
cd my-skills
git init
```

**步骤 2：创建 Skill 文件夹**
```bash
mkdir my-first-skill
cd my-first-skill
touch SKILL.md
```

**步骤 3：编写 SKILL.md**
```markdown
---
name: my-first-skill
description: 我的第一个 Skill
---

# My First Skill
...
```

**步骤 4：推送到 GitHub**
```bash
git add .
git commit -m "Add my-first-skill"
git push origin main
```

**步骤 5：发布到 skills.sh**
```bash
npx skills publish my-first-skill
```

**验证发布**：
- 访问 https://skills.sh/
- 搜索你的 Skill 名称
- 检查是否出现在列表中

---

## 七、安全注意事项

### 1. Skills 的安全风险

**⚠️ 警告**：Skills 是可执行代码，可能包含：
- **提示词注入**：恶意提示词劫持 AI 行为
- **工具投毒**：篡改工具输出误导 AI
- **隐藏恶意载荷**：后门、数据窃取
- **不安全数据处理**：泄露敏感信息

### 2. 安全审查清单

**安装前检查**：
- ✅ 查看 GitHub 仓库星标数、Fork 数
- ✅ 检查作者信誉（是否是知名开发者/组织）
- ✅ 阅读 SKILL.md 源码（是否有可疑操作）
- ✅ 查看 VirusTotal 扫描报告（skills.sh 提供）
- ✅ 检查最近更新时间（长期维护 vs 废弃项目）

**代码审查重点**：
```bash
# 检查是否有可疑命令
grep -r "curl.*bash" skill-folder/
grep -r "rm -rf /" skill-folder/
grep -r "eval" skill-folder/
grep -r "exec" skill-folder/

# 检查是否上传数据到外部服务器
grep -r "http://" skill-folder/
grep -r "https://" skill-folder/
```

### 3. 安全工具推荐

**① Snyk Skill Security Scanner**
```bash
# 安装
npm install -g @snyk/skill-scan

# 扫描 Skill
skill-scan ~/.openclaw/skills/seo-audit
```

**② Agent Trust Hub**
- 网站：https://ai.gendigital.com/agent-trust-hub
- 功能：Skills 安全评级、漏洞数据库

**③ VirusTotal 集成**
- skills.sh 上每个 Skill 都有 VirusTotal 报告
- 点击 Skill 页面查看扫描结果

### 4. 安全最佳实践

**① 使用项目级 Skills（隔离）**
```bash
# 不要全局安装不信任的 Skill
# ❌ 避免
~/.openclaw/skills/untrusted-skill/

# ✅ 推荐
my-project/skills/untrusted-skill/
```

**② 定期审查已安装 Skills**
```bash
# 列出所有 Skills
ls ~/.openclaw/skills/

# 查看 Skill 更新日期
ls -lt ~/.openclaw/skills/

# 删除不用的 Skills
rm -rf ~/.openclaw/skills/old-skill/
```

**③ 限制 AI 权限**
```yaml
# ~/.openclaw/config.yaml
security:
  allow_file_write: false  # 禁止 AI 写入文件
  allow_network: false     # 禁止网络访问
  sandbox: true            # 沙盒模式
```

### 5. 官方安全指南

**Awesome-OpenClaw-Skills 筛选标准**：
- ❌ 已过滤 396 个恶意 Skills
- ❌ 已过滤 1,180 个垃圾/测试 Skills
- ❌ 已过滤 672 个加密货币相关 Skills
- ✅ 仅保留 3,002 个经审核的 Skills

**推荐做法**：
- ✅ 优先从 Awesome 列表安装 Skills
- ✅ 安装前查看 VirusTotal 报告
- ✅ 定期更新 Skills（安全补丁）
- ✅ 报告可疑 Skills（GitHub Issue）

---

## 八、未来展望

### 1. Skills 生态的趋势

**① Skills 市场化**
- 付费 Skills（企业级、高级功能）
- Skills 订阅服务
- Skills 版权和授权

**② Skills 标准化**
- 统一 Skill 格式规范
- 跨平台兼容性（Claude、Codex、Cursor 通用）
- Skill 依赖管理（类似 package.json）

**③ Skills 智能化**
- AI 自动推荐 Skills
- Skills 自动组合（Skill + Skill = 新能力）
- Skills 自我进化（基于使用反馈优化）

### 2. 技术演进

**① MCP (Model Context Protocol) 集成**
- Skills 作为 MCP 服务器
- 动态加载 Skills
- Skills 之间的通信

**② 多模态 Skills**
- 图像处理 Skills
- 视频编辑 Skills
- 音频转录 Skills

**③ Agent-to-Agent Skills**
- AI Agent 之间共享 Skills
- Skill 交易市场
- 跨 Agent 协作

### 3. 社区发展

**当前数据**（2026 年 2 月）：
- Skills 总数：70,184+
- 月增长：~5,000 个
- 活跃贡献者：~10,000 人

**预测**（2026 年底）：
- Skills 总数：150,000+
- 企业级 Skills 比例：30%
- 付费 Skills 市场规模：$10M+

---

## 九、实战案例

### 案例 1：自动化博客部署

**场景**：每次发布博客文章，需要构建、提交、部署到服务器。

**解决方案**：创建 `blog-deploy` Skill

```markdown
---
name: blog-deploy
description: 自动化博客部署流程
---

# Blog Deploy Skill

## 工作流程
\`\`\`bash
# 1. 构建
npm run build

# 2. 提交
git add .
git commit -m "Deploy blog"
git push origin main

# 3. 部署到服务器
rsync -avz dist/ user@server:/var/www/blog/

# 4. 验证
curl https://blog.example.com | grep "200 OK"
\`\`\`

## 使用
> 帮我部署最新博客
```

**效果**：
- **原来**：10 分钟手动操作
- **现在**：AI 自动执行，1 分钟完成

### 案例 2：SEO 审计报告

**场景**：需要定期审计网站 SEO 状况。

**解决方案**：安装 `seo-audit` Skill

```bash
npx skills add coreyhaines31/marketingskills/seo-audit
```

**使用**：
```
> 审计这个页面的 SEO：https://example.com/blog/post-1

AI 回复：
📊 SEO 审计报告

标题标签：
  ✅ 长度：58 字符（推荐：50-60）
  ❌ 缺少目标关键词

Meta 描述：
  ✅ 长度：155 字符（推荐：150-160）
  ✅ 包含关键词

标题结构：
  ✅ H1：1 个
  ⚠️ H2：8 个（过多，推荐：3-5）

链接：
  ✅ 内部链接：12 个
  ❌ 外部链接：0 个（建议添加 2-3 个权威来源）

总分：75/100
建议：...
```

### 案例 3：PDF 批量处理

**场景**：需要从 100 个 PDF 提取文本并合并。

**解决方案**：安装 `pdf` Skill

```bash
npx skills add anthropics/skills/pdf
```

**使用**：
```
> 提取 ./invoices/ 文件夹下所有 PDF 的文本，合并到 all_invoices.txt

AI 回复：
✅ 已处理 100 个 PDF 文件
✅ 提取文本总计：45,231 字
✅ 输出文件：all_invoices.txt
```

---

## 总结

AI Agent Skills 生态正在快速发展，它们将 AI 从"通用助手"升级为"领域专家"。

**关键要点**：
- ✅ **Skills 是什么**：可复用的知识包，扩展 AI 能力
- ✅ **哪里找 Skills**：skills.sh（官方）+ awesome-openclaw-skills（精选）
- ✅ **如何安装**：官方 CLI（`npx skills add`）/ 手动 / 粘贴链接
- ✅ **如何创建**：SKILL.md + 脚本 + 参考资料
- ✅ **安全注意**：审查代码、使用沙盒、定期更新

**下一步行动**：
1. 访问 https://skills.sh/ 浏览热门 Skills
2. 安装 1-2 个与你工作相关的 Skills
3. 体验 AI 从助手到专家的能力跃升
4. 创建你自己的第一个 Skill

Skills 生态正在扩大，7 万+ 可用能力包等你挖掘。装上几个实用 Skill，你的 AI 助手就不再是只会写代码的工具人——它能审计 SEO、处理 PDF、自动化部署，真正成为工作中的得力助手。

---

## 参考资料

- [Skills.sh 官方网站](https://skills.sh/)
- [Awesome-OpenClaw-Skills GitHub](https://github.com/VoltAgent/awesome-openclaw-skills)
- [ClawHub 官方文档](https://www.clawhub.ai/)
- [Anthropic Skills 官方仓库](https://github.com/anthropics/skills)
- [OpenClaw 官方文档](https://docs.openclaw.ai)
