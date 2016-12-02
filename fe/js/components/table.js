

import React, {Component, PropTypes} from 'react';
import {Table, Column, Cell} from 'fixed-data-table-2';
import {GetColumns, ResizeColumns} from 'js/components/columnsSetting';

var SortTypes = {
    ASC: 'ASC',
    DESC: 'DESC'
};

function reverseSortDirection(dir) {
    return dir === SortTypes.DESC
        ? SortTypes.ASC
        : SortTypes.DESC;
}

class SortHeaderCell extends React.Component {
    constructor(props) {
        super(props);
        this._onSortChange = this._onSortChange.bind(this);
    }

    render() {
        var {
            data,
            column,
            ...props
        } = this.props;
        var dir = column.dir;
        var html;
        if (column.columnRender) {
            html = column.columnRender(data);
        } else {
            html = column.column;
        }
        var sortFlag = !column.hasOwnProperty('sort') || column.sort;
        return (
            <Cell className={`center title ${sortFlag && 'hasSort' || ''}`} {...props}>
                {this.props.onSortChange && <a>{html}</a> || html}
                {sortFlag && <i className = {
                    `sort-icon ${dir || ''}`
                }
                onClick = {
                    this._onSortChange
                } />|| ''}
            </Cell>
        );
    }

    _onSortChange(e) {
        e.preventDefault();
        var {column, columnKey} = this.props;
        if (!this.props.onSortChange)
            return;
        if (!column.hasOwnProperty('sort') || column.sort) {
            this.props.onSortChange(columnKey, reverseSortDirection(column.dir), column);
        }
    }
}

const TextCell = ({
    rowIndex,
    column,
    data,
    columnKey,
    ...props
}) => {
    var html;
    var curData = data[rowIndex];
    var length = data.length;
    if (!curData.hasOwnProperty(columnKey)) {
        html = '';
    } else if (column.render) {
        html = column.render(curData[columnKey], curData, rowIndex, length);
    } else {
        html = curData[columnKey];
    }
    var title = html;
    if (column.title) {
        title = column.title(curData[columnKey], curData);
    }
    if (!_.isString(title)) {
        title = '';
    }
    var tdClass = column.tdClass;
    if (_.isFunction(tdClass)) {
        tdClass = tdClass(curData);
    }
    return <Cell className={tdClass || ''} title={title} {...props}>
        {html}
    </Cell>;
};

const CollapseCell = ({
    rowIndex,
    collapsedRows,
    callback,
    column,
    data,
    columnKey,
    ...props
}) => {
    var html;
    var curData = data[rowIndex];
    var collapsedTpl = '';
    if (curData.children || curData.tableDepth > 1) {
        collapsedTpl = <span className={`indenter ${curData.children && curData.children.length && 'isParent'}`} onClick={() => callback(curData.tableId)}></span>;
    }
    if (!curData.hasOwnProperty(columnKey)) {
        html = '';
    } else if (column.render) {
        html = column.render(curData[columnKey], curData);
    } else {
        html = curData[columnKey];
    }
    var title = html;
    if (column.titleRender) {
        title = column.titleRender(curData[columnKey], curData);
    }
    if (!_.isString(title)) {
        title = '';
    }
    var tdClass = column.tdClass;
    if (_.isFunction(tdClass)) {
        tdClass = tdClass(curData);
    }
    var className = collapsedRows.has(curData.tableId)
        ? 'expanded'
        : 'collapsed';
    return <Cell className={`${tdClass} depth${curData.tableDepth} ${className}`} title={title} {...props}>
        {html && collapsedTpl}
        {html}
    </Cell>;
};

// params
// {
//      data: [{
//         dataDepth: 1 //强制设depth
//      }],
//      width: 740,
//      height: 693,
//      columns: [{
//          column: '',
//          key:'',
//          tdClass: '',
//          render:(){},
//          sortParse(){},
//          showTitle: ,
//          titleRender(){}
//      }],
//      sort: sort,
//      onSortChange: this.onSortChange.bind(this),
//      idField: function(data) {
//          return `${data.securityId}`;
//      }
// };

export default class TableView extends Component {
    static propTypes = {
        columns: PropTypes.array.isRequired,
        width: PropTypes.number.isRequired,
        // height: PropTypes.number.isRequired,
        sort: PropTypes.object,
        // onSortChange: PropTypes.func.isRequired,
        data: PropTypes.array.isRequired
    }

    constructor(props) {
        super(props);
        var columns = props.columns;
        if (!props.disableResizeColumns) {
            columns = ResizeColumns(props.columns, props.width);
        }
        this.state = {
            collapsedRows: new Set(),
            collapsedRowsArray: [],
            columns: columns,
            width: props.width,
            height: props.height || 0,
            maxHeight: props.maxHeight || 0,
            expandColumns: props.expandColumns,
            data: _.cloneDeep(props.data),
            sort: props.sort,
            needRefresh: false,
            initDepth: props.depth || 1
        };
        this._onSortChange = this._onSortChange.bind(this);
        this._handleCollapseClick = this._handleCollapseClick.bind(this);
        this._initData = this._initData.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        this.setState({
            columns: nextProps.columns,
            sort: nextProps.sort,
            width: nextProps.width,
            height: nextProps.height,
            maxHeight: nextProps.maxHeight,
            data: _.cloneDeep(nextProps.data)
        });
    }

