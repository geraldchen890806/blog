import React, { PropTypes, Component } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import ReactBlog from './reactBlog';

export default class BlogItem extends Component {
  render() {
    const { blog } = this.props;
    if (blog.view) return <ReactBlog {...this.props} />;
    return (
      <div className="article blog">
        <header className="blogItem">
          <h1>
            <Link className="article-title" to={`/blog/${blog.url}`}>{blog.title}</Link>
          </h1>
        </header>
        <div className="content markdown-body">
          <ReactMarkdown source={blog.content || ''} htmlMode={'raw'} />
        </div>
        <footer className="article-footer" />
      </div>
    );
  }
}
