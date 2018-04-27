import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Route } from 'react-router-dom';
import { bindActionCreators } from 'redux';
import queryString from 'query-string';
import { ConnectedRouter } from 'react-router-redux';

import { store } from 'js/redux/store';
import { commonType } from 'js/redux/constants';
import history from 'js/redux/middleware/history';

import Home from 'js/apps/home';
import Recommend from 'js/apps/recommend';
import Blog from 'js/apps/blog/view';
import BlogNew from 'js/apps/blog/new';
import Tag from 'js/apps/tag';
import About from 'js/apps/about';

import Header from './header';
import Side from './side';

import * as allActions from './actions';

history.listen((location, action) => {
  store.dispatch({ type: commonType.CLEAR });
});

@connect(
  (state) => ({
    ...state.common,
  }),
  (dispatch) => ({
    actions: bindActionCreators(allActions, dispatch),
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
