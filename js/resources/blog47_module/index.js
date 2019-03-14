export default {
  title: 'module',
  url: 'module',
  tags: ['js', 'es6'],
  hide: true,
  date: '2019-02-16',
  load: () => import(/* webpackChunkName: "blog47_module" */ './view'),
};
