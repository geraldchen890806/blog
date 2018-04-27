

import $ from 'jquery';
const exp = '{"code":-407';
$.ajaxSetup({
  xhrFields: {
    withCredentials: !(_config.noCredentials),
  },
  dataFilter(data, type) {
    if (data.slice(0, exp.length) == exp) {
      const d = JSON.parse(data);
      if (d.code == -407 && d.redirectUrl) {
        window.location = d.redirectUrl;
        return;
      }
    }
    return data;
  },
  error(xhr, state) {
    if (state == 'abort') return;
    if (state == 'timeout' || xhr.status == 502) {
    } else {
    }
  },
});
