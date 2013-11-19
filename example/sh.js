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
sh.on('done', function (index, job) {
    console.log(
        '[' + index + '] '
        + job.command + ' '
        + job.arguments.join(' ')
    );
});

var s = sh.createStream();
process.stdin.pipe(s).pipe(process.stdout);
