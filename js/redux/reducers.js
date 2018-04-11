import { combineReducers } from 'redux';
import { routerReducer } from 'react-router-redux';

import common from 'js/containers/reducer';
import home from 'js/apps/home/reducer';

export default combineReducers({
  common,
  home,
  router: routerReducer
});
