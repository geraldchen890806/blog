

import {
    combineReducers
} from "redux";
import {
    routerReducer
} from "react-router-redux";

import home from "./home";
import common from "./common";

export default combineReducers({
    common,
    home,
    routing: routerReducer
});
