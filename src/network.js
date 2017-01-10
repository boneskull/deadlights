import dgram from 'dgram';
import os from 'os';
import _ from 'lodash';
import {EventEmitter} from 'events';
import {Netmask} from 'netmask';
import {Bulb} from './bulb';
import Promise from 'bluebird';
import NodeCache from 'node-cache';

export const DISCOVERY_PORT = 48899;
export const DISCOVERY_MESSAGE = 'HF-A11ASSISTHREAD';
// seconds
export const STALE_BULB_TTL = 300;
export const STALE_BULB_CHECK_PERIOD = 60;

export class Network extends EventEmitter {
  constructor (options = {}) {
    super();
    _.defaults(options, {keepOpen: false});

    this.interfaceInfo = Network.getInterfaceInfo();
    this.cache = new NodeCache({
      stdTTL: STALE_BULB_TTL,
      checkperiod: STALE_BULB_CHECK_PERIOD
    }).on('del', (id, bulb) => {
      this.bulbs.delete(id);
      this.emit('bulb-removed', bulb);
    })
      .on('expired', (id, bulb) => {
        this.emit('bulb-expired', bulb);
      });
    this.keepOpen = Boolean(options.keepOpen);
    this.bulbs = new Map();
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

  static getInterfaceInfo (force = false) {
    if (Network.interfaceInfo && !force) {
      return Network.interfaceInfo;
    }
    const networkInterface = _.find(_.flatten(_.values(os.networkInterfaces())),
      {
        internal: false,
        family: 'IPv4'
      });
    const block = new Netmask(`${networkInterface.address}/${networkInterface.netmask}`);
    Network.interfaceInfo = {
      ipAddress: networkInterface.address,
      broadcastAddress: block.broadcast
    };
    return Network.interfaceInfo;
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
    const oldBulbs = Array.from(this.bulbs.values());
    const onMessage = (msg, rinfo) => {
      // ignore our initial broadcast
      msg = String(msg);
      if (msg !== DISCOVERY_MESSAGE) {
        const [ip, id, model] = msg.split(',');
        let bulb;
        let isNewBulb = false;
        if (!this.bulbs.has(id)) {
          isNewBulb = true;
          bulb = new Bulb({
            ip,
            id,
            model
          });
        } else {
          bulb = this.bulbs.get(id);
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
        sock.send(DISCOVERY_MESSAGE, DISCOVERY_PORT,
          this.interfaceInfo.broadcastAddress, err => {
            if (err) {
              reject(err);
              return;
            }
            this.emit('discovering');

            sock.once('error', onError);

            timer = setTimeout(() => {
              sock.removeAllListeners('message');
              sock.removeListener('error', onError);
              resolve(discoveredBulbs);
            }, timeout);
          });
      });
    })
      .then(discoveredBulbs => {
        const allBulbs = Array.from(this.bulbs.values());
        allBulbs
          .filter(bulb => !discoveredBulbs.has(bulb.id))
          .forEach(bulb => {
            this.cache.set(bulb.id, bulb);
          });
        const bulbs = Array.from(discoveredBulbs.values());
        if (onlyNew) {
          return _.difference(bulbs, oldBulbs);
        }
        return bulbs;
      });
  }
}
