import { b as createAstro, c as createComponent, m as maybeRenderHead, f as addAttribute, g as renderTransition, r as renderComponent, a as renderTemplate } from './astro/server_x2VUGck0.mjs';
import 'piccolore';
import { d as createSvgComponent } from './Footer_BNLkkPdT.mjs';
/* empty css                         */

const IconHash = createSvgComponent({"meta":{"src":"/_astro/IconHash.D97SZ4jU.svg","width":24,"height":24,"format":"svg"},"attributes":{"width":"24","height":"24","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round","class":"icon icon-tabler icons-tabler-outline icon-tabler-hash"},"children":"<path stroke=\"none\" d=\"M0 0h24v24H0z\" fill=\"none\" /><path d=\"M5 9l14 0\" /><path d=\"M5 15l14 0\" /><path d=\"M11 4l-4 16\" /><path d=\"M17 4l-4 16\" />"});

const $$Astro = createAstro("https://chenguangliang.com/");
const $$Tag = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Tag;
  const { tag, tagName, size = "lg" } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<li> <a${addAttribute(`/tags/${tag}/`, "href")}${addAttribute([
    "flex items-center gap-0.5",
    "border-b-2 border-dashed border-foreground",
    "hover:-mt-0.5 hover:border-accent hover:text-accent",
    "focus-visible:border-none focus-visible:text-accent",
    { "text-sm": size === "sm" },
    { "text-lg": size === "lg" }
  ], "class:list")}${addAttribute(renderTransition($$result, "36ssibgs", "", tag), "data-astro-transition-scope")}> ${renderComponent($$result, "IconHash", IconHash, { "class:list": [
    "opacity-80",
    { "size-5": size === "lg" },
    { "size-4": size === "sm" }
  ] })} ${tagName} </a> </li>`;
}, "/Users/geraldchen/workspace/blog/src/components/Tag.astro", "self");

export { $$Tag as $ };
