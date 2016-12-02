

import React, {Component} from 'react';
import enhanceWithClickOutside from 'react-click-outside';

// tips
// {
//     className:''
//     top:0
//     left:0
//     z-index:11
// }

@enhanceWithClickOutside
export default class Tips extends Component {

    constructor(props) {
        super(props);
        this.state = {
            flag: props.flag || false
        };
        this.show = this.show.bind(this);
        this.hide = this.hide.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        if (this.state.flag !== nextProps.flag) {
            if (nextProps.flag) {
                this.show();
            } else if (nextProps.hasOwnProperty('flag') && !nextProps.flag) {
                this.hide();
            }
        }
    }

    show() {
        this.setState({flag: true});
    }

    hide() {
        this.setState({flag: false});
        if (this.props.onHide) {
            this.props.onHide();
        }
    }

    handleClickOutside() {
        var {disableOutClick} = this.props;
        if (!disableOutClick) {
            this.hide();
        }
    }

    render() {
        var {flag} = this.state;
        var {style, className} = this.props;
        return flag && <div className={`tips-react ${className || ''}`} style={style}>
            {this.props.children}
        </div> ||<div />;
    }
}
