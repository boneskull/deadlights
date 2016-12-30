'use strict';

const {EventEmitter} = require('events');
const _ = require('lodash');
const {BulbConnection} = require('./connection');
const Promise = require('bluebird');
Promise.longStackTraces();

class Bulb extends EventEmitter {
  constructor ({ip, id, model} = {}) {
    super();

    this.ip = ip;
    this.id = id;
    this.model = model;

    this.history = [];
    this.connection = new BulbConnection({ip});

    this.on('state', bulbState => {
      this.history.push(bulbState);
    });
  }

  get state () {
    return _.last(this.history) || {};
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

  refresh () {
    return this.conn.queryState()
      .then(bulbState => {
        this.emit('state', bulbState);
        return this;
      });
  }
}

exports.Bulb = Bulb;
