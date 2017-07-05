import React, { Component } from 'react';
import { connect } from 'react-redux';
import BlogItem from 'js/components/blogItem';
import _ from 'lodash';

@connect(state => ({
  ...state.blog,
  _common: state.common
}))
export default class BlogNew extends Component {
  constructor(props) {
    super(props);
    let { routeParams = {}, _common = {} } = props;
    let { blogs = [] } = _common;
    let cur = {};
    if (routeParams.id) {
      cur = _.find(blogs, { url: routeParams.id }) || {};
    }
    this.state = {
      cur
    };
  }

  render() {
    let { _common, actions, routeParams } = this.props;
    let { cur = {} } = this.state;
    let blogTpl = <BlogItem key={cur.title} blog={cur} {...actions} />;
    return (
      <div className="blogPage">
        {blogTpl}
      </div>
    );
  }
}
