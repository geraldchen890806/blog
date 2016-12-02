

import React, {Component} from 'react';
import {render} from 'react-dom';
import 'jquery-ui/ui/core';
import 'jquery-ui/ui/widgets/draggable';

// Popup
// {
//     title: '',
//     flag: false,
//     id: '',
//     className: '',
//     children: {}
// }

export default class Popup extends Component {

    constructor(props) {
        super(props);
        this.state = {
            flag: !!(props.flag) || false,
            portalId: props.id || 'popup-react'
        };
    }

    componentDidMount() {
        var p = this.state.portalId && document.getElementById(this.state.portalId);
        if (!p) {
            p = document.createElement('div');
            p.id = this.state.portalId;
            document.body.appendChild(p);
        }
        this.portalElement = p;
        this.componentDidUpdate();
    }

    componentWillReceiveProps(nextProps) {
        if (this.state.flag == !(nextProps.flag)) {
            if (nextProps.flag) {
                this.show();
            } else if (nextProps.hasOwnProperty('flag') && !nextProps.flag) {
                this.hide();
            }
        }
    }

    show() {
        this.setState({flag: true});
        if (this.props.show) {
            this.props.show();
        }
    }

    hide() {
        this.setState({flag: false});
        if (this.props.hide) {
            this.props.hide();
        }
    }

    render() {
        return null;
    }

    componentDidUpdate() {
        const {children, className, title} = this.props;
        var {flag, portalId} = this.state;
        render(flag && <div id={portalId} className={`popup-react ${className}`}>
            <div className='popup-contentTpl'>
                <div className="popup-title">
                    <a className="popup-close">
                        <img src={`${_config.base}/static/img/close.png`} alt="" onClick={() => {
                            this.hide();
                        }}/></a>
                    <h4>添加成分配置</h4>
                </div>
                {children}
            </div>
        </div> || <div/>, this.portalElement);
        setTimeout(function() {
            let elem = $(`#${portalId}`).find('.popup-contentTpl');
            if (elem.length) {
                elem.draggable({handle: '.popup-title'});
            }
        });
    }
}
