import wx from 'weixin-js-sdk';
import $ from 'jquery';

const appId = 'wx3451a3941b095c75';

window.wx = wx;
export default function (obj) {
  // let timestamp = new Date().getTime();
  let url = location.href;
  $.ajax({
    type: 'get',
    url: `${_config.api}/wx/token?appId=${appId}&url=${url}`,
    success: (resp) => {
      wxConfig({
        appId,
        signature: resp.signature,
        nonceStr: resp.nonceStr,
        timestamp: resp.timestamp,
        obj: { ...obj, link: resp.url }
      });
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
}

wx.error((res) => {
  console.log(res);
});

wx.ready(() => {
  // 分享给朋友
  wx.onMenuShareAppMessage({
    title: '互联网之子',
    desc: '在长大的过程中，我才慢慢发现，我身边的所有事，别人跟我说的所有事，那些所谓本来如此，注定如此的事，它们其实没有非得如此，事情是可以改变的。更重要的是，有些事既然错了，那就该做出改变。',
    link: 'http://movie.douban.com/subject/25785114/',
    imgUrl: 'http://img3.douban.com/view/movie_poster_cover/spst/public/p2166127561.jpg',
    trigger(res) {
      alert('用户点击发送给朋友');
    },
    success(res) {
      alert('已分享');
    },
    cancel(res) {
      alert('已取消');
    },
    fail(res) {
      alert(JSON.stringify(res));
    }
  });

  // wx.onMenuShareAppMessage(options.obj);
  // 分享到朋友圈
  wx.onMenuShareTimeline(options.obj);
  // 分享到QQ
  wx.onMenuShareQQ(options.obj);
  // 分享到腾讯微博
  wx.onMenuShareWeibo(options.obj);
});
