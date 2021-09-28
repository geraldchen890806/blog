import React from 'react';
import { Button } from 'antd';
import styled from 'styled-components';
import QRCode from 'qrcode.react';
import {check} from './check';

export default class Inch extends React.PureComponent {
  state = {};

  doCheck = () => {
    clearTimeout(this.timer);
    check().then(resp => {
      this.setState(resp)
    })
  }

  componentWillUnmount() {
    clearTimeout(this.timer);
  }

  render() {
    return (
      <StyledDiv>
        {JSON.stringify(this.state, null, '  ')}

        <Button onClick={this.doCheck}>check </Button>
      </StyledDiv>
    );
  }
}

const StyledDiv = styled.div`
  textarea.ant-input {
    height: 100px;
  }
  .desc {
    margin-bottom: 0.15rem;
    text-align: center;
    font-size: 0.16rem;
    line-height: 0.2rem;
    color: #828387;
  }
  .qrCode {
    width: 2rem;
    height: 2rem;
  }
`;
