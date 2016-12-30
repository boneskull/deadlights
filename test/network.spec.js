/* eslint-env mocha */
/* global expect */

const {Network, DISCOVERY_PORT} = require('../src/network');
const sinon = require('sinon');
const MockDgram = require('mock-dgram');
const dgram = require('dgram');
const DISCOVERY_TIMEOUT = 0;

describe('network', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('class Network', function () {
    describe('constructor', function () {
      it('should instantiate an object', function () {
        expect(new Network())
          .to
          .be
          .an('object');
      });

      it('should call Network.getInterfaceInfo()', function () {
        sandbox.stub(Network, 'getInterfaceInfo');
        /* eslint no-new: off */
        new Network();
        expect(Network.getInterfaceInfo).to.have.been.calledOnce;
      });

      it(
        'should assign the result of Network.getInterfaceInfo() to property "interfaceInfo"',
        function () {
          const obj = {};
          sandbox.stub(Network, 'getInterfaceInfo')
            .returns(obj);
          const network = new Network();
          expect(network.interfaceInfo)
            .to
            .equal(obj);
        });

      it('should call Network#createSocket()', function () {
        sandbox.stub(Network.prototype, 'createSocket');
        const network = new Network();
        expect(network.createSocket).to.have.been.calledOnce;
      });
    });

    describe('when internal socket emits an error', function () {
      let network;

      beforeEach(function () {
        network = new Network();
      });

      it('should re-emit the error', function () {
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

      describe('discover()', function () {
        beforeEach(function () {
          sandbox.stub(dgram, 'createSocket')
            .returns(new MockDgram({
              port: DISCOVERY_PORT
            }));
          network = new Network();
          network.once('discovering', sock => {
            const msg = '10.0.0.18,ACCF236726C6,HF-LPB100-ZJ200';
            sock.input.write({
              ip: {src: '1.1.1.1'},
              udp: {
                srcPort: 52,
                dataLength: msg.length
              },
              data: msg
            });
          });
        });

        it('should return an Array', function () {
          return expect(network.discover(DISCOVERY_TIMEOUT))
            .to
            .eventually
            .be
            .an('Array');
        });

        it('should return the found bulbs(s)', function () {
          return expect(network.discover(DISCOVERY_TIMEOUT)
            .then(bulbs => bulbs.pop()))
            .to
            .eventually
            .include({
              id: 'ACCF236726C6',
              model: 'HF-LPB100-ZJ200',
              ip: '10.0.0.18'
            });
        });
      });
    });
  });
});
