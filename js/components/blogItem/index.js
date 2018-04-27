import React, { Component } from 'react';
import propTypes from 'prop-types';
import { Link } from 'react-router-dom';
import 'intersection-observer';

export default class BlogItem extends Component {
  state = {
    Content: null,
  }

  componentDidMount() {
    if (this.observer) {
      this.observer.observe(this.blog);
    }
  }

  observer = (() =>
    new IntersectionObserver(
      (entries) => {
        if (entries[0] && entries[0].intersectionRatio > 0) {
          this.forceImport();
        }
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: [0],
      }
    ))();

  forceImport = () => {
    if (this.importDone) return;
    if (this.observer) {
      this.observer.unobserve(this.blog);
    }
    this.importDone = true;
    this.load();
  };

  load() {
    const { blog } = this.props;
    if (blog.load) {
      blog.load().then((mod) => {
        this.setState({
          Content: mod.default ? mod.default : mod,
        });
      });
    }
  }

  render() {
    const { Content } = this.state;
    const { blog } = this.props;
    return (
      <div className="article blog" ref={(c) => (this.blog = c)}>
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

BlogItem.propTypes = {
  blog: propTypes.object,
};
