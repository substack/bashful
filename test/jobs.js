var test = require('tape');
var bash = require('../');
var through = require('through');
var concat = require('concat-stream');

test('1 job', function (t) {
    t.plan(1);
    
    var sh = bash({ spawn: run, env: { 'PS1': '' } });
    
    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(src + '', '[0] beep\nboop!\n');
    }));
    s.write('beep &\njobs\n');
    s.end();
});

test('3 jobs', function (t) {
    t.plan(1);
    
    var sh = bash({ spawn: run, env: { 'PS1': '' } });
    
    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(src + '', '[0] one\n[1] two\n[2] three\nTHREE!\nTWO!\nONE!\n');
    }));
    s.write('one &\n');
    s.write('two &\n');
    s.write('three &\n');
    s.write('jobs\n');
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
    else if (cmd === 'one') {
        var tr = through();
        setTimeout(function () {
            tr.queue('ONE!\n');
            tr.queue(null);
        }, 300);
        return tr;
    }
    else if (cmd === 'two') {
        var tr = through();
        setTimeout(function () {
            tr.queue('TWO!\n');
            tr.queue(null);
        }, 200);
        return tr;
    }
    else if (cmd === 'three') {
        var tr = through();
        setTimeout(function () {
            tr.queue('THREE!\n');
            tr.queue(null);
        }, 100);
        return tr;
    }
}
