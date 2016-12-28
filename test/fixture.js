'use strict';

global.expect = require('chai')
  .use(require('sinon-chai'))
  .use(require('chai-eventemitter'))
  .use(require('chai-as-promised')).expect;

const MockDgram = require('mock-dgram');

MockDgram.prototype.bind = function (port, done) {
  process.nextTick(done);
};

const send = MockDgram.prototype.send;

MockDgram.prototype.send = function (msg, port, addr, done) {
  return send.call(this, msg, 0, msg.length, port, addr, done);
};
