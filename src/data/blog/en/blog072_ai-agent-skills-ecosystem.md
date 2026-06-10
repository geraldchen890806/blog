---
title: "The Complete Guide to AI Agent Skills: Give Your AI Assistant Superpowers"
pubDatetime: 2026-02-21T20:00:00+08:00
description: "What are Skills? How do you install and use them in Claude Code, Codex, OpenClaw, and other AI tools? Explore skills.sh and awesome-openclaw-skills, tap into 3,000+ community Skills, and turn your AI Agent from a generalist assistant into a domain expert."
author: Gerald Chen
category: 'AI'
tags: ['AI', 'Agent', 'Skills', 'Claude', 'OpenClaw', 'Automation', '工具']
featured: true
---

## Introduction: Where Do an AI Agent's Capabilities End?

Your AI coding assistant can write code, but does it understand your company's specific workflows? Can it handle your CI/CD pipeline automatically? Does it know the particular tools and APIs you rely on?

**AI Agent Skills** exist to solve exactly this problem — they are reusable capability packages that turn a general-purpose AI assistant into a domain expert.

Imagine:
- An **SEO expert Skill** that lets the AI audit your website
- A **PDF processing Skill** that lets the AI extract, edit, and merge PDF documents
- A **GitHub workflow Skill** that lets the AI handle PR reviews and CI/CD automatically

That's the power of Skills — **packaging procedural knowledge into modules so the AI can operate like a human expert in a specific domain**.

This article walks through the entire AI Agent Skills ecosystem: what Skills are, how to use them, where to find them, how to create your own, and what to watch out for security-wise.

---

## 1. What Are Skills?

### 1. Definition

**Skills** are modular, self-contained knowledge packages that extend an AI Agent's capabilities. Think of them as function libraries for programmers — except they're built for AI Agents.

**Official definition** (from Anthropic):
> Skills are reusable capabilities for AI agents. Install them with a single command to enhance your agents with access to procedural knowledge.

**In plain terms**:
- **For developers**: Skills work like npm packages or Python libraries — install, uninstall, update
- **For AI Agents**: Skills provide domain knowledge, workflows, and tool usage guides

### 2. What Does a Skill Provide?

A Skill typically contains:

**(1) Expert workflows**
```markdown
## SEO Audit Workflow
1. Fetch page HTML and meta tags
2. Check title tag length (50-60 characters)
3. Verify meta description (150-160 characters)
4. Scan for H1/H2/H3 structure
5. Analyze internal/external links
6. Generate SEO score report
```

**(2) Tool integration guides**
```markdown
## Using GitHub CLI (gh)
- List PRs: `gh pr list --state open`
- Create PR: `gh pr create --title "..." --body "..."`
- Merge PR: `gh pr merge <number> --squash`
```

**(3) Domain expertise**
```markdown
## React Best Practices
- Use functional components + hooks (not class components)
- Avoid prop drilling: use Context API or state management
- Memoize expensive computations with useMemo
```

**(4) Bundled resources**
```
skill-folder/
├── SKILL.md          # Main document
├── scripts/          # Executable scripts
│   ├── audit.sh
│   └── report.py
└── references/       # Reference material
    └── checklist.txt
```

### 3. Skills vs Plain Prompts

| Dimension | Plain prompt | Skills |
|------|----------|--------|
| **Reusability** | One-off | Installable, works across projects |
| **Structure** | Free-form text | Structured Markdown + metadata |
| **Resources** | Text only | Can bundle scripts, tools, reference files |
| **Discoverability** | Hard to share | Public registry (skills.sh) |
| **Versioning** | None | Git + version numbers |

**Side-by-side example**:

**Plain prompt** (retyped every single time):
```
Review this PR for me, checking: code style, test coverage, security issues, performance optimizations
```

**Skill** (install once, use forever):
```bash
npx skills add obra/pr-reviewer
```

The AI runs the whole flow automatically: pull the PR → check lint → run tests → scan for security issues → generate a report

---

## 2. The Skills Ecosystem at a Glance

### 1. Skills.sh — The Official Directory

