import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import * as allActions from './actions';
import BlogItem from 'js/components/blogItem';
import { browserHistory } from 'react-router-dom';
import _ from 'lodash';

@connect(
  state => ({
    ...state.blog,
    _common: state.common
  }),
  dispatch => ({
    actions: bindActionCreators(allActions, dispatch)
  })
)
export default class Home extends Component {
  render() {
    let { _common, actions, match } = this.props;
    let tag = match.params.tag;
    let { blogs } = _common;
    let curBlogs = _.filter(blogs, b => _.some(b.tags, t => t.name == tag));
    return (
      <div className="homePage">
        {curBlogs.map(blog => <BlogItem key={blog.title} blog={blog} {...actions} />)}
      </div>
    );
  }
}
