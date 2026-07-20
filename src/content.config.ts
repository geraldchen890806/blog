import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { SITE } from "@/config";

export const BLOG_PATH = "src/data/blog";

const blog = defineCollection({
  loader: glob({
    pattern: ["**/[^_]*.md", "!**/*.tweet.*.md"],
    base: `./${BLOG_PATH}`,
    // 强制用文件路径作 entry id(如 "zh/blog186_xxx"),保证 zh/en 同名文章 id 不冲突,
    // 且语言可从 id 前缀推断。glob 默认会优先用 frontmatter slug 作 id,导致双语副本冲突。
    generateId: ({ entry }) => entry.replace(/\.md$/, ""),
  }),
  schema: ({ image }) =>
    z.object({
      author: z.string().default(SITE.author),
      pubDatetime: z.date(),
      modDatetime: z.date().optional().nullable(),
      title: z.string(),
      featured: z.boolean().optional(),
      draft: z.boolean().optional(),
      tags: z.array(z.string()).default(["others"]),
      ogImage: image().or(z.string()).optional(),
      description: z.string(),
      canonicalURL: z.string().optional(),
      hideEditPost: z.boolean().optional(),
      timezone: z.string().optional(),
      reviewed: z.boolean().optional(),
      approved: z.boolean().optional(),
      slug: z.string().optional(),
    }),
});

export const collections = { blog };
