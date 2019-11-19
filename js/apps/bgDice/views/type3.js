import _ from 'lodash';
import React from 'react';
import digit from 'js/utils/digit';
import { Button, Input } from 'antd';
import { StyledType3 } from '../style';
import { createData, getVipAward } from '../createData';

export default class Type2 extends React.PureComponent {
  state = {
    flag: false,
    num: 1,
    ratio: 1,
    results: new Array(93).fill('').map((d, i) => ({ i: i + 3, result: [] })),
  }

  run = () => {
    const { flag, results } = this.state;
    if (flag) {
      this.setState({
        results: results.map(({ i, result }) => {
          const newResult = this.doItem(result, i);
          const eosReturn = _.sumBy(newResult, 'eosReturn');
          return {
            i,
            eosReturn,
            result: newResult,
          };
        }),
      }, () => {
        setTimeout(() => {
          this.run();
        }, 2000);
      });
    }
  }

  doItem = (array, start) => {
    let r = array;
    const { ratio, num } = this.state;
    for (let i = 0; i < 1000; i += 1) {
      r = this.do(r, ratio, num, start);
    }
    return r;
  }

  do = (array = [], ratio, num, start) => {
    const cNum = num;
    const item = createData({
      i: start, length: 1, num: cNum, ratio,
    });
    return array.concat(item);
  }

  render() {
    const {
      flag, results = [], ratio, num, sort = 'i',
    } = this.state;
    // const showResults = _.values(result);
    const totalNum = _.get(results, '[0].result.length', 0);
    const vip = getVipAward(totalNum * num);
    return (
      <StyledType3>
        <div>
          投注金额：
          <Input style={{ width: 200 }} value={num} onChange={(e) => this.setState({ num: e.target.value })} />
        </div>
        <div>
          人品加成：
          <Input style={{ width: 200 }} value={ratio} onChange={(e) => this.setState({ ratio: e.target.value })} />
        </div>
        <div>
          投注次数：
          {totalNum}
        </div>
        <div>
          VIP奖励：
          EOS：
          {`${vip.eos} + ${vip.rebate}`}
          {'   '}
          BG：
          {vip.bg}
          {'   '}
          invite：
          {vip.invite}
        </div>
        <div>
          <Button
            onClick={() => {
              this.setState({ flag: !flag }, this.run);
            }}
          >
            {flag ? '结束' : '开始'}
          </Button>
          <Button
            style={{ margin: '0 10px' }}
            onClick={() => {
              this.setState({ flag: !flag, results: new Array(93).fill('').map((d, i) => ({ i: i + 3, result: [] })) });
            }}
          >
            重置
          </Button>
          <Button
            style={{ margin: '0 10px' }}
            onClick={() => {
              this.setState({ sort: sort == 'i' ? 'eosReturn' : 'i' });
            }}
          >
            排序
          </Button>
        </div>
        <ul>
          {_.orderBy(results, sort, 'desc').map((item) => {
            const { i, result, eosReturn } = item;
            const sumReturn = digit.format(eosReturn, '0.0000');
            const sumBg = digit.format(_.sumBy(result, 'bgReturn'), '0.0000');
            return (
              <li key={i} className={`${sumReturn > 0 ? 'green' : 'red'}`}>
                <div className="title">
                  {i}
                </div>
                <div>
                  盈利EOS：
                  <b>
                    {sumReturn}
                  </b>
                </div>
                <div>
                  挖矿BG：
                  {sumBg}
                </div>
              </li>
            );
          })}
        </ul>

      </StyledType3>
    );
  }
}
