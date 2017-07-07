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

import App from 'js/containers';

if (module.hot) {
  module.hot.accept();
}

if (module.hot) {
  module.hot.accept();
}

render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root')
);
