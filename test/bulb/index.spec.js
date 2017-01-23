import {Bulb} from '../../src/bulb';
import {BulbConnection} from '../../src/bulb/connection';
import sinon from 'sinon';

describe('bulb', function () {
  let ipAddress;
  let model;
  let id;
  let sandbox;

  beforeEach(function () {
    model = 'model name';
    id = 'unique id';
    ipAddress = '99.99.99.99';
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('class Bulb', function () {
    let bulb;

    afterEach(function () {
      return bulb.forget();
    });

    describe('constructor', function () {
      it('should create a BulbConnection on prop "connection"', function () {
        bulb = new Bulb({
          ipAddress,
          model,
          id
        });
        expect(bulb.connection)
          .to
          .be
          .an
          .instanceof(BulbConnection);
      });

      it.skip('should listen for "state" event', function () {

      });
    });

    describe('method', function () {
      beforeEach(function () {
        bulb = new Bulb({
          ipAddress,
          model,
          id
        });
      });
      describe('refresh()', function () {
        it.skip('should call BulbConnection#queryState()', function () {

        });

        it.skip('should emit "state" event w/ BulbState object', function () {

        });
      });

      describe('toJSON', function () {
        beforeEach(function () {
          bulb.history.push('despair');
        });

        it(
          'should return the "state", "id", "ip", and "model" props from the bulb',
          function () {
            expect(bulb.toJSON()).to.eql({
              ipAddress: bulb.ipAddress,
              model: bulb.model,
              id: bulb.id,
              state: bulb.history.pop()
            });
          });
      });
    });
  });
});
