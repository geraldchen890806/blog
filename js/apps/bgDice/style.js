import styled from 'styled-components';

export const StyledDiv = styled.div`
  padding: 20px 60px;
`;


export const StyledType1 = styled.div`
  div {
    margin: 10px 0;
  }
`;


export const StyledType3 = styled.div`
  div {
    margin: 10px 0;
  }
  ul {
    display: flex;
    flex-wrap: wrap;
    li {
      border: 1px solid #e3e3e3;
      width: 180px;
      margin: 10px;
      padding: 10px;
      &.green {
        background: green;
        color: #fff;
      }
      .title {
        text-align: center;
        font-size: 25px;
      }
      b {
        font-size: 16px;
      }
    }
  }
`;
