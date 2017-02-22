import {EventEmitter} from 'events';
import _ from 'lodash/fp';
import {findExternalInterface} from 'find-external-interface';
import os from 'os';
import {default as Cache} from 'node-cache';
import {Netmask} from 'netmask';
import debug from 'debug';

const d = debug('deadlights:network-interface');

// ms
export const STALE_INTERFACE_CHECK_PERIOD = 20000;
// ms
export const STALE_INTERFACE_TTL = 120000;
// ms
export const CACHE_CHECK_PERIOD = 5000;
const networkInterfaces = new Cache({
  checkperiod: CACHE_CHECK_PERIOD / 1000
});

class NetworkInterface extends EventEmitter {
  constructor ({ipAddress, broadcastAddress, name} = {}) {
    super();
    this.ipAddress = ipAddress;
    this.broadcastAddress = broadcastAddress;
    this.name = name;
    this.checkTimer = setTimeout(() => {
      this.check();
    }, STALE_INTERFACE_CHECK_PERIOD)
      .unref();
  }

  check () {
    const ok = findExternalInterface({name: this.name});
    if (ok) {
      clearTimeout(this.checkTimer);
      this.checkTimer = setTimeout(() => {
        this.check();
      }, STALE_INTERFACE_CHECK_PERIOD)
        .unref();
      this.emit('present', this.name, STALE_INTERFACE_CHECK_PERIOD);
      return Boolean(ok);
    }
    this.emit('absent', this.name, STALE_INTERFACE_TTL);
    if (!networkInterfaces.getTTL(this.name)) {
      networkInterfaces.ttl(this.name, STALE_INTERFACE_TTL / 1000);
    }
  }
}

/**
 * Returns a {@link NetworkInterface} object for broadcasting
 * @param {Object|string} [options] Options or `name` (interface name) if
 *   string
 * @param {boolean} [options.force=false] Force interface to be queried; only
 *   used if `name` present
 * @param {string} [options.name] Interface name
 * @param {string} [options.broadcastAddress] Override broadcast address
 * @param {string} [options.netmask] Override netmask
 * @param {string} [options.ipAddress] Override IP address
 * @returns {NetworkInterface} NetworkInterface object
 */
export function getNetworkInterface (options = {}) {
  if (_.isString(options)) {
    options = {
      name: options
    };
  }
  options = _.defaults({
    force: false
  }, options);
  const {force} = options;
  let {name, broadcastAddress, netmask, ipAddress} = options;
  let networkInterface = name && networkInterfaces.get(name);
  if (networkInterface && !force) {
    return networkInterface;
  }

  const osNetworkInterfaces = os.networkInterfaces();
  const externalInterfaceName = findExternalInterface({name});

  if (externalInterfaceName) {
    const externalInterface = _.find({internal: false}, osNetworkInterfaces[externalInterfaceName]);
    netmask = externalInterface.netmask;
    ipAddress = externalInterface.address;
    broadcastAddress =
      broadcastAddress || new Netmask(`${ipAddress}/${netmask}`).broadcast;
    name = name || externalInterfaceName;
    const networkInterface = new NetworkInterface({
      ipAddress,
      broadcastAddress,
      name
    });
    networkInterfaces.set(name, networkInterface);
    d(`found external interface on ${externalInterfaceName}`);
    return networkInterface;
  }

  if (name) {
    throw new Error(`Could not find network interface with name "${name}".  Found these instead:
     ${JSON.stringify(osNetworkInterfaces, null, 2)}`);
  } else {
    throw new Error('Could not find local IPv4 network interface; are you connected?');
  }
}
