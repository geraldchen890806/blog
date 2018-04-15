import 'babel-polyfill';
import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';

import _ from 'lodash';
import $ from 'jquery';
window.$ = window.jQuery = $;

import './configs/index';
import '../style/main.less';
import { store } from './redux/store';

import 'github-markdown-css/github-markdown.css';

import App from 'js/containers';

if (module.hot) {
  module.hot.accept();
}
render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root')
);


// Install ServiceWorker and AppCache in the end since
// it's not most important operation and if main code fails,
// we do not want it installed
import runtime from 'offline-plugin/runtime';
if (process.env.NODE_ENV === 'production') {
  runtime.install({ // eslint-disable-line global-require
    onUpdating: () => {
      console.log('SW Event:', 'onUpdating');
    },
    onUpdateReady: () => {
      console.log('SW Event:', 'onUpdateReady');
      // Tells to new SW to take control immediately
      runtime.applyUpdate();
    },
    onUpdated: () => {
      console.log('SW Event:', 'onUpdated');
      // Reload the webpage to load into the new version
      window.location.reload();
    },

    onUpdateFailed: () => {
      console.log('SW Event:', 'onUpdateFailed');
    },
  });
}
