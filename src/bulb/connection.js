import 'source-map-support/register';
import * as messages from '../messages';
import {EventEmitter} from 'events';
import Promise from 'bluebird';
import _ from 'lodash/fp';
import {Socket} from 'net';

export const BULB_PORT = 5577;
export const RESPONSE_LENGTH = 14;

export class BulbConnection extends EventEmitter {
  constructor ({ip} = {}) {
    super();
    this.ip = ip;
  }

  static finalizeCommand (command) {
    return command.concat(_.sum(command) & 0xff);
  }

  close () {
    return new Promise(resolve => {
      if (this.sock && this.sock.localPort) {
        this.sock.end();
      }
      resolve(this);
    });
  }

  connect () {
    if (!this.sock) {
      this.createSocket();
    }
    return new Promise(resolve => {
      if (this.sock.localPort) {
        resolve();
        return;
      }
      this.sock.connect({
        port: BULB_PORT,
        host: this.ip
      }, resolve);
    });
  }

  doCommand (message) {
    if (_.isString(message)) {
      message = messages[message];
    }
    return this.connect()
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

  sendRequest (message, ...args) {
    return new Promise((resolve, reject) => {
      // we can do better than "isObject()"
      if (!_.isObject(message)) {
        reject(
          new Error('message must be an array of unsigned 8-bit integers'));
        return;
      }
      const command = _.isFunction(message.command)
        ? message.command(args)
        : message.command;

      const data = Buffer.from(BulbConnection.finalizeCommand(command));

      // TODO unsure about error handling here
      if (message.parser) {
        let chunks = [];
        const onData = data => {
          chunks = chunks.concat(Array.from(data));
          if (chunks.length === RESPONSE_LENGTH) {
            this.sock.removeListener('data', onData);
            resolve({data: Buffer.from(chunks)});
          }
        };
        this.sock.on('data', onData);
        this.sock.write(data);
        return;
      }

      this.sock.write(data, resolve);
    })
      .then(({data} = {}) => {
        if (data) {
          return message.parser.parse(data);
        }
      });
  }
}
