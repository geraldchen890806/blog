import { b as createAstro, c as createComponent, m as maybeRenderHead, f as addAttribute, r as renderComponent, a as renderTemplate } from './astro/server_x2VUGck0.mjs';
import 'piccolore';
import { s as slugifyStr } from './slugify_BANPlBp3.mjs';
import { g as getPath } from './getPath_CErWY5M9.mjs';
import { $ as $$Datetime } from './Datetime_x7pjztjo.mjs';

const $$Astro = createAstro("https://chenguangliang.com/");
const $$Card = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Card;
  const { variant: Heading = "h2", id, data, filePath } = Astro2.props;
  const { title, description, ...props } = data;
  return renderTemplate`${maybeRenderHead()}<li class="my-6"> <a${addAttribute(getPath(id, filePath), "href")}${addAttribute([
    "inline-block text-lg font-medium text-accent",
    "decoration-dashed underline-offset-4 hover:underline",
    "focus-visible:no-underline focus-visible:underline-offset-0"
  ], "class:list")}> ${renderComponent($$result, "Heading", Heading, { "style": { viewTransitionName: slugifyStr(title.replaceAll(".", "-")) } }, { "default": ($$result2) => renderTemplate`${title}` })} </a> ${renderComponent($$result, "Datetime", $$Datetime, { ...props })} <p>${description}</p> </li>`;
}, "/Users/geraldchen/workspace/blog/src/components/Card.astro", void 0);

export { $$Card as $ };
