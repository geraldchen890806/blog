import { BLOG_PATH } from "@/content.config";
import { slugifyStr } from "./slugify";

/**
 * Get full path of a blog post.
 *
 * URL strategy (方案 A，2026-05 起):
 * - 旧文章：URL 沿用文件名（含 blogXXX_ 序号前缀），保证外链不失效
 * - 新文章：frontmatter 显式声明不带序号前缀的 `slug` 字段时，URL 使用该 slug
 *   判定方式：slug 不以 `blog` + 数字 + `_` 开头时视为干净 slug
 *
 * @param id - id of the blog post (Astro collection id, derived from filename)
 * @param filePath - the blog post full file location
 * @param includeBase - whether to include `/posts` in return value
 * @param frontmatterSlug - optional frontmatter `slug` field
 * @returns blog post path
 */
export function getPath(
  id: string,
  filePath: string | undefined,
  includeBase = true,
  frontmatterSlug?: string
) {
  const pathSegments = filePath
    ?.replace(BLOG_PATH, "")
    .split("/")
    .filter(path => path !== "")
    .filter(path => !path.startsWith("_"))
    .filter(path => path !== "zh" && path !== "en")
    .slice(0, -1)
    .map(segment => slugifyStr(segment));

  const basePath = includeBase ? "/posts" : "";

  // 优先使用 frontmatter 中显式声明的干净 slug（不带 blogXXX_ 前缀）
  let slug: string;
  if (frontmatterSlug && !/^blog\d+_/i.test(frontmatterSlug)) {
    slug = frontmatterSlug;
  } else {
    const blogId = id.split("/");
    slug = blogId.length > 0 ? blogId.slice(-1).join("") : id;
  }

  if (!pathSegments || pathSegments.length < 1) {
    return [basePath, slug].join("/");
  }

  return [basePath, ...pathSegments, slug].join("/");
}
