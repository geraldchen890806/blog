import React from 'react';
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
    width: 8px;
  }
  .ant-table-column-sorter {
    margin-left: 3px;
  }
  .ant-spin-container {
    .ant-table {
      min-height: ${(props) => `${props.minHeight}px` || 'auto'};
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

  handleResize = (key, e, { size }) => {
    const columnWidthsPreference = this.state.columnWidthsPreference || this.props.columnWidthsPreference || {};
    const newColPre = { ...columnWidthsPreference, [key]: size.width };
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
      lineHeight = 28,
      draggable,
      minHeight,
      className,
      ...reset
    } = this.props;
    const newColumns = columns.map((item) => {
      let dir;
      if (sort && sort.key === item.dataIndex) {
        dir = sort.dir;
      } else {
        dir = null;
      }

      if (item.draggable && !item.width) {
        throw new Error('允许的自定义列宽（draggable === true）的默认列宽（width）不能为空！');
      }

      let titleContent;
      if (item.titleRender) {
        titleContent = item.titleRender(dataSource);
      } else {
        titleContent = item.title || item.column;
      }
      const sortFlag = (!item.hasOwnProperty('sort') || item.sort) && onSortChange;
      const customSort = item.sorter;
      const width = columnWidthsPreference[item.dataIndex] || (item.width && parseInt(item.width, 10));
      let titleParams = {};
      if (!disabledEllipsis) {
        titleParams = {
          className: 'ellipsis',
          style: draggable
            ? {
              width: width - 5 - (customSort ? 25 : 0), // 5:rightPadding
              padding: '0 2px',
              // cursor: sortFlag ? 'pointer' : 'text',
              display: 'inline-block',
              verticalAlign: 'top',
              height: lineHeight,
            }
            : {},
        };
      }
      const title = (
        <div key={item.dataIndex} {...titleParams}>
          <span
            style={{ cursor: sortFlag ? 'pointer' : 'text' }}
            onClick={() => {
              if (!sortFlag) return;
              this.props.onSortChange({
                key: item.dataIndex,
                dir: dir === 'DESC' ? 'ASC' : 'DESC',
                column: item,
              });
            }}
          >
            {titleContent}
            {(sortFlag && (
              <div className="ant-table-column-sorter">
                <span className={`ant-table-column-sorter-up ${dir === 'ASC' ? 'on' : 'off'}`} title="↑">
                  <i className="anticon anticon-caret-up" />
                </span>
                <span className={`ant-table-column-sorter-down ${dir === 'DESC' ? 'on' : 'off'}`} title="↓">
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
        render: (text, record, index) => (item.render ? item.render(text, record, index, width) : text),
        title,
      };
    });

    const totalWidth = _.sumBy(newColumns, (d) => d.width);

    return (
      <TABLE
        minHeight={minHeight || scroll.y + 30}
        className={`${draggable && 'enableResize'} ${className}`}
        dataSource={dataSource}
        components={draggable ? this.components : {}}
        columns={newColumns}
        {...reset}
        scroll={{
          ...scroll,
          x: _.has(scroll, 'x') ? scroll.x : totalWidth,
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
};

const ResizableTitle = (props) => {
  const {
    onResize, width, dataIndex, ...restProps
  } = props;
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
};
