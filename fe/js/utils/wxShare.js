import wx from 'weixin-js-sdk';

export default function (obj) {
  let params = {
    appid: 'xxx',
    appSecret: 'xxx',
    noncestr: 'test',
    timestamp: new Date().getTime(),
    url: location.href
  };
  $.ajax({
    type: 'post',
    url: 'https://gw.wmcloud-stg.com/cloud/wechatapp/jsapi/ticket/signature.json',
    data: JSON.stringify({
      ...params
    }),
    success: (resp) => {
      if (resp.data) {
        wxConfig({ signature: resp.data, ...params, obj });
      }
    }
  });
}

function wxConfig(options) {
  wx.config({
    debug: true, // 开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印。
    appId: options.appId, // 必填，公众号的唯一标识
    timestamp: options.timestamp, // 必填，生成签名的时间戳
    nonceStr: options.nonceStr, // 必填，生成签名的随机串
    signature: options.signature, // 必填，签名，见附录13
    jsApiList: ['onMenuShareAppMessage', 'onMenuShareTimeline', 'onMenuShareQQ', 'onMenuShareWeibo'] // 必填，需要使用的JS接口列表，所有JS接口列表见附录2
  });
  wx.checkJsApi({
    jsApiList: ['onMenuShareAppMessage'], // 需要检测的JS接口列表，所有JS接口列表见附录2,
    success(res) {
      // 以键值对的形式返回，可用的api值true，不可用为false
      // 如：{"checkResult":{"chooseImage":true},"errMsg":"checkJsApi:ok"}
    },
    error: (resp) => {
      // console.log(resp);
    }
  });
  wx.ready(() => {
    // 分享给朋友
    wx.onMenuShareAppMessage(options.obj);
    // 分享到朋友圈
    wx.onMenuShareTimeline(options.obj);
    // 分享到QQ
    wx.onMenuShareQQ(options.obj);
    // 分享到腾讯微博
    wx.onMenuShareWeibo(options.obj);
  });
  wx.error((res) => {
    // console.log(res);
  });
}
