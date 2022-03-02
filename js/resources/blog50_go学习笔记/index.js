import { lazy } from 'react';
export default {
  title: 'go学习笔记',
  url: 'go学习笔记',
  tags: ['js', 'go'],
  date: '2019-03-20',
  hide: true,
  load: lazy(() => import('./view')),
};
