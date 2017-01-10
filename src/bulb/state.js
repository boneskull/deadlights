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
      this.mode = this.white ? 'white' : 'color';
    } else {
      this.mode = this.rawMode;
    }
  }

  get color () {
    return this.white ? rgbHex.apply(null, WARM_WHITE_RGB) : rgbHex(this.red,
        this.green, this.blue);
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
}
