/** Copyright © 2013-2019 DataYes, All Rights Reserved. */

import _ from 'lodash';

import { isNumber } from 'js/utils/numberUtils';

function sortData(data, obj) {
  let newData = [];
  const {
    column = {}, key, dir, columns,
  } = obj;
  if (!key) return data;
  if (column.sortMultiItem) {
    _.map(data, (d) => {
      const multiItem2 = columns[column.sortMultiItem];
      return {
        ...d,
        sortMultiItem1: column.sortParse
          ? column.sortParse(_.get(d, key), d)
          : _.get(d, key),
        sortMultiItem2:
          multiItem2 && multiItem2.sortParse
            ? multiItem2.sortParse(d[column.sortMultiItem], d)
            : d[column.sortMultiItem],
      };
    });
    newData = _.sortBy(data, ['sortMultiItem1', 'sortMultiItem2']);
  } else {
    newData = _.sortBy(data, (d) => {
      if (column.sortParse) {
        return column.sortParse(_.get(d, key), d);
      }
      return _.get(d, key) || '';
    });
  }
  if (dir === 'DESC') {
    newData = newData.reverse();
  }
  return _.map(newData, (d) => {
    if (d.children && d.children.length) {
      return { ...d, children: sortData(d.children, obj) };
    }
    return d;
  });
}

export function columnSort(data, key, dir) {
  const emptyProd = data.filter((item) => item[key] === '');
  let nonEmptyProd = data.filter((item) => item[key] !== '');
  nonEmptyProd = dir === 'DESC'
    ? _.sortBy(nonEmptyProd, key).reverse()
    : _.sortBy(nonEmptyProd, key);
  return nonEmptyProd.concat(emptyProd);
}

export default sortData;

export const columnSorter = (key, a, b, dir) => {
  if (a.isSummaryData) {
    return dir === 'descend' ? -1 : 1;
  }
  if (b.isSummaryData) {
    return dir === 'descend' ? 1 : -1;
  }
  const aV = _.get(a, key);
  const bV = _.get(b, key);
  if (isNumber(aV) || isNumber(bV)) {
    if (!isNumber(aV)) return -1;
    if (!isNumber(bV)) return 1;
    return aV - bV;
  }
  return aV > bV ? 1 : -1;
};
