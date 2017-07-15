import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import * as allActions from './actions';
import BlogItem from 'js/components/blogItem';

@connect(
  state => ({
    ...state.home,
    _common: state.common
  }),
  dispatch => ({
    actions: bindActionCreators(allActions, dispatch)
  })
)
export default class Home extends Component {
  render() {
    let { actions, _common } = this.props;
    let { blogs } = _common;
    return (
      <div className="homePage">
        {blogs.map(blog => <BlogItem key={blog.title} blog={blog} {...actions} />)}
      </div>
    );
  }
}
