import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import _ from 'lodash';

export default class Side extends Component {
  render() {
    const { blogs } = this.props;
    const tags = _.uniq(_.reduce(blogs, (re, b) => re.concat(b.tags), []));
    return (
      <div className="mainSide">
        <div id="info">
          <img alt="" src="/img/icon.png" />
          <div>geraldchen890806@gmail.com</div>
        </div>
        <div id="recent">
          <h4 className="title">最新文章</h4>
          <ul>
            {blogs.slice(0, 5).map((blog) =>
              (<li key={blog.title}>
                <Link className="article-title" to={`/blog/${blog.url}`}>{blog.title}</Link>
               </li>))}
          </ul>
        </div>
        <div id="tags" className="item">
          <h4 className="title">标签</h4>
          <ul>
            {tags.map((tag, i) =>
              (<li key={i}>
                <Link className="article-title" to={`/tag/${tag}`}>{tag}</Link>
               </li>))}
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
