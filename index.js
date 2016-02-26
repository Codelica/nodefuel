'use strict';

// Plug-in registration for additional features
const plugins = new Map();

function registerPlugin (plugin, features) { 
  plugins.set(plugin, features); 
}

const core = { registerPlugin: registerPlugin };

// Load logging module
const logging = require('./lib/logging.js')(plugins);
const log = logging.logger('nF-Core');

// Load config module
const config = require('./lib/config.js')(plugins, log);

// Merge and expose all exports
module.exports = Object.assign(core, logging, config);