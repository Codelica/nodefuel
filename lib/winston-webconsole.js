'use strict';

const util = require('util'),
    winston = require('winston');

const WebConsole = function (options) {
  this.name = options.name || 'webconsole';
  this.level = options.level || 'all';
  this.formatter = options.formatter;
  this.timestamp = options.timestamp;
  this.wsWriter = options.wsWriter;  
};

util.inherits(WebConsole, winston.Transport);
winston.transports.WebConsole = WebConsole;

WebConsole.prototype.log = function (level, msg, meta) {
  if (!this.silent) {
    let options = {
      name: this.name,
      label: this.label,
      timestamp: this.timestamp,
      level: level,
      message: msg,
      meta: meta
    };
    this.wsWriter(this.formatter(options));
  }
  this.label = '';
};

module.exports.WebConsole = WebConsole;