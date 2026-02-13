import { g as getCollection } from '../../../chunks/_astro_content_DVGTcQgj.mjs';
import { g as getPath } from '../../../chunks/getPath_CErWY5M9.mjs';
import { a as generateOgImageForPost } from '../../../chunks/generateOgImages_Cfp6NbYN.mjs';
export { renderers } from '../../../renderers.mjs';

async function getStaticPaths() {
  const posts = await getCollection("blog").then(
    (p) => p.filter(({ data }) => !data.draft && !data.ogImage)
  );
  return posts.map((post) => ({
    params: { slug: getPath(post.id, post.filePath, false) },
    props: post
  }));
}
const GET = async ({ props }) => {
  const buffer = await generateOgImageForPost(props);
  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": "image/png" }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  getStaticPaths
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
