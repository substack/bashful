var test = require('tape');
var bash = require('../');
var through = require('through');
var concat = require('concat-stream');

test('basic pushd', function (t) {
    t.plan(5);

    var dirs = [
        '/home/robot',
        '/beep/boop'
    ];

    var sh = bash({
        spawn: function (cmd) { t.fail('spawn ' + cmd) },
        env: {
            PS1: '$ ',
            PWD: '/beep/boop',
            HOME: '/home/robot'
        },
        exists: function (file, cb) {
            var dir = dirs.shift();
            t.equal(file, dir);
            cb(file === dir);
        }
    });

    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(src + '', '$ /home/robot /beep/boop\n0\n/home/robot\n'
            + '/beep/boop /home/robot /beep/boop\n0\n/beep/boop\n');
        t.same(sh.dirs, [
            '/home/robot',
            '/beep/boop'
        ]);
        t.equal(sh.env.PWD, '/beep/boop');
    }));
    s.end('pushd ~; echo $?; pwd; pushd /beep/boop; echo $?; pwd;');
});

test('pushd with no arguments and an empty stack should err', function (t) {
    t.plan(3);

    var sh = bash({
        spawn: function (cmd) { t.fail('spawn ' + cmd) },
        env: {
            PS1: '$ ',
            PWD: '/beep/boop',
            HOME: '/home/robot'
        },
        exists: function (cmd) { t.fail('exists ' + cmd) }
    });

    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(src + '', '$ pushd: no other directory\n');
        t.same(sh.dirs, []);
        t.equal(sh.env.PWD, '/beep/boop');
    }));
    s.end('pushd');
});

test('pushd with no arguments swaps top two dirs', function (t) {
    t.plan(4);

    var sh = bash({
        spawn: function (cmd) { t.fail('spawn ' + cmd) },
        env: {
            PS1: '$ ',
            PWD: '/beep/boop',
            HOME: '/home/robot'
        },
        exists: function (file, cb) {
            t.equal(file, '/home/robot');
            cb(file === '/home/robot');
        }
    });
    sh.dirs = [
        '/home/robot'
    ];

    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(src + '', '$ /home/robot /beep/boop\n0\n/home/robot\n');
        t.same(sh.dirs, [
            '/beep/boop'
        ]);
        t.equal(sh.env.PWD, '/home/robot');
    }));
    s.end('pushd; echo $?; pwd;');
});

test('pushd with no arguments handles missing destination dir', function (t) {
    t.plan(4);

    var sh = bash({
        spawn: function (cmd) { t.fail('spawn ' + cmd) },
        env: {
            PS1: '$ ',
            PWD: '/beep/boop',
            HOME: '/home/robot'
        },
        exists: function (file, cb) {
            t.equal(file, '/does/not/exist');
            cb(false);
        }
    });
    sh.dirs = [
        '/does/not/exist'
    ];

    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(src + '', '$ pushd: /does/not/exist: No such file or directory\n0\n/beep/boop\n');
        t.same(sh.dirs, [
            '/beep/boop'
        ]);
        t.equal(sh.env.PWD, '/beep/boop');
    }));
    s.end('pushd; echo $?; pwd;');
});

test('pushd with stack rotation argument on empty stack', function (t) {
    t.plan(3);

    var sh = bash({
        spawn: function (cmd) { t.fail('spawn ' + cmd) },
        env: {
            PS1: '$ ',
            PWD: '/beep/boop',
            HOME: '/home/robot'
        },
        exists: function (cmd) { t.fail('exists ' + cmd) }
    });

    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(src + '', '$ pushd: +1: directory stack index out of range\n1\n/beep/boop\n');
        t.same(sh.dirs, []);
        t.equal(sh.env.PWD, '/beep/boop');
    }));
    s.end('pushd +1; echo $?; pwd;');
});

test('pushd with stack rotation argument greater than stack size', function (t) {
    t.plan(3);

    var sh = bash({
        spawn: function (cmd) { t.fail('spawn ' + cmd) },
        env: {
            PS1: '$ ',
            PWD: '/beep/boop',
            HOME: '/home/robot'
        },
        exists: function (cmd) { t.fail('exists ' + cmd) }
    });
    sh.dirs = [
        '/beep/boop',
        '/home/robot'
    ];

    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(src + '', '$ pushd: -9: directory stack index out of range\n1\n/beep/boop\n');
        t.same(sh.dirs, [
            '/beep/boop',
            '/home/robot'
        ]);
        t.equal(sh.env.PWD, '/beep/boop');
    }));
    s.end('pushd -9; echo $?; pwd;');
});

test('pushd avoids false positives for stack rotation arguments', function (t) {
    t.plan(4);

    var sh = bash({
        spawn: function (cmd) { t.fail('spawn ' + cmd) },
        env: {
            PS1: '$ ',
            PWD: '/beep/boop',
            HOME: '/home/robot'
        },
        exists: function (file, cb) {
            t.equal(file, '/42-things-you-should-try-while-in-oakland');
            cb(file === '/42-things-you-should-try-while-in-oakland');
        }
    });

    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(src + '', '$ /42-things-you-should-try-while-in-oakland /beep/boop\n0\n/42-things-you-should-try-while-in-oakland\n');
        t.same(sh.dirs, [
            '/beep/boop'
        ]);
        t.equal(sh.env.PWD, '/42-things-you-should-try-while-in-oakland');
    }));
    s.end('pushd /42-things-you-should-try-while-in-oakland; echo $?; pwd;');
});