**Website**: https://skills.sh/

**Numbers (February 2026)**:
- **Total Skills**: 70,184+
- **Supported AI tools**: 15+ (Claude Code, Codex, OpenClaw, Cursor, Windsurf, and more)
- **Categories**: 30+ domains

**Highlights**:
- ✅ Officially maintained public registry
- ✅ One-command install (`npx skills add <owner/repo>`)
- ✅ Live leaderboards (by installs, trending, popularity)
- ✅ Search (by name, tag, description)

**Note**: skills.sh ships a unified `npx skills` CLI that can install into multiple AI tools (use the `-a` flag to pick a target).

**Top 10 Skills** (as of 2026-02-21):

| Rank | Skill | Installs | Purpose |
|-----|-------|--------|------|
| 1 | find-skills | 282.2K | Discover and recommend Skills |
| 2 | vercel-react-best-practices | 153.3K | React best practices |
| 3 | web-design-guidelines | 116.1K | Web design guidelines |
| 4 | remotion-best-practices | 102.6K | Best practices for the Remotion video library |
| 5 | frontend-design | 86.4K | Frontend design patterns |
| 6 | agent-browser | 50.2K | Browser automation |
| 7 | skill-creator | 41.9K | Create Skills |
| 8 | ui-ux-pro-max | 33.2K | UI/UX design |
| 9 | seo-audit | 23.4K | SEO audits |
| 10 | pdf | 18.2K | PDF processing |

### 2. Awesome-OpenClaw-Skills — Community Curated

**Repository**: https://github.com/VoltAgent/awesome-openclaw-skills

**Numbers**:
- **Curated Skills**: 3,002 (selected from 70,184)
- **Filtered out**: 2,748 (spam, crypto, malware, duplicates, non-English)
- **Categories**: 30+

**Selection criteria**:
- ❌ Excluded: spam accounts, test/useless Skills
- ❌ Excluded: cryptocurrency and financial trading Skills
- ❌ Excluded: duplicate or near-identical names
- ❌ Excluded: malware (flagged by security audits)
- ❌ Excluded: non-English descriptions

**Why does a curated list matter?**
Skills.sh hosts 70K+ Skills of wildly varying quality. The Awesome list applies human review to surface Skills that are safe and genuinely useful.

**Popular categories** (Skill counts):
1. AI & LLMs (287)
2. Web & Frontend Development (202)
3. DevOps & Cloud (212)
4. Marketing & Sales (143)
5. Browser & Automation (139)
6. Coding Agents & IDEs (133)
7. Communication (132)
8. Productivity & Tasks (135)

---

## 3. AI Tools That Support Skills

### 1. Mainstream AI Coding Tools

| Tool | Skills support | Installation |
|------|-----------|---------|
| **Claude Code** | ✅ Native | `~/.claude/skills/` |
| **Codex (OpenAI)** | ✅ Native | `~/.codex/skills/` |
| **OpenClaw** | ✅ Native | `~/.openclaw/skills/` |
| **Cursor** | ✅ Compatible | Copy manually into `.cursor/` |
| **Windsurf** | ✅ Compatible | Copy manually into `.windsurf/` |
| **Cline** | ✅ Compatible | VS Code extension config |
| **Goose** | ✅ Compatible | See docs |
| **Amp Code** | ✅ Native | Official CLI |
| **Roo Code** | ✅ Native | Official CLI |

### 2. OpenClaw — The Best Home for Skills

**OpenClaw** is a locally running AI assistant platform with the most complete Skills support:

**Highlights**:
- **Three-tier Skills priority**:
  - Workspace (project-level) > Local (user-level) > Bundled (built-in)
- **Auto-loading**: just drop them into `~/.openclaw/skills/` or `<project>/skills/`
- **Official CLI support**: `npx skills add <skill> -a openclaw` installs in one command
- **Skill discovery**: ships with a built-in `find-skills` Skill so the AI recommends Skills automatically

**Install OpenClaw**:
```bash
# macOS/Linux
curl -fsSL https://openclaw.ai/install.sh | bash

# Windows
powershell -c "irm openclaw.ai/install.ps1 | iex"
```

