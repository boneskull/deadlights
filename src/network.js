'use strict';

const dgram = require('dgram');
const os = require('os');
const _ = require('lodash');
const {EventEmitter} = require('events');
const {Netmask} = require('netmask');
const {Light} = require('./light');
const DISCOVERY_PORT = 48899;
const DISCOVERY_MESSAGE = 'HF-A11ASSISTHREAD';

class Network extends EventEmitter {
  constructor () {
    super();

    const networkInterface = _(os.networkInterfaces())
      .values()
      .flatten()
      .find({
        internal: false,
        family: 'IPv4'
      });

    const block = new Netmask(`${networkInterface.address}/${networkInterface.netmask}`);

    this.lights = new Map();
    this.broadcastAddress = block.broadcast;

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
      this.sock.bind(DISCOVERY_PORT, () => {
        this.sock.setBroadcast(true);
        resolve(this.sock);
      });
    })
      .then(sock => {
        return new Promise((resolve, reject) => {
          sock.send(DISCOVERY_MESSAGE, DISCOVERY_PORT, this.broadcastAddress,
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
        const newLights = [];

        const onMessage = (msg, rinfo) => {
          const [ip, id, model] = String(msg).split(',');
          if (!this.lights.has(id)) {
            const light = new Light({
              ip,
              id,
              model
            });
            this.lights.set(id, light);
            newLights.push(light);
            this.emit('light-found', light);
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
            resolve(newLights);
          }, timeout);
        });
      });
  }
}

exports.Network = Network;
exports.DISCOVERY_MESSAGE = DISCOVERY_MESSAGE;
exports.DISCOVERY_PORT = DISCOVERY_PORT;
