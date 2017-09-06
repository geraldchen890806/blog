import wx from 'weixin-js-sdk';
import $ from 'jquery';
import sha1 from 'sha1';

const appId = 'wx3451a3941b095c75';
const secret = 'fba1e9ed15b672f05f45ac4943416105';
const nonceStr = 'test';

window.wx = wx;
export default function (obj) {
  let timestamp = new Date().getTime();
  $.ajax({
    type: 'get',
    url: `${_config.api}/wx/token?appId=${appId}&secret=${secret}`,
    success: (resp) => {
      let ticket = resp.ticket;
      let params = {
        appId,
        signature,
        nonceStr,
        timestamp
      };
      let signature = sha1(`jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${location.href}`);
      wxConfig({ ...params, signature, obj });
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
      console.log('success');
      // 以键值对的形式返回，可用的api值true，不可用为false
      // 如：{"checkResult":{"chooseImage":true},"errMsg":"checkJsApi:ok"}
    },
    error: (resp) => {
      console.log(resp);
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
    console.log(res);
  });
}
