import { c as createComponent, r as renderComponent, e as renderScript, a as renderTemplate, m as maybeRenderHead, f as addAttribute } from '../chunks/astro/server_x2VUGck0.mjs';
import 'piccolore';
import { g as getCollection } from '../chunks/_astro_content_DVGTcQgj.mjs';
import { d as createSvgComponent, $ as $$Layout, a as $$Header, b as $$LinkButton, e as SOCIALS, f as $$Socials, c as $$Footer } from '../chunks/Footer_BNLkkPdT.mjs';
import { $ as $$Card } from '../chunks/Card_Bb60apsm.mjs';
import { g as getSortedPosts } from '../chunks/getSortedPosts_Csxocpgt.mjs';
import { I as IconArrowRight } from '../chunks/IconArrowRight_t5NgMQ1r.mjs';
import { S as SITE } from '../chunks/config_BTWUie35.mjs';
export { renderers } from '../renderers.mjs';

const IconRss = createSvgComponent({"meta":{"src":"/_astro/IconRss.BYWRoVjV.svg","width":24,"height":24,"format":"svg"},"attributes":{"width":"24","height":"24","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round","class":"icon icon-tabler icons-tabler-outline icon-tabler-rss"},"children":"<path stroke=\"none\" d=\"M0 0h24v24H0z\" fill=\"none\" /><path d=\"M5 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0\" /><path d=\"M4 4a16 16 0 0 1 16 16\" /><path d=\"M4 11a9 9 0 0 1 9 9\" />"});

const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const posts = await getCollection("blog");
  const sortedPosts = getSortedPosts(posts);
  const featuredPosts = sortedPosts.filter(({ data }) => data.featured);
  const recentPosts = sortedPosts.filter(({ data }) => !data.featured);
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, {}, { "default": async ($$result2) => renderTemplate` ${renderComponent($$result2, "Header", $$Header, {})} ${maybeRenderHead()}<main id="main-content" data-layout="index" class="app-layout"> <section id="hero"${addAttribute(["pt-8 pb-6", "border-b border-border"], "class:list")}> <h1 class="my-4 inline-block text-4xl font-bold sm:my-8 sm:text-5xl">
你好 👋
</h1> <a target="_blank" href="/rss.xml" class="inline-block" aria-label="rss feed" title="RSS Feed"> ${renderComponent($$result2, "IconRss", IconRss, { "width": 20, "height": 20, "class": "scale-125 stroke-accent stroke-3 rtl:-rotate-90" })} <span class="sr-only">RSS Feed</span> </a> <p>
这里是陈广亮的技术博客，记录前端开发、JavaScript、Web 技术的学习与思考。
</p> <p class="mt-2">
欢迎常来逛逛，也可以访问
${renderComponent($$result2, "LinkButton", $$LinkButton, { "class": "underline decoration-dashed underline-offset-4 hover:text-accent", "href": "/about/" }, { "default": async ($$result3) => renderTemplate`
关于我
` })} 了解更多。
</p> ${// only display if at least one social link is enabled
  SOCIALS.length > 0 && renderTemplate`<div class="mt-4 flex max-sm:flex-col sm:items-center"> <div class="me-2 mb-1 whitespace-nowrap sm:mb-0">Social Links:</div> ${renderComponent($$result2, "Socials", $$Socials, {})} </div>`} </section> ${featuredPosts.length > 0 && renderTemplate`<section id="featured"${addAttribute([
    "pt-12 pb-6",
    { "border-b border-border": recentPosts.length > 0 }
  ], "class:list")}> <h2 class="text-2xl font-semibold tracking-wide">精选文章</h2> <ul> ${featuredPosts.map((data) => renderTemplate`${renderComponent($$result2, "Card", $$Card, { "variant": "h3", ...data })}`)} </ul> </section>`} ${recentPosts.length > 0 && renderTemplate`<section id="recent-posts" class="pt-12 pb-6"> <h2 class="text-2xl font-semibold tracking-wide">最新文章</h2> <ul> ${recentPosts.map(
    (data, index) => index < SITE.postPerIndex && renderTemplate`${renderComponent($$result2, "Card", $$Card, { "variant": "h3", ...data })}`
  )} </ul> </section>`} <div class="my-8 text-center"> ${renderComponent($$result2, "LinkButton", $$LinkButton, { "href": "/posts/" }, { "default": async ($$result3) => renderTemplate`
所有文章
${renderComponent($$result3, "IconArrowRight", IconArrowRight, { "class": "inline-block rtl:-rotate-180" })} ` })} </div> </main> ${renderComponent($$result2, "Footer", $$Footer, {})} ` })} ${renderScript($$result, "/Users/geraldchen/workspace/blog/src/pages/index.astro?astro&type=script&index=0&lang.ts")}`;
}, "/Users/geraldchen/workspace/blog/src/pages/index.astro", void 0);

const $$file = "/Users/geraldchen/workspace/blog/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
