import { c as createComponent, r as renderComponent, e as renderScript, a as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_x2VUGck0.mjs';
import 'piccolore';
import { $ as $$Layout, a as $$Header, c as $$Footer } from '../../chunks/Footer_BNLkkPdT.mjs';
export { renderers } from '../../renderers.mjs';

const $$CsvToJson = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "CSV \u8F6C JSON | \u5728\u7EBF\u5DE5\u5177" }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "Header", $$Header, {})} ${maybeRenderHead()}<main id="main-content" class="app-layout pb-12"> <nav class="breadcrumb my-4 text-sm opacity-70"> <a href="/" class="hover:text-accent">首页</a> <span class="mx-1">&gt;</span> <a href="/tools" class="hover:text-accent">工具</a> <span class="mx-1">&gt;</span> <span>CSV 转 JSON</span> </nav> <h1 class="mb-2 text-2xl font-semibold sm:text-3xl">📊 CSV 转 JSON</h1> <p class="mb-6 italic opacity-80">将 CSV 数据转换为 JSON 格式。首列为 key 时自动按列生成多个 JSON 文件。</p> <div class="mb-4 flex flex-wrap items-center gap-4"> <label class="flex items-center gap-2 text-sm">
分隔符：
<input id="delimiter" type="text" value="," maxlength="5" class="w-16 rounded border border-border bg-transparent px-2 py-1 text-center focus:border-accent focus:outline-none"> </label> <label class="cursor-pointer rounded border border-border px-3 py-1 text-sm hover:border-accent">
上传 CSV 文件
<input id="csv-file" type="file" accept=".csv,.tsv,.txt" class="hidden"> </label> </div> <div class="grid grid-cols-1 gap-4 lg:grid-cols-2"> <div> <label class="mb-1 block text-sm font-medium">CSV 输入</label> <textarea id="csv-input" rows="16" placeholder="key,en,tw
logout,Logout,登出
login,Login,登入" class="w-full resize-y rounded-lg border border-border bg-transparent p-3 font-mono text-sm focus:border-accent focus:outline-none"></textarea> </div> <div> <div id="json-output-area"> <div class="mb-1 flex items-center justify-between"> <label class="text-sm font-medium">JSON 输出</label> <div class="flex gap-2"> <button id="btn-copy" class="rounded border border-border px-3 py-0.5 text-sm hover:border-accent">复制</button> <button id="btn-download-all" class="hidden rounded border border-border px-3 py-0.5 text-sm hover:border-accent">全部下载</button> </div> </div> <!-- Single JSON output (normal mode) --> <textarea id="json-output" rows="16" readonly class="w-full resize-y rounded-lg border border-border bg-transparent p-3 font-mono text-sm focus:border-accent focus:outline-none"></textarea> <!-- Multi JSON output (key mode) --> <div id="multi-json-output" class="hidden space-y-4"></div> </div> </div> </div> <p id="csv-error" class="mt-2 hidden text-sm text-red-500"></p> </main> ${renderComponent($$result2, "Footer", $$Footer, {})} ` })} ${renderScript($$result, "/Users/geraldchen/workspace/blog/src/pages/tools/csv-to-json.astro?astro&type=script&index=0&lang.ts")}`;
}, "/Users/geraldchen/workspace/blog/src/pages/tools/csv-to-json.astro", void 0);

const $$file = "/Users/geraldchen/workspace/blog/src/pages/tools/csv-to-json.astro";
const $$url = "/tools/csv-to-json";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$CsvToJson,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
