import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import _ from 'lodash';
import { connect } from 'react-redux';
import iconPng from 'img/icon.png';

@connect((state) => ({
  ...state.common,
}))
export default class Side extends PureComponent {
  render() {
    const { blogs = [] } = this.props;
    const tags = _.uniq(_.reduce(blogs, (re, b) => re.concat(b.tags), []));
    return (
      <div className="mainSide">
        <div id="info">
          <img alt="" src={iconPng} />
          <div>geraldchen890806@gmail.com</div>
        </div>
        <div id="recent">
          <h4 className="title">最新文章</h4>
          <ul>
            {blogs
              .filter((d) => !d.hide)
              .slice(0, 5)
              .map((blog) => (
                <li key={blog.title}>
                  <Link className="article-title" to={`/blog/${blog.url}`}>
                    {blog.title}
                  </Link>
                </li>
              ))}
          </ul>
        </div>
        <div id="tags" className="item">
          <h4 className="title">标签</h4>
          <ul>
            {tags.map((tag) => (
              <li key={tag}>
                <Link className="article-title" to={`/tag/${tag}`}>
                  {tag}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
}

Side.propTypes = {
  blogs: PropTypes.array,
};
