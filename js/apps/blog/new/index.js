import React, { Component } from 'react';
import { connect } from 'react-redux';
import BlogItem from 'js/components/blogItem';
import _ from 'lodash';

@connect((state) => ({
  ...state.blog,
  _common: state.common,
}))
export default class BlogNew extends Component {
  constructor(props) {
    super(props);
    const { match = {}, _common = {} } = props;
    const { blogs = [] } = _common;
    let cur = {};
    if (match.params.id) {
      cur = _.find(blogs, { url: match.params.id }) || {};
    }
    this.state = {
      cur,
    };
  }

  render() {
    const { _common, actions } = this.props;
    const { cur = {} } = this.state;
    const blogTpl = <BlogItem key={cur.title} blog={cur} {...actions} />;
    return (
      <div className="blogPage">
        {blogTpl}
      </div>
    );
  }
}
