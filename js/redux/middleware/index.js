import thunk from 'redux-thunk';
import logger from './logger';
import history from './history';
import { routerMiddleware } from 'react-router-redux';

export default [thunk, logger, routerMiddleware(history)];
