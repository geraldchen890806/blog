

import {
    createStore,
    applyMiddleware,
    compose
} from 'redux';
import {
    devTools
} from 'redux-devtools';
import middleware from './middleware';
import reducer from './reducers';
// import DevTools from '../containers/DevTools';

let finalCreateStore;
if (__DEVELOPMENT__) {
    finalCreateStore = compose(
        applyMiddleware.apply(this, middleware),
        // Provides support for DevTools:
        // Optional. Lets you write ?debug_session=<key> in address bar to persist debug sessions
        typeof window === 'object' && window.devToolsExtension && window.devToolsExtension() || devTools.instrument()
    )(createStore);
} else {
    finalCreateStore = compose(
        applyMiddleware.apply(this, middleware)
    )(createStore);
}

export const store = finalCreateStore(reducer);
