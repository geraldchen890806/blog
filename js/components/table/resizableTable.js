/* eslint-disable */
import React from 'react';
import { findDOMNode } from 'react-dom';
import PropTypes from 'prop-types';
import { Table } from 'antd';
import styled from 'styled-components';
import { Resizable } from 'react-resizable';
import 'react-resizable/css/styles.css';

const TABLE = styled(Table)`
  &.enableResize .ant-table-scroll table {
    min-width: auto;
  }
  .react-resizable-handle {
    cursor: ew-resize;
    height: 32px;
    width: 2px;
    background: none;
    border-right: 1px solid #fff;
  }
  .ant-spin-container {
    .ant-table {
      min-height: ${(props) => `${props.minHeight}px` || 'auto'};
    }
  }
  .ant-table .ant-table-row {
    .ant-table-row-expand-icon {
      width: 12px;
      height: 12px;
      border-radius: 2px;
      border: 1px solid #ccc;
    }
    .ant-table-row-collapsed:after,
    .ant-table-row-expanded:after {
      color: #ccc;
      position: relative;
      top: -2px;
      font-weight: normal;
    }
  }
`;

export default class ResizableTable extends React.Component {
  // state = {};
  // components = {
  //   header: {
  //     cell: ResizableTitle
  //   }
  // };

  constructor(props) {
    super(props);
    this.state = {};
    this.components = {
      header: {
        cell: ResizableTitle,
      },
    };
    this.handleResize = _.debounce(this.handleResize, 150);
  }

  componentDidMount() {
    this.tableElem = findDOMNode(this.table);
    this.width = this.tableElem && this.tableElem.offsetWidth;
  }

  handleResize = (key, e, { size }) => {
    const columnWidthsPreference =
      this.state.columnWidthsPreference ||
      this.props.columnWidthsPreference ||
      {};
    const newColPre = {
      ...columnWidthsPreference,
      [key]: _.max([size.width, 45]),
    };
    const { onSaveWidthsPreference } = this.props;
    if (onSaveWidthsPreference) {
      onSaveWidthsPreference(newColPre);
    }
  };

  render() {
    const {
      columns,
      scroll = {},
      dataSource,
      disabledEllipsis,
      sort,
      columnWidthsPreference = {},
      onSortChange,
      lineHeight,
      draggable,
      minHeight,
      className,
      ...reset
    } = this.props;
    let newColumns = columns.map((item) => {
      let dir;
      if (sort && sort.key === item.dataIndex) {
        dir = sort.dir;
      } else {
        dir = null;
      }

      if (item.draggable && !item.width) {
        throw new Error(
          '允许的自定义列宽（draggable === true）的默认列宽（width）不能为空！'
        );
      }

      let titleContent;
      if (item.titleRender) {
        titleContent = item.titleRender(dataSource);
      } else {
        titleContent = item.title || item.column;
      }
      const sortFlag =
        (!item.hasOwnProperty('sort') || item.sort) && onSortChange;
      const customSort = item.sorter;
      const width =
        columnWidthsPreference[item.dataIndex] ||
        (item.width && parseInt(item.width, 10));
      let titleParams = {};
      if (!disabledEllipsis) {
        titleParams = {
          className: 'ellipsis',
          style: draggable
            ? {
                width: width - 2 - (customSort ? 15 : 0) - 20, // 2:inline-block padding, 20: padding
                padding: '0',
                cursor: sortFlag ? 'pointer' : 'text',
                display: 'inline-block',
                verticalAlign: 'top',
                height: lineHeight,
              }
            : { maxWidth: width - 2 - (customSort ? 15 : 0) - 20 },
        };
      }
      const title = (
        <div key={item.dataIndex} {...titleParams}>
          <span
            onClick={() => {
              if (!sortFlag) return;
              const nextDir = !dir ? 'DESC' : dir === 'ASC' ? '' : 'ASC';
              this.props.onSortChange({
                key: nextDir ? item.dataIndex : '',
                dir: nextDir,
                column: item,
              });
            }}
          >
            {titleContent}
            {(sortFlag && (
              <div className="ant-table-column-sorter">
                <span
                  className={`ant-table-column-sorter-up ${
                    dir === 'ASC' ? 'on' : 'off'
                  }`}
                  title="↑"
                >
                  <i className="anticon anticon-caret-up" />
                </span>
                <span
                  className={`ant-table-column-sorter-down ${
                    dir === 'DESC' ? 'on' : 'off'
                  }`}
                  title="↓"
                >
                  <i className="anticon anticon-caret-down" />
                </span>
              </div>
            )) ||
              ''}
          </span>
        </div>
      );
      return {
        ...item,
        width: columnWidthsPreference[item.dataIndex] || item.width,
        onHeaderCell: (col) => ({
          dataIndex: col.dataIndex,
          width,
          onResize: (e, obj) => this.handleResize(item.dataIndex, e, obj),
        }),
        render: (text, record, index) =>
          item.render ? item.render(text, record, index, width) : text,
        title,
      };
    });

    const totalWidth = _.sumBy(newColumns, (d) => d.width);

    let fixedRightColumns = _.filter(newColumns, (d) => d.fixed === 'right');
    if (!_.isEmpty(fixedRightColumns)) {
      const leftColumns = _.filter(newColumns, (d) => d.fixed !== 'right');
      if (this.width && totalWidth < this.width) {
        fixedRightColumns = fixedRightColumns.map((d) => ({
          ...d,
          fixed: false,
        }));
      }
      newColumns = leftColumns.concat(fixedRightColumns);
    }

    return (
      <TABLE
        ref={(c) => (this.table = c)}
        minHeight={minHeight || scroll.y + lineHeight + 1}
        className={`${draggable && 'enableResize'} ${className}`}
        dataSource={dataSource}
        components={draggable ? this.components : {}}
        columns={newColumns}
        {...reset}
        scroll={{
          ...scroll,
          x: 'x' in scroll ? scroll.x : totalWidth,
        }}
      />
    );
  }
}

ResizableTable.propTypes = {
  dataSource: PropTypes.array.isRequired,
  columns: PropTypes.array.isRequired,
  onResize: PropTypes.func,
  disabledEllipsis: PropTypes.bool,
  draggable: PropTypes.bool,
  scroll: PropTypes.object,
  sort: PropTypes.object,
  onSortChange: PropTypes.func,
  lineHeight: PropTypes.number,
  minHeight: PropTypes.number,
  columnWidthsPreference: PropTypes.object,
  onSaveWidthsPreference: PropTypes.func,
  classname: PropTypes.string,
};

const ResizableTitle = (props) => {
  const { onResize, width, dataIndex, ...restProps } = props;
  if (!width) {
    return <th key={dataIndex} {...restProps} />;
  }

  return (
    <Resizable width={width} key={dataIndex} height={0} onResize={onResize}>
      <th {...restProps} />
    </Resizable>
  );
};

ResizableTitle.propTypes = {
  onResize: PropTypes.func.isRequired,
  width: PropTypes.number,
  dataIndex: PropTypes.string,
  className: PropTypes.string,
};

ResizableTable.defaultProps = {
  lineHeight: 32,
};
