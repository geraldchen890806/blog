

import React, {Component, PropTypes} from "react";
import {
    Router,
    Route,
    IndexRedirect,
    IndexRoute,
    browserHistory,
    Redirect
} from "react-router";
import {Provider} from "react-redux";
import {store} from "./redux/store";
import {syncHistoryWithStore} from "react-router-redux";

const history = syncHistoryWithStore(browserHistory, store);

import {commonType} from "js/redux/constants/index";

import App from "js/containers";
import Home from "js/apps/home";
import Blog from "js/apps/blog";
import Recommend from "js/apps/home";
import About from "js/apps/about";

browserHistory.listen(function() {
    store.dispatch({type: commonType.CLEAR});
});

export default class Root extends Component {
    render() {
        return (
            <div>
                <Provider store={store}>
                    <Router history={history}>
                        <Route path='/' component={App}>
                            <IndexRedirect to="home"/>
                            <Route path='home' component={Home}/>
                            <Route path='recommend' component={Recommend}/>
                            <Route path='about' component={About}/>
                            <Route path='blog/:id' component={Blog}/>
                        </Route>
                    </Router>
                </Provider>
            </div>
        );
    }
}
