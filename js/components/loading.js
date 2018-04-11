

import React, {Component} from 'react';

export default class Loading extends Component {

    render() {
        const { flag, text } = this.props;
        return <div className={`loadingTpl load ${flag ? '' : 'hide'}`} style={{top:0,height:'100%'}} >
                    <div className='loading load'>
                        <div>{text || 'Loading...'}</div>
                    </div>
                </div>;
    }
}
