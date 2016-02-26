# About NodeFuel

NodeFuel is a small, modular collection of Node.js utilites and tools based on code I found myself reusing repeatedly for projects.  Perhaps I'll be the only user, but it makes my life easier, so it deserves a home on the web. :stuck_out_tongue_winking_eye:

####Module Family:
- **nodefuel** - This "core" module providing the base framework and essentials
- **nodefuel-webconsole** - Socket.io streaming Web view of log events **(coming)**
- **nodefuel-tcp** - TCP socket client and server framework **(coming)**
- **nodefuel-cli** - Command line tooling for rapid project startup **(coming)**

# NodeFuel (core)

This "core" package provides the (lightweight) base framework, as well as some essential logging and configuration tools:

* Simple, real-time log tools with output options for the console, local files, Pushover mobile alerts, and the Web (via "nodefuel-webconsole" -- **coming soon**).
* 6 log event "levels" (raw, debug, info, warn, error, alarm) and optional custom log event "labels" that can be used to target and filter specific log output.
* ANSI colored console output with formatting to improve readability.
* Pretty-printing for logged Javascript data types (objects, arrays, etc).
* "Raw" logger option for completely manual ouput formatting.
* A variety of other logging options and overrides.
* One-time and watched loading of JSON based configuration files. **(coming)**
* Change detection on watched configuration files, with event emitters for custom change handlers. **(coming)**

> **NOTE:** *This project is currently under active development. While I am using it in production, I do expect there will be changes leading up to a 1.0 release.  You have been warned! :)*

## Installation

Use NPM to install NodeFuel (core) and add it to your package.json:
```bash
$ npm install nodefuel --save
```

## Sample Usage

Getting started is easy:

```javascript
// Include NodeFuel
const nf = require('nodefuel');

// Request a logger with "MyApp" label (to use for filtering later)
const log = nf.logger('MyApp');

// Use the logger to log some events
log.raw('This is RAW output being logged');
log.debug('This is a DEBUG event message');
log.info('This is an INFO event message');
log.warn('This is a WARNING event message');
log.error('This is an ERROR event message');
log.alarm('This is an ALARM event message');
```

If there is a variable you'd like to log, just append it at the end of your log call:

```javascript
// The variable we'd like to include
let myVar = {
  aString: 'My String',
  aNumber: 123456,
  aArray: [1,2,3],
  aObject: { aParam: 'Another String'}
};

// Append it to the log call for pretty printing
log.info('Outputting myVar:', myVar);
```

You can also use the profile fuction to time events:

```javascript
// Start our timer named "MyTimer1"
log.profile('MyTimer1');

// Complete our "MyTimer1" on callback and log the resulting timespan
someProcessingFunction(var1, var2, () => { log.profile('MyTimer1'); } );
```

Now we'll add a second labeled logger to use for events related to all our "REST calls", and limit console output to only "warnings" and more critical events from all logger labels: 

```javascript
// Create a second logger labeled RESTcall
const logRest = nf.logger('RESTcall');

// Limit console log output to only events of "warning" level or higher
nf.logFilter('console', {level: 'warn'});
```

We'll also also create a couple rotating log files.  One for "error" and higher events with the "MyApp" label , and another for "debug" level and higher events with the "RESTcall" label:

```javascript
// Add a couple rotating log files filtered by level and label
nf.addLogFile('logs/application.log', {level: 'error', labels: 'MyApp'});
nf.addLogFile('logs/restcalls.log', {level: 'debug', labels: 'RESTcall'});
```

