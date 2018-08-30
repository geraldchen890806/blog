import thunk from 'redux-thunk';
import { routerMiddleware } from 'react-router-redux';
import logger from './logger';
import history from './history';

export default [thunk, logger, routerMiddleware(history)];
