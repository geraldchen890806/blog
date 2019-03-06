import React, { Component, lazy, Suspense } from 'react';
import _ from 'lodash';
import { Route } from 'react-router-dom';
import notification from 'js/utils/notification';

import Header from './header';
import Side from './side';

const navs = [
  {
    url: '/',
    component: lazy(() => import('js/apps/home')),
  },
  {
    url: '/home',
    component: lazy(() => import('js/apps/home')),
  },
  {
    url: '/recommend',
    component: lazy(() => import(/* webpackChunkName: "Recommend" */ 'js/apps/recommend')),
  },
  {
    url: '/blog/:id',
    component: lazy(() => import('js/apps/blog/view')),
  },
  {
    url: '/tag/:tag',
    component: lazy(() => import(/* webpackChunkName: "Tag" */ 'js/apps/tag')),
  },
];

export default class App extends Component {
  state = {};

  loadRjm() {
    import(/* webpackChunkName: "Rjm" */ 'js/apps/rjm').then((mod) => {
      this.setState({
        RjmComp: mod.default ? mod.default : mod,
      });
    });
  }

  isRjm() {
    return (
      ['xn--boqs2g85v.xn--6qq986b3xl', '任加敏.我爱你', 'jiamin.ren'].includes(
        window.location.host
      ) || window.location.search.includes('rjm')
    );
  }

  checkNotification() {
    const { blogs } = this.props;
    const blog = _.first(blogs);
    // if (
    //   moment()
    //     .subtract(1, 'month')
    //     .format('YYYY-MM-DD') < blog.date
    // ) {
    //   notification({
    //     title: '点击查看最新文章',
    //     body: blog.title,
    //     icon,
    //     callback: () => {
    //       history.push(`/blog/${blog.url}`);
    //     },
    //   });
    // }
  }

  componentDidMount() {
    if (this.isRjm()) {
      // 任加敏.我爱你
      this.loadRjm();
      document.title = '任加敏.我爱你';
    }
    this.checkNotification();
  }

  render() {
    const { RjmComp } = this.state;
    if (this.isRjm()) {
      // 任加敏.我爱你
      return RjmComp ? <RjmComp /> : null;
    }
    console.log('sas');
    return (
      <div>
        <Header />
        <div className="main">
          <div className="mainContent">
            <Suspense fallback={<>1</>}>
              <>
                {navs.map(({ url, component }) => {
                  console.log(component);
                  return (
                    <Route exact key={url} path={url} component={component} />
                  );
                })}
              </>
            </Suspense>
          </div>
          <Side {...this.props} />
        </div>
      </div>
    );
  }
}
