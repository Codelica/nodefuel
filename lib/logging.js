'use strict';

const os = require('os'),
    winston = require('winston'),
    moment = require('moment'),
    prettyjson = require('prettyjson'),
    c = require('chalk');

require('./winston-pushover.js').Pushover;
require('./winston-webconsole.js').Pushover;

let plugins = new Map(),
    logs = { console: { filterLabels: false, labelLength: 0 } },
    logTotals = new Map([['console', 1], ['file', 0], ['push', 0], ['web', 0]]),
    loggers = new Map(),
    loggerLabels = new Set(),
    loggerLabelsLength = 0;

const logLevels = { all: 6, raw: 5, debug: 4, info: 3, warn: 2, error: 1, alarm: 0 };

// Console log setup

const consoleLogColors = {
  debug: c.blue,
  info: c.green,
  warn: c.yellow,
  error: c.red,
  alarm: c.cyan.bold,
  timer: c.cyan.bold
};

const consoleLogJsonColors = {
  stringColor: 'green', 
  keysColor: 'yellow', 
  dashColor: 'yellow', 
  numberColor: 'blue',
  inlineArrays: 1
};

const consoleLogOptions = {
  level: 'all',
  label: null,
  timestamp: () => moment().format('MM/DD/YY HH:mm:ss.SSS'),
  formatter: logFormatter('console', 'console'),
  colorize: true,
  silet: false,
  handleExceptions: true,
  humanReadableUnhandledException: false
};

// General log formatter

function logFormatter (logName, logType) {
  return function (options) {

    // Raw logging
    if (options.level == 'raw') {
      return options.message;
    }

    // Profile timer logging
    if (options.meta && Object.keys(options.meta).length == 1 && options.meta.durationMs != undefined ) {
      options.level = 'timer';
      options.message = `${options.message} = ${options.meta.durationMs}ms`;
      options.meta = null;
    }
    if (options.message == undefined) options.message = '';
    let output = '';

    // Standard console logging
    if (logType == 'console') {
      output = `${c.white(options.timestamp())} ${consoleLogColors[options.level](('     ' + options.level.toUpperCase()).slice(-5))} `;
      if (options.label) {
        output += `${c.magenta((' '.repeat(logs[logName].labelLength) + options.label).slice(-1 * logs[logName].labelLength) + ':')} `;
        coreLog.transports[logName].label = '';
      }
      else if (options.label === '') output += ' '.repeat(logs[logName].labelLength ? logs[logName].labelLength + 2 : 0);
      output += `${options.message}`;
      if (options.meta && Object.keys(options.meta).length) {
        output += `\n\n${prettyjson.render(options.meta, consoleLogJsonColors, 4)}\n`;
      }
    }

    // Standard file logging
    else if (logType == 'file') {
      output = `${options.timestamp()} ${('     ' + options.level.toUpperCase()).slice(-5)} `;
      if (options.label) {
        output += `${(' '.repeat(logs[logName]['labelLength']) + options.label).slice(-1 * logs[logName]['labelLength']) + ':'} `;
        coreLog.transports[logName].label = '';
      }
      else if (options.label === '') output += ' '.repeat(logs[logName].labelLength ? logs[logName].labelLength + 2 : 0);
      output += `${options.message}`;
      if (options.meta && Object.keys(options.meta).length) {
        output += `\n\n${prettyjson.render(options.meta, {noColor: true}, 4)}\n`;
      }
    }

    return output;
  };
}

// Log system and internal functions

const coreLog = new (winston.Logger)({
  levels: logLevels,
  transports: [ new (winston.transports.Console)(consoleLogOptions) ],
  exitOnError: true
});

const log = logger('nF-Core');

function setFilterLabels (logName, filterLabels) {
  if (filterLabels || filterLabels === '') {
    if (typeof filterLabels == 'string') filterLabels = [filterLabels];
    logs[logName]['filterLabels'] = new Set(filterLabels);
    logs[logName]['labelLength'] = 0;
    logs[logName]['filterLabels'].forEach( (label) => { 
      if (label.length > logs[logName]['labelLength']) logs[logName]['labelLength'] = label.length;
    });
  }
  else {
    logs[logName]['filterLabels'] = false;
    logs[logName]['labelLength'] = loggerLabelsLength;
  }
}

function logEntry (type, label, args) {
  Object.keys(logs).forEach((logName) => {
    if (!logs[logName]['filterLabels']) {
      coreLog.transports[logName]['silent'] = false;
      coreLog.transports[logName].label = label;
    }
    else if (logs[logName]['filterLabels'].has(label)) {
      coreLog.transports[logName]['silent'] = false;
      if (logs[logName].filterLabels.size > 1) coreLog.transports[logName].label = label;
      else coreLog.transports[logName].label = false;
    }
    else coreLog.transports[logName]['silent'] = true;
  });
  if (type == 'profile') coreLog.profile(args);
  else coreLog[type].apply(this, args);
}

// Functions to export

