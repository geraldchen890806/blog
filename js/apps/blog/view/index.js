import React, { Component } from 'react';
import propTypes from 'prop-types';
import _ from 'lodash';

import { connect } from 'react-redux';
import BlogItem from 'js/components/blogItem';
// import wxShare from 'js/utils/wxShare';

@connect((state) => ({
  blogs: state.common.blogs,
}))
export default class Blog extends Component {
  render() {
    const { blogs, match = {} } = this.props;

    const cur = _.find(blogs, { url: _.get(match, 'params.id') });
    let blogTpl;
    if (cur) {
      blogTpl = <BlogItem key={cur.title} blog={cur} isDetail />;
    } else {
      blogTpl = <div className="noneBlog">并没有这篇文章</div>;
    }
    // wxShare({
    //   title: "GeraldChen's blog",
    //   desc: (cur && cur.title) || '',
    //   imgUrl: 'http://www.chenguangliang.com/static/img/icon.png'
    // });
    return <div className="blogPage">{blogTpl}</div>;
  }
}

Blog.propTypes = {
  blogs: propTypes.array,
  match: propTypes.object,
};
