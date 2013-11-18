var test = require('tap').test;
var bash = require('../');
var through = require('through');
var concat = require('concat-stream');

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
            cb(file === '/home/robot');
        }
    });
    
    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(src + '', '$ 0\n/home/robot\n');
    }));
    s.end('cd; echo $?; pwd');
});
