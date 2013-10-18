#!/usr/bin/env node
var bash = require('../');
var spawn = require('pty.js').spawn;
var clone = require('clone');
var duplexer = require('duplexer');
var ReadStream = require('tty').ReadStream;
var WriteStream = require('tty').WriteStream;
var fs = require('fs');

var sh = bash({
    env: process.env,
    spawn: spawn,
    write: fs.createWriteStream,
    read: fs.createReadStream,
    exists: fs.exists
});

require('net').createServer(function (sock) {
  var s = sh.createStream();
  sock.pipe(s).pipe(sock)
}).listen(7777)
