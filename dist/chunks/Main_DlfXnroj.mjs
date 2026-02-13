import { b as createAstro, c as createComponent, r as renderComponent, m as maybeRenderHead, f as addAttribute, g as renderTransition, a as renderTemplate, d as renderSlot, e as renderScript } from './astro/server_x2VUGck0.mjs';
import 'piccolore';
import { $ as $$Breadcrumb } from './Breadcrumb_CwM99IDE.mjs';
/* empty css                         */

const $$Astro = createAstro("https://chenguangliang.com/");
const $$Main = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Main;
  const { props } = Astro2;
  const backUrl = Astro2.url.pathname ;
  return renderTemplate`${renderComponent($$result, "Breadcrumb", $$Breadcrumb, {})} ${maybeRenderHead()}<main${addAttribute(backUrl, "data-backUrl")} id="main-content" class="app-layout pb-4"> ${"titleTransition" in props ? renderTemplate`<h1 class="text-2xl font-semibold sm:text-3xl"> ${props.pageTitle[0]} <span${addAttribute(renderTransition($$result, "hn2qarie", "", props.titleTransition), "data-astro-transition-scope")}> ${props.pageTitle[1]} </span> </h1>` : renderTemplate`<h1 class="text-2xl font-semibold sm:text-3xl">${props.pageTitle}</h1>`} <p class="mt-2 mb-6 italic">${props.pageDesc}</p> ${renderSlot($$result, $$slots["default"])} </main> ${renderScript($$result, "/Users/geraldchen/workspace/blog/src/layouts/Main.astro?astro&type=script&index=0&lang.ts")}`;
}, "/Users/geraldchen/workspace/blog/src/layouts/Main.astro", "self");

export { $$Main as $ };
