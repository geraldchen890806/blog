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
        let cur = _.find(blogs, {title: routeParams.id});
        var blogTpl;
        if (cur) {
            blogTpl = <BlogItem key={cur.title} blog={cur} {...actions}/>;
        } else {
            blogTpl= <div className='noneBlog'>并没有这篇文章</div>;
        }
        return (
            <div className='blogPage'>
                {blogTpl}
            </div>
        );

    }
}
