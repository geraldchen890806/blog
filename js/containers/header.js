import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Link } from 'react-router-dom';

export default class Header extends Component {
  render() {
    return (
      <div className="layout-header">
        <div className="container">
          <h3>
            <a href="/">
              {"GeraldChen's Blog"}
            </a>
          </h3>
          <ul>
            <li>
              <Link to="/home">
                首页
              </Link>
            </li>
            <li>
              <Link to="/recommend">
                推荐
              </Link>
            </li>
            <li>
              <Link to="/about">
                关于
              </Link>
            </li>
          </ul>
        </div>
      </div>
    );
  }
}
