import 'source-map-support/register';
import dgram from 'dgram';
import _ from 'lodash/fp';
import {EventEmitter} from 'events';
import {Bulb} from './bulb';
import Promise from 'bluebird';
import NodeCache from 'node-cache';
import {getNetworkInterface} from './network-interface';

export const DISCOVERY_PORT = 48899;
export const DISCOVERY_MESSAGE = 'HF-A11ASSISTHREAD';
// seconds
export const STALE_BULB_TTL = 300;
// seconds
export const STALE_BULB_CHECK_PERIOD = 60;
/**
 * @type {{keepOpen: boolean}}
 */
export const NETWORK_DEFAULTS = {
  keepOpen: false
};

export const CACHE_CHECK_PERIOD = 5000;

export class Network extends EventEmitter {
  constructor (options = {}) {
    super();
    options = _.defaults(NETWORK_DEFAULTS, options);

    this.cache = new NodeCache({
      checkperiod: CACHE_CHECK_PERIOD / 1000,
      useClones: false
    }).on('del', (id, bulb) => {
      this.emit('bulb-removed', bulb);
    })
      .on('expired', (id, bulb) => {
        this.emit('bulb-expired', bulb);
      });

    this.interfaceInfo = getNetworkInterface(options);
    this.keepOpen = Boolean(options.keepOpen);
  }

  close () {
    return new Promise(resolve => {
      if (this.sock && this.sock.fd) {
        this.sock.close(() => resolve(this));
        return;
      }
      resolve(this);
    });
  }

  createSocket () {
    // we cannot reuse the address here; it doesn't work.
    // I don't know why.  if the port's in use, let it throw.
    this.sock = dgram.createSocket({
      type: 'udp4'
    })
      .on('error', err => {
        this.emit('error', err);
      });
  }

  bind () {
    if (!this.sock) {
      this.createSocket();
    }
    return new Promise(resolve => {
      // there has to be a better way?
      // if fd === null, we aren't bound.
      if (this.sock.fd) {
        resolve(this.sock);
        return;
      }
      this.sock.bind(DISCOVERY_PORT, () => {
        this.sock.setBroadcast(true);
        resolve(this.sock);
      });
    })
      .disposer(sock => {
        if (!this.keepOpen && sock.fd) {
          sock.close();
        }
      });
  }

  discover ({timeout = 2000, onlyNew = true} = {}) {
    const discoveredBulbs = new Map();
    const oldBulbs = this.cache.mget(this.cache.keys());
    const onMessage = (msg, rinfo) => {
      // ignore our initial broadcast
      msg = String(msg);
      if (msg !== DISCOVERY_MESSAGE) {
        const [ipAddress, id, model] = msg.split(',');
        let bulb = this.cache.get(id);
        let isNewBulb = false;
        if (!bulb) {
          isNewBulb = true;
          bulb = new Bulb({
            ipAddress,
            id,
            model
          });
        }
        discoveredBulbs.set(id, bulb);
        this.emit('bulb', bulb, isNewBulb);
      }
    };

    return Promise.using(this.bind(), sock => {
      return new Promise((resolve, reject) => {
        let timer;
        const onError = err => {
          clearTimeout(timer);
          reject(err);
        };
        sock.removeAllListeners('message');
        sock.on('message', onMessage);
        sock.once('error', onError);
        sock.send(DISCOVERY_MESSAGE, DISCOVERY_PORT,
          this.interfaceInfo.broadcastAddress, err => {
            if (err) {
              reject(err);
              return;
            }
            this.emit('discovering');

            timer = setTimeout(() => {
              sock.removeAllListeners('message');
              sock.removeListener('error', onError);
              resolve(discoveredBulbs);
            }, timeout);
          });
      });
    })
      .then(discoveredBulbs => {
        const allBulbs = this.cache.mget(this.cache.keys());
        const missingBulbs = _.reject(bulb => discoveredBulbs.has(bulb.id),
          allBulbs);
        _.forEach(bulb => {
          this.cache.set(bulb.id, bulb);
        }, missingBulbs);
        const bulbs = Array.from(discoveredBulbs.values());
        if (onlyNew) {
          return _.difference(bulbs, oldBulbs);
        }
        return bulbs;
      });
  }
}

Network.interfaceInfo = new Map();