**Verify the install**:
```bash
openclaw --version
```

---

## 4. Installing and Using Skills

### 1. Option 1: The Official CLI (Recommended)

**Install a Skill**:
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

**List installed Skills**:
```bash
# 查看所有已安装的 Skills
npx skills list

# 或直接查看文件夹
ls ~/.openclaw/skills/  # OpenClaw
ls ~/.claude/skills/    # Claude Code
ls ~/.codex/skills/     # Codex
```

**Use a Skill**:
```bash
# 启动 OpenClaw
openclaw

# 在聊天中直接使用
> 帮我审计这个网站的 SEO：example.com
```

The AI automatically detects the `seo-audit` Skill and runs the audit workflow.

### 2. Option 2: Manual Installation

**Steps**:
1. Download the Skill folder from GitHub
2. Copy it into your Skills directory
3. Restart the AI tool

**Example**:
```bash
# 克隆仓库
git clone https://github.com/coreyhaines31/marketingskills.git

# 复制 Skill 到全局目录
cp -r marketingskills/seo-audit ~/.openclaw/skills/

# 或复制到项目目录
cp -r marketingskills/seo-audit ./skills/
```

### 3. Option 3: Paste a GitHub Link (Easiest)

**Steps**:
1. Copy the Skill's GitHub repository link
2. Paste it into your AI assistant's chat window
3. Let the AI install it for you

**Example**:
```
> Install this Skill: https://github.com/coreyhaines31/marketingskills/tree/main/seo-audit

AI reply:
✅ Installed the seo-audit Skill
📂 Location: ~/.openclaw/skills/seo-audit
🚀 You can now use it to audit website SEO
```

### 4. Skills Directory Layout

**Global Skills** (shared across all projects):
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

**Project-level Skills** (current project only):
```
my-project/
├── skills/
│   └── company-workflow/
│       ├── SKILL.md
│       └── deploy.sh
├── src/
└── package.json
```

**Priority**:
```
Workspace Skills > Global Skills > Bundled Skills
```

---

## 5. Recommended Skills

### 1. Frontend Development

**(1) vercel-react-best-practices** (153.3K installs)
- **Purpose**: React project best practices
- **Covers**: component design, performance optimization, state management
- **Install**: `npx skills add vercel-labs/agent-skills/vercel-react-best-practices`

**(2) web-design-guidelines** (116.1K installs)
- **Purpose**: Web design standards
- **Covers**: layout, typography, color, responsive design
- **Install**: `npx skills add vercel-labs/agent-skills/web-design-guidelines`

**(3) frontend-design** (86.4K installs)
- **Purpose**: Frontend design patterns
- **Covers**: UI component libraries, design systems, Tailwind CSS
- **Install**: `npx skills add anthropics/skills/frontend-design`

### 2. Browser Automation

**(1) agent-browser** (50.2K installs)
- **Purpose**: Browser automation
- **Covers**: page navigation, clicking, form filling, screenshots
- **Install**: `npx skills add vercel-labs/agent-browser`

**(2) browser-use** (35.4K installs)
- **Purpose**: Browser control
- **Covers**: Playwright/Puppeteer wrappers
- **Install**: `npx skills add browser-use/browser-use`

### 3. Marketing & SEO

**(1) seo-audit** (23.4K installs)
- **Purpose**: Website SEO audits
- **Covers**: title, description, keyword, and link analysis
- **Install**: `npx skills add coreyhaines31/marketingskills/seo-audit`

**(2) copywriting** (17.6K installs)
- **Purpose**: Marketing copywriting
- **Covers**: headlines, taglines, email templates
- **Install**: `npx skills add coreyhaines31/marketingskills/copywriting`

**(3) content-strategy** (11.2K installs)
- **Purpose**: Content strategy planning
- **Covers**: topic research, audience analysis, publishing schedules
- **Install**: `npx skills add coreyhaines31/marketingskills/content-strategy`

### 4. Developer Tools

