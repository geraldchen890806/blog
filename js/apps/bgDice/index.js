import { Tabs } from 'antd';
import React from 'react';
import { StyledDiv } from './style';
import Type1 from './views/type1';
import Type2 from './views/type2';
import Type3 from './views/type3';
const { TabPane } = Tabs;


export default class BG extends React.PureComponent {
  render() {
    return (
      <StyledDiv>
        <Tabs defaultActiveKey="1">
          <TabPane tab="倍数玩法" key="1">
            <Type1 />
          </TabPane>
          <TabPane tab="95日常" key="2">
            <Type2 />
          </TabPane>
          <TabPane tab="普通押注" key="3">
            <Type3 />
          </TabPane>
        </Tabs>
      </StyledDiv>
    );
  }
}
