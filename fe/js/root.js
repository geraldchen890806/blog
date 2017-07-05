import React, { Component, PropTypes } from 'react';
import { Router, Route, IndexRedirect, IndexRoute, browserHistory, Redirect } from 'react-router';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import { syncHistoryWithStore } from 'react-router-redux';

const history = syncHistoryWithStore(browserHistory, store);

import { commonType } from 'js/redux/constants';

import App from 'js/containers';
import Home from 'js/apps/home';
import Blog from 'js/apps/blog/view';
import BlogNew from 'js/apps/blog/new';
import Tag from 'js/apps/tag';
import About from 'js/apps/about';

browserHistory.listen(() => {
  store.dispatch({ type: commonType.CLEAR });
});

export default class Root extends Component {
  render() {
    return (
      <div>
        <Provider store={store}>
          <Router history={history}>
            <Route path="/" component={App}>
              <IndexRedirect to="home" />
              <Route path="home" component={Home} />
              <Route path="recommend" component={Home} />
              <Route path="about" component={About} />
              <Route path="blog/new" component={BlogNew} />
              <Route path="blog/:id" component={Blog} />
              <Route path="blog/:id/edit" component={BlogNew} />
              <Route path="tag/:tag" component={Tag} />
            </Route>
          </Router>
        </Provider>
      </div>
    );
  }
}
