

import React, {Component, PropTypes} from "react";
import {connect} from "react-redux";
import {bindActionCreators} from "redux";
import * as actions from "./actions";

import Header from "./header";
import Side from "./side";


@connect(state => ({
    ...state.common
}), dispatch => ({
    actions: bindActionCreators(actions, dispatch)
}))
export default class App extends Component {

    static contextTypes = {
        router: React.PropTypes.object.isRequired
    }

    componentDidMount() {
        var {actions} = this.props;
        actions.fetchBlogs();
    }

    render() {
        return (
            <div>
                <Header/>
                <div className='main'>
                    <div className='mainContent'>
                        {this.props.children}
                    </div>
                    <Side {...this.props}/>
                </div>
            </div>
        );
    }
}
