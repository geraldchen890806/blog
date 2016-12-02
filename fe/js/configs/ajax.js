

import $ from 'jquery';
import Modal from 'js/utils/modal';
var exp = '{"code":-407';
$.ajaxSetup({
    xhrFields: {
        withCredentials: !(_config.noCredentials)
    },
    dataFilter: function(data, type) {
        if (data.slice(0, exp.length) == exp) {
            var d = JSON.parse(data);
            if (d.code == -407 && d.redirectUrl) {
                window.location = d.redirectUrl;
                return;
            }
        }
        return data;
    },
    error: function(xhr, state) {
        if (state == 'abort') return;
        if (state == 'timeout' || xhr.status == 502) {
            new Modal.Alert({
                title: '提示',
                content: '系统超时，请刷新页面!'
            });
        } else {
            new Modal.Alert({
                title: '提示',
                content: xhr.responseJSON.message || '系统错误，请联系管理员!'
            });
        }
    }
});
