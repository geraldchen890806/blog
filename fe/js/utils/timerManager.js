

import _ from 'lodash';
var timers = {};

export function addTimer(key, value) {
    let cur = timers[key] || {};
    timers[key] = {...value,
        cur
    };
}

export function clearTimer(key) {
    let cur = timers[key];
    if (cur && cur.timer) {
        clearTimeout(cur.timer);
    }
    if (cur && cur.ajax) {
        cur.ajax.abort && cur.ajax.abort();
    }
    return cur;
}

export function clearAllTimer() {
    _.map(timers, (value, key) => {
        clearTimer(key);
    });
}
