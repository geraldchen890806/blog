import React, { Component } from 'react';
import ReactAudioPlayer from 'react-audio-player';
import { Carousel } from 'antd';
import audio from 'img/rjm/1.mp3';
import img1 from 'img/rjm/1.jpeg';
import img2 from 'img/rjm/2.jpeg';
import img3 from 'img/rjm/3.jpeg';
import img4 from 'img/rjm/4.jpeg';
const images = [img1, img2, img3, img4];

export default class RJM extends Component {
  render() {
    const height = document.body.clientHeight;
    const width = document.body.clientWidth;
    return (
      <div style={{ width: '100%', margin: '0 auto' }} ref={(c) => (this.ul = c)}>
        <Carousel autoplay infinite>
          {images.map((img, i) => (
            <div key={i}>
              <img
                src={img}
                style={{ maxWidth: width, maxHeight: height, margin: '0 auto' }}
              />
            </div>
          ))}
        </Carousel>
        <ReactAudioPlayer src={audio} autoPlay loop />
      </div>
    );
  }
}
