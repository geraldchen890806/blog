
## Progressive Web App, 简称 [PWA](https://lavas.baidu.com/pwa)，是提升 Web App 的体验的一种新方法，能给用户原生应用的体验。

### PWA 能做到原生应用的体验不是靠特指某一项技术，而是经过应用一些新技术进行改进，在安全、性能和体验三个方面都有很大提升，PWA 本质上是 Web App，借助一些新技术也具备了 Native App 的一些特性，兼具 Web App 和 Native App 的优点。

### PWA 的主要特点包括下面三点：

1. 可靠 - 即使在不稳定的网络环境下，也能瞬间加载并展现
2. 体验 - 快速响应，并且有平滑的动画响应用户的操作
3. 粘性 - 像设备上的原生应用，具有沉浸式的用户体验，用户可以添加到桌面

### 可靠
  通过 [Service Worker](https://developers.google.cn/web/fundamentals/primers/service-workers/) 能够让用户在网络条件很差或离线的情况下也能瞬间加载并且展现。

  介绍个sw的简便实现方法 [offline-plugin](https://github.com/NekR/offline-plugin)

```
  // webpack.config.js
  var OfflinePlugin = require('offline-plugin');
  module.exports = {
    plugins: [
      new OfflinePlugin({
        Caches: 'all'
      })
    ]
  }
  //index.js
  import * as OfflinePluginRuntime from 'offline-plugin/runtime';
  OfflinePluginRuntime.install();
```

### 体验
  首屏加载优化
  [App Shell](https://developers.google.cn/web/fundamentals/architecture/app-shell)

### 粘性
  借助 [Web App Manifest](https://developers.google.cn/web/fundamentals/web-app-manifest/?hl=zh-cn) 提供给用户和 Native App 一样的沉浸式体验
  可以通过给用户[发送离线通知](https://developers.google.cn/web/fundamentals/push-notifications/?hl=zh-cn)，让用户回流


### 坑：
  1. ios桌面icon 实现依然使用[link](https://developer.apple.com/library/content/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)标签
  2. 全站必须使用https, [免费证书](https://www.sslforfree.com/)
  3. manifest.json配置的start-url必须在sw.js缓存列表中，否则无法离线使用


### 推荐阅读文章：

  1. [下一代 Web 应用模型 —— Progressive Web App](https://huangxuan.me/2017/02/09/nextgen-web-pwa/)
  2. [饿了么的 PWA 升级实践](https://huangxuan.me/2017/07/12/upgrading-eleme-to-pwa/)
  3. [Your first service worker](https://www.hacklabo.com/your-first-service-worker/)