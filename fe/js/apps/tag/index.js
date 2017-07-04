import React, {Component, PropTypes} from "react";
import {connect} from "react-redux";
import {bindActionCreators} from "redux";
import * as actions from "./actions";
import BlogItem from "js/components/blogItem";
import{ browserHistory } from "react-router";

@connect(state => ({
    ...state.blog,
    _common: state.common
}), dispatch => ({
    actions: bindActionCreators(actions, dispatch)
}))
export default class Home extends Component {

    render() {
        var {_common, actions, routeParams} = this.props;
        var {blogs} = _common;
        let curBlogs = _.filter(blogs, b => ~b.tag.indexOf(routeParams.tag));
        return (
          <div className='homePage'>
              {curBlogs.map(blog => <BlogItem key={blog.title} blog={blog} {...actions}/>)}
          </div>
        );

    }
}
