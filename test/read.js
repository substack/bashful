var test = require('tap').test;
var bash = require('../');

var through = require('through');
var concat = require('concat-stream');
var fs = require('fs');
var spawn = require('child_process').spawn;

var path = require('path');
var mkdirp = require('mkdirp');
var tempfile = path.join(
    require('os').tmpDir(),
    'bashful-test',
    Math.floor(Math.pow(16,8)*Math.random()).toString(16)
);
mkdirp.sync(path.dirname(tempfile));

test('wc -c < file', function (t) {
    t.plan(1);
    
    var sh = bash({
        spawn: spawn,
        env: { PS1: '$ ' },
        read: fs.createReadStream
    });
    fs.writeFileSync(tempfile, 'beep boop\n');
    
    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(src + '', '$ 10\n');
    }));
    s.write('wc -c < ' + tempfile + '\n');
    s.end();
});

test('wc -c < relative_file', function (t) {
    t.plan(1);
    
    var sh = bash({
        spawn: spawn,
        env: { PS1: '$ ', PWD: path.dirname(tempfile) },
        read: fs.createReadStream
    });
    fs.writeFileSync(tempfile, 'beep boop\n');
    
    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(src + '', '$ 10\n');
    }));
    s.write('wc -c < ' + path.basename(tempfile) + '\n');
    s.end();
});

test('cat < file | wc -c', function (t) {
    t.plan(1);
    
    var sh = bash({
        spawn: spawn,
        env: { PS1: '$ ' },
        read: fs.createReadStream
    });
    fs.writeFileSync(tempfile, 'beep boop\n');
    
    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(src + '', '$ 10\n');
    }));
    s.write('cat < ' + tempfile + '| wc -c\n');
    s.end();
});
