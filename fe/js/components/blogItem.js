import React, {PropTypes, Component} from "react";
import {Link} from "react-router";

export default class BlogItem extends Component {
    render() {
        const {blog} = this.props;
        return (
            <div className="article blog">
                <header className="blogItem">
                    <h1>
                        <Link className="article-title" to={`/blog/${blog.url}`}>{blog.title}</Link>
                    </h1>
                </header>
                <div className="content article-entry" dangerouslySetInnerHTML={{ __html: blog.content }} />
                <footer className="article-footer"></footer>
            </div>
        );
    }
}
