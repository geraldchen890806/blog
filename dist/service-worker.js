// 历史残留 Service Worker 的自我注销脚本
// 老访客浏览器仍缓存着旧 SW 并反复请求此文件;本脚本让其卸载自身后刷新页面
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => {
  self.registration.unregister()
    .then(() => self.clients.matchAll())
    .then(clients => clients.forEach(client => client.navigate(client.url)));
});
