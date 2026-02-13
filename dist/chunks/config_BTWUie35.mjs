const VALID_INPUT_FORMATS = [
  "jpeg",
  "jpg",
  "png",
  "tiff",
  "webp",
  "gif",
  "svg",
  "avif"
];
const VALID_SUPPORTED_FORMATS = [
  "jpeg",
  "jpg",
  "png",
  "tiff",
  "webp",
  "gif",
  "svg",
  "avif"
];
const DEFAULT_OUTPUT_FORMAT = "webp";
const DEFAULT_HASH_PROPS = [
  "src",
  "width",
  "height",
  "format",
  "quality",
  "fit",
  "position",
  "background"
];

const SITE = {
  website: "https://chenguangliang.com/",
  author: "陈广亮",
  profile: "https://chenguangliang.com/",
  desc: "陈广亮的技术博客 - 分享前端开发、JavaScript、TypeScript、React、Web3、AI 等技术实践与深度思考",
  title: "陈广亮的技术博客",
  ogImage: "astropaper-og.jpg",
  postPerIndex: 4,
  postPerPage: 8,
  scheduledPostMargin: 15 * 60 * 1e3,
  editPost: {
    enabled: false,
    url: ""
  },
  dynamicOgImage: true,
  dir: "ltr",
  lang: "zh-CN",
  timezone: "Asia/Shanghai"
};

export { DEFAULT_OUTPUT_FORMAT as D, SITE as S, VALID_INPUT_FORMATS as V, VALID_SUPPORTED_FORMATS as a, DEFAULT_HASH_PROPS as b };
