const colorNamer = require('color-namer');
const rgbHex = require('rgb-hex');

const WARM_WHITE = [
  255,
  166,
  87
];

class BulbState {
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
      this.white ? rgbHex.apply(null, WARM_WHITE) : rgbHex(this.red, this.green,
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
}

exports.BulbState = BulbState;
