import React, { Component } from 'react';

export default class Alinkview extends Component {
  render() {
    const { target, className } = this.props;
    return (<a
      className={className}
      onClick={() => {
        document.getElementById(target).scrollIntoView();
        document.body.scrollTop = document.body.scrollTop - 146;
      }}
    >
      {this.props.children}
    </a>);
  }
}