    shouldComponentUpdate(nextProps, nextState) {
        var flag = false;
        flag = flag || !_.isEqual(this.state.refreshFlag, nextState.refreshFlag);
        flag = flag || !_.isEqual(this.state.needRefresh, nextState.needRefresh);
        flag = flag || !_.isEqual(this.state.columns, nextState.columns);
        flag = flag || !_.isEqual(this.state.sort, nextState.sort);
        flag = flag || !_.isEqual(this.state.collapsedRowsArray, nextState.collapsedRowsArray);
        flag = flag || !_.isEqual(this.state.initDepth, nextState.initDepth);
        flag = flag || !_.isEqual(this.state.data, nextState.data);
        flag = flag || !_.isEqual(this.state.width, nextState.width);
        flag = flag || !_.isEqual(this.state.height, nextState.height);
        flag = flag || !_.isEqual(this.state.maxHeight, nextState.maxHeight);
        return flag;
    }

    _handleCollapseClick(tableId) {
        let {collapsedRows} = this.state;
        collapsedRows.has(tableId)
            ? collapsedRows.delete(tableId)
            : collapsedRows.add(tableId);
        this.setState({collapsedRows: collapsedRows, collapsedRowsArray: Array.from(collapsedRows), initDepth: 1});
    }

    _onSortChange(columnKey, dir) {
        var {onSortChange} = this.props;
        if (onSortChange) {
            onSortChange({key: columnKey, dir: dir});
        } else {
            console.log('require fn onSortChange');
        }
    }

    _onColumnResizeEndCallback(newColumnWidth, columnKey) {
        var {columns} = this.props;
        var cols = _.map(columns, function(column) {
            if (column.key == columnKey) {
                column.width = newColumnWidth;
            }
            return column;
        });
        this.setState({
            columns: cols,
            needRefresh: !this.state.needRefresh
        });
    }

    _initData(data, parentTableId = 'root', depth = 1) {
        let {collapsedRows, initDepth} = this.state;
        var newData = _.reduce(_.cloneDeep(data), (re, d) => {
            d.tableId = d.tableId = d.tableId || `${parentTableId}-${this._getId(d)}`;
            d.tableDepth = d.dataDepth || depth;
            re.push({
                ...d
            });
            if (depth < initDepth) {
                collapsedRows.add(d.tableId);
            }
            if (collapsedRows.has(d.tableId) && d.children) {
                re = re.concat(this._initData(d.children, d.tableId, depth + 1));
            }
            return re;
        }, []);
        this.state = {
            ...this.state,
            collapsedRows: collapsedRows,
            collapsedRowsArray: Array.from(collapsedRows)
        };
        return newData;
    }

    _getId(data) {
        var {idField} = this.props;
        if (_.isFunction(idField)) {
            var id = idField(data);
            return id && id.toString().trim().replace(/\s+/g, '_');
        } else {
            return data[idField] && data[idField].toString() || data.id;
        }
    }

    changeShowDepth(depth) {
        this.setState({initDepth: depth});
    }

    refresh() {
        this.setState({
            refreshFlag: !this.state.refreshFlag
        });
    }

    // componentWillUpdate(nextProps, nextState) {
    //     console.time(`{update-${nextState.sort.key}}`);
    // }
    // componentDidUpdate(nextProps, nextState) {
    //     console.timeEnd(`{update-${nextState.sort.key}}`);
    // }
    render() {
        var {
            columns,
            width,
            height,
            sort,
            collapsedRows,
            expandColumns,
            data
        } = this.state;
        var {onSortChange, disableResize} = this.props;
        columns = _.map(columns, column => {
            if (sort && sort.key == column.key) {
                column.dir = sort.dir;
            } else {
                column.dir = null;
            }
            return column;
        });
        if (expandColumns){
            data = this._initData(data);
        }
        let heightProps = _.pick(this.state, ['height', 'maxHeight']);
        return <Table className='treeTableReact' rowHeight={28} headerHeight={28} rowsCount={data.length} width={width} {...heightProps} isColumnResizing={false} onColumnResizeEndCallback={this._onColumnResizeEndCallback.bind(this)}>
            {columns.map((column) => {
                var header = <SortHeaderCell onSortChange={onSortChange && this._onSortChange} column={column} data={data}/>;
                var cell;
                if (expandColumns && ~ expandColumns.indexOf(column.key)) {
                    cell = <CollapseCell column={column} data={data} callback={this._handleCollapseClick} collapsedRows={collapsedRows}/>;
                } else {
                    cell = <TextCell column={column} data={data}/>;
                }
                return <Column key={column.key} columnKey={column.key} header={header} cell={cell} width={column.width} isResizable={!disableResize} minWidth={80}></Column>;
            })}
        </Table>;
    }
}
