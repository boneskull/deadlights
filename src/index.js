import {Network} from './network';
export {Network};
export {Bulb} from './bulb';

import Promise from 'bluebird';
Promise.longStackTraces();

export function discover (options = {}) {
  const network = new Network(options);
  return network.discover();
}
