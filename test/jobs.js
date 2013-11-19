var test = require('tape');
var bash = require('../');
var through = require('through');
var concat = require('concat-stream');

test('jobs', function (t) {
    t.plan(1);
    
    var sh = bash({ spawn: run, env: { 'PS1': '' } });
    
    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(src + '', '[0] beep\nboop!\n');
    }));
    s.write('beep &\njobs\n');
    s.end();
});

function run (cmd, args) {
    if (cmd === 'beep') {
        var tr = through();
        setTimeout(function () {
            tr.queue('boop!\n');
            tr.queue(null);
        }, 100);
        return tr;
    }
}
