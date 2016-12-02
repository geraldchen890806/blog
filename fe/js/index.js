

import "babel-polyfill";
import React from "react";
import { render } from "react-dom";
import _ from "lodash";
import $ from "jquery";
window.$ = window.jQuery = $;

import "./configs/index";

import Root from "./root";
import "../style/main.less";


if(module.hot) {
    module.hot.accept();
}

render(<Root />, document.getElementById("root"));
