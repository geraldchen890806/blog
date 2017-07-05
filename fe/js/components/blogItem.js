import React, { PropTypes, Component } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router';
import 'github-markdown-css/github-markdown.css';

export default class BlogItem extends Component {
  render() {
    const { blog } = this.props;
    return (
      <div className="article blog">
        <header className="blogItem">
          <h1>
            <Link className="article-title" to={`/blog/${blog.url}`}>{blog.title}</Link>
          </h1>
        </header>
        <div className="content article-entry">
          <ReactMarkdown source={blog.content} htmlMode={'raw'} />
        </div>
        <footer className="article-footer" />
      </div>
    );
  }
}
