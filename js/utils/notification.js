const { Notification } = window || {};

export default (options) => {
  if (!Notification) return;
  if (Notification.permission === 'granted') {
    doNotification(options);
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission(() => {
      doNotification(options);
    });
  }
};

const doNotification = (options = {}) => {
  const notification = new Notification(options.title, {
    ...options,
  });
  notification.onclick = options.callback || function callback() {};
};
