---
author: Gerald Chen
pubDatetime: 2026-04-28T10:00:00+08:00
title: "Tool Guide 50: Online Meta Tag Generator"
slug: blog153_meta-tag-generator-guide
featured: false
draft: true
reviewed: false
approved: false
tags:
  - 工具指南
  - 工具
  - 前端
  - 开发效率
description: "Meta tags directly affect search rankings and how your pages look when shared. This post breaks down the three major categories—Open Graph, Twitter Card, and SEO tags—and shows how to generate a clean, ready-to-use configuration with an online meta tag generator."
---

After finishing a web page, the part most likely to bite you when testing SEO and social sharing is the meta tags. Get the format wrong and search engines won't recognize them; put the wrong image size in og:image and your share preview on WeChat or Twitter comes out distorted—and none of these problems show up in local testing. You only find out after the page goes live.

This post breaks down the three major categories of meta tags, explains what each field actually does, and then shows how to use the [online Meta Tag Generator](https://anyfreetools.com/tools/meta-tag-generator) to quickly produce a configuration you can drop straight into your site.

## The Three Categories of Meta Tags

### 1. Basic SEO Tags

When a search engine crawls a page, these are the first tags it reads:

```html
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="description" content="页面描述，建议 120-160 字符" />
<meta name="keywords" content="关键词1, 关键词2, 关键词3" />
<meta name="robots" content="index, follow" />
<meta name="author" content="陈广亮" />
```

**`description`** is the single most important field for SEO. The summary line shown under the title in Google search results usually comes from here. Anything over 160 characters gets truncated; anything too short (under 60 characters) gets replaced with auto-generated text by the search engine.

**`keywords`** has been essentially ignored by Google since 2009, when they announced they no longer use it. Baidu and Bing still give it some weight, though, so it's worth filling in for Chinese-language sites.

**`robots`** controls crawler behavior:
- `index, follow`: allow indexing of the current page and following its links (the default)
- `noindex, nofollow`: don't index, don't follow—used for admin pages, login pages, and the like
- `noarchive`: don't show a "cached" link in search results

**`viewport`** also affects SEO indirectly: under Google's mobile-first indexing, pages without a proper viewport configuration rank lower in mobile search.

### 2. Open Graph Tags (Social Sharing)

Open Graph is a protocol Facebook introduced in 2010, and it's now the de facto standard for social share previews—WeChat, Twitter, LinkedIn, Slack, and others all support it.

```html
<meta property="og:title" content="页面标题" />
<meta property="og:description" content="分享描述，建议 200 字符以内" />
<meta property="og:image" content="https://example.com/og-image.jpg" />
<meta property="og:url" content="https://example.com/page" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="网站名称" />
<meta property="og:locale" content="zh_CN" />
```

**`og:image`** is where most things go wrong:

| Platform | Recommended size | Minimum size | Max file size |
|------|----------|----------|-------------|
| Facebook | 1200×630 | 600×315 | 8MB |
| Twitter | 1200×628 | 300×157 | 5MB |
| LinkedIn | 1200×627 | - | 5MB |
| WeChat | 300×300 (square) | 100×100 | 1MB |

The image URL must be an absolute path—relative paths won't work. Some platforms (WeChat, for example) require the image domain to be whitelisted, and URLs from a local dev environment can't generate a preview.

**`og:type`** common values:
- `website`: a regular web page (the default)
- `article`: an article page, used together with `article:published_time` and `article:author`
- `product`: a product page

```html
<!-- 文章类型的完整示例 -->
<meta property="og:type" content="article" />
<meta property="article:published_time" content="2026-04-28T10:00:00+08:00" />
<meta property="article:author" content="https://example.com/about" />
<meta property="article:section" content="前端开发" />
```

### 3. Twitter Card Tags

Twitter has its own card system that doesn't rely entirely on Open Graph:

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@your_account" />
<meta name="twitter:creator" content="@author_account" />
<meta name="twitter:title" content="标题" />
<meta name="twitter:description" content="描述" />
<meta name="twitter:image" content="https://example.com/twitter-image.jpg" />
<meta name="twitter:image:alt" content="图片描述" />
```

**`twitter:card`** determines the card layout:
- `summary`: small image plus text, with the image shown as a square thumbnail
- `summary_large_image`: a large banner image spanning the full card width—this is the right choice for nearly all article/blog scenarios
- `app`: an app download card
- `player`: a video/audio player

If Twitter can't find any `twitter:*` tags, it automatically falls back to the corresponding `og:*` tags. So Open Graph is the foundation, and Twitter Card is the supplement.

## Generating Tags with an Online Tool

Writing these tags by hand makes it easy to miss a field or get the format wrong. The [Meta Tag Generator on anyfreetools.com](https://anyfreetools.com/tools/meta-tag-generator) brings all three categories together in a single interface:

1. Fill in the page basics (title, description, URL, image link)
2. Pick the og:type (website / article / product)
3. Check the tag categories you need (SEO / Open Graph / Twitter Card)
4. Copy the generated HTML block with one click

The generated code can be pasted directly into your HTML `<head>`, or split out into the appropriate framework configuration.

## Using the Tags in Different Frameworks

### Plain HTML

Paste directly inside the `<head>` tag:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>页面标题</title>

    <!-- SEO -->
    <meta name="description" content="页面描述" />
    <meta name="robots" content="index, follow" />

    <!-- Open Graph -->
    <meta property="og:title" content="页面标题" />
    <meta property="og:description" content="页面描述" />
    <meta property="og:image" content="https://example.com/og.jpg" />
    <meta property="og:url" content="https://example.com/page" />
    <meta property="og:type" content="website" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="页面标题" />
    <meta name="twitter:description" content="页面描述" />
    <meta name="twitter:image" content="https://example.com/og.jpg" />
  </head>
</html>
```

### Next.js (App Router)

The App Router in Next.js 13+ provides a type-safe Metadata API:

```typescript
// app/page.tsx 或 app/[slug]/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "页面标题",
  description: "页面描述",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "页面标题",
    description: "页面描述",
    url: "https://example.com/page",
    siteName: "网站名称",
    images: [
      {
        url: "https://example.com/og.jpg",
        width: 1200,
        height: 630,
        alt: "图片描述",
      },
    ],
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "页面标题",
    description: "页面描述",
    images: ["https://example.com/og.jpg"],
    creator: "@your_account",
  },
};
```

For dynamic routes (like a blog post page), use the `generateMetadata` function:

```typescript
// app/posts/[slug]/page.tsx
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPost(slug);

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [{ url: post.coverImage, width: 1200, height: 630 }],
      type: "article",
      publishedTime: post.publishedAt,
      authors: [post.author],
    },
  };
}
```

> Note: starting with Next.js 15, `params` is an async Promise and must be `await`ed before use. If you're still on Next.js 13-14, you can destructure `params.slug` directly.

### Astro

```astro
---
// src/layouts/Layout.astro
interface Props {
  title: string;
  description: string;
  image?: string;
  url?: string;
}

const {
  title,
  description,
  image = "https://example.com/default-og.jpg",
  url = Astro.url.href,
} = Astro.props;
---

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <meta name="description" content={description} />

  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:image" content={image} />
  <meta property="og:url" content={url} />
  <meta property="og:type" content="website" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={image} />
</head>
```

## Verifying Your Configuration

Once generated and deployed, you can verify with these tools:

- **Facebook Sharing Debugger**: `developers.facebook.com/tools/debug/` — enter a URL to see the og tags Facebook parsed, and force a cache refresh if needed
- **opengraph.xyz**: previews Twitter Card, Open Graph, and other social share cards online (Twitter's official Card Validator was shut down in 2022)
- **LinkedIn Post Inspector**: `linkedin.com/post-inspector/`

Note: these validators require the page to be publicly accessible. During local development, you can expose a local port with a tool like ngrok, or deploy to a staging environment to verify.

## Common Issues

**The share preview isn't updating**: social platforms cache og tags. After making changes, you need to manually refresh the cache with the official debugging tool (Facebook Sharing Debugger has a "Scrape Again" button).

**og:image won't display**: check that the image URL is an absolute path, that the image server allows cross-origin access (it needs to allow the social platforms' crawler User-Agents), and that the image meets the minimum size requirements.

**Should title and og:title be the same?** Not necessarily. `<title>` is what shows in the browser tab and bookmarks, and usually includes the site name (e.g. "Article Title | Site Name"); `og:title` is the share card's title, and it's best to use just the article title itself without the site name suffix.
