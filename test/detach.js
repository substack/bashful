var test = require('tape');
var bash = require('../');
var through = require('through');
var concat = require('concat-stream');

test('detach', function (t) {
    t.plan(1);
    
    var sh = bash({ spawn: run, env: { 'PS1': '$ ' } });
    
    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(src + '', '$ beep $ boop!');
    }));
    s.write('first & second\n');
    s.end();
});

function run (cmd, args) {
    if (cmd === 'first') {
        var tr = through();
        setTimeout(function () {
            tr.queue('boop!');
            tr.queue(null);
        }, 200);
        return tr;
    }
    else if (cmd === 'second') {
        var tr = through();
        setTimeout(function () {
            tr.queue('beep ');
            tr.queue(null);
        }, 100);
        return tr;
    }
}
