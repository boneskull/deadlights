/* eslint-env mocha */
/* global expect */

'use strict';
const Promise = require('bluebird');
const messages = require('../src/messages');
const {Bulb, BULB_PORT} = require('../src/bulb');
const {BulbState} = require('../src/bulb-state');
const sinon = require('sinon');
const Mitm = require('mitm');
const {Socket} = require('net');

describe('bulb', function () {
  let sandbox;
  let man;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    man = Mitm();
  });

  afterEach(function () {
    sandbox.restore();
    man.disable();
  });

  describe('class Bulb', function () {
    describe('constructor', function () {
      it('should instantiate an object', function () {
        expect(new Bulb())
          .to
          .be
          .an('object');
      });

      it('should retain ip, id, and model properties', function () {
        const props = {
          ip: 'foo',
          id: 'bar',
          model: 'baz'
        };
        expect(new Bulb(props))
          .to
          .include(props);
      });

      it('should call Bulb#createSocket()', function () {
        sandbox.stub(Bulb.prototype, 'createSocket');
        const bulb = new Bulb();
        expect(bulb.createSocket).to.have.been.calledOnce;
      });
    });

    describe('method', function () {
      let bulb;

      beforeEach(function () {
        bulb = new Bulb({
          ip: '99.99.99.99',
          id: 'ASDFGHJKL',
          model: 'Camry'
        });
      });

      describe('createSocket()', function () {
        it('should create a net.Socket property "sock"', function () {
          expect(bulb.createSocket().sock)
            .to
            .be
            .an
            .instanceof(Socket);
        });

        it('should return the Bulb instance', function () {
          expect(bulb.createSocket())
            .to
            .equal(bulb);
        });

        it('should listen for event "error" on the Socket', function () {
          sandbox.spy(Socket.prototype, 'on');
          bulb.createSocket();
          expect(bulb.sock.on)
            .to
            .have
            .been
            .calledWith('error', sinon.match.func);
        });

        it('should listen for event "timeout" on the Socket', function () {
          sandbox.spy(Socket.prototype, 'on');
          bulb.createSocket();
          expect(bulb.sock.on)
            .to
            .have
            .been
            .calledWith('timeout', sinon.match.func);
        });

        describe('Socket event', function () {
          describe('"error"', function () {
            beforeEach(function () {
              bulb.createSocket();
            });

            it('should re-emit on the Bulb instance', function () {
              const err = new Error();
              expect(() => bulb.sock.emit('error', err))
                .to
                .emitFrom(bulb, 'error', err);
            });
          });

          describe('"timeout"', function () {
            beforeEach(function () {
              sandbox.stub(bulb.sock, 'destroy');
              sandbox.stub(bulb, 'createSocket');
              bulb.sock.emit('timeout');
            });

            it('should destroy the Socket', function () {
              expect(bulb.sock.destroy).to.have.been.calledOnce;
            });

            it('should call Bulb#createSocket again', function () {
              expect(bulb.createSocket).to.have.been.calledOnce;
            });
          });
        });
      });

      describe('queryState()', function () {
        let bulbState;

        beforeEach(function () {
          bulbState = new BulbState();
          sandbox.stub(bulb, 'sendRequest')
            .returns(Promise.resolve(bulbState));
          sandbox.stub(bulb.sock, 'connect')
            .callsArgAsync(1);
        });

        it('should connect to the Bulb on BULB_PORT', function () {
          return bulb.queryState()
            .then(() => {
              expect(bulb.sock.connect)
                .to
                .have
                .been
                .calledWithExactly({
                  port: BULB_PORT,
                  host: bulb.ip
                }, sinon.match.func);
            });
        });

        it('should send a "QUERY_STATE" message to the Bulb', function () {
          return bulb.queryState()
            .then(() => {
              expect(bulb.sendRequest)
                .to
                .have
                .been
                .calledWithExactly(messages.QUERY_STATE);
            });
        });

        it('should record the Bulb state in the "history" array prop',
          function () {
            return bulb.queryState()
              .then(() => {
                expect(bulb.history)
                  .to
                  .eql([bulbState]);
              });
          });

        it('should fulfill with the Bulb', function () {
          return expect(bulb.queryState())
            .to
            .eventually
            .equal(bulb);
        });
      });

      describe('sendRequest()', function () {
        let message;
        let data;
        let result;

        beforeEach(function () {
          result = {};
          message = {
            command: [
              0x00,
              0x01,
              0x02
            ],
            parser: {
              parse: sandbox.spy(() => {
                return result;
              })
            }
          };

          data = Buffer.from([
            0x81,
            0x44,
            0x24,
            0x61,
            0x21,
            0x1f,
            0x00,
            0x00,
            0x00,
            0xff,
            0x05,
            0x00,
            0x0f,
            0x9d
          ]);
          sandbox.spy(Bulb, 'finalizeCommand');
          sandbox.stub(bulb.sock, 'write', () => {
            process.nextTick(() => {
              // each response is 14 bytes
              bulb.sock.emit('data', data);
            });
          });
        });

        it('should reject if called without a message', function () {
          return expect(bulb.sendRequest())
            .to
            .eventually
            .be
            .rejectedWith(Error, /message must be an array/);
        });

        it('should call Bulb.finalize() on the command', function () {
          return bulb.sendRequest(message)
            .then(() => {
              expect(Bulb.finalizeCommand)
                .to
                .have
                .been
                .calledWithExactly(message.command);
            });
        });

        it('should write the finalized command to the Socket', function () {
          return bulb.sendRequest(message)
            .then(() => {
              const buf = Buffer.from(Bulb.finalizeCommand(message.command));
              expect(bulb.sock.write)
                .to
                .have
                .been
                .calledWith(buf);
            });
        });

        it('should call the parser with the response data', function () {
          return bulb.sendRequest(message)
            .then(() => {
              expect(message.parser.parse)
                .to
                .have
                .been
                .calledWithExactly(data);
            });
        });

        it('should fulfill with the result object', function () {
          return expect(bulb.sendRequest(message))
            .to
            .eventually
            .equal(result);
        });
      });
    });
  });
});
