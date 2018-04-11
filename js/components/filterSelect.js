

import React, {Component} from 'react';
import enhanceWithClickOutside from 'react-click-outside';

// 搜索单选框
// {
//     selectData: []
//     valueKey: ''
//     labelKey: ''
//     className:''
//     select: () => {}
//     allOption: {},
//     initOption: {}
// }
@enhanceWithClickOutside
export default class FilterSelect extends Component {

    constructor(props) {
        super(props);
        this.state = {
            filter: '',
            showFlag: false,
            valueKey: props.valueKey || '',
            labelKey: props.labelKey || '',
            data: props.data || [],
            allOption: props.allOption,
            curOption: props.initOption || {}
        };
    }

    handleClickOutside() {
        this.setState({showFlag: false});
    }

    choose(d) {
        this.setState({curOption: d, showFlag: false});
        if (this.props.select) {
            this.props.select(d);
        }
    }
    render() {
        var {
            filter,
            showFlag,
            labelKey,
            valueKey,
            curOption,
            allOption
        } = this.state;
        var {data, className} = this.props;
        var curData = _.filter(data, d => {
            return ~ d[labelKey].indexOf(filter);
        });
        if (allOption) {
            curData.unshift(allOption);
        }
        return <div id={'filterSelect-react'} className={`${showFlag && 'open' || ''} ${className}`} onClick={() => {
            this.setState({
                showFlag: !showFlag
            });
        }}>
            <div className="name">{curOption[labelKey] || '未选择'}</div>
            <span className="arrow">
                <b className="presentation"></b>
            </span>
            <div className="selectTpl">
                <div className="searchTpl">
                    <input type="text" placeholder="搜索" onClick={e => e.stopPropagation()} onChange={e => {
                        this.setState({filter: e.target.value});
                    }}/>
                </div>
                <ul>
                    {curData.map(d => {
                        return <li key={d[labelKey]} className={`${d[valueKey] == curOption[valueKey] && 'cur' || ''}`} onClick={(e) => {
                            e.stopPropagation();
                            this.choose(d);
                        }}>{d[labelKey]}</li>;
                    })}
                </ul>
            </div>
            <select></select>
        </div>;
    }
}
