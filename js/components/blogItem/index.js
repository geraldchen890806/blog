import React, { Component } from 'react';
import propTypes from 'prop-types';
import styled from 'styled-components';
import moment from 'moment';
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
      <BlogDiv className="article" innerRef={(c) => (this.blog = c)}>
        <header>
          <h1>
            <Link className="article-title" to={`/blog/${blog.url}`}>{blog.title}</Link>
          </h1>
        </header>
        <div className="content markdown-body">
          {Content && <Content {...this.props} />}
        </div>
        <footer>
        <ul>
          {blog.tags.map((tag, i) =>
              (<li key={i}>
                <Link className="article-title" to={`/tag/${tag}`}>#{tag}</Link>
               </li>))}
        </ul>
          {moment(blog.date).format('YYYY-MM-DD')}
        </footer>
      </BlogDiv>
    );
  }
}

BlogItem.propTypes = {
  blog: propTypes.object,
};

const BlogDiv = styled.div`
  margin: 0 0 30px;
  background: #fff;
  -webkit-box-shadow: 1px 2px 3px #ddd;
  box-shadow: 1px 2px 3px #ddd;
  border: 1px solid #ddd;
  -webkit-border-radius: 3px;
  border-radius: 3px;
  header {
    padding: 20px 20px 0;
    position: relative;
    a.article-title {
      font-size: 2em;
      font-weight: bold;
      line-height: 1.1em;
    }
    .article-times {
      color: #999;
      vertical-align: bottom;
      font-size: 12px;
      position: absolute;
      top: 40px;
      right: 10px;
    }
    a.article-delete, a.article-edit {
      padding-left: 10px;
      color: #777;
      display: inline-block;
    }
  }
  .content {
    color: #555;
    font-size: 14px;
    overflow: hidden;
    padding: 10px 20px;
    height: 300px;
    pre {
      // margin: 0 -20px;
    }
  }
  footer {
    font-size: 0.85em;
    line-height: 1.6em;
    border-top: 1px solid #ddd;
    padding: 0.6em 0.2em 0;
    margin: 10px 20px;
    text-align: right;
    ul {
      float: left;
      li {
        display: inline-block;
        margin: 0 10px 0 0;
      }
    }
    .article-next-link {
      margin: 0 0 10px;
      a {
        padding: 0 10px;
      }
    }
  }
  .comments {
    border-top: 1px solid #CCC;
    padding: 5px;
    .comment {
      padding: 10px 30px;
      .name {
        display: inline-block;
        text-align: left;
        vertical-align: top;
        width: 80px;
        overflow: hidden;
      }
      .content {
        width: 630px;
        background: #eee;
        border-radius: 5px;
        padding: 8px 12px;
        word-break: break-word;
        .time {
          color: gray;
          font-size: 12px;
          padding: 0 0 6px;
        }
        display: inline-block;
      }
      .del_icon {
        vertical-align: top;
        display: inline-block;
        position: relative;
        right: 16px;
        top: 5px;
      }
    }
    .in-comment {
      padding: 25px;
      label {
        padding: 0 15px 0 0;
        vertical-align: top;
      }
      .in-email, .in-name {
        padding: 0 0 20px;
        input {
          padding: 5px;
          width: 200px;
          height: auto;
          font-size: 12px;
        }
      }
      .in-content {
        .editor {
          width: 668px;
          display: inline-block;
          .preview, textarea {
            height: 200px;
          }
        }
      }
      .in-btn {
        text-align: right;
        padding: 10px 20px 0 0;
      }
    }
  }
`
