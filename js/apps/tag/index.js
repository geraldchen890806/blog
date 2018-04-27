import React, { Component } from 'react';
import propTypes from 'prop-types';
import { connect } from 'react-redux';
import BlogItem from 'js/components/blogItem';
import _ from 'lodash';

@connect(
  (state) => ({
    blogs: state.common.blogs,
  })
)
export default class Tag extends Component {
  render() {
    const { blogs, match } = this.props;
    const tag = match.params.tag;
    const curBlogs = _.filter(blogs, (blog) => blog.tags.includes(tag));
    return (
      <div className="homePage">
        {curBlogs.map((blog) => <BlogItem key={blog.title} blog={blog} />)}
      </div>
    );
  }
}

Tag.propTypes = {
  blogs: propTypes.array,
  match: propTypes.object,
};
