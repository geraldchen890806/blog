/** Copyright © 2013-2019 DataYes, All Rights Reserved. */

import _ from 'lodash';

import Digit from 'js/utils/digit';

export function isNumber(value) {
  if (!`${value}`.length || `${value}` == 'null') return false;
  const _value = Number(value);
  if (_.isNaN(_value) || !_.isFinite(_value)) {
    return false;
  }
  return true;
}

export function toFixed2Percent(data, n, str) {
  if (n && n > 0) {
    return (_.isNumber(data) && data.toFixed(n)) || (str === '' ? '' : '-');
  }
  return (
    (_.isNumber(data) && `${(data * 100).toFixed(2)}%`) ||
    (str === '' ? '' : '-')
  );
}

export function formatAccuracy(value, num, i) {
  const accuracy = Number(num) || 1;
  const digit = new Array(accuracy + 1).join(i || '#');
  return Digit.format(value, `0.${digit}`);
}

export function formatAccuracyPercent(value, num, i, isPercent) {
  if (!isNumber(value)) return '--';
  const accuracy = Number(num) || 1;
  const digit = new Array(accuracy + 1).join(i || '#');
  return Digit.format(value, `0.${digit}${(isPercent && '%') || ''}`);
}

export function getUnit(res) {
  if (!res || !res.length) {
    return {
      num: 1,
      label: '',
    };
  }
  const maxNum = _.maxBy(res, (d) => (isNumber(d) ? d : 0));
  if (maxNum > 1000000000000) {
    return {
      num: 100000000000,
      label: '万亿',
    };
  }
  if (maxNum > 100000000) {
    return {
      num: 10000000,
      label: '亿',
    };
  }
  if (maxNum > 10000) {
    return {
      num: 10000,
      label: '万',
    };
  }
  return {
    num: 1,
    label: '',
  };
}
