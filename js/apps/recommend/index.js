import React, { Component } from 'react';
import { connect } from 'react-redux';
import BlogItem from 'js/components/blogItem';
import _ from 'lodash';

@connect(state => ({
  ...state.home,
  _common: state.common
}))
export default class Recommend extends Component {
  render() {
    let { actions, _common } = this.props;
    let { blogs } = _common;
    blogs = _.filter(blogs, 'isRecommend');
    return (
      <div className="homePage">
        {blogs.map(blog => <BlogItem key={blog.title} blog={blog} {...actions} />)}
      </div>
    );
  }
}
