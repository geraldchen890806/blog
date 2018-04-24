import React, { Component } from 'react';
import { Link } from 'react-router-dom';

export default class BlogItemS extends Component {
  state = {
    Content: null,
  }

  componentWillMount() {
    this.load();
  }

  load() {
    // import
    const { blog } = this.props;
    if (blog.load) {
      blog.load().then((mod) => {
        this.setState({
          Content: mod.default ? mod.default : mod,
        });
      });
      return;
    }

    // bundle loader
    blog.load()((mod) => {
      this.setState({
        // handle both es imports and cjs
        Content: mod.default ? mod.default : mod,
      });
    });
  }

  render() {
    const { Content } = this.state;
    const { blog } = this.props;
    return (
      <div className="article blog">
        <header className="blogItem">
          <h1>
            <Link className="article-title" to={`/blog/${blog.url}`}>{blog.title}</Link>
          </h1>
        </header>
        <div className="content markdown-body">
          {Content && <Content {...this.props} />}
        </div>
        <footer className="article-footer" />
      </div>
    );
  }
}
