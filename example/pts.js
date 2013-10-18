#!/usr/bin/env node
var bash = require('../');
var spawn = require('pty.js').spawn
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

sh.on('exit', process.exit);

process.stdin.on('data', function (buf) {
    if (sh.current) { /* let the current program handle the input */ }
    else if (buf[0] === 13) process.stdout.write('\n');
    else if (buf[0] > 27 && buf[0] < 127) {
        process.stdout.write(buf);
    }
});
process.stdin.setRawMode(true);

var s = sh.createStream();
process.stdin.pipe(s).pipe(process.stdout);
