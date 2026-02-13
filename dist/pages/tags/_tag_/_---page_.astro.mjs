import { b as createAstro, c as createComponent, r as renderComponent, a as renderTemplate, f as addAttribute, g as renderTransition, m as maybeRenderHead } from '../../../chunks/astro/server_x2VUGck0.mjs';
import 'piccolore';
import { g as getCollection } from '../../../chunks/_astro_content_DVGTcQgj.mjs';
import { $ as $$Main } from '../../../chunks/Main_DlfXnroj.mjs';
import { $ as $$Layout, a as $$Header, c as $$Footer } from '../../../chunks/Footer_BNLkkPdT.mjs';
import { $ as $$Card } from '../../../chunks/Card_Bb60apsm.mjs';
import { $ as $$Pagination } from '../../../chunks/Pagination_BVu0kEQ-.mjs';
import { g as getUniqueTags } from '../../../chunks/getUniqueTags_itznxwWt.mjs';
import { g as getSortedPosts } from '../../../chunks/getSortedPosts_Csxocpgt.mjs';
import { a as slugifyAll } from '../../../chunks/slugify_BANPlBp3.mjs';
import { S as SITE } from '../../../chunks/config_BTWUie35.mjs';
/* empty css                                       */
export { renderers } from '../../../renderers.mjs';

const getPostsByTag = (posts, tag) => getSortedPosts(
  posts.filter((post) => slugifyAll(post.data.tags).includes(tag))
);

const $$Astro = createAstro("https://chenguangliang.com/");
async function getStaticPaths({ paginate }) {
  const posts = await getCollection("blog");
  const tags = getUniqueTags(posts);
  return tags.flatMap(({ tag, tagName }) => {
    const tagPosts = getPostsByTag(posts, tag);
    return paginate(tagPosts, {
      params: { tag },
      props: { tagName },
      pageSize: SITE.postPerPage
    });
  });
}
const $$ = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$;
  const params = Astro2.params;
  const { tag } = params;
  const { page, tagName } = Astro2.props;
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": `Tag: ${tagName} | ${SITE.title}` }, { "default": async ($$result2) => renderTemplate` ${renderComponent($$result2, "Header", $$Header, {})} ${renderComponent($$result2, "Main", $$Main, { "pageTitle": [`Tag:`, `${tagName}`], "titleTransition": tag, "pageDesc": `All the articles with the tag "${tagName}".` }, { "default": async ($$result3) => renderTemplate`  ${maybeRenderHead()}<ul> ${page.data.map((data) => renderTemplate`${renderComponent($$result3, "Card", $$Card, { ...data })}`)} </ul> `, "title": async ($$result3) => renderTemplate`<h1${addAttribute(renderTransition($$result3, "7yucybdb", "", tag), "data-astro-transition-scope")}>${`Tag:${tag}`}</h1>` })} ${renderComponent($$result2, "Pagination", $$Pagination, { "page": page })} ${renderComponent($$result2, "Footer", $$Footer, { "noMarginTop": page.lastPage > 1 })} ` })}`;
}, "/Users/geraldchen/workspace/blog/src/pages/tags/[tag]/[...page].astro", "self");

const $$file = "/Users/geraldchen/workspace/blog/src/pages/tags/[tag]/[...page].astro";
const $$url = "/tags/[tag]/[...page]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$,
  file: $$file,
  getStaticPaths,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
