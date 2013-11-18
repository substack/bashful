var test = require('tap').test;
var bash = require('../');
var through = require('through');
var concat = require('concat-stream');

test('run', function (t) {
    t.plan(1);
    
    var sh = bash({ spawn: run, env: { 'PS1': '$ ' } });
    
    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(src + '', '$ 10\n');
    }));
    s.write('echo beep boop | wc -c\n');
    s.end();
});

function run (cmd, args) {
    if (cmd === 'wc' && args[0] === '-c') {
        var count = 0;
        var write = function (buf) { count += buf.length };
        var end = function () {
            this.queue(count + '\n');
            this.queue(null);
        };
        var tr = through(write, end);
        return tr;
    }
}
