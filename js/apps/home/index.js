import React, { Component } from 'react';
import propTypes from 'prop-types';
import { connect } from 'react-redux';
import BlogItem from 'js/components/blogItem';
import queryString from 'query-string';
// import wxShare from 'js/utils/wxShare';
@connect((state) => ({
  blogs: state.common.blogs,
}))
export default class Home extends Component {
  // componentDidMount() {
  //   wxShare({
  //     title: "GeraldChen's blog",
  //     desc: '本网站为学习nodejs+react创建，正在不停完善中',
  //     imgUrl: 'http://www.chenguangliang.com/static/img/icon.png'
  //   });
  // }
  render() {
    const { blogs } = this.props;
    return (
      <div className="homePage">
        {blogs
          .filter((b) => !b.hide)
          .map((blog, i) => (
            <BlogItem key={blog.title} blog={blog} />
          ))}
      </div>
    );
  }
}

Home.propTypes = {
  blogs: propTypes.array,
};
