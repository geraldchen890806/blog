import _ from 'lodash';
import React from 'react';
import { Button, Input } from 'antd';
import { StyledType1 } from '../style';
import { createData } from '../createData';

export default class Type2 extends React.PureComponent {
  state = {
    flag: false,
    start: 95,
    num: 1,
    ratio: 1,
    result: [],
  }

  run = () => {
    if (this.state.flag) {
      // result[i] = this.doItem(result[i] || []);
      this.setState({
        result: this.doItem(this.state.result),
      }, () => {
        setTimeout(() => {
          this.run();
        }, 1000);
      });
    }
  }

  doItem = (array) => {
    let r = array;
    const { ratio, num, start } = this.state;
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
      flag, result = [], start, ratio, num,
    } = this.state;
    return (
      <StyledType1>
        <div>
          押注点数：
          <Input style={{ width: 200 }} value={start} onChange={(e) => this.setState({ start: e.target.value })} />
        </div>
        <div>
          投注金额：
          <Input style={{ width: 200 }} value={num} onChange={(e) => this.setState({ num: e.target.value })} />
        </div>
        <div>
          人品加成：
          <Input style={{ width: 200 }} value={ratio} onChange={(e) => this.setState({ ratio: e.target.value })} />
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
              this.setState({ flag: !flag, result: [] });
            }}
          >
            重置
          </Button>
        </div>
        <div>
          投注次数：
          {result.length}
        </div>
        <div>
          总盈利EOS：
          {_.sumBy(result, 'eosReturn')}
        </div>
      </StyledType1>
    );
  }
}
