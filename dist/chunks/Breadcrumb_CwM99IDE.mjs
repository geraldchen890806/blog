import { b as createAstro, c as createComponent, m as maybeRenderHead, f as addAttribute, a as renderTemplate } from './astro/server_x2VUGck0.mjs';
import 'piccolore';
import 'clsx';

const $$Astro = createAstro("https://chenguangliang.com/");
const $$Breadcrumb = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Breadcrumb;
  const currentUrlPath = Astro2.url.pathname.replace(/\/+$/, "");
  const breadcrumbList = currentUrlPath.split("/").slice(1);
  if (breadcrumbList[0] === "posts") {
    breadcrumbList.splice(0, 2, `Posts (page ${breadcrumbList[1] || 1})`);
  }
  if (breadcrumbList[0] === "tags" && !isNaN(Number(breadcrumbList[2]))) {
    breadcrumbList.splice(
      1,
      3,
      `${breadcrumbList[1]} ${Number(breadcrumbList[2]) === 1 ? "" : "(page " + breadcrumbList[2] + ")"}`
    );
  }
  return renderTemplate`${maybeRenderHead()}<nav class="app-layout mt-8 mb-1" aria-label="breadcrumb"> <ul class="font-light [&>li]:inline [&>li:not(:last-child)>a]:hover:opacity-100"> <li> <a href="/" class="opacity-80">Home</a> <span aria-hidden="true" class="opacity-80">&raquo;</span> </li> ${breadcrumbList.map(
    (breadcrumb, index) => index + 1 === breadcrumbList.length ? renderTemplate`<li> <span${addAttribute(["capitalize opacity-75", { lowercase: index > 0 }], "class:list")} aria-current="page">  ${decodeURIComponent(breadcrumb)} </span> </li>` : renderTemplate`<li> <a${addAttribute(`/${breadcrumb}/`, "href")} class="capitalize opacity-70"> ${breadcrumb} </a> <span aria-hidden="true">&raquo;</span> </li>`
  )} </ul> </nav>`;
}, "/Users/geraldchen/workspace/blog/src/components/Breadcrumb.astro", void 0);

export { $$Breadcrumb as $ };