**(1) skill-creator** (41.9K installs)
- **Purpose**: Create your own Skills
- **Covers**: Skill templates, structure guidelines, publishing workflow
- **Install**: `npx skills add anthropics/skills/skill-creator`

**(2) github** (built into OpenClaw)
- **Purpose**: GitHub operations
- **Covers**: PR management, issue handling, CI/CD
- **Install**: ships with OpenClaw

**(3) pdf** (18.2K installs)
- **Purpose**: PDF document processing
- **Covers**: text extraction, merging, splitting, editing
- **Install**: `npx skills add anthropics/skills/pdf`

### 5. AI & LLMs

**(1) mcp-builder** (11.2K installs)
- **Purpose**: Build MCP (Model Context Protocol) servers
- **Covers**: MCP service development, tool integration
- **Install**: `npx skills add anthropics/skills/mcp-builder`

**(2) claude-optimised** (trending)
- **Purpose**: Optimize CLAUDE.md configuration files
- **Covers**: prompt optimization, context management
- **Install**: `npx skills add hexnickk/claude-optimised`

---

## 6. Creating Your Own Skill

### 1. Why Create a Skill?

**Good reasons**:
- ✅ You have company-specific workflows (deployment scripts, review processes)
- ✅ You keep seeing the AI make the same mistakes (a fixed procedure helps)
- ✅ You want to share knowledge with the community (open-source contribution)
- ✅ You need to integrate a specific tool or API

### 2. Basic Skill Structure

**Minimal Skill** (just one file):
```markdown
---
name: my-first-skill
description: A short description of what this Skill does
---

# My First Skill

## When to Use
Use this Skill when the user needs to do X.

## Workflow
1. Step one
2. Step two
3. Step three

## Examples
...
```

**Full Skill**:
```
my-skill/
├── SKILL.md          # Required: main document
├── meta.json         # Optional: metadata
├── scripts/          # Optional: executable scripts
│   ├── setup.sh
│   └── run.py
├── references/       # Optional: reference files
│   ├── api-docs.md
│   └── checklist.txt
└── assets/           # Optional: images, config
    └── config.yaml
```

### 3. Writing SKILL.md

**frontmatter** (required):
```yaml
---
name: my-skill
description: 一句话描述（<100字符）
---
```

**Recommended content structure**:
```markdown
# Skill Name

## When to Use
Spell out exactly when this Skill applies.

## Prerequisites
- Tools that must be installed
- Required environment variables
- Permission requirements

## Workflow
1. Step one
2. Step two
3. Step three

## Examples
### Example 1: ...
\`\`\`bash
example command
\`\`\`

### Example 2: ...
...

## Notes
- Common errors and how to fix them
- Limitations and constraints
```

### 4. Core Principles

**(1) Be ruthlessly concise**
- **The context window is a shared resource** — Skills compete with everything else
- **Assume the AI is smart by default** — only add information the AI doesn't already know
- **Use examples instead of long-winded explanations**

**Bad example** (verbose):
```markdown
Git is a distributed version control system created by Linus Torvalds in 2005.
It lets multiple developers collaborate on code, tracks file change history, supports branching and merging...
(200 words explaining what Git is)

Before using Git, you first need to install...
```

**Good example** (concise):
```markdown
## Common Git Commands
\`\`\`bash
git status              # check status
git add <file>          # stage a file
git commit -m "..."     # commit
git push origin main    # push
\`\`\`
```

**(2) Set the right degree of freedom**

| Freedom | When it fits | Example |
|--------|---------|------|
| **High** | Multiple valid approaches | "Review code quality" |
| **Medium** | There's a recommended pattern | "Create the PR from this template" |
| **Low** | Must be executed exactly | "Run this script to deploy" |

**High-freedom example**:
```markdown
## Code Review Checklist
- Is the code style consistent?
- Is there test coverage?
- Any obvious performance issues?
(The AI decides how to check)
```

**Low-freedom example**:
```markdown
## Deployment Procedure (follow this order exactly)
\`\`\`bash
npm run build
npm run test
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0
./deploy.sh production
\`\`\`
```

### 5. Publishing a Skill

