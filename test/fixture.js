import 'source-map-support/register';
import chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiEventEmitter from 'chai-eventemitter';
import chaiAsPromised from 'chai-as-promised';

global.expect = chai.use(sinonChai)
  .use(chaiEventEmitter)
  .use(chaiAsPromised).expect;
