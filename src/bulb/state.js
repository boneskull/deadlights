import 'source-map-support/register';
import colorNamer from 'color-namer';
import rgbHex from 'rgb-hex';
import _ from 'lodash';

// this is roughly 2700K
export const WARM_WHITE_RGB = [
  255,
  166,
  87
];

export class BulbState {
  get mode () {
    if (this.rawMode === 'rgbw') {
      return this.white ? 'white' : 'color';
    } else {
      return this.rawMode;
    }
  }

  get color () {
    return this.mode === 'white' ? rgbHex.apply(null, WARM_WHITE_RGB) : rgbHex(
        this.red, this.green, this.blue);
  }

  get colorName () {
    return this.white
      ? `Warm White (${Math.round(this.white / 255 * 100)}%)`
      : colorNamer(this.color)
        .ntc
        .shift().name;
  }

  update (newState = {}) {
    const state = new BulbState();
    _.defaults(state, newState, this);
    return state;
  }

  toJSON () {
    return {
      mode: this.mode,
      blue: this.blue,
      green: this.green,
      red: this.red,
      color: this.color,
      colorName: this.colorName,
      speed: this.speed,
      white: this.white,
      isOn: this.isOn
    };
  }
}
