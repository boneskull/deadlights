import {Bulb} from '../../src/bulb';
import {BulbConnection} from '../../src/bulb/connection';
import sinon from 'sinon';

describe('bulb', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('class Bulb', function () {
    describe('constructor', function () {
      it('should create a BulbConnection on prop "connection"', function () {
        const ip = '99.99.99.99';

        expect(new Bulb({ip}).connection).to.be.an.instanceof(BulbConnection);
      });

      it.skip('should listen for "state" event', function () {

      });
    });

    describe('method', function () {
      let bulb;
      beforeEach(function () {
        bulb = new Bulb();
      });
      describe('refresh()', function () {
        it.skip('should call BulbConnection#queryState()', function () {

        });

        it.skip('should emit "state" event w/ BulbState object', function () {

        });
      });

      describe('toJSON', function () {
        beforeEach(function () {
          bulb.ip = '99.99.99.99';
          bulb.model = 'foo';
          bulb.id = 'bar';
          bulb.history.push('despair');
        });

        it('should return the state, id, ip, and model props from the bulb',
          function () {
            expect(bulb.toJSON()).to.eql({
              ip: bulb.ip,
              model: bulb.model,
              id: bulb.id,
              state: bulb.history.pop()
            });
          });
      });
    });
  });
});
