import React, { PropTypes, Component } from 'react';
import { Link } from 'react-router-dom';

export default class BlogItemS extends Component {
  render() {
    const { blog } = this.props;
    let Content = blog.view;
    return (
      <div className="article blog">
        <header className="blogItem">
          <h1>
            <Link className="article-title" to={`/blog/${blog.url}`}>{blog.title}</Link>
          </h1>
        </header>
        <div className="content markdown-body">
          <Content />
        </div>
        <footer className="article-footer" />
      </div>
    );
  }
}
