import React, { Component } from 'react';
import propTypes from 'prop-types';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import 'intersection-observer';

export default class BlogItem extends Component {
  blog = React.createRef();

  state = {
    Content: null,
  };

  componentDidMount() {
    if (this.observer) {
      this.observer.observe(this.blog.current);
    }
  }

  observer = (() => new IntersectionObserver(
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
      this.observer.unobserve(this.blog.current);
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
    const { blog, isDetail } = this.props;
    return (
      <BlogDiv
        className={`article ${isDetail ? 'isDetail' : ''}`}
        ref={this.blog}
      >
        <header>
          <h1>
            <Link className="article-title" to={`/blog/${blog.url}`}>
              {blog.title}
            </Link>
          </h1>
        </header>
        <div className="content markdown-body">
          {Content && <Content {...this.props} />}
        </div>
        <footer>
          <ul>
            {blog.tags.map((tag) => (
              <li key={tag}>
                <Link className="article-title" to={`/tag/${tag}`}>
                  #
                  {tag}
                </Link>
              </li>
            ))}
          </ul>
          {blog.date}
        </footer>
      </BlogDiv>
    );
  }
}

BlogItem.propTypes = {
  blog: propTypes.object,
  isDetail: propTypes.bool,
};

const BlogDiv = styled.div`
  margin: 2px 2px 20px;
  background: #fff;
  -webkit-box-shadow: 1px 2px 3px #ddd;
  box-shadow: 1px 2px 3px #ddd;
  border: 1px solid #ddd;
  -webkit-border-radius: 3px;
  border-radius: 3px;
  box-shadow: 0 2px 8px 0 rgba(182, 186, 189, 0.3);
  &:hover {
    box-shadow: 0 2px 10px 0 rgba(21, 114, 206, 0.36);
  }
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
    a.article-delete,
    a.article-edit {
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
  &.isDetail {
    .content {
      height: auto;
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
    border-top: 1px solid #ccc;
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
      .in-email,
      .in-name {
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
          .preview,
          textarea {
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
`;
