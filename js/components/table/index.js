import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { Tooltip } from 'antd';
import ResizableTable from './resizableTable';

// 表格控件默认去除100%缩放功能，需设实际宽度
// tableParams = {
//   columnWidthsPreference, 值：postPreference(`columnWidthsPreference_productFilter${customKey}) = {a:11,b:22}
//   onSaveWidthsPreference: (obj) => {
//     postPreference(`columnWidthsPreference_productFilter${customKey}`, obj);
//   },
//   minHeight: xxx, // 表格主体默认最小高度,未设置时使用scroll.y
//   draggable: true, //
//   showEllipsis: true, // 显示...
//   sort: {
//     dir: params.order, 'ASC' || 'DESC'
//     key: params.orderBy
//   },
//   onSortChange: this.onSortChange,
//   columns: [{
//     showTooltip: true
//     tooltipRender: 设置tooltip的render函数
//   }],
// }

export default class TableAntd extends React.Component {
  constructor(props) {
    super(props);
    const { width, columns, columnWidthsPreference, onSortChange, showEllipsis, expandIconColumnIndex } = this.props;
    const res = resetColumnWidth({
      columns,
      showEllipsis,
      expandIconColumnIndex,
      columnWidthsPreference,
      width,
    });
    this.state = {
      width,
      columns: res.columns,
      columnWidthsPreference,
    };
  }

  componentWillReceiveProps(nextProps) {
    const { columns, columnWidthsPreference, showEllipsis, expandIconColumnIndex, width } = nextProps;
    let stateColumnWidthsPreference = this.state.columnWidthsPreference;
    let stateColumns = this.state.columns;
    if (!_.isEqual(columnWidthsPreference, this.props.columnWidthsPreference)) {
      stateColumnWidthsPreference = columnWidthsPreference;
    }
    // if (
    //   _.map(columns, (d) => d.key || d.dataIndex).join() !== _.map(stateColumns, (d) => d.key || d.dataIndex).join()
    // ) {
    const res = resetColumnWidth({
      columns,
      showEllipsis,
      expandIconColumnIndex,
      columnWidthsPreference: stateColumnWidthsPreference,
      width,
    });
    stateColumns = res.columns;
    // }
    this.setState({
      columns: stateColumns,
      columnWidthsPreference: stateColumnWidthsPreference,
    });
  }

  addDataSourceDepth = (data, depth) =>
    data.map((d) => {
      d._depth = depth;
      d.children = _.isEmpty(d.children) ? null : this.addDataSourceDepth(d.children, depth + 1);
      return d;
    });

  onSaveWidthsPreference = (obj) => {
    this.setState({
      columnWidthsPreference: obj,
    });
    if (this.props.onSaveWidthsPreference) {
      this.props.onSaveWidthsPreference(obj);
    }
  };

  render() {
    const { columns, columnWidthsPreference } = this.state;
    let { scroll = {}, dataSource, pagination } = this.props;
    if (_.some(dataSource, 'children')) {
      dataSource = this.addDataSourceDepth(dataSource, 1);
    }
    return (
      <ResizableTable
        {...this.props}
        columnWidthsPreference={columnWidthsPreference}
        onSaveWidthsPreference={this.onSaveWidthsPreference}
        dataSource={dataSource}
        columns={columns}
      />
    );
  }
}

const _render = ({ column, showEllipsis, columnIndex, expandIconColumnIndex }) => (text, record, index, width) => {
  let html;
  if (column.render) {
    html = column.render(text, record, index, width);
  } else {
    html = text;
  }
  let title = html;
  if (showEllipsis) {
    const treeStep = !!record._depth && columnIndex === expandIconColumnIndex ? (record._depth - 1) * 20 + 30 : 0;
    let maxWidth = width - 14 - treeStep; // 14 为td padding (12 inline-block多使用2px)
    if (maxWidth < 0) {
      maxWidth = 0;
    }
    html = (
      <div
        className="ellipsis"
        style={{
          display: 'inline-block',
          verticalAlign: 'top',
          maxWidth,
        }}
      >
        {html}
      </div>
    );
  }
  if (column.showTooltip || column.tooltipRender) {
    if (!_.isString(title) || title === '--') {
      title = '';
    }
    if (column.titleRender) {
      title = column.titleRender(text, record);
    }
    const xlsRender = column.xlsRender;
    if (_.isFunction(xlsRender)) {
      title = xlsRender(text, record);
    }
    const tooltipRender = column.tooltipRender;
    if (_.isFunction(tooltipRender)) {
      title = tooltipRender(text, record);
    }
    if (_.isString(title) && title === '--') {
      title = '';
    }
    return (
      <Tooltip placement={'topLeft'} mouseEnterDelay={0.5} title={title}>
        {html}
      </Tooltip>
    );
  }
  return html;
};

export const resetColumnWidth = ({ columns, showEllipsis, expandIconColumnIndex, columnWidthsPreference, width }) => {
  let step = 1;
  if (width && _.isEmpty(columnWidthsPreference)) {
    const sumWidth = _.sumBy(columns, (c) => c.width || 0);
    step = (width - 5) / sumWidth;
  }
  return {
    columns: columns.map((column, index) => ({
      ...column,
      title: column.title || column.column,
      dataIndex: column.dataIndex || column.key,
      render: _render({ column, showEllipsis, columnIndex: index, expandIconColumnIndex }),
      className: column.className || column.tdClass,
      titleRender: column.titleRender || column.columnRender,
      width: parseInt(column.width * step, 10),
    })),
  };
};

TableAntd.propTypes = {
  columns: PropTypes.array.isRequired,
  dataSource: PropTypes.array.isRequired,
  columnWidthsPreference: PropTypes.object,
  onSaveWidthsPreference: PropTypes.func,
  showEllipsis: PropTypes.bool,
  draggable: PropTypes.bool.isRequired,
  sort: PropTypes.object,
  onSortChange: PropTypes.func,
  pagination: PropTypes.oneOfType([PropTypes.object, PropTypes.bool]),
  expandIconColumnIndex: PropTypes.number,
  width: PropTypes.number,
  bordered: PropTypes.number,
};

TableAntd.defaultProps = {
  columns: [],
  dataSource: [],
  showEllipsis: true,
  draggable: true,
  pagination: false,
  expandIconColumnIndex: 0,
  bordered: true,
};
