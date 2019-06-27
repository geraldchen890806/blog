

import _ from 'lodash';
import styled from 'styled-components';
import React from 'react';
import PropTypes from 'prop-types';
import uuidv4 from 'uuid/v4';
import doImportDelegate from './imports';
// import defaultConfigs from 'mof/cardsCommonConfig';
import 'intersection-observer';

// import { CardWrapper } from './style';
// import { enhance } from './enhance';
export class Card extends React.Component {
  static contextTypes = {
    store: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);
    const { uid = uuidv4() } = props;
    this.observer = new IntersectionObserver(
      (entries) => {
        // 观察当前卡片区域是否在可视区域，选择是否加载卡片
        setTimeout(() => {
          if (entries[0] && entries[0].intersectionRatio > 0) {
            // observe once
            this.forceImport();
          }
        }, 300);
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: [0],
      }
    );
    this.state = {
      // isValid: !!cardMapping[type], // 判断卡片合法性，可用于非法卡片提示
      InnerComponent: null,
      uid,
    };
  }

  componentDidMount() {
    // 如果浏览器不支持IntersectionObserver，则直接加载卡片
    if (!this.props.lazyLoad) {
      this.importCard();
      return;
    }
    // 开启观察模式
    if (this.observer) {
      this.observer.observe(this.cardNode);
    }
    if (this.props.autoLoad > 0) {
      setTimeout(this.forceImport, this.props.autoLoad);
    }
  }

  forceImport = () => {
    if (this.importDone) return;
    if (this.observer) {
      this.observer.unobserve(this.cardNode);
    }
    this.importDone = true;
    this.importCard();
  };

  importCard = () => {
    const { type, version } = this.props;
    doImportDelegate(type, this.state.uid, this.context.store, version).then(
      ({ InnerComponent, configs }) => {
        this.setState({
          InnerComponent: enhance(InnerComponent),
          configs: { ...configs },
        });
      }
    );
  };

  render() {
    const { className, customization = {}, ...resetProps } = this.props;
    const { InnerComponent, configs = {} } = this.state;

    return (
      <CardWrapper
        id={`_${this.state.uid}`}
        className={`${className} dy-card dy-card-wrap`}
        ref={(cardNode) => {
          this.cardNode = cardNode;
        }}
      >
        {/* {isLoading && <div>Loading</div>} */}
        {InnerComponent ? (
          <InnerComponent
            uid={this.state.uid}
            {...{
              ...configs,
              customization: { ...configs.customization, ...customization },
            }}
            {...resetProps}
          />
        ) : null}
      </CardWrapper>
    );
  }
}

Card.propTypes = {
  type: PropTypes.string,
  uid: PropTypes.string,
  lazyLoad: PropTypes.bool,
  autoLoad: PropTypes.number,
  className: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
};

export default Card;

export const CardWrapper = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  transition: all ease-in-out 0.2s;
  overflow: hidden;
  min-height: 150px;

  /* 卡片内的antd message提示 相对卡片定位 */
  .ant-message {
    position: absolute;
  }
  .noDataTpl {
    .tip1,
    .tip2 {
      font-size: 12px;
    }
  }
`;
