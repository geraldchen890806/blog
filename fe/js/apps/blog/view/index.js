import React, { Component } from 'react';
import { connect } from 'react-redux';
import BlogItem from 'js/components/blogItem';
import _ from 'lodash';

@connect(state => ({
  ...state.blog,
  _common: state.common
}))
export default class BlogView extends Component {
  render() {
    let { _common, match = {}, location } = this.props;
    let { blogs } = _common;
    let cur = _.find(blogs, { url: match.params.id });
    let blogTpl;
    if (cur) {
      blogTpl = <BlogItem key={cur.title} blog={cur} />;
    } else {
      blogTpl = <div className="noneBlog">并没有这篇文章</div>;
    }
    return (
      <div className="blogPage">
        {blogTpl}
      </div>
    );
  }
}
