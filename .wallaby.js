'use strict';

module.exports = function wallabyConfig () {
  return {
    files: [
      'src/**/*.js',
      {
        pattern: 'test/fixture.js',
        instrument: false
      }
    ],
    tests: [
      'test/**/*.spec.js'
    ],
    env: {
      type: 'node',
      runner: 'node'
    },
    testFramework: 'mocha',
    bootstrap: function bootstrap (wallaby) {
      const path = require('path');
      require(path.join(wallaby.localProjectDir, 'test', 'fixture'));
    }
  };
};