function logger (label) {
  if (label === undefined || label === false) label = '';
  if (loggerLabels.has(`l-${label}`)) return loggers.get(`l-${label}`);
  else {
    const logger = {
      raw: function () { logEntry('raw', label, arguments); },
      debug: function () { logEntry('debug', label, arguments); },
      info: function () { logEntry('info', label, arguments); },
      warn: function () { logEntry('warn', label, arguments); },
      error: function () { logEntry('error', label, arguments); },
      alarm: function () { logEntry('alarm', label, arguments); },
      profile: function (timerName) { logEntry('profile', label, timerName); }
    };
    loggerLabels.add(label);
    loggers.set(`l-${label}`, logger);
    if (label.length > loggerLabelsLength) {
      loggerLabelsLength = label.length;
      Object.keys(logs).forEach((logName) => {
        if (!logs[logName]['filterLabels']) logs[logName]['labelLength'] = loggerLabelsLength;
      });
    }
    return logger;
  }
}

function addLogFile (filename, options) {
  if (typeof filename != 'string') throw(new Error('Filename is required for addLogFile()'));
  if (options === undefined) options = {};
  if (typeof options != 'object') throw(new Error('Invalid options object for addLogFile()'));
  logTotals.set('file', (logTotals.get('file') + 1));
  const logName = 'logfile-' + logTotals.get('file');

  const fileOptions = {
    name: logName,
    filename: filename,
    level: options.level || 'info',
    label: null,
    formatter: options.formatter ? options.formatter : logFormatter(logName, 'file'),
    timestamp: options.timestamp ? options.timestamp : () => moment().format('MM/DD/YY HH:mm:ss.SSS'),
    json: options.json || false,
    colorize: options.colorize || false,
    eol: options.eol || os.EOL,
    maxsize: options.maxsize || 10485760,
    zippedArchive: options.zippedArchive || true,
    maxFiles: options.maxFiles || 20,
    tailable: options.tailable || true,
    maxRetries: options.maxRetries || 3
  };

  logs[logName] = {};
  setFilterLabels(logName, options.labels);
  coreLog.add(winston.transports.File, fileOptions);
  return logName;
}

function addPushAlert (alertTitle, options) {
  if (typeof alertTitle != 'string') throw(new Error('alertTitle is required for addPushAlert()'));
  if (typeof options != 'object') throw(new Error('Invalid options object for addPushAlert()'));
  if (!options.userKey || !options.token) throw(new Error('Options object must contain "userKey" and "token" for addPushAlert()'));
  logTotals.set('push', (logTotals.get('push') + 1));
  const logName = 'push-' + logTotals.get('push');

  const pushoverOptions = {
    name: logName,
    level: options.level || 'alarm',
    title: alertTitle,
    userKey: options.userKey,
    token: options.token,
    priority: options.priority || 0,
    sound: options.sound || 'siren',
    retry: options.retry || null,
    expire: options.expire || null,
    exceptionLog: log,
    silent: false
  };
 
  logs[logName] = {};
  setFilterLabels(logName, options.labels);
  coreLog.add( winston.transports.Pushover, pushoverOptions);
  return logName;
}

function addWebConsole (ip, port, options) {
  if (!plugins.has('webconsole')) throw(new Error('addWebConsole() failed - nodefuel-webconsole module was not included'));

  if (!options) options = {};
  logTotals.set('web', (logTotals.get('web') + 1));
  const logName = 'web-' + logTotals.get('web');

  const webconsoleOptions = {
    name: logName,
    level: options.level || coreLog.transports.console.level,
    formatter: logFormatter(logName, 'console'),
    timestamp: coreLog.transports.console.timestamp,
    wsWriter: () => {}
  };

  const webOptions = {
    title: options.title || 'NodeFuel Web Console'
  };

  logs[logName] = {};
  setFilterLabels(logName, options.labels);
  coreLog.add( winston.transports.WebConsole, webconsoleOptions);

  plugins.get('webconsole').startServer(ip, port, webOptions, logName, (wsWriter) => {
    coreLog.transports[logName].wsWriter = wsWriter;
  });
  return logName;
}

function logFilter (logName, filterOptions) {
  if (typeof logName != 'string' || !coreLog.transports[logName]) throw(new Error('Invalid logName for logFilter()'));
  if (typeof filterOptions != 'object') throw(new Error('Invalid filterOptions object for addPushAlert()'));
  if (filterOptions.level) coreLog.transports[logName].level = filterOptions.level;
  if (filterOptions.hasOwnProperty('labels')) setFilterLabels(logName, filterOptions.labels);
}

function getLoggers () {
  return Array.from(loggerLabels);
}

function getLogs () {
  return Object.keys(logs);
}

// Export core module

module.exports = function (corePlugins) {
  plugins = corePlugins;
  return {
    logger: logger,
    addLogFile: addLogFile,
    addPushAlert: addPushAlert,
    addWebConsole: addWebConsole,
    logFilter: logFilter,
    getLoggers: getLoggers,
    getLogs: getLogs
  };
};