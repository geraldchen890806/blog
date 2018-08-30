import _ from 'lodash';
const timers = {};

export function addTimer(key, value) {
  const cur = timers[key] || {};
  timers[key] = {
    ...value,
    cur,
  };
}

export function clearTimer(key) {
  const cur = timers[key];
  if (cur && cur.timer) {
    clearTimeout(cur.timer);
  }
  if (cur && cur.ajax && cur.ajax.abort) {
    cur.ajax.abort();
  }
  return cur;
}

export function clearAllTimer() {
  _.map(timers, (value, key) => {
    clearTimer(key);
  });
}
