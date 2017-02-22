import 'source-map-support/register';
import * as messages from '../messages';
import {EventEmitter} from 'events';
import Promise from 'bluebird';
import _ from 'lodash/fp';
import net from 'net';
import debug from 'debug';

export const BULB_PORT = 5577;
export const RESPONSE_LENGTH = 14;

const d = debug('deadlights:bulb:connection');

export class BulbConnection extends EventEmitter {
  constructor ({ipAddress} = {}) {
    super();
    this.ipAddress = ipAddress;
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
    return new Promise(resolve => {
      if (!this.sock) {
        this.sock = net.createConnection({
          port: BULB_PORT,
          host: this.ipAddress
        }, resolve);
        return;
      }
      resolve();
    })
      .tap(() => {
        d(`connected to ${this.ipAddress}`);
      });
  }

  doCommand (message) {
    if (_.isString(message)) {
      message = messages[message];
    }
    return this.connect()
      .then(() => this.sendRequest(message));
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
      d('sending data', data);
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
        d('raw response', data);
        if (data) {
          return message.parser.parse(data);
        }
      })
      .tap(data => {
        d('parsed response', data);
      });
  }
}
