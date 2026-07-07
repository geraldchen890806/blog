import { defineConfig, envField, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import remarkToc from "remark-toc";
import remarkCollapse from "remark-collapse";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { transformerFileName } from "./src/utils/transformers/fileName";
import { SITE } from "./src/config";
import fs from "node:fs";
import path from "node:path";

// 文章 URL → 最后更新时间(modDatetime 优先,回退 pubDatetime),供 sitemap lastmod 使用
function buildLastmodMap() {
  const map = new Map<string, Date>();
  for (const lang of ["zh", "en"] as const) {
    const dir = path.resolve("./src/data/blog", lang);
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith(".md")) continue;
      const raw = fs.readFileSync(path.join(dir, f), "utf8");
      if (/^draft:\s*true/m.test(raw)) continue;
      const slug =
        raw.match(/^slug:\s*["']?([^"'\n]+?)["']?\s*$/m)?.[1]?.trim() ??
        f.replace(/\.md$/, "");
      const dateStr =
        raw.match(/^modDatetime:\s*(\S+)/m)?.[1] ??
        raw.match(/^pubDatetime:\s*(\S+)/m)?.[1];
      if (!dateStr) continue;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) continue;
      map.set(`${lang === "en" ? "/en" : ""}/posts/${slug}/`, d);
    }
  }
  return map;
}
const LASTMOD_MAP = buildLastmodMap();

// https://astro.build/config
export default defineConfig({
  site: SITE.website,
  integrations: [
    sitemap({
      // search/tags 已加 noindex(薄页面,AdSense 整改),同步移出 sitemap;
      // 分页页(/posts/page/N/)同为薄页面,不进 sitemap(仍可被正常爬取)
      filter: page => {
        const path = new URL(page).pathname;
        if (/^\/(en\/)?(search|tags)(\/|$)/.test(path)) return false;
        if (/^\/(en\/)?posts\/page\//.test(path)) return false;
        return SITE.showArchives || !page.endsWith("/archives");
      },
      serialize: item => {
        const d = LASTMOD_MAP.get(new URL(item.url).pathname);
        if (d) item.lastmod = d.toISOString();
        return item;
      },
    }),
  ],
  markdown: {
    remarkPlugins: [remarkToc, [remarkCollapse, { test: "Table of contents" }]],
    shikiConfig: {
      // For more themes, visit https://shiki.style/themes
      themes: { light: "min-light", dark: "night-owl" },
      defaultColor: false,
      wrap: false,
      transformers: [
        transformerFileName({ style: "v2", hideDot: false }),
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
        transformerNotationDiff({ matchAlgorithm: "v3" }),
      ],
    },
  },
  vite: {
    // eslint-disable-next-line
    // @ts-ignore
    // This will be fixed in Astro 6 with Vite 7 support
    // See: https://github.com/withastro/astro/issues/14030
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
  },
  image: {
    responsiveStyles: true,
    layout: "constrained",
  },
  env: {
    schema: {
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
    },
  },
  // Astro 6 起 fonts / preserveScriptOrder 已稳定，从 experimental 移到顶层
  fonts: [
    {
      name: "Google Sans Code",
      cssVariable: "--font-google-sans-code",
      provider: fontProviders.google(),
      fallbacks: ["monospace"],
      weights: [300, 400, 500, 600, 700],
      styles: ["normal", "italic"],
    },
  ],
});
