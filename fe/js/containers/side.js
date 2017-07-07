import React, { PropTypes, Component } from 'react';
import { Link } from 'react-router-dom';

export default class Side extends Component {
  render() {
    let { blogs } = this.props;
    let tags = _.reduce(
      blogs,
      (re, blog) => re.concat(blog.tags),
      []
    );
    tags = _.uniqBy(tags, 'id');
    return (
      <div className="mainSide">
        <div id="info">
          <img src="/static/img/icon.png" />
          <div>geraldchen890806@gmail.com</div>
        </div>
        <div id="recent">
          <h4 className="title">最新文章</h4>
          <ul>
            {blogs.slice(0, 5).map(blog => (
              <li key={blog.title}>
                <Link className="article-title" to={`/blog/${blog.url}`}>{blog.title}</Link>
              </li>
              ))}
          </ul>
        </div>
        <div id="tags" className="item">
          <h4 className="title">标签</h4>
          <ul>
            {tags.map(tag => (
              <li key={tag.name}>
                <Link className="article-title" to={`/tag/${tag.name}`}>{tag.name}</Link>
              </li>
              ))}
          </ul>
        </div>
        <div id="links" className="item">
          <h4 className="title">友情链接</h4>
          <ul>
            <li>
              <a href="http://www.jiweiwei.com/">众生相</a>
            </li>
            <li>
              <a href="http://blog.samsonis.me/">Samson's Weblog</a>
            </li>
            <li>
              <a href="http://www.adrian-run.com/">Adrian Hwang</a>
            </li>
          </ul>
        </div>
      </div>
    );
  }
}
