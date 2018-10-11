import React, { Component } from 'react';
import Loadable from 'react-loadable';
import _ from 'lodash';
import { connect } from 'react-redux';
import { Route } from 'react-router-dom';
import queryString from 'query-string';
import { ConnectedRouter } from 'react-router-redux';

import history from 'js/redux/middleware/history';
import notification from 'js/utils/notification';
import icon from 'img/icon.png';

import Header from './header';
import Side from './side';

const navs = [
  {
    url: '/',
    component: Loadable({
      loader: () => import(/* webpackChunkName: "home" */ 'js/apps/home'),
      loading: () => null,
    }),
  },
  {
    url: '/home',
    component: Loadable({
      loader: () => import(/* webpackChunkName: "home" */ 'js/apps/home'),
      loading: () => null,
    }),
  },
  {
    url: '/recommend',
    component: Loadable({
      loader: () => import(/* webpackChunkName: "Recommend" */ 'js/apps/recommend'),
      loading: () => null,
    }),
  },
  {
    url: '/blog/:id',
    component: Loadable({
      loader: () => import(/* webpackChunkName: "Blog" */ 'js/apps/blog/view'),
      loading: () => null,
    }),
  },
  {
    url: '/tag/:tag',
    component: Loadable({
      loader: () => import(/* webpackChunkName: "Tag" */ 'js/apps/tag'),
      loading: () => null,
    }),
  },
];

@connect((state) => ({
  ...state.common,
}))
export default class App extends Component {
  checkAndRender = (Comp, props) => {
    const {
      history: { location = {} },
      match = {},
    } = props;
    const nProps = {
      ...props,
      history: {
        ...location,
        query: queryString.parse(location.search),
      },
      params: {
        ...match.params,
      },
      routeParams: {
        ...match.params,
      },
      location: {
        ...props.location,
        query: queryString.parse(location.search),
      },
    };
    return <Comp {...nProps} />;
  };

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
    notification({
      title: '点击查看最新文章',
      body: blog.title,
      icon,
      callback: () => {
        history.push(`/blog/${blog.url}`);
      },
    });
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
    return (
      <ConnectedRouter history={history}>
        <div>
          <Header />
          <div className="main">
            <div className="mainContent">
              {navs.map((nav) => (
                <Route
                  exact
                  key={nav.url}
                  path={nav.url}
                  render={(props) => this.checkAndRender(nav.component, props)}
                />
              ))}
              {/* <Route exact path="/" render={(props) => this.checkAndrender(Home, props)} />
              <Route path="/home" render={(props) => this.checkAndrender(Home, props)} />
              <Route path="/recommend" render={(props) => this.checkAndrender(Recommend, props)} />
              <Route path="/about" render={(props) => this.checkAndrender(About, props)} />
              <Route path="/blog/new" render={(props) => this.checkAndrender(BlogNew, props)} />
              <Route path="/blog/:id" render={(props) => this.checkAndrender(Blog, props)} />
              <Route path="/blog/:id/edit" render={(props) => this.checkAndrender(BlogNew, props)} />
              <Route path="/tag/:tag" render={(props) => this.checkAndrender(Tag, props)} /> */}
            </div>
            <Side {...this.props} />
          </div>
        </div>
      </ConnectedRouter>
    );
  }
}
