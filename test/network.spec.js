const {Network, DISCOVERY_PORT} = require('../src/network');
const sinon = require('sinon');
const MockDgram = require('mock-dgram');
const dgram = require('dgram');

describe('network', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('class Network', function () {
    it('should instantiate an object', function () {
      expect(new Network())
        .to
        .be
        .an('object');
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
          return expect(network.discover(100))
            .to
            .eventually
            .be
            .an('Array');
        });

        it('should return the found light(s)', function () {
          return expect(network.discover(100)
            .then(lights => lights.pop()))
            .to
            .eventually
            .eql({
              id: 'ACCF236726C6',
              model: 'HF-LPB100-ZJ200',
              ip: '10.0.0.18'
            });
        });
      });
    });
  });
});