**Step 1: Create a GitHub repository**
```bash
mkdir my-skills
cd my-skills
git init
```

**Step 2: Create the Skill folder**
```bash
mkdir my-first-skill
cd my-first-skill
touch SKILL.md
```

**Step 3: Write SKILL.md**
```markdown
---
name: my-first-skill
description: My first Skill
---

# My First Skill
...
```

**Step 4: Push to GitHub**
```bash
git add .
git commit -m "Add my-first-skill"
git push origin main
```

**Step 5: Publish to skills.sh**
```bash
npx skills publish my-first-skill
```

**Verify the release**:
- Visit https://skills.sh/
- Search for your Skill's name
- Confirm it shows up in the listing

---

## 7. Security Considerations

### 1. Security Risks of Skills

**⚠️ Warning**: Skills are executable code and may contain:
- **Prompt injection**: malicious prompts that hijack the AI's behavior
- **Tool poisoning**: tampered tool output that misleads the AI
- **Hidden malicious payloads**: backdoors, data exfiltration
- **Unsafe data handling**: leaking sensitive information

### 2. Security Review Checklist

**Before installing**:
- ✅ Check the GitHub repo's star and fork counts
- ✅ Check the author's reputation (a known developer/organization?)
- ✅ Read the SKILL.md source (any suspicious operations?)
- ✅ Check the VirusTotal scan report (provided by skills.sh)
- ✅ Check the last update date (actively maintained vs abandoned)

**What to look for in code review**:
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

### 3. Recommended Security Tools

**(1) Snyk Skill Security Scanner**
```bash
# 安装
npm install -g @snyk/skill-scan

# 扫描 Skill
skill-scan ~/.openclaw/skills/seo-audit
```

**(2) Agent Trust Hub**
- Website: https://ai.gendigital.com/agent-trust-hub
- Features: Skill security ratings, vulnerability database

**(3) VirusTotal integration**
- Every Skill on skills.sh has a VirusTotal report
- Click into the Skill page to view scan results

### 4. Security Best Practices

**(1) Use project-level Skills (isolation)**
```bash
# 不要全局安装不信任的 Skill
# ❌ 避免
~/.openclaw/skills/untrusted-skill/

# ✅ 推荐
my-project/skills/untrusted-skill/
```

**(2) Audit installed Skills regularly**
```bash
# 列出所有 Skills
ls ~/.openclaw/skills/

# 查看 Skill 更新日期
ls -lt ~/.openclaw/skills/

# 删除不用的 Skills
rm -rf ~/.openclaw/skills/old-skill/
```

**(3) Restrict the AI's permissions**
```yaml
# ~/.openclaw/config.yaml
security:
  allow_file_write: false  # 禁止 AI 写入文件
  allow_network: false     # 禁止网络访问
  sandbox: true            # 沙盒模式
```

### 5. Official Security Guidance

**Awesome-OpenClaw-Skills filtering stats**:
- ❌ Filtered out 396 malicious Skills
- ❌ Filtered out 1,180 spam/test Skills
- ❌ Filtered out 672 cryptocurrency-related Skills
- ✅ Kept only 3,002 reviewed Skills

**Recommended practices**:
- ✅ Prefer installing Skills from the Awesome list
- ✅ Check the VirusTotal report before installing
- ✅ Update Skills regularly (security patches)
- ✅ Report suspicious Skills (via GitHub Issues)

---

## 8. Looking Ahead

### 1. Where the Skills Ecosystem Is Heading

**(1) Skills as a market**
- Paid Skills (enterprise-grade, premium features)
- Skill subscription services
- Skill licensing and copyright

**(2) Skills standardization**
- A unified Skill format spec
- Cross-platform compatibility (works across Claude, Codex, Cursor)
- Skill dependency management (think package.json)

**(3) Smarter Skills**
- AI-driven Skill recommendations
- Automatic Skill composition (Skill + Skill = new capability)
- Self-improving Skills (refined from usage feedback)

### 2. Technical Evolution

**(1) MCP (Model Context Protocol) integration**
- Skills served as MCP servers
- Dynamic Skill loading
- Inter-Skill communication

