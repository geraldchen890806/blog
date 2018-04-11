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
if (process.env.NODE_ENV === 'production') {
  require('offline-plugin/runtime').install(); // eslint-disable-line global-require
}
