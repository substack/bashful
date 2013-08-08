#!/usr/bin/env node
var bash = require('../');
var fs = require('fs');

var sh = bash({
    env: process.env,
    spawn: require('child_process').spawn,
    write: fs.createWriteStream,
    read: fs.createReadStream,
    exists: fs.exists
});
sh.on('exit', process.exit);

process.stdin.on('data', function (buf) {
    if (buf[0] === 13) process.stdout.write('\n');
    else if (buf[0] > 27 && buf[0] < 127) {
        process.stdout.write(buf);
    }
});
process.stdin.setRawMode(true);

var s = sh.createStream();
process.stdin.pipe(s).pipe(process.stdout);
