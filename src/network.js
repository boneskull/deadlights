'use strict';

const dgram = require('dgram');
const os = require('os');
const _ = require('lodash');
const {EventEmitter} = require('events');
const {Netmask} = require('netmask');
const {Bulb} = require('./bulb');

const DISCOVERY_PORT = 48899;
const DISCOVERY_MESSAGE = 'HF-A11ASSISTHREAD';

class Network extends EventEmitter {
  constructor (options = {}) {
    super();

    this.bulbs = new Map();
    this.interfaceInfo = Network.getInterfaceInfo();
    this.createSocket();
  }

  static getInterfaceInfo (force = false) {
    if (Network.interfaceInfo && !force) {
      return Network.interfaceInfo;
    }
    const networkInterface = _(os.networkInterfaces())
      .values()
      .flatten()
      .find({
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
    this.sock = dgram.createSocket({
      type: 'udp4',
      reuseAddr: true
    })
      .on('error', err => {
        this.emit('error', err);
      });
  }

  discover (timeout = 2000) {
    return new Promise(resolve => {
      // XXX don't do this if already bound
      this.sock.bind(DISCOVERY_PORT, () => {
        this.sock.setBroadcast(true);
        resolve(this.sock);
      });
    })
      .then(sock => {
        return new Promise((resolve, reject) => {
          sock.send(DISCOVERY_MESSAGE, DISCOVERY_PORT, this.interfaceInfo.broadcastAddress,
            err => {
              if (err) {
                reject(err);
                return;
              }
              resolve(sock);
            });
        });
      })
      .then(sock => {
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
              this.emit('bulb-found', bulb);
            }
          }
        };

        return new Promise((resolve, reject) => {
          sock.on('message', onMessage);
          this.emit('discovering', sock);
          sock.once('error', err => {
            clearTimeout(t);
            reject(err);
          });

          const t = setTimeout(() => {
            sock.removeListener('message', onMessage);
            resolve(newBulbs);
          }, timeout);
        });
      });
  }
}

exports.Network = Network;
exports.DISCOVERY_MESSAGE = DISCOVERY_MESSAGE;
exports.DISCOVERY_PORT = DISCOVERY_PORT;

if (require.main === module) {
  const n = new Network();
  n.discover()
    .then(bulbs => _.find(bulbs, {id: 'ACCF23801D98'})
      .queryState())
    .then(bulb => {
      console.log(bulb.colorName);
      console.log(bulb.color);
    });
}
