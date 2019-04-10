/** Copyright © 2013-2019 DataYes, All Rights Reserved. */

import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import _ from 'lodash';

import reducerInjectrors from 'js/utils/injectReducer/reducerInjectors';

if (!window.uidMap) window.uidMap = {}; // uid得在container和其他产品卡片加载上下文中共享
const { uidMap } = window;
// const defaultMapStateToProps = (state) => state;
const mapStateToProps = (state, { uid }) => {
  const {
    // component: { mapStateToProps: mapStateToPropsForCard },
    reducerKey,
  } = uidMap[uid];
  const stateForCard = _.get(state, ['cards', uid]);
  const mapStateToPropsForCard = _.get(
    uidMap[uid],
    'component.default.mapStateToProps'
  );
  // if (!stateForCard) return {};
  if (!mapStateToPropsForCard) return _.get(stateForCard, reducerKey);
  return mapStateToPropsForCard(stateForCard);
};

const getDispatchToProps = (actions, uid) => (dispatch) => {
  // 定制dispatch, 注入uid
  const dis = (action) => {
    if (typeof action === 'object') dispatch({ ...action, uid });
    else action(dis);
  };
  const re = Object.keys(actions)
    .filter((name) => typeof actions[name] === 'function')
    .reduce((actionsBinded, name) => {
      const result = { ...actionsBinded };
      result[name] = bindActionCreators(actions[name], dis);
      return result;
    }, {});

  re.actions = { ...re };
  re.dispatch = dispatch;

  return re;
};

// 用我们的mapStateToProps, mapDispatchToProps来重新绑定组件类
const conn = (Comp, actions, id) => connect(
  mapStateToProps,
  getDispatchToProps(actions, id)
)(Comp);

const cardReducer = (stateDefault = {}, action) => {
  let state = stateDefault; // To resolve eslint no-param-reassign
  const { uid } = action;
  if (!uid) return state;
  const { reducer: reducerForCard, reducerKey } = uidMap[uid];
  const stateGlobleFake = state[uid];
  if (!stateGlobleFake) state = _.set(state, [uid], {});
  const stateForCard = _.get(state, [uid, reducerKey]);
  state = _.set(state, [uid, reducerKey], reducerForCard(stateForCard, action));
  return { ...state };
};

// use doImport.bind(import('reducer'), import('actions'), import('componet'), className, type)
/**
 doImport(id, store).then(Comp => {...}.catch(console.error));
*/

const combineComponent = (imports, componentName, type, uid, store) => {
  const { injectReducer } = reducerInjectrors(store);
  const {
    reducer = (state) => state, actions = {}, component,
  } = imports;

  if (!store.injectedReducers.cards) {
    injectReducer('cards', cardReducer);
  }

  uidMap[uid] = {
    reducer: reducer.default || reducer,
    component,
    reducerKey: type,
  };
  store.dispatch({ type: '@@INIT', uid });

  return conn(component[componentName], actions.default || actions, uid);
};

export default (type, uid, store) => {
  const { importConfig, configs = {} } = window.cardMapping[type] || {};
  if (!importConfig) {
    console.log(type, uid, store);
  }
  const { imports, componentName, componentType } = importConfig;

  return new Promise((resolve) => {
    const resolved = typeof imports === 'function'
      ? imports()
      : new Promise((resolveM) => resolveM(imports));

    resolved.then((m) => {
      const InnerComponent = combineComponent(
        m,
        componentName,
        componentType,
        uid,
        store
      );
      resolve({
        InnerComponent,
        configs,
      });
    });
  });
};
