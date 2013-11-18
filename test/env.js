var test = require('tap').test;
var bash = require('../');
var through = require('through');
var concat = require('concat-stream');

test('set env vars', function (t) {
    t.plan(1);
    
    var sh = bash({ spawn: run, env: { X: 3, PS1: '$ ' } });
    
    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(src + '', '$ 3\n5\n3\n2\n');
    }));
    s.write('printx; X=5 printx; printx; X=2; printx\n');
    s.end();
});

test('set quoted env var', function (t) {
    t.plan(1);
    
    var sh = bash({ spawn: run, env: { X: 3, PS1: '$ ' } });
    
    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(src + '', '$ 7 8 9\n');
    }));
    s.write('X="7 8 9"; printx\n');
    s.end();
});

function run (cmd, args, opts) {
    var tr = through();
    tr.pause();
    
    if (cmd === 'printx') {
        tr.queue(opts.env.X + '\n');
    }
    else {
        tr.queue('No such command: ' + cmd + '\n');
    }
    
    tr.queue(null);
    process.nextTick(function () { tr.resume() });
    return tr;
}
