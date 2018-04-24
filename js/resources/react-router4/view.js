import React, { Component } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import text from './content.md';

export default class View extends Component {
  render() {
    return <ReactMarkdown source={text} htmlMode={'raw'} />;
  }
}
