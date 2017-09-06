import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import * as allActions from './actions';
import BlogItem from 'js/components/blogItem';
import wxShare from 'js/utils/wxShare';

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
  componentDidMount() {
    wxShare({
      title: '看懂了这个私募排行榜,你才更懂”FOF”',
      desc: '通联魔方，倾力打造17年私募排行榜暨黑马榜，综合考虑收益、风险、最大回撤、VAR、峰度等指标，给广大投资者展示一个更“FOF”视角的私募榜单',
      link: 'http://chenguangliang.com/home',
      imgUrl: 'http://chenguangliang.com/static/img/icon.png'
    });
  }
  render() {
    let { actions, _common } = this.props;
    let { blogs } = _common;
    return <div className="homePage">{blogs.map(blog => <BlogItem key={blog.title} blog={blog} {...actions} />)}</div>;
  }
}
