import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Route } from 'react-router-dom';
import queryString from 'query-string';
import { ConnectedRouter } from 'react-router-redux';

import history from 'js/redux/middleware/history';
import Home from 'js/apps/home';
import Recommend from 'js/apps/recommend';
import Blog from 'js/apps/blog/view';
import BlogNew from 'js/apps/blog/new';
import Tag from 'js/apps/tag';
import About from 'js/apps/about';

import Header from './header';
import Side from './side';

import RJM from './rjm';

@connect(
  (state) => ({
    ...state.common,
  })
)
export default class App extends Component {
  checkAndrender = (Comp, props) => {
    const { history: { location = {} }, match = {} } = props;
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
  }

  render() {
    if (['xn--boqs2g85v.xn--6qq986b3xl','任加敏.我爱你', 'jiamin.ren'].includes(location.host)) { // 任加敏.我爱你
      return <RJM />
    }
    return (
      <ConnectedRouter history={history}>
        <div>
          <Header />
          <div className="main">
            <div className="mainContent">
              <Route exact path="/" render={(props) => this.checkAndrender(Home, props)} />
              <Route path="/home" render={(props) => this.checkAndrender(Home, props)} />
              <Route path="/recommend" render={(props) => this.checkAndrender(Recommend, props)} />
              <Route path="/about" render={(props) => this.checkAndrender(About, props)} />
              <Route path="/blog/new" render={(props) => this.checkAndrender(BlogNew, props)} />
              <Route path="/blog/:id" render={(props) => this.checkAndrender(Blog, props)} />
              <Route path="/blog/:id/edit" render={(props) => this.checkAndrender(BlogNew, props)} />
              <Route path="/tag/:tag" render={(props) => this.checkAndrender(Tag, props)} />
            </div>
            <Side {...this.props} />
          </div>
        </div>
      </ConnectedRouter>
    );
  }
}
