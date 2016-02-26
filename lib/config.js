'use strict';

let plugins = null,
    log = null;

// Functions to export

function toBeDone (file) {
  log.debug('To be done...');
}

// Export config module

module.exports = function (corePlugins, coreLog) {
  plugins = corePlugins;
  log = coreLog;

  return {
    readConfig: toBeDone,
    watchConfig: toBeDone
  };
};