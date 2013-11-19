var test = require('tape');
var bash = require('../');
var resumer = require('resumer');
var concat = require('concat-stream');

test('run', function (t) {
    t.plan(1);
    
    var sh = bash({
        env: {
            XYZ: 'abcdefg',
            PS1: '$ ',
            PWD: '/home/test'
        },
        spawn: run
    });
    
    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(src + '', [
            '$ /home/test',
            'boop',
            'abcdefg',
            ''
        ].join('\n'));
    }));
    s.end('pwd; beep; echo $XYZ\n');
});

function run (cmd, args) {
    if (cmd === 'beep') {
        var tr = resumer();
        tr.queue('boop\n');
        tr.queue(null);
        return tr;
    }
}
