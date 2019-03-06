import thunk from 'redux-thunk';
import { routerMiddleware } from 'connected-react-router';
import logger from './logger';
import history from './history';

export default [thunk, logger, routerMiddleware(history)];
