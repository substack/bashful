var test = require('tape');
var bash = require('../');
var through = require('through');
var concat = require('concat-stream');
var nextTick = require('../lib/next_tick.js');

test('basic cd', function (t) {
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
            nextTick(function () {
                cb(file === '/home/robot');
            });
        }
    });
    
    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(src + '', '$ 0\n/home/robot\n');
    }));
    s.end('cd; echo $?; pwd');
});

test('cd should fail when trying to change to a non-existing directory', function (t) {
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
            nextTick(function () {
                cb(false);
            });
        }
    });

    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(src + '', '$ cd: /home/robot: No such file or directory\n1\n/beep/boop\n');
    }));
    s.end('cd; echo $?; pwd');
});
