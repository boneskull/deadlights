import Promise from 'bluebird';
import {BulbConnection, BULB_PORT} from '../../src/bulb/connection';
import {BulbState} from '../../src/bulb/state';
import sinon from 'sinon';
import Mitm from 'mitm';
import {Socket} from 'net';

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

  describe('class BulbConnection', function () {
    describe('constructor', function () {
      it('should instantiate an object', function () {
        expect(new BulbConnection())
          .to
          .be
          .an('object');
      });

      it('should retain ip, id, and model properties', function () {
        const props = {
          ip: 'foo'
        };
        expect(new BulbConnection(props))
          .to
          .include(props);
      });
    });

    describe('method', function () {
      let conn;

      beforeEach(function () {
        conn = new BulbConnection({
          ip: '99.99.99.99'
        });
      });

      describe('createSocket()', function () {
        it('should create a net.Socket property "sock"', function () {
          expect(conn.createSocket().sock)
            .to
            .be
            .an
            .instanceof(Socket);
        });

        it('should return the BulbConnection instance', function () {
          expect(conn.createSocket())
            .to
            .equal(conn);
        });

        it('should listen for event "error" on the Socket', function () {
          sandbox.spy(Socket.prototype, 'on');
          conn.createSocket();
          expect(conn.sock.on)
            .to
            .have
            .been
            .calledWith('error', sinon.match.func);
        });

        it('should listen for event "timeout" on the Socket', function () {
          sandbox.spy(Socket.prototype, 'on');
          conn.createSocket();
          expect(conn.sock.on)
            .to
            .have
            .been
            .calledWith('timeout', sinon.match.func);
        });

        describe('Socket event', function () {
          describe('"error"', function () {
            beforeEach(function () {
              conn.createSocket();
            });

            it('should re-emit on the BulbConnection instance', function () {
              const err = new Error();
              expect(() => conn.sock.emit('error', err))
                .to
                .emitFrom(conn, 'error', err);
            });
          });

          describe('"timeout"', function () {
            beforeEach(function () {
              conn.createSocket();
              sandbox.stub(conn.sock, 'destroy');
              sandbox.stub(conn, 'createSocket');
              conn.sock.emit('timeout');
            });

            it('should destroy the Socket', function () {
              expect(conn.sock.destroy).to.have.been.calledOnce;
            });

            it('should call BulbConnection#createSocket again', function () {
              expect(conn.createSocket).to.have.been.calledOnce;
            });
          });
        });
      });

      describe('doCommand()', function () {
        let bulbState;

        beforeEach(function () {
          bulbState = new BulbState();
          conn.createSocket();
          sandbox.stub(conn, 'sendRequest')
            .returns(Promise.resolve(bulbState));
          sandbox.stub(conn.sock, 'connect')
            .callsArgAsync(1);
        });

        it('should connect to the BulbConnection on BULB_PORT', function () {
          return conn.doCommand({})
            .then(() => {
              expect(conn.sock.connect)
                .to
                .have
                .been
                .calledWithExactly({
                  port: BULB_PORT,
                  host: conn.ip
                }, sinon.match.func);
            });
        });

        describe('when called with a message', function () {
          it('should send the message to the BulbConnection', function () {
            const msg = {};
            return conn.doCommand({})
              .then(() => {
                expect(conn.sendRequest)
                  .to
                  .have
                  .been
                  .calledWithExactly(msg);
              });
          });
        });

        it('should fulfill with the bulb state', function () {
          return expect(conn.doCommand({
            parser: {
              parse: sandbox.spy(() => bulbState)
            }
          }))
            .to
            .eventually
            .equal(bulbState);
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
          sandbox.spy(BulbConnection, 'finalizeCommand');
          conn.createSocket();
          sandbox.stub(conn.sock, 'write', () => {
            process.nextTick(() => {
              // each response is 14 bytes
              conn.sock.emit('data', data);
            });
          });
        });

        it('should reject if called without a message', function () {
          return expect(conn.sendRequest())
            .to
            .eventually
            .be
            .rejectedWith(Error, /message must be an array/);
        });

        it('should call BulbConnection.finalize() on the command', function () {
          return conn.sendRequest(message)
            .then(() => {
              expect(BulbConnection.finalizeCommand)
                .to
                .have
                .been
                .calledWithExactly(message.command);
            });
        });

        it('should write the finalized command to the Socket', function () {
          return conn.sendRequest(message)
            .then(() => {
              const buf = Buffer.from(BulbConnection.finalizeCommand(message.command));
              expect(conn.sock.write)
                .to
                .have
                .been
                .calledWith(buf);
            });
        });

        it('should call the parser with the response data', function () {
          return conn.sendRequest(message)
            .then(() => {
              expect(message.parser.parse)
                .to
                .have
                .been
                .calledWithExactly(data);
            });
        });

        it('should fulfill with the result object', function () {
          return expect(conn.sendRequest(message))
            .to
            .eventually
            .equal(result);
        });
      });
    });
  });
});
