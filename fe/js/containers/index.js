import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { BrowserRouter, Route, Redirect, withRouter } from 'react-router-dom';
import { bindActionCreators } from 'redux';
import * as actions from './actions';
import createHistory from 'history/createBrowserHistory';
const history = createHistory();

import Header from './header';
import Side from './side';

import Home from 'js/apps/home';
import Recommend from 'js/apps/recommend';
import Blog from 'js/apps/blog/view';
import BlogNew from 'js/apps/blog/new';
import Tag from 'js/apps/tag';
import About from 'js/apps/about';

@connect(
  state => ({
    ...state.common
  }),
  dispatch => ({
    actions: bindActionCreators(actions, dispatch)
  })
)
export default class App extends Component {
  componentDidMount() {
    let { actions } = this.props;
    actions.fetchBlogs();
  }

  render() {
    return (
      <BrowserRouter history={history}>
        <div>
          <Header />
          <div className="main">
            <div className="mainContent">
              <Route exact path="/" render={() => <Redirect to="/home" />} />
              <Route path="/home" component={Home} />
              <Route path="/recommend" component={Recommend} />
              <Route path="/about" component={About} />
              <Route path="/blog/new" component={BlogNew} />
              <Route path="/blog/:id" component={Blog} />
              <Route path="/blog/:id/edit" component={BlogNew} />
              <Route path="/tag/:tag" component={Tag} />
            </div>
            <Side {...this.props} />
          </div>
        </div>
      </BrowserRouter>
    );
  }
}
