const {discover} = require('..');

// find all the bulbs on the local network
discover()
  // grab the first one
  .then(bulbs => bulbs.pop()
    // get its state
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
