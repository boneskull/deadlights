'use strict';

const colorNamer = require('color-namer');
const rgbHex = require('rgb-hex');
const _ = require('lodash');

// this is roughly 2700K
const WARM_WHITE_RGB = [
  255,
  166,
  87
];

class BulbState {
  constructor () {
    Object.defineProperties(this, {
      cachedColor: {
        value: null,
        writable: true,
        enumerable: false
      },
      cachedColorName: {
        value: null,
        writable: true,
        enumerable: false
      }
    });
  }

  get mode () {
    if (this.rawMode === 'rgbw') {
      return this.white ? 'white' : 'color';
    }
    return this.rawMode;
  }

  get color () {
    if (this.cachedColor) {
      return this.cachedColor;
    }
    this.cachedColor =
      this.white ? rgbHex.apply(null, WARM_WHITE_RGB) : rgbHex(this.red, this.green,
          this.blue);
    return this.cachedColor;
  }

  get colorName () {
    if (this.cachedColorName) {
      return this.cachedColorName;
    }
    this.cachedColorName = this.white
      ? `Warm White (${Math.round(this.white / 255 * 100)}%)`
      : colorNamer(this.color)
        .ntc
        .shift().name;
    return this.cachedColorName;
  }

  update (newState = {}) {
    return new BulbState(_.defaults(newState, this));
  }
}

exports.BulbState = BulbState;
exports.WARM_WHITE = WARM_WHITE_RGB;