**(2) Multimodal Skills**
- Image processing Skills
- Video editing Skills
- Audio transcription Skills

**(3) Agent-to-Agent Skills**
- AI Agents sharing Skills with each other
- A Skill marketplace
- Cross-agent collaboration

### 3. Community Growth

**Current numbers** (February 2026):
- Total Skills: 70,184+
- Monthly growth: ~5,000
- Active contributors: ~10,000

**Projections** (end of 2026):
- Total Skills: 150,000+
- Enterprise-grade Skills share: 30%
- Paid Skills market size: $10M+

---

## 9. Case Studies

### Case 1: Automated Blog Deployment

**Scenario**: Every blog post release requires building, committing, and deploying to a server.

**Solution**: create a `blog-deploy` Skill

```markdown
---
name: blog-deploy
description: Automated blog deployment workflow
---

# Blog Deploy Skill

## Workflow
\`\`\`bash
# 1. Build
npm run build

# 2. Commit
git add .
git commit -m "Deploy blog"
git push origin main

# 3. Deploy to the server
rsync -avz dist/ user@server:/var/www/blog/

# 4. Verify
curl https://blog.example.com | grep "200 OK"
\`\`\`

## Usage
> Deploy my latest blog post
```

**Result**:
- **Before**: 10 minutes of manual work
- **After**: the AI runs it automatically, done in 1 minute

### Case 2: SEO Audit Report

**Scenario**: You need to audit your website's SEO regularly.

**Solution**: install the `seo-audit` Skill

```bash
npx skills add coreyhaines31/marketingskills/seo-audit
```

**Usage**:
```
> Audit the SEO of this page: https://example.com/blog/post-1

AI reply:
📊 SEO Audit Report

Title tag:
  ✅ Length: 58 characters (recommended: 50-60)
  ❌ Missing target keyword

Meta description:
  ✅ Length: 155 characters (recommended: 150-160)
  ✅ Contains keywords

Heading structure:
  ✅ H1: 1
  ⚠️ H2: 8 (too many, recommended: 3-5)

Links:
  ✅ Internal links: 12
  ❌ External links: 0 (consider adding 2-3 authoritative sources)

Overall score: 75/100
Recommendations: ...
```

### Case 3: Batch PDF Processing

**Scenario**: You need to extract text from 100 PDFs and merge it.

**Solution**: install the `pdf` Skill

```bash
npx skills add anthropics/skills/pdf
```

**Usage**:
```
> Extract the text from every PDF in ./invoices/ and merge it into all_invoices.txt

AI reply:
✅ Processed 100 PDF files
✅ Total extracted text: 45,231 words
✅ Output file: all_invoices.txt
```

---

## Summary

The AI Agent Skills ecosystem is growing fast, and it's upgrading AI from "general-purpose assistant" to "domain expert."

**Key takeaways**:
- ✅ **What Skills are**: reusable knowledge packages that extend AI capabilities
- ✅ **Where to find them**: skills.sh (official) + awesome-openclaw-skills (curated)
- ✅ **How to install**: official CLI (`npx skills add`) / manual copy / paste a link
- ✅ **How to create one**: SKILL.md + scripts + reference material
- ✅ **Security**: review the code, use sandboxes, keep Skills updated

**Next steps**:
1. Visit https://skills.sh/ and browse the trending Skills
2. Install 1-2 Skills relevant to your work
3. Watch your AI jump from assistant to expert
4. Create your own first Skill

The ecosystem keeps expanding, with 70K+ capability packages waiting to be discovered. Install a few practical Skills and your AI assistant stops being a code-only tool — it can audit SEO, process PDFs, and automate deployments, becoming a genuinely capable teammate.

---

## References

- [Skills.sh Official Website](https://skills.sh/)
- [Awesome-OpenClaw-Skills on GitHub](https://github.com/VoltAgent/awesome-openclaw-skills)
- [ClawHub Official Docs](https://www.clawhub.ai/)
- [Anthropic Skills Official Repository](https://github.com/anthropics/skills)
- [OpenClaw Official Docs](https://docs.openclaw.ai)
