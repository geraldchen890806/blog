import { b as createAstro, c as createComponent, m as maybeRenderHead, f as addAttribute, r as renderComponent, a as renderTemplate } from './astro/server_x2VUGck0.mjs';
import 'piccolore';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { d as createSvgComponent } from './Footer_BNLkkPdT.mjs';
import { S as SITE } from './config_BTWUie35.mjs';

const IconCalendar = createSvgComponent({"meta":{"src":"/_astro/IconCalendar.C0xY3fv4.svg","width":24,"height":24,"format":"svg"},"attributes":{"width":"24","height":"24","viewBox":"0 0 24 24","fill":"none","stroke":"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round","class":"icon icon-tabler icons-tabler-outline icon-tabler-calendar-week"},"children":"<path stroke=\"none\" d=\"M0 0h24v24H0z\" fill=\"none\" /><path d=\"M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12z\" /><path d=\"M16 3v4\" /><path d=\"M8 3v4\" /><path d=\"M4 11h16\" /><path d=\"M7 14h.013\" /><path d=\"M10.01 14h.005\" /><path d=\"M13.01 14h.005\" /><path d=\"M16.015 14h.005\" /><path d=\"M13.015 17h.005\" /><path d=\"M7.01 17h.005\" /><path d=\"M10.01 17h.005\" />"});

const $$Astro = createAstro("https://chenguangliang.com/");
const $$Datetime = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Datetime;
  dayjs.extend(utc);
  dayjs.extend(timezone);
  const {
    pubDatetime,
    modDatetime,
    size = "sm",
    class: className = "",
    timezone: postTimezone
  } = Astro2.props;
  const isModified = modDatetime && modDatetime > pubDatetime;
  const datetime = dayjs(isModified ? modDatetime : pubDatetime).tz(
    postTimezone || SITE.timezone
  );
  const date = datetime.format("D MMM, YYYY");
  return renderTemplate`${maybeRenderHead()}<div${addAttribute(["flex items-center gap-x-2 opacity-80", className], "class:list")}> ${renderComponent($$result, "IconCalendar", IconCalendar, { "class:list": [
    "inline-block size-6 min-w-5.5",
    { "scale-90": size === "sm" }
  ] })} ${isModified && renderTemplate`<span${addAttribute(["text-sm", { "sm:text-base": size === "lg" }], "class:list")}>
Updated:
</span>`} <time${addAttribute(["text-sm", { "sm:text-base": size === "lg" }], "class:list")}${addAttribute(datetime.toISOString(), "datetime")}>${date}</time> </div>`;
}, "/Users/geraldchen/workspace/blog/src/components/Datetime.astro", void 0);

export { $$Datetime as $ };
