import 'source-map-support/register';
import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiEventEmitter from 'chai-eventemitter';
import chaiAsPromised from 'chai-as-promised';

global.expect = chai.use(sinonChai)
  .use(chaiEventEmitter)
  .use(chaiAsPromised).expect;

const MockDgram = require('mock-dgram');

MockDgram.prototype.bind = function (port, done) {
  process.nextTick(done);
};

const send = MockDgram.prototype.send;

MockDgram.prototype.send = function (msg, port, addr, done) {
  return send.call(this, msg, 0, msg.length, port, addr, done);
};
