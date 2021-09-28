import React, { Component, lazy, Suspense } from 'react';
import _ from 'lodash';
import { Route } from 'react-router-dom';
import notification from 'js/utils/notification';

import Header from './header';
import Side from './side';

const navs = [
  {
    url: ['/', '/home', '/all'],
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
  {
    url: '/tag/:tag',
    component: lazy(() => import(/* webpackChunkName: "Tag" */ 'js/apps/tag')),
  },
  {
    url: '/qrcode',
    component: lazy(() => import(/* webpackChunkName: "qrcode" */ 'js/apps/qrcode')),
  },
  {
    url: '/1inch',
    component: lazy(() => import(/* webpackChunkName: "1inch" */ 'js/apps/inch')),
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

  loadBg() {
    import(/* webpackChunkName: "bgDice" */ 'js/apps/bgDice').then((mod) => {
      this.setState({
        BgDice: mod.default ? mod.default : mod,
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
    if (window.location.href.includes('bg')) {
      this.loadBg();
    }
    this.checkNotification();
  }

  render() {
    const { RjmComp, BgDice } = this.state;
    if (this.isRjm()) {
      // 任加敏.我爱你
      return RjmComp ? <RjmComp /> : null;
    }
    if (window.location.href.includes('bg')) {
      return BgDice ? <BgDice /> : null;
    }
    return (
      <div>
        <Header />
        <div className="main">
          <div className="mainContent">
            <Suspense fallback={<></>}>
              <>
                {navs.map(({ url, component }) => (
                  <Route exact key={url} path={url} component={component} />
                ))}
              </>
            </Suspense>
          </div>
          <Side {...this.props} />
        </div>
      </div>
    );
  }
}
