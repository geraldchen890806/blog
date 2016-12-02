

import React, {Component, PropTypes} from 'react';
import Loading from 'js/components/loading';

import {
    getCache,
    clearCache
} from 'js/utils/commonCache';


export default class AddConcern extends Component {

    componentDidMount(){
        var that = this;
        getCache('api/groups').then(function (resp) {
            that.setState({
                loading: false,
                groups: resp
            });
        });
    }

    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            checkedGroups: [],
            groups: []
        };
    }

    save() {
        var {data, onSave} = this.props;
        var {checkedGroups} = this.state;
        var params = {
            id: _.map(data, 'id')
        };
        if (checkedGroups.length) {
            params.groupId = checkedGroups;
        } else {
            params.groupName = '默认分组';
        }
        $.ajax({
            type: 'PUT',
            url: `${_config.api}/api/accounts/follow?` + $.param(params).replace(/%5B%5D/g,''),
            success: function() {
                onSave();
                clearCache('api/groups');
            }
        });
    }

    render() {
        var {data} = this.props;
        var {loading, checkedGroups, groups} = this.state;
        // var checkedData = _.filter(curData, 'inputCheck');
        return <div className='tablePanel'>
            <Loading flag={loading}/>
            <ul>
                {data.map(d => {
                    return <li key={d.externalId}>
                        组合ID:
                        <span className='idTpl'>{d.externalId}</span>
                        所属投顾:{d.manager}</li>;
                })}
            </ul>
            <div className='groupsTpl'>
                选择分组 {groups.length && groups.map((group) => {
                    return <label key={group.id}>
                        <input type='checkbox' checked={~ checkedGroups.indexOf(group.id)} onChange={(e) => {
                            if (e.target.checked) {
                                checkedGroups.push(group.id);
                            } else {
                                checkedGroups = _.without(checkedGroups, group.id);
                            }
                            this.setState({checkedGroups: checkedGroups});
                        }}/>
                        <span>{group.name}</span>
                    </label>;
                }) || <label>
                    <input type='checkbox' checked={true} disabled={true}/>
                    <span>默认分组</span>
                </label>}
            </div>
            <div className='popup-btnTpl'>
                <a className={`btn-blue ${groups.length && !checkedGroups.length && 'disabled' || ''}`} onClick={this.save.bind(this)}>确定</a>
                <a className='btn-white' onClick={this.props.onHide}>取消</a>
            </div>
        </div>;
    }
}
