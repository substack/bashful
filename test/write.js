var test = require('tap').test;
var bash = require('../');

var through = require('through');
var concat = require('concat-stream');
var fs = require('fs');
var spawn = require('child_process').spawn;

var path = require('path');
var mkdirp = require('mkdirp');


var tempdir = path.join(require('os').tmpDir(), 'bashful-test');
mkdirp.sync(tempdir);

function genTempfile () {
    return path.join(
        tempdir,
        Math.floor(Math.pow(16,8)*Math.random()).toString(16)
    );
}

test('echo > file', function (t) {
    t.plan(2);
    var tempfile = genTempfile();
    
    var sh = bash({
        spawn: spawn,
        env: { PS1: '' },
        write: fs.createWriteStream
    });
    
    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(
            fs.readFileSync(tempfile, 'utf8'),
            'beep boop\n'
        );
        t.equal(src + '', 'beep boop\n');
    }));
    s.write('echo beep boop > ' + tempfile + '\n');
    s.write('cat ' + tempfile + '\n');
    s.end();
});

test('echo | wc -c > file', function (t) {
    t.plan(1);
    var tempfile = genTempfile();
    
    var sh = bash({
        spawn: spawn,
        env: { PS1: '$ ', PWD: path.dirname(tempfile) },
        write: fs.createWriteStream
    });
    
    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(
            fs.readFileSync(tempfile, 'utf8'),
            '10\n'
        );
    }));
    s.write('echo beep boop | wc -c > ' + tempfile + '\n');
    s.end();
});

test('pwd; echo | wc -c > file', function (t) {
    t.plan(2);
    var tempfile = genTempfile();
    
    var sh = bash({
        spawn: spawn,
        env: { PS1: '', PWD: tempdir },
        write: fs.createWriteStream
    });
    
    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(
            fs.readFileSync(tempfile, 'utf8'),
            '10\n'
        );
        t.equal(src + '', tempdir + '\n10\n');
    }));
    s.write('pwd; echo beep boop | wc -c > ' + path.basename(tempfile) + '\n');
    s.write('cat ' + path.basename(tempfile) + '\n');
    s.end();
});

test('echo | wc -c > file; pwd', function (t) {
    t.plan(2);
    var tempfile = genTempfile();
    
    var sh = bash({
        spawn: spawn,
        env: { PS1: '', PWD: path.dirname(tempfile) },
        write: fs.createWriteStream
    });
    
    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(
            fs.readFileSync(tempfile, 'utf8'),
            '10\n'
        );
        t.equal(src + '', path.dirname(tempfile) + '\n10\n');
    }));
    s.write('echo beep boop | wc -c > ' + path.basename(tempfile) + '; pwd\n');
    s.write('cat ' + path.basename(tempfile) + '\n');
    s.end();
});

test('true > file && echo PASS', function (t) {
    t.plan(2);
    var tempfile = genTempfile();
    
    var sh = bash({
        spawn: spawn,
        env: { PS1: '$ ', PWD: path.dirname(tempfile) },
        write: fs.createWriteStream
    });
    
    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(fs.readFileSync(tempfile, 'utf8'), '');
        t.equal(src + '', '$ PASS\n');
    }));
    s.write('true > ' + tempfile + ' && echo PASS\n');
    s.end();
});

test('false > file && echo PASS', function (t) {
    t.plan(2);
    var tempfile = genTempfile();
    
    var sh = bash({
        spawn: spawn,
        env: { PS1: '$ ' },
        write: fs.createWriteStream
    });
    
    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(fs.readFileSync(tempfile, 'utf8'), '');
        t.equal(src + '', '$ ');
    }));
    s.write('false > ' + tempfile + ' && echo PASS\n');
    s.end();
});

test('true > file || echo PASS', function (t) {
    t.plan(2);
    var tempfile = genTempfile();
    
    var sh = bash({
        spawn: spawn,
        env: { PS1: '$ ' },
        write: fs.createWriteStream
    });
    
    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(fs.readFileSync(tempfile, 'utf8'), '');
        t.equal(src + '', '$ ');
    }));
    s.write('true > ' + tempfile + ' || echo PASS\n');
    s.end();
});

test('false > file || echo PASS', function (t) {
    t.plan(2);
    var tempfile = genTempfile();
    
    var sh = bash({
        spawn: spawn,
        env: { PS1: '$ ' },
        write: fs.createWriteStream
    });
    
    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(fs.readFileSync(tempfile, 'utf8'), '');
        t.equal(src + '', '$ PASS\n');
    }));
    s.write('false > ' + tempfile + ' || echo PASS\n');
    s.end();
});
