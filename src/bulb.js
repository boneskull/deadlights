'use strict';

const {EventEmitter} = require('events');
const _ = require('lodash');
const {Socket} = require('net');
const messages = require('./messages');
const BULB_PORT = 5577;
const RESPONSE_LENGTH = 14;
const Promise = require('bluebird');
Promise.longStackTraces();

class Bulb extends EventEmitter {
  constructor ({ip, id, model} = {}) {
    super();

    this.ip = ip;
    this.id = id;
    this.model = model;

    this.history = [];
    this.createSocket();
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
  }

  sendRequest (message) {
    return new Promise(resolve => {
      let chunks = [];
      const command = message.command.concat(_.sum(message.command) & 0xff);
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

  get state () {
    return _.last(this.history);
  }

  get mode () {
    return this.state.mode;
  }

  get colorName () {
    return this.state.colorName;
  }

  get color () {
    return this.state.color;
  }

  get isOn () {
    return this.state.isOn;
  }

  get speed () {
    return this.state.speed;
  }

  queryState () {
    const message = messages.QUERY_STATE;
    return new Promise(resolve => {
      this.sock.connect({
        port: BULB_PORT,
        host: this.ip
      }, resolve);
    })
      .then(() => this.sendRequest(message))
      .then(bulbState => {
        this.history.push(bulbState);
      })
      .return(this);
  }
}

exports.Bulb = Bulb;
exports.BULB_PORT = BULB_PORT;
