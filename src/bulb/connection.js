'use strict';

const messages = require('../messages');
const {EventEmitter} = require('events');
const BULB_PORT = 5577;
const RESPONSE_LENGTH = 14;
const Promise = require('bluebird');
const _ = require('lodash');
const {Socket} = require('net');

class BulbConnection extends EventEmitter {
  constructor ({ip} = {}) {
    super();
    this.ip = ip;
    this.createSocket();
  }

  static finalizeCommand (command) {
    return command.concat(_.sum(command) & 0xff);
  }

  queryState () {
    const message = messages.QUERY_STATE;
    return new Promise(resolve => {
      this.sock.connect({
        port: BULB_PORT,
        host: this.ip
      }, resolve);
    })
      .then(() => this.sendRequest(message));
  }

  createSocket () {
    this.sock = new Socket()
      .on('error', err => {
        this.emit('error', err);
      })
      .on('timeout', () => {
        // appropriate?
        this.sock.destroy();
        this.createSocket();
      });
    return this;
  }

  sendRequest (message) {
    return new Promise((resolve, reject) => {
      // we can do better than "isObject()"
      if (!_.isObject(message)) {
        reject(
          new Error('message must be an array of unsigned 8-bit integers'));
        return;
      }
      // TODO unsure about error handling here
      let chunks = [];
      const command = BulbConnection.finalizeCommand(message.command);
      const data = Buffer.from(command);
      const onData = data => {
        chunks = chunks.concat(Array.from(data));
        if (chunks.length === RESPONSE_LENGTH) {
          this.sock.removeListener('data', onData);
          resolve(Buffer.from(chunks));
        }
      };
      this.sock.on('data', onData);
      this.sock.write(data);
    })
      .then(data => message.parser.parse(data));
  }
}

exports.BulbConnection = BulbConnection;
exports.BULB_PORT = BULB_PORT;
