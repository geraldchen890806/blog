export default {
  title: "通过polyfill了解JS",
  url: "通过polyfill了解JS",
  tags: ["js"],
  date: "2018-08-04",
  load: () =>
    import(/* webpackChunkName: "blog42_通过polyfill了解JS" */ "./view")
};
