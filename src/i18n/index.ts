import type { CollectionEntry } from "astro:content";

export type Lang = "zh" | "en";

export const DEFAULT_LANG: Lang = "zh";

/** 从 collection entry id（如 "en/blog186_xxx"）推断语言 */
export function getLangFromId(id: string): Lang {
  return id.startsWith("en/") ? "en" : "zh";
}

/** 从 URL pathname（如 "/en/posts/xxx"）推断语言 */
export function getLangFromUrl(pathname: string): Lang {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "zh";
}

/** getCollection 过滤器：只保留指定语言的文章 */
export const byLang =
  (lang: Lang) =>
  (post: CollectionEntry<"blog">): boolean =>
    getLangFromId(post.id) === lang;

/** 给路径加上语言前缀（zh 为默认语言，无前缀） */
export function localizePath(path: string, lang: Lang): string {
  if (lang === "zh") return path;
  return path === "/" ? "/en/" : `/en${path}`;
}

/** 当前 pathname 在另一语言下的对应路径（朴素前缀互换） */
export function alternatePathname(pathname: string): string {
  if (getLangFromUrl(pathname) === "en") {
    const stripped = pathname.replace(/^\/en/, "");
    return stripped === "" ? "/" : stripped;
  }
  return pathname === "/" ? "/en/" : `/en${pathname}`;
}

/** 中文文章 id 对应的英文翻译 id，反之亦然 */
export function translationId(id: string): string {
  return getLangFromId(id) === "en"
    ? id.replace(/^en\//, "zh/")
    : `en/${id.replace(/^zh\//, "")}`;
}

export const LOCALE_TAG: Record<Lang, string> = {
  zh: "zh-CN",
  en: "en",
};

export const OG_LOCALE: Record<Lang, string> = {
  zh: "zh_CN",
  en: "en_US",
};

const zh = {
  siteTitle: "陈广亮的技术博客",
  siteDesc:
    "陈广亮的技术博客 - 分享前端开发、JavaScript、TypeScript、React、Web3、AI 等技术实践与深度思考",
  privacyPolicy: "隐私政策",
  contact: "联系方式",
  relatedPosts: "相关阅读",
  tableOfContents: "目录",
  appreciationButton: "☕ 觉得有帮助？请作者喝杯咖啡",
  appreciationTitle: "请作者喝杯咖啡 ☕",
  appreciationSubtitle: "如果这篇文章对你有帮助",
  appreciationCopy: "复制地址",
  appreciationCopied: "已复制 ✓",
  appreciationNote: "支持 ETH / ERC-20 代币",
  langToggleLabel: "EN",
  langToggleTitle: "Switch to English",
  rssTitle: "陈广亮的技术博客",
};

type UIStrings = { [K in keyof typeof zh]: string };

const en: UIStrings = {
  siteTitle: "Gerald Chen's Tech Blog",
  siteDesc:
    "Gerald Chen's tech blog — deep dives into frontend engineering, JavaScript, TypeScript, React, Web3, and AI.",
  privacyPolicy: "Privacy Policy",
  contact: "Contact",
  relatedPosts: "Related Posts",
  tableOfContents: "Table of Contents",
  appreciationButton: "☕ Found this helpful? Buy me a coffee",
  appreciationTitle: "Buy me a coffee ☕",
  appreciationSubtitle: "If this article helped you",
  appreciationCopy: "Copy address",
  appreciationCopied: "Copied ✓",
  appreciationNote: "ETH / ERC-20 tokens supported",
  langToggleLabel: "中文",
  langToggleTitle: "切换到中文",
  rssTitle: "Gerald Chen's Tech Blog",
};

export const ui: Record<Lang, UIStrings> = { zh, en };

export function useTranslations(lang: Lang) {
  return function t(key: keyof UIStrings): string {
    return ui[lang][key];
  };
}
