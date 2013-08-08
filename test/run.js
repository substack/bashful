var test = require('tap').test;
var bash = require('../');
var resumer = require('resumer');
var concat = require('concat-stream');

test('run', function (t) {
    t.plan(1);
    
    var sh = bash({
        env: { XYZ: 'abcdefg', PS1: '$ ', PWD: '/home/test' },
        spawn: run
    });
    
    var s = sh.createStream();
    s.pipe(concat(function (err, src) {
        t.equal(src, '$ /home/test\nboop\nabcdefg\n');
    }));
    s.write('pwd\n');
    s.write('beep\n');
    s.write('echo $XYZ\n');
    s.end();
});

function run (cmd, args) {
    if (cmd === 'beep') {
        var tr = resumer();
        tr.queue('boop\n');
        tr.queue(null);
        return tr;
    }
}
