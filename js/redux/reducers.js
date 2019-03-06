import { combineReducers } from 'redux';
import { connectRouter } from 'connected-react-router';
import history from 'js/utils/history';
import common from 'js/containers/reducer';

export default combineReducers({
  common,
  router: connectRouter(history),
});
