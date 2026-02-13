import { c as createComponent, r as renderComponent, a as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_x2VUGck0.mjs';
import 'piccolore';
import { $ as $$Layout, a as $$Header, c as $$Footer } from '../chunks/Footer_BNLkkPdT.mjs';
import { $ as $$Main } from '../chunks/Main_DlfXnroj.mjs';
export { renderers } from '../renderers.mjs';

const $$Index = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "\u5728\u7EBF\u5DE5\u5177 | \u9648\u5E7F\u4EAE\u7684\u6280\u672F\u535A\u5BA2" }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "Header", $$Header, {})} ${renderComponent($$result2, "Main", $$Main, { "pageTitle": "\u5728\u7EBF\u5DE5\u5177", "pageDesc": "\u4E00\u4E9B\u5B9E\u7528\u7684\u5728\u7EBF\u5C0F\u5DE5\u5177\uFF0C\u7EAF\u524D\u7AEF\u5B9E\u73B0\uFF0C\u65E0\u9700\u540E\u7AEF\u3002" }, { "default": ($$result3) => renderTemplate` ${maybeRenderHead()}<div class="grid grid-cols-1 gap-6 sm:grid-cols-2"> <a href="/tools/qrcode" class="group rounded-lg border border-border p-6 transition-all hover:border-accent"> <h2 class="text-xl font-semibold group-hover:text-accent">
🔲 二维码工具
</h2> <p class="mt-2 text-sm opacity-80">
生成和解析二维码。输入文本生成二维码图片，或上传图片识别二维码内容。
</p> </a> <a href="/tools/csv-to-json" class="group rounded-lg border border-border p-6 transition-all hover:border-accent"> <h2 class="text-xl font-semibold group-hover:text-accent">
📊 CSV 转 JSON
</h2> <p class="mt-2 text-sm opacity-80">
将 CSV 数据转换为 JSON 格式，支持自定义分隔符、文件上传和一键复制。
</p> </a> </div> ` })} ${renderComponent($$result2, "Footer", $$Footer, {})} ` })}`;
}, "/Users/geraldchen/workspace/blog/src/pages/tools/index.astro", void 0);

const $$file = "/Users/geraldchen/workspace/blog/src/pages/tools/index.astro";
const $$url = "/tools";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
