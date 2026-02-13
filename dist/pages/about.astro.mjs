import { b as createAstro, c as createComponent, r as renderComponent, a as renderTemplate, m as maybeRenderHead, d as renderSlot, u as unescapeHTML } from '../chunks/astro/server_x2VUGck0.mjs';
import 'piccolore';
import { $ as $$Layout, a as $$Header, c as $$Footer } from '../chunks/Footer_BNLkkPdT.mjs';
import { $ as $$Breadcrumb } from '../chunks/Breadcrumb_CwM99IDE.mjs';
import { S as SITE } from '../chunks/config_BTWUie35.mjs';
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro("https://chenguangliang.com/");
const $$AboutLayout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$AboutLayout;
  const { frontmatter } = Astro2.props;
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": `${frontmatter.title} | ${SITE.title}` }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "Header", $$Header, {})} ${renderComponent($$result2, "Breadcrumb", $$Breadcrumb, {})} ${maybeRenderHead()}<main id="main-content" class="app-layout"> <section id="about" class="app-prose mb-28 max-w-app prose-img:border-0"> <h1 class="text-2xl tracking-wider sm:text-3xl">${frontmatter.title}</h1> ${renderSlot($$result2, $$slots["default"])} </section> </main> ${renderComponent($$result2, "Footer", $$Footer, {})} ` })}`;
}, "/Users/geraldchen/workspace/blog/src/layouts/AboutLayout.astro", void 0);

const html = () => "<h2 id=\"陈广亮\">陈广亮</h2>\n<p>前端工程师，热爱技术，持续学习。</p>\n<h3 id=\"技术栈\">技术栈</h3>\n<ul>\n<li><strong>前端</strong>：JavaScript / TypeScript、React、Vue、Astro</li>\n<li><strong>工程化</strong>：Webpack、Vite、CI/CD</li>\n<li><strong>后端</strong>：Node.js、Go</li>\n<li><strong>其他</strong>：性能优化、PWA、Web 安全</li>\n</ul>\n<h3 id=\"关于这个博客\">关于这个博客</h3>\n<p>这个博客最初于 2015 年用 React + Redux + Webpack 搭建，2026 年迁移至 <a href=\"https://astro.build/\">Astro</a>，使用 <a href=\"https://github.com/satnaing/astro-paper\">AstroPaper</a> 主题。</p>\n<p>记录技术学习、工作思考和偶尔的生活感悟。</p>\n<h3 id=\"联系方式\">联系方式</h3>\n<ul>\n<li>GitHub: <a href=\"https://github.com/geraldchen890806\">geraldchen890806</a></li>\n</ul>";

				const frontmatter = {"layout":"../layouts/AboutLayout.astro","title":"关于我"};
				const file = "/Users/geraldchen/workspace/blog/src/pages/about.md";
				const url = "/about";
				function rawContent() {
					return "   \n                                    \n            \n   \n\n## 陈广亮\n\n前端工程师，热爱技术，持续学习。\n\n### 技术栈\n\n- **前端**：JavaScript / TypeScript、React、Vue、Astro\n- **工程化**：Webpack、Vite、CI/CD\n- **后端**：Node.js、Go\n- **其他**：性能优化、PWA、Web 安全\n\n### 关于这个博客\n\n这个博客最初于 2015 年用 React + Redux + Webpack 搭建，2026 年迁移至 [Astro](https://astro.build/)，使用 [AstroPaper](https://github.com/satnaing/astro-paper) 主题。\n\n记录技术学习、工作思考和偶尔的生活感悟。\n\n### 联系方式\n\n- GitHub: [geraldchen890806](https://github.com/geraldchen890806)\n";
				}
				async function compiledContent() {
					return await html();
				}
				function getHeadings() {
					return [{"depth":2,"slug":"陈广亮","text":"陈广亮"},{"depth":3,"slug":"技术栈","text":"技术栈"},{"depth":3,"slug":"关于这个博客","text":"关于这个博客"},{"depth":3,"slug":"联系方式","text":"联系方式"}];
				}

				const Content = createComponent((result, _props, slots) => {
					const { layout, ...content } = frontmatter;
					content.file = file;
					content.url = url;

					return renderTemplate`${renderComponent(result, 'Layout', $$AboutLayout, {
								file,
								url,
								content,
								frontmatter: content,
								headings: getHeadings(),
								rawContent,
								compiledContent,
								'server:root': true,
							}, {
								'default': () => renderTemplate`${unescapeHTML(html())}`
							})}`;
				});

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  Content,
  compiledContent,
  default: Content,
  file,
  frontmatter,
  getHeadings,
  rawContent,
  url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
