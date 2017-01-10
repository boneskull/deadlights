# deadlights

[![Build Status](https://travis-ci.org/boneskull/deadlights.svg?branch=master)](https://travis-ci.org/boneskull/deadlights) [![Dependency Status](https://dependencyci.com/github/boneskull/deadlights/badge)](https://dependencyci.com/github/boneskull/deadlights)

> Interface for [Flux](https://www.fluxsmartlighting.com) (aka "Magic Home") WiFi RGB light bulbs

This wouldn't be possible without the Python [flux_led](https://github.com/beville/flux_led) project.

My ultimate goal here is to create a Node-RED flow for Flux WiFi bulb control; see [node-red-contrib-fluxwifi](https://github.com/node-red-contrib-fluxwifi). 

## Installation

```bash
$ npm install deadlights
```

## Requirements

- Node.js, probably 4.x or newer

I'm not sure how feasible browser support is, but I'll look at it! 

## Usage

**API is not yet fully implemented!**

API docs forthcoming, but an example:

```js
const {discover} = require('deadlights');

// find all the bulbs on the local network
discover()
  // grab the first one & get its state
  .then(bulbs => bulbs.pop()
    .refresh())
  .then(bulb => {
    // toggle the bulb on and off
    if (bulb.isOn) {
      return bulb.switchOff();
    } else {
      return bulb.switchOn();
    }
  })
  .then(bulb => {
    // close the connection to the bulb;
    // without this, the connection (and script) would stay open indefinitely
    return bulb.forget();
  });
```

## License

:copyright: 2017 [Christopher Hiller](https://github.com/boneskull).  Licensed MIT.
