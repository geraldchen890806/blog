# 写作与发布流程(中英双语版)

> 2026-06 i18n 改造后的权威流程。旧版(单语 + Telegram 伪代码)已被本文档取代,
> 通知逻辑的实际实现见 `enhanced-publish.js`。

## 目录结构与命名

```text
src/data/blog/
├── zh/   ← 中文原文(写作入口,文章一律先写在这里)
└── en/   ← 英文译文(与 zh/ 同名文件,frontmatter 锁定字段必须一致)
```

- 文件命名:`blog{三位序号}_{英文短slug}.md`,例如 `blog187_image-watermark-guide.md`
- 新文章 URL 用干净 slug:frontmatter 里写 `slug: image-watermark-guide`(不带序号前缀),
  老文章保持原样不动(避免制造死链)
- 命名检查:`bash scripts/check-blog-naming.sh`(加 `--fix` 自动补序号,会同步重命名 en/ 同名文件)

## frontmatter 约定

```yaml
---
author: 陈广亮            # 英文版为 Gerald Chen
pubDatetime: 2026-06-11T10:00:00+08:00
title: 中文标题           # 英文版翻译;含冒号等特殊字符时用双引号包裹
slug: clean-slug          # 中英文版必须一致
featured: false
draft: true               # 写作期一律 true;发布时中英文同步翻转
tags: [...]               # 中英文版完全一致,tag 不翻译
description: ...          # 英文版翻译
---
```

**锁定字段**(中英文必须逐字一致):`pubDatetime、modDatetime、slug、tags、draft、featured、reviewed、approved、ogImage、canonicalURL、timezone、hideEditPost`。

## 完整流程

```text
1. 写作        在 zh/ 写中文初稿(draft: true)
2. 命名检查    bash scripts/check-blog-naming.sh
3. 翻译        生成 en/ 同名英文版(见下方"翻译方式")
4. 审核        中英文一起审:事实、代码可运行、英文是否地道
5. 发布        node enhanced-publish.js <slug>
               (自动:zh+en 同步 draft→false → build → git push → 部署 → 验证)
6. 验证        /posts/<slug>/ 与 /en/posts/<slug>/ 都返回 200,
               页面 head 里有互指的 hreflang
7. 分发        社媒发布走 scripts/detect-new-posts.sh(只统计 zh/ 避免重复计数)
```

## 翻译方式(二选一)

**方式 A:让 Claude 直接翻**(推荐,质量最好)
在 Claude Code 里说"翻译 zh/blogXXX_xxx.md",规则见下。

**方式 B:API 脚本**(批量/自动化场景)
```bash
ANTHROPIC_API_KEY=... node scripts/translate-post.js src/data/blog/zh/blogXXX_xxx.md
# 模型可换:TRANSLATE_MODEL=claude-sonnet-4-6(默认 claude-opus-4-8)
```

**翻译规则**(两种方式都遵守):
- 真代码块(标注语言的)及其中注释:原样保留不翻译
- text/无语言标注的 ASCII 图、流程图、决策树:翻译文字,框线结构保形
- 站内链接 `/posts/<slug>` → `/en/posts/<slug>`;指向本站的完整 URL 链接同样改写,
  锚文本换成目标文章的英文标题
- tags、行内代码、命令、产品/库名:不翻译
- 译文要像英文原创,不要翻译腔

## 发布注意事项

- `enhanced-publish.js` 在缺英文版时会**中断发布**——先翻译再发,保证双语同步上线
- 部署后如有新文章,在 Google Search Console 重新提交 sitemap
- 中文版后续修订时,记得同步更新英文版(modDatetime 两边一致)

## i18n 架构备忘(改动前必读)

- `content.config.ts` 的 `generateId` 强制用文件路径作 entry id(`zh/blogXXX`)——
  **不能删**,否则双语同名文章 id 冲突,英文版会被静默丢弃
- 语言推断、UI 文案字典统一在 `src/i18n/index.ts`
- hreflang 由 Layout 的 `alternateURL` prop 控制,只在译文确实存在时输出
- 首页语言跳转是客户端脚本(静态站无 middleware),用户偏好存 `preferred_lang` cookie
