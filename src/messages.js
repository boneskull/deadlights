import 'source-map-support/register';
import {Parser} from 'binary-parser';
import {BulbState} from './bulb/state';

export const QUERY_STATE = {
  command: [
    0x81,
    0x8a,
    0x8b
  ],
  parser: new Parser().create(BulbState)
    .skip(2)
    .uint8('isOn', {
      formatter: num => num === 0x23
    })
    .uint8('rawMode', {
      formatter: num => {
        switch (num) {
          case 0x60:
            return 'custom';
          case 0x61:
          case 0x62:
            /* falls-through */
            return 'rgbw';
          default:
            return 'preset';
        }
      }
    })
    .skip(1)
    .uint8('speed', {
      // note speed & delay are inverted
      formatter: num => {
        const MIN_DELAY = 0x01;
        const MAX_DELAY = 0x1f;
        const MIN_SPEED = 0x00;
        const MAX_SPEED = 0x64;

        return (num - MIN_DELAY) * (MIN_SPEED - MAX_SPEED) /
          (MAX_DELAY - MIN_DELAY) + MAX_SPEED;
      }
    })
    .uint8('red')
    .uint8('green')
    .uint8('blue')
    .uint8('white')
};

export const SWITCH_ON = {
  command: [
    0x71,
    0x23,
    0x0f
  ]
};

export const SWITCH_OFF = {
  command: [
    0x71,
    0x24,
    0x0f
  ]
};

export const SET_RGB = {
  command (red, green, blue, persist = true) {
    return [persist ? 0x31 : 0x41].concat(red, green, blue, 0x00, 0xf0, 0x0f);
  }
};
