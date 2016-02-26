'use strict';

const util = require('util'),
    winston = require('winston'),
    pushover = require('pushover-notifications');

const Pushover = function (options) {
  this.name = options.name || 'pushover';
  this.title = options.title || 'NodeFuel Alert';
  this.level = options.level || 'alarm';
  this.userKey = options.userKey;
  this.token = options.token;
  this.priority = options.priority || 0;
  this.retry = options.retry || 60;
  this.expire = options.expire || 3600;
  this.sound = options.sound || 'siren',
  this.exceptionLog = options.exceptionLog
};

util.inherits(Pushover, winston.Transport);
winston.transports.Pushover = Pushover;

Pushover.prototype.log = function (level, msg, meta, callback) {
  if (!this.silent) {

    let alert = {
      title: this.label ? `${this.title} - ${this.label}` : this.title,
      message: this.level == 'alarm' ? msg : `[${level}] ${msg}`,
      timestamp: Math.round((new Date()).getTime() / 1000),
      sound: this.sound,
      priority: this.priority
    };

    if (this.priority == 2) {
      alert.retry = this.retry || 60 ;
      alert.expire = this.expire || 3600 ;
    }
    
    this.label = '';

    if (alert.title.length + alert.message.length > 512) {
      alert.message = alert.message.substr(0, 512 - alert.title.length);
    }

    var alertPusher = new pushover({ 
      user: this.userKey, 
      token: this.token,
      onerror: (err) => { this.exceptionLog.error(`PushAlert ERROR (${this.title}) ${err}`); } 
    });

    alertPusher.send(alert, (error, result) => {
      if (error) callback(error, false);
      else {

        let parseResult = JSON.parse(result);
        if (parseResult.status == 1) callback(null, true);
        else callback(new Error('Pushover failed with error code ' + parseResult.status, false));
      }
    });
  }
};

module.exports.Pushover = Pushover;