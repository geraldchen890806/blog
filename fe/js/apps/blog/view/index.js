import React, { Component } from 'react';
import { connect } from 'react-redux';
import BlogItem from 'js/components/blogItem';
import _ from 'lodash';
import wxShare from 'js/utils/wxShare';

@connect(state => ({
  ...state.blog,
  _common: state.common
}))
export default class BlogView extends Component {
  render() {
    let { _common, routeParams = {}, location } = this.props;
    let { blogs } = _common;
    let cur = _.find(blogs, { url: routeParams.id });
    let blogTpl;
    if (cur) {
      blogTpl = <BlogItem key={cur.title} blog={cur} />;
    } else {
      blogTpl = <div className="noneBlog">并没有这篇文章</div>;
    }
    wxShare({
      title: "GeraldChen's blog",
      desc: (cur && cur.title) || '',
      imgUrl: 'http://www.chenguangliang.com/static/img/icon.png'
    });
    return <div className="blogPage">{blogTpl}</div>;
  }
}
