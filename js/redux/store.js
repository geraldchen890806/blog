

/* eslint-disable */
import React from 'react';
import { createStore, applyMiddleware, compose } from 'redux';
import middleware from './middleware';
import createReducer from './reducers';

let enhancer;
if (__DEVELOPMENT__) {
  // const { whyDidYouUpdate } = require('why-did-you-update');
  // whyDidYouUpdate(React);
  enhancer = compose(
    applyMiddleware.apply(this, middleware),
    // Provides support for DevTools:
    // Optional. Lets you write ?debug_session=<key> in address bar to persist debug sessions
    typeof window === 'object' && window.devToolsExtension
      ? window.devToolsExtension()
      : (f) => f
  );
} else {
  enhancer = compose(applyMiddleware.apply(this, middleware));
}

export const store = createStore(createReducer, enhancer);

if (module.hot) {
  module.hot.accept('./reducers', () => {
    store.replaceReducer(createReducer(store.injectedReducers));
  });
}
