
import React, { Component } from 'react';
import ReactAudioPlayer from 'react-audio-player';
import { Carousel } from 'antd';
import audio from 'img/rjm/1.mp3';
const images = [
  'https://thumbnail0.baidupcs.com/thumbnail/cbba538d6985e710f8c58ee9264703b3?fid=1812085760-250528-890003818788363&rt=pr&sign=FDTAER-DCb740ccc5511e5e8fedcff06b081203-AD68wg%2bvyX9LVF10sACFGtOThg8%3d&expires=8h&chkbd=0&chkv=0&dp-logid=3222921070115128926&dp-callid=0&time=1526742000&size=c1680_u1050&quality=90&vuk=1812085760&ft=image&autopolicy=1',
  'https://thumbnail0.baidupcs.com/thumbnail/01a5ef2330279f8d801625a9358a313d?fid=1812085760-250528-1034884624288374&rt=pr&sign=FDTAER-DCb740ccc5511e5e8fedcff06b081203-GL2YMv7Ye%2bdE0%2fPAFu9K52i5SYE%3d&expires=8h&chkbd=0&chkv=0&dp-logid=3222921070115128926&dp-callid=0&time=1526742000&size=c1680_u1050&quality=90&vuk=1812085760&ft=image&autopolicy=1',
  'https://thumbnail0.baidupcs.com/thumbnail/78e54e18f994de81b99c51b75ab9ab0b?fid=1812085760-250528-972758474267874&rt=pr&sign=FDTAER-DCb740ccc5511e5e8fedcff06b081203-kTfbSK3E6EBDIq7E0It%2b3IZZwI0%3d&expires=8h&chkbd=0&chkv=0&dp-logid=3222921070115128926&dp-callid=0&time=1526742000&size=c1680_u1050&quality=90&vuk=1812085760&ft=image&autopolicy=1',
  'https://thumbnail0.baidupcs.com/thumbnail/10da85120c7cb8d4321566dd90f97c6c?fid=1812085760-250528-914670250859595&rt=pr&sign=FDTAER-DCb740ccc5511e5e8fedcff06b081203-GFGAvK3xRJAFJJHu7ydkyDbr8wY%3d&expires=8h&chkbd=0&chkv=0&dp-logid=3222921070115128926&dp-callid=0&time=1526742000&size=c1680_u1050&quality=90&vuk=1812085760&ft=image&autopolicy=1',
  'https://thumbnail0.baidupcs.com/thumbnail/b8e54e6bb9c7098d2cc12b9b75d1e0d0?fid=1812085760-250528-334516620893124&rt=pr&sign=FDTAER-DCb740ccc5511e5e8fedcff06b081203-OaPbd7yusIeB%2fy%2bNXjrpcbGonDk%3d&expires=8h&chkbd=0&chkv=0&dp-logid=3222921070115128926&dp-callid=0&time=1526742000&size=c1680_u1050&quality=90&vuk=1812085760&ft=image&autopolicy=1',
  'https://thumbnail0.baidupcs.com/thumbnail/2e3dc2b09487e492ff6f2cafa776f9ef?fid=1812085760-250528-963610901574667&rt=pr&sign=FDTAER-DCb740ccc5511e5e8fedcff06b081203-sBYf%2b65XbT1SDmNux67fSLxm5nU%3d&expires=8h&chkbd=0&chkv=0&dp-logid=3222921070115128926&dp-callid=0&time=1526742000&size=c1680_u1050&quality=90&vuk=1812085760&ft=image&autopolicy=1',
  'https://thumbnail0.baidupcs.com/thumbnail/afee9f3a21e3ffcbc0b15ae9a732b15b?fid=1812085760-250528-276717652926289&rt=pr&sign=FDTAER-DCb740ccc5511e5e8fedcff06b081203-CKYeufIHMpvxflz85mPJZon9PGw%3d&expires=8h&chkbd=0&chkv=0&dp-logid=3222921070115128926&dp-callid=0&time=1526742000&size=c1680_u1050&quality=90&vuk=1812085760&ft=image&autopolicy=1',
  'https://thumbnail0.baidupcs.com/thumbnail/072ffce0ed14692e5bc592eb64cbd9e9?fid=1812085760-250528-594607158923128&rt=pr&sign=FDTAER-DCb740ccc5511e5e8fedcff06b081203-OeGkDp%2b3UyLutuia3P9UA9NbksY%3d&expires=8h&chkbd=0&chkv=0&dp-logid=3222921070115128926&dp-callid=0&time=1526742000&size=c1680_u1050&quality=90&vuk=1812085760&ft=image&autopolicy=1',
  'https://thumbnail0.baidupcs.com/thumbnail/072ffce0ed14692e5bc592eb64cbd9e9?fid=1812085760-250528-594607158923128&rt=pr&sign=FDTAER-DCb740ccc5511e5e8fedcff06b081203-OeGkDp%2b3UyLutuia3P9UA9NbksY%3d&expires=8h&chkbd=0&chkv=0&dp-logid=3222921070115128926&dp-callid=0&time=1526742000&size=c1680_u1050&quality=90&vuk=1812085760&ft=image&autopolicy=1',
  'https://thumbnail0.baidupcs.com/thumbnail/2165206eb774a812bb38152382c1778b?fid=1812085760-250528-240672393625039&rt=pr&sign=FDTAER-DCb740ccc5511e5e8fedcff06b081203-8KULRocXlOTrvd0jrG67p5iPNng%3d&expires=8h&chkbd=0&chkv=0&dp-logid=3222921070115128926&dp-callid=0&time=1526742000&size=c1680_u1050&quality=90&vuk=1812085760&ft=image&autopolicy=1',
  'https://thumbnail0.baidupcs.com/thumbnail/2165206eb774a812bb38152382c1778b?fid=1812085760-250528-190634328052694&rt=pr&sign=FDTAER-DCb740ccc5511e5e8fedcff06b081203-KPjpk%2bbm5fMoBFnE68AIxBjy4mo%3d&expires=8h&chkbd=0&chkv=0&dp-logid=3222921070115128926&dp-callid=0&time=1526742000&size=c1680_u1050&quality=90&vuk=1812085760&ft=image&autopolicy=1',
  'https://thumbnail0.baidupcs.com/thumbnail/ac922edd917a4ecf7d2cd20cc4471764?fid=1812085760-250528-673544679596556&rt=pr&sign=FDTAER-DCb740ccc5511e5e8fedcff06b081203-CB4BbOUMI9T9JjfT%2fb578Fr9KXA%3d&expires=8h&chkbd=0&chkv=0&dp-logid=3222921070115128926&dp-callid=0&time=1526742000&size=c1680_u1050&quality=90&vuk=1812085760&ft=image&autopolicy=1',
  'https://thumbnail0.baidupcs.com/thumbnail/7ac1dabd7a268695d0305abeda9885ee?fid=1812085760-250528-698683817577903&rt=pr&sign=FDTAER-DCb740ccc5511e5e8fedcff06b081203-PmgWeyM6UVny93KCOK3G%2fAQp5jk%3d&expires=8h&chkbd=0&chkv=0&dp-logid=3222921070115128926&dp-callid=0&time=1526742000&size=c1680_u1050&quality=90&vuk=1812085760&ft=image&autopolicy=1',
  'https://thumbnail0.baidupcs.com/thumbnail/ac922edd917a4ecf7d2cd20cc4471764?fid=1812085760-250528-1028720123154243&rt=pr&sign=FDTAER-DCb740ccc5511e5e8fedcff06b081203-sfcHHLfBPa9M2Dq69kzd45UM5EE%3d&expires=8h&chkbd=0&chkv=0&dp-logid=3222921070115128926&dp-callid=0&time=1526742000&size=c1680_u1050&quality=90&vuk=1812085760&ft=image&autopolicy=1',
]

export default class RJM extends Component {


  render() {
    const height = document.body.clientHeight;
    const width = document.body.clientWidth;
    return (
      <div style={{ width: '100%', margin:'0 auto'}} ref={c => this.ul = c}>
        <Carousel autoplay infinite>
          {images.map((img, i) => <div key={i}>
            <img 
              src={img}
              style={{maxWidth: width, maxHeight: height, margin: '0 auto'}}
            />
          </div>)}
        </Carousel>
        <ReactAudioPlayer
          src={audio}
          autoPlay
          loop
        />
      </div>
    );
  }
}
