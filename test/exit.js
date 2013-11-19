var test = require('tape');
var bash = require('../');
var through = require('through');
var concat = require('concat-stream');
var nextTick = typeof setImmediate !== 'undefined'
    ? setImmediate : process.nextTick
;

test('true $?', function (t) {
    t.plan(1);
    
    var env = { PS1: '$ ' };
    var sh = bash({
        env: env,
        spawn: run,
        custom: [ 'true', 'false' ]
    });
    
    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(env['?'], 0);
    }));
    s.end('true\n');
});

test('false $?', function (t) {
    t.plan(1);
    
    var env = { PS1: '$ ' };
    var sh = bash({
        env: env,
        spawn: run,
        custom: [ 'true', 'false' ]
    });
    
    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(env['?'], 1);
    }));
    s.end('false\n');
});

test('true; echo $?', function (t) {
    t.plan(1);
    
    var env = { PS1: '$ ' };
    var sh = bash({
        env: env,
        spawn: run,
        custom: [ 'true', 'false' ]
    });
    
    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(src, '$ 0\n');
    }));
    s.end('true; echo $?\n');
});

test('false; echo $?', function (t) {
    t.plan(1);
    
    var env = { PS1: '$ ' };
    var sh = bash({
        env: env,
        spawn: run,
        custom: [ 'true', 'false' ]
    });
    
    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(src, '$ 1\n');
    }));
    s.end('false; echo $?\n');
});

function run (cmd, args) {
    var tr = through();
    tr.pause();
    if (cmd === 'true') {
        process.nextTick(function () {
            tr.emit('exit', 0);
            tr.queue(null);
            tr.resume();
        });
    }
    else if (cmd === 'false') {
        process.nextTick(function () {
            tr.emit('exit', 1);
            tr.queue(null);
            tr.resume();
        });
    }
    else if (cmd === 'echo') {
        tr.queue(args.join(' ') + '\n');
        process.nextTick(function () {
            tr.queue(null);
            tr.resume();
        });
    }
    
    return tr;
}
