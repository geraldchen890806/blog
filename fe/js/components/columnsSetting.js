

// import App from 'js/app';
import React, {Component} from 'react';
import Popup from 'js/components/popup';

// 自定义列
// {
//     defaultColumns: [],
//     storeColumns: [],
//     storageName: [],
//     saveSetting: () => {}
// }
export default class ColumnSetting extends Component {

    constructor(props) {
        super(props);
        let curColumns = _.isEmpty(props.storeColumns) && props.defaultColumns || GetColumns(props.defaultColumns, props.storeColumns, true);
        this.state = {
            defaultColumns: props.defaultColumns,
            columns: _.cloneDeep(curColumns),
            _columns: curColumns,
            storageName: props.storageName,
            animIndex: -1,
            saveFlag: false
        };
    }

    componentWillReceiveProps(nextProps) {
        let curColumns = _.isEmpty(nextProps.storeColumns) && nextProps.defaultColumns || GetColumns(nextProps.defaultColumns, nextProps.storeColumns, true);
        this.setState({columns: _.cloneDeep(curColumns), _columns: curColumns});
    }

    save() {
        var {columns} = this.state;
        var {saveSetting, storageName} = this.props;
        var popupReact = this.refs.popupReact;
        var res = _.chain(columns).filter('selected').reduce((re, col, index) => {
            if (col.selected) {
                re.push({key: col.key, selected: true, index: index});
            }
            return re;
        }, []).value();
        //TODO
        // $.when(App.request('SettingsSet:entities', {
        //     category: storageName,
        //     content: res
        // })).done(function() {
        //     popupReact.hide();
        //     saveSetting(res);
        // });
    }

    render() {
        var {columns, _columns, animIndex, saveFlag} = this.state;
        var {defaultColumns} = this.props;
        var tipsTpl;
        if (!_.isEqual(_.map(columns, 'column'), _.map(defaultColumns, 'column'))) {
            tipsTpl = <div className="columnSetting-resetTip">
                <a className="reset" onClick={() => {
                    this.setState({columns: _.cloneDeep(defaultColumns), animIndex: -1, saveFlag: true});
                }}>恢复默认</a>
                <span>数据列显示项目及排序</span>
            </div>;
        } else {
            tipsTpl = <div className="columnSetting-resetTip">
                <span>当前是默认设置</span>
            </div>;
        }
        return <div className="columnsSettingTpl">
            <a className="pms-icon i-settings columnsSetting" title="设置表格数据列" onClick={() => {
                this.setState({columns: _.cloneDeep(_columns), animIndex: -1, saveFlag: false});
                this.refs.popupReact.show();
            }}></a>
            <Popup ref='popupReact' className='fixTableColumnsPopup-react'>
                <div className="columnSetting-content">
                    <div className="columnSetting-remainColumns">
                        <div className="columnSetting-title">添加数据列</div>
                        <div className="columnSetting-search">
                            <input className="columnSetting-filter" placeholder="搜索"/>
                            <i className="pms-icon i-search"></i>
                        </div>
                        <ul>
                            {columns.map((col, index) => {
                                return !col.selected && <li key={col.column} className={`${animIndex == index && 'bone' || ''}`}>
                                    <label>{col.column}</label>
                                    <i className='fixCloumnsIcon i-add' onClick={() => {
                                        col.selected = true;
                                        columns.push(col);
                                        columns[index] = null;
                                        this.setState({
                                            columns: _.filter(columns),
                                            saveFlag: true,
                                            animIndex: columns.length - 2
                                        });
                                    }}>+</i>
                                </li> || '';
                            })}
                        </ul>
                    </div>
                    <div className="columnSetting-icon"></div>
                    <div className="columnSetting-selectedColumns">
                        <div className="columnSetting-title">已显示的数据列</div>
                        <div className="columnSetting-tips">注意：当前数据列过多，可能会影响显示！</div>
                        <ul>
                            {columns.map((col, index) => {
                                return col.selected && !col.forbiddenDisplay && <li key={col.column} className={`${animIndex == index && 'bone' || ''}`}>
                                    <label>{col.column}</label>
                                    {!col.forbiddenRemove && <i className='fixCloumnsIcon i-subs' onClick={() => {
                                        col.selected = false;
                                        columns.push(col);
                                        columns[index] = null;
                                        this.setState({
                                            columns: _.filter(columns),
                                            saveFlag: true,
                                            animIndex: columns.length - 2
                                        });
                                    }}>X</i> || ''}
                                    {!col.forbiddenMove && <i className='fixCloumnsIcon i-down' onClick={() => {
                                        let nextIndex = index + 1;
                                        while (nextIndex < columns.length && !columns[nextIndex].selected) {
                                            nextIndex++;
                                        }
                                        columns[index] = columns[nextIndex];
                                        columns[nextIndex] = col;
                                        this.setState({columns: columns, saveFlag: true, animIndex: nextIndex});
                                    }}></i> || ''}
                                    {!col.forbiddenMove && <i className='fixCloumnsIcon i-up' onClick={() => {
                                        let nextIndex = index - 1;
                                        while (nextIndex > 0 && !columns[nextIndex].selected) {
                                            nextIndex--;
                                        }
                                        columns[index] = columns[nextIndex];
                                        columns[nextIndex] = col;
                                        this.setState({columns: columns, saveFlag: true, animIndex: nextIndex});
                                    }}></i> || ''}
                                </li> || '';
                            })}
                        </ul>
                    </div>
                </div>
                <div className="btnTpl">
                    <a className="btn-white" onClick={() => {
                        this.refs.popupReact.hide();
                    }}>取消</a>
                    <a className={`btn-blue ${saveFlag || 'disabled'}`} onClick={this.save.bind(this)}>保存</a>
                    {tipsTpl}
                </div>
            </Popup>
        </div>;
    }
}

export function GetColumns(defaultColumns, storeColumns, isPopup, width) {
    var columns = _.cloneDeep(defaultColumns);
    if (storeColumns && storeColumns.length) {
        storeColumns = _.keyBy(storeColumns, 'key');
        _.map(columns, function(item) {
            item.selected = false;
            item.index = -1;
            return _.extend(item, storeColumns[item.key]);
        });
        columns.sort(function(a, b) {
            var aItem = storeColumns[a.key] || {
                    index: -1
                },
                bItem = storeColumns[b.key] || {
                    index: -1
                };
            return aItem.index - bItem.index;
        });
    }
    if (!isPopup) {
        columns = _.filter(columns, function(column) {
            return column.selected;
        });
    }
    if (width)
        return ResizeColumns(columns, width);
    return columns;
}

export function ResizeColumns(columns, width) {
    let totalWidth = _.reduce(columns, (re, column) => re += column.width, 0);
    columns = _.map(columns, column => {
        column.width = Math.floor(column.width / totalWidth * width);
        return column;
    });
    let afterWidth = _.reduce(columns, (re, column) => re += column.width, 0);
    if (columns[0]) {
        columns[0].width = columns[0].width - (afterWidth - width);
    }
    return columns;
}
