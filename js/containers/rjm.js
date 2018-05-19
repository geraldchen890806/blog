
import React, { Component } from 'react';
import ReactAudioPlayer from 'react-audio-player';
import { Carousel } from 'antd';

import img1 from 'img/rjm/1.jpeg';
import img2 from 'img/rjm/2.jpeg';
import img3 from 'img/rjm/3.jpeg';
import img4 from 'img/rjm/4.jpeg';
import audio from 'img/rjm/1.mp3';

export default class RJM extends Component {


  render() {
    const height = document.body.clientHeight;
    return (
      <div style={{ width: '100%', margin:'0 auto'}} ref={c => this.ul = c}>
        <Carousel>
          <div><img src={img1} height={height}/></div>
          <div><img src={img2} height={height}/></div>
          <div><img src={img3} height={height}/></div>
          <div><img src={img4} height={height}/></div>
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
