import { combineReducers } from 'redux';
import { routerReducer } from 'react-router-redux';

import common from 'js/containers/reducer';

export default combineReducers({
  common,
  router: routerReducer,
});
