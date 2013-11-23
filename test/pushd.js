var test = require('tape');
var bash = require('../');
var through = require('through');
var concat = require('concat-stream');

test('basic pushd', function (t) {
    t.plan(3);

    var dirs = [
        '/home/robot',
        '/beep/boop'
    ];

    var sh = bash({
        spawn: function (cmd) { t.fail('spawn ' + cmd) },
        env: {
            PS1: '$ ',
            PWD: '/beep/boop',
            HOME: '/home/robot'
        },
        exists: function (file, cb) {
            var dir = dirs.shift();
            t.equal(file, dir);
            cb(file === dir);
        }
    });

    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(src + '', '$ /home/robot /beep/boop\n0\n/home/robot\n'
            + '/beep/boop /home/robot /beep/boop\n0\n/beep/boop\n');
    }));
    s.end('pushd ~; echo $?; pwd; pushd /beep/boop; echo $?; pwd;');
});

test('pushd with no arguments and an empty stack should err', function (t) {
    t.plan(1);

    var sh = bash({
        spawn: function (cmd) { t.fail('spawn ' + cmd) },
        env: {
            PS1: '$ ',
            PWD: '/beep/boop',
            HOME: '/home/robot'
        },
        exists: function (cmd) { t.fail('exists ' + cmd) }
    });

    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(src + '', '$ pushd: no other directory\n');
    }));
    s.end('pushd');
});

test('pushd with no arguments swaps top two dirs', function (t) {
    t.plan(2);

    var sh = bash({
        spawn: function (cmd) { t.fail('spawn ' + cmd) },
        env: {
            PS1: '$ ',
            PWD: '/beep/boop',
            HOME: '/home/robot'
        },
        exists: function (file, cb) {
            t.equal(file, '/home/robot');
            cb(file === '/home/robot');
        }
    });
    sh.dirs = [
        '/beep/boop',
        '/home/robot'
    ];

    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(src + '', '$ /home/robot /beep/boop\n0\n/home/robot\n');
    }));
    s.end('pushd; echo $?; pwd;');
});