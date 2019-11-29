import _ from 'lodash';
import digit from 'js/utils/digit';

export const createData = ({
  i, length = 1000, num, ratio,
}) => {
  const list = [];
  for (let j = 0; j < length; j += 1) {
    list.push(createItem({ i, ratio, num }));
  }
  return list;
};


// i 押注数字
// ratio 人品值
// num 押注金额
export const createItem = ({ i, ratio = 1, num = 1 }) => {
  const result = Math.floor(Math.random() * ratio * 100);
  const win = result < i;
  let bgReturn = 0;
  if (win) {
    if (result % 11 === 0) {
      bgReturn = num * 0.5;
    }
    bgReturn = num * 0.125;
  }
  return {
    num,
    win,
    i,
    result,
    eosReturn: win ? Number(digit.format(98 / i * num, '0.0000')) - num : -num,
    bgReturn,
  };
};


export const getVipAward = (num) => {
  const DATA = [{
    num: 15000000,
    eos: 518 * 10,
    bg: 0,
    ratio: 0.0015,
  }, {
    num: 7500000,
    eos: 288 * 10,
    bg: 0,
    ratio: 0.0013,
  }, {
    num: 2500000,
    eos: 128 * 10,
    bg: 0,
    ratio: 0.0011,
  }, {
    num: 1000000,
    eos: 88 * 5,
    bg: 0,
    ratio: 0.0009,
  }, {
    num: 500000,
    eos: 58 * 5,
    bg: 0,
    ratio: 0.0007,
  }, {
    num: 100000,
    eos: 28 * 3,
    bg: 0,
    ratio: 0.0006,
  }, {
    num: 50000,
    eos: 18 * 3,
    ratio: 0.0005,
    bg: 0,
  }, {
    num: 10000,
    ratio: 0.0004,
    eos: 4 * 2,
    bg: 1000 * 2,
  }, {
    num: 5000,
    ratio: 0.0003,
    eos: 2 * 2,
    bg: 500 * 2,
  }, {
    num: 1000,
    ratio: 0.0002,
    eos: 0.5 * 2,
    bg: 100 * 2,
  }];
  const filterData = _.filter(DATA, (d) => num > d.num);
  return {
    eos: _.sumBy(filterData, (d) => d.eos),
    bg: _.sumBy(filterData, (d) => d.bg),
    rebate: _.reduce(filterData.reverse(), (re, d, i) => {
      const next = filterData[i + 1];
      let max = num;
      if (next) {
        max = next.num;
      }
      console.log(max, d.num);
      return re + (max - d.num) * d.ratio;
    }, 0),
    invite: num * 0.0012,
  };
};
