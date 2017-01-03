import dgram from 'dgram';
import os from 'os';
import _ from 'lodash';
import {EventEmitter} from 'events';
import {Netmask} from 'netmask';
import {Bulb} from './bulb';
import Promise from 'bluebird';

export const DISCOVERY_PORT = 48899;
export const DISCOVERY_MESSAGE = 'HF-A11ASSISTHREAD';

export class Network extends EventEmitter {
  constructor (options = {}) {
    super();

    this.bulbs = new Map();
    this.interfaceInfo = Network.getInterfaceInfo();
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
    });
  }

  discover (timeout = 2000) {
    const newBulbs = [];
    const onMessage = (msg, rinfo) => {
      // ignore our initial broadcast
      if (rinfo.address !== this.interfaceInfo.ipAddress) {
        const [ip, id, model] = String(msg)
          .split(',');
        if (!this.bulbs.has(id)) {
          const bulb = new Bulb({
            ip,
            id,
            model
          });
          this.bulbs.set(id, bulb);
          newBulbs.push(bulb);
        }
      }
    };

    return this.bind()
      .then(sock => {
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
                resolve(newBulbs);
              }, timeout);
            });
        });
      })
      .finally(() => {
        if (!this.sock.keepOpen) {
          return this.close();
        }
      });
  }
}
