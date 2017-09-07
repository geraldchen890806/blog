import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import * as allActions from './actions';
import BlogItem from 'js/components/blogItem';
// import wxShare from 'js/utils/wxShare';

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
  // componentDidMount() {
  //   wxShare({
  //     title: "GeraldChen's blog",
  //     desc: '本网站为学习nodejs+react创建，正在不停完善中',
  //     imgUrl: 'http://www.chenguangliang.com/static/img/icon.png'
  //   });
  // }
  render() {
    let { actions, _common } = this.props;
    let { blogs } = _common;
    return <div className="homePage">{blogs.map(blog => <BlogItem key={blog.title} blog={blog} {...actions} />)}</div>;
  }
}
