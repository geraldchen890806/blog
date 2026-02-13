import { c as createComponent, r as renderComponent, e as renderScript, a as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_x2VUGck0.mjs';
import 'piccolore';
import { $ as $$Layout, a as $$Header, c as $$Footer } from '../../chunks/Footer_BNLkkPdT.mjs';
export { renderers } from '../../renderers.mjs';

const $$Qrcode = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "\u4E8C\u7EF4\u7801\u751F\u6210/\u89E3\u6790 | \u5728\u7EBF\u5DE5\u5177" }, { "default": async ($$result2) => renderTemplate` ${renderComponent($$result2, "Header", $$Header, {})} ${maybeRenderHead()}<main id="main-content" class="app-layout pb-12"> <nav class="breadcrumb my-4 text-sm opacity-70"> <a href="/" class="hover:text-accent">首页</a> <span class="mx-1">&gt;</span> <a href="/tools" class="hover:text-accent">工具</a> <span class="mx-1">&gt;</span> <span>二维码</span> </nav> <h1 class="mb-2 text-2xl font-semibold sm:text-3xl">🔲 二维码生成 / 解析</h1> <p class="mb-8 italic opacity-80">生成或识别二维码，纯前端实现。</p> <!-- Tabs --> <div class="mb-6 flex gap-4 border-b border-border"> <button id="tab-gen" class="tab-btn border-b-2 border-accent px-4 py-2 font-medium text-accent">生成</button> <button id="tab-scan" class="tab-btn px-4 py-2 font-medium opacity-60 hover:opacity-100">解析</button> </div> <!-- Generate Panel --> <div id="panel-gen"> <div class="flex flex-col gap-4"> <textarea id="qr-input" rows="3" placeholder="输入文本或 URL..." class="w-full rounded-lg border border-border bg-transparent p-3 focus:border-accent focus:outline-none"></textarea> <button id="btn-generate" class="w-fit rounded-lg bg-accent px-6 py-2 font-medium text-white hover:opacity-90">生成二维码</button> <div id="qr-output" class="flex flex-col items-center gap-4"> <canvas id="qr-canvas" class="hidden rounded-lg border border-border"></canvas> <button id="btn-download" class="hidden rounded-lg border border-border px-4 py-2 hover:border-accent">
下载图片
</button> </div> </div> </div> <!-- Scan Panel --> <div id="panel-scan" class="hidden"> <div class="flex flex-col gap-4"> <label class="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-accent"> <span class="mb-2 text-4xl">📷</span> <span class="opacity-70">点击上传二维码图片</span> <input id="qr-file" type="file" accept="image/*" class="hidden"> </label> <div id="scan-result" class="hidden rounded-lg border border-border p-4"> <p class="mb-1 text-sm font-medium opacity-60">识别结果：</p> <p id="scan-text" class="break-all font-mono"></p> <button id="btn-copy-scan" class="mt-2 rounded border border-border px-3 py-1 text-sm hover:border-accent">
复制
</button> </div> <p id="scan-error" class="hidden text-red-500"></p> </div> </div> </main> ${renderComponent($$result2, "Footer", $$Footer, {})} ` })} ${renderScript($$result, "/Users/geraldchen/workspace/blog/src/pages/tools/qrcode.astro?astro&type=script&index=0&lang.ts")}`;
}, "/Users/geraldchen/workspace/blog/src/pages/tools/qrcode.astro", void 0);

const $$file = "/Users/geraldchen/workspace/blog/src/pages/tools/qrcode.astro";
const $$url = "/tools/qrcode";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Qrcode,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
