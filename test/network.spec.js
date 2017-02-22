import Mitm from 'mitm';
import {DISCOVERY_PORT, Network} from '../src/network';
import {BulbConnection} from '../src/bulb/connection';
import {BulbState} from '../src/bulb/state';
import * as networkInterface from '../src/network-interface';
import sinon from 'sinon';
import MockDgram from 'mock-dgram';
import dgram from 'dgram';

const DISCOVERY_TIMEOUT = 0;

describe('network', function () {
  let sandbox;
  let man;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    const send = MockDgram.prototype.send;
    sandbox.stub(MockDgram.prototype, 'send', function (msg, port, addr, done) {
      return send.call(this, msg, 0, msg.length, port, addr, done);
    });
    sandbox.stub(MockDgram.prototype, 'bind', function (port, done) {
      process.nextTick(done);
    });
    man = Mitm();
  });

  afterEach(function () {
    sandbox.restore();
    man.disable();
  });

  describe('class Network', function () {
    let interfaceInfo;
    beforeEach(function () {
      interfaceInfo = {
        broadcastAddress: '10.0.0.255'
      };
      sandbox.stub(networkInterface, 'getNetworkInterface')
        .returns(interfaceInfo);
    });
    describe('constructor', function () {
      it('should instantiate an object', function () {
        expect(new Network())
          .to
          .be
          .an('object');
      });

      it('should call getNetworkInterface()', function () {
        /* eslint no-new: off */
        new Network();
        expect(networkInterface.getNetworkInterface).to.have.been.calledOnce;
      });

      it(
        'should assign the result of getNetworkInterface to property "interfaceInfo"',
        function () {
          const obj = {};
          networkInterface.getNetworkInterface.restore();
          sandbox.stub(networkInterface, 'getNetworkInterface')
            .returns(obj);
          const network = new Network();
          expect(network.interfaceInfo)
            .to
            .equal(obj);
        });
    });

    describe('when internal socket emits an error', function () {
      let network;

      beforeEach(function () {
        network = new Network();
      });

      it('should re-emit the error', function () {
        network.createSocket();
        expect(() => network.sock.emit('error', new Error()))
          .to
          .emitFrom(network, 'error');
      });
    });

    describe('method', function () {
      let network;

      beforeEach(function () {
        network = new Network();
      });

      describe.only('discover()', function () {
        beforeEach(function () {
          sandbox.stub(dgram, 'createSocket')
            .returns(new MockDgram({
              port: DISCOVERY_PORT
            }));
          sandbox.stub(BulbConnection.prototype, 'doCommand')
            .returns(Promise.resolve(new BulbState()));
          network = new Network();
          network.once('discovering', () => {
            const msg = '10.0.0.18,ACCF236726C6,HF-LPB100-ZJ200';
            network.sock.input.write({
              ipAddress: {
                src: '1.1.1.1'
              },
              udp: {
                srcPort: 52,
                dataLength: msg.length
              },
              data: msg
            });
          });
        });

        it('should return an Array', function () {
          return expect(network.discover({timeout: DISCOVERY_TIMEOUT}))
            .to
            .eventually
            .be
            .an('Array');
        });

        it('should return the found bulbs(s)', function () {
          return expect(network.discover({timeout: DISCOVERY_TIMEOUT})
            .then(bulbs => bulbs.pop()))
            .to
            .eventually
            .include({
              id: 'ACCF236726C6',
              model: 'HF-LPB100-ZJ200',
              ipAddress: '10.0.0.18'
            });
        });
      });
    });
  });
});