Finally we want any "alarm" level events for our "RESTcall" logger to be sent as Pushover (http://pushover.net) notifications to developers:

```javascript
// Add Pushover alerts for any "alarm" level events with our "RESTcall" label
nf.addPushAlert('My Node Application', {
  userKey: 'E1kbSVq4QWgQxXz81CEJp56Tdm4CDK', // Obviously use something legit :)
  token: 'aMdLHjhNFvR3u823sfydqX9q3ePutvi',  // Obviously use something legit :)
  level: 'alarm',
  labels: 'RESTcall'
});

// This would go to the console, restcalls.log file, and a push alert to developers
logRest.alarm(`Major failure: ${err}`);  
```

There are a variety of other logging options, covered in the API section below...

## API

####logger ([label])
- **label** (string) - Optional user-defined label for display and filtering.
- **Returns ->** Logger function object {raw(), debug(), info(), warn(), error(), alarm(), profile()} to log messages with.

```javascript
// Sample code
const nf = require('nodefuel');
const log = nf.logger('DBcall');
// ... some DB query resulting with an err
log.error(`Query error: ${err}`);
```

####addLogFile (filename[, options])
- **filename** (string) - Filename to write log messages to. **(required)**
- **options** (object) - Options object to configure the log file:
    - **level** (string) - Lowest log level that will be written *(default: 'info')*
    - **labels** (string|array|false) - Only include these filter labels *(default: false)*
    - **maxsize** (integer) - Max log file size before rotation *(default: 10485760)*
    - **maxFiles** (integer) - How many files should be rotated *(default: 20)*
    - **zippedArchive** (boolean) - Should the rotated archives be gzip'd *(default: true)*
    - **timestamp** (function) - Custom function returning a formatted time string to use
    - **eol** (string) - Line ending to use *(default: OS default)*
    - **maxRetries** (integer) - How many times to try writing file before error *(default: 3)*
- **returns -> ** Log name (string) to idenitfy the log for later actions like logfilter().

```javascript
// Sample code
const nf = require('nodefuel');
nf.addLogFile('logs/application.log', {level: 'debug'});
```

####addPushAlert (alertTitle[, options])
- **alertTitle** (string) - Pushover application title to use for these notifications. **(required)**
- **options** (object) - Options object to configure the Pushover alerts: **(required)**
    - **userKey** (string) - Pushover user/group key **(required)**
    - **token** (string) - Pushover application token **(required)**
    - **level** (string) - Lowest log level that will be sent *(default: 'alarm')*
    - **labels** (string|array|false) - Only include these filter labels *(default: false)*
    - **priority** (integer) - Pushover messages priority level *(default: 0)*
    - **sound** (string) - Pushover sound to use *(default: 'siren')*
    - **retry** (integer) - How often to retry for Pushover priority 2 events *(default: 60)*
    - **expire** (integer) - How log to retry for Pushover priority 2 events *(default: 3600)*
- **returns -> ** Log name (string) to idenitfy the log for later actions like logfilter().

```javascript
// Sample code
const nf = require('nodefuel');
nf.addPushAlert('My Node Application', {
  userKey: 'E1kbSVq4QWgQxXz81CEJp56Tdm4CDK', // Obviously use something legit :)
  token: 'aMdLHjhNFvR3u823sfydqX9q3ePutvi'  // Obviously use something legit :)
});
```

####addWebConsole ([ip, port, options]) ** * * COMING * * **
- **ip** (string) - IP address to use for the Web server *(default: 'localhost')*
- **port** (integer) - Port number to use for the Web server *(default: 8080)*
- **options** (object) - Options object to configure the Web console:
    - **level** (string) - Lowest log level that will be displayed *(default: 'raw')*
    - **labels** (string|array|false) - Only include these filter labels *(default: false)*
    - **title** (string) - Title to use for the Web console page *(default: 'NodeFuel Web Console')*
- **returns -> ** Log name (string) to idenitfy the log for later actions like logfilter().

```javascript
// Sample code
const nf = require('nodefuel');
nf.addWebConsole('192.168.1.100', 8000, { title: 'My Node Application' });
```
    
####getLoggers ()
- **returns -> ** Array of all logger labels currently defined.

####getLogs ()
- **returns -> ** Array of all log names currently defined.

## Version 

* Currently v0.5.0 

## History

* v0.5.0 - Initial release

## Credits

This module uses Winston, PrettyJSON, Pushover Notifications, and Moment.js

## License

#### ISC License

Copyright (c) 2016, Codelica LLC

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

*THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.*