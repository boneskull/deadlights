import 'source-map-support/register';
import {EventEmitter} from 'events';
import _ from 'lodash/fp';
import {BulbConnection} from './connection';
import Promise from 'bluebird';
import debug from 'debug';

const d = debug('deadlights:bulb');

export class Bulb extends EventEmitter {
  constructor ({ipAddress, id, model, maxHistory = 10} = {}, onState = _.noop) {
    super();

    this.ipAddress = ipAddress;
    this.id = id;
    this.model = model;

    this.history = [];
    this.connection = new BulbConnection({ipAddress});

    this.on('state', bulbState => {
      d('new state', bulbState);
      this.history.push(bulbState);
      if (this.history.length > maxHistory) {
        this.history.shift();
      }
    })
      .on('state', onState);
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

  switchOn (force = false) {
    if (this.state.isOn && !force) {
      return Promise.resolve(this);
    }
    return this.connection.doCommand('SWITCH_ON')
      .then(() => {
        this.emit('state', this.state.update({isOn: true}));
        return this;
      });
  }

  flash (count = 20, duration = 250) {
    return this.switchOn()
      .then(() => _.range(count))
      .each(idx => {
        if (idx % 2 === 0) {
          return this.switchOff()
            .delay(duration);
        } else {
          return this.switchOn()
            .delay(duration);
        }
      });
  }

  toJSON () {
    return _.pick([
      'state',
      'id',
      'ipAddress',
      'model'
    ], this);
  }

  switchOff (force = false) {
    if (!this.state.isOn && !force) {
      return Promise.resolve(this);
    }
    return this.connection.doCommand('SWITCH_OFF')
      .then(bulbState => {
        this.emit('state', this.state.update({isOn: false}));
        return this;
      });
  }

  update () {
    return this.connection.doCommand('QUERY_STATE')
      .then(bulbState => {
        if (!_.isEqual(bulbState, this.state)) {
          this.emit('state', bulbState);
        }
        d('completed update');
        return this;
      });
  }

  forget () {
    return this.connection.close();
  }
}
