var test = require('tape');
var bash = require('../');
var through = require('through');
var concat = require('concat-stream');
var nextTick = require('../lib/next_tick');

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
            nextTick(function () {
                cb(file === dir);
            });
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
        t.equal(src + '', '$ pushd: no other directory\n1\n/beep/boop\n');
        t.same(sh.dirs, []);
        t.equal(sh.env.PWD, '/beep/boop');
    }));
    s.end('pushd; echo $?; pwd');
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
            nextTick(function () {
                cb(file === '/home/robot');
            });
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
            nextTick(function () {
                cb(false);
            });
        }
    });
    sh.dirs = [
        '/does/not/exist'
    ];

    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(src + '', '$ pushd: /does/not/exist: No such file or directory\n1\n/beep/boop\n');
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
        t.equal(src + '', '$ pushd: -3: directory stack index out of range\n1\n/beep/boop\n');
        t.same(sh.dirs, [
            '/beep/boop',
            '/home/robot'
        ]);
        t.equal(sh.env.PWD, '/beep/boop');
    }));
    s.end('pushd -3; echo $?; pwd;');
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

test('pushd with positive stack rotation argument', function (t) {
    t.plan(4);

    var sh = bash({
        spawn: function (cmd) { t.fail('spawn ' + cmd) },
        env: {
            PS1: '$ ',
            PWD: '/4',
            HOME: '/home/robot'
        },
        exists: function (file, cb) {
            t.equal(file, '/1');
            cb(file === '/1');
        }
    });
    sh.dirs = [
        '/3',
        '/2',
        '/1'
    ];

    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(src + '', '$ /1 /4 /3 /2\n0\n/1\n');
        t.same(sh.dirs, [
            '/4',
            '/3',
            '/2'
        ]);
        t.equal(sh.env.PWD, '/1');
    }));
    s.end('pushd +3; echo $?; pwd;');
});

test('pushd with negative stack rotation argument', function (t) {
    t.plan(4);

    var sh = bash({
        spawn: function (cmd) { t.fail('spawn ' + cmd) },
        env: {
            PS1: '$ ',
            PWD: '/4',
            HOME: '/home/robot'
        },
        exists: function (file, cb) {
            t.equal(file, '/3');
            nextTick(function () {
                cb(file === '/3');
            });
        }
    });
    sh.dirs = [
        '/3',
        '/2',
        '/1'
    ];

    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(src + '', '$ /3 /2 /1 /4\n0\n/3\n');
        t.same(sh.dirs, [
            '/2',
            '/1',
            '/4'
        ]);
        t.equal(sh.env.PWD, '/3');
    }));
    s.end('pushd -3; echo $?; pwd;');
});

test('pushd with the -n argument should only modify the stack, not PWD', function (t) {
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
        '/home/robot'
    ];

    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(src + '', '$ /beep/boop .. /home/robot\n0\n/beep/boop\n');
        t.same(sh.dirs, [
            '..',
            '/home/robot'
        ]);
        t.equal(sh.env.PWD, '/beep/boop');
    }));
    s.end('pushd -n ..; echo $?; pwd;');
});

test('pushd with the -n argument should only modify the stack, not PWD (reverse argument order)', function (t) {
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
        t.equal(src + '', '$ /beep/boop nope\n0\n/beep/boop\n');
        t.same(sh.dirs, [
            'nope'
        ]);
        t.equal(sh.env.PWD, '/beep/boop');
    }));
    s.end('pushd nope -n; echo $?; pwd;');
});

test('pushd with the -n argument and no dir should be a noop', function (t) {
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
        '/home/robot'
    ];

    var s = sh.createStream();
    s.pipe(concat(function (src) {
        t.equal(src + '', '$ 0\n/beep/boop\n');
        t.same(sh.dirs, [
            '/home/robot'
        ]);
        t.equal(sh.env.PWD, '/beep/boop');
    }));
    s.end('pushd -n; echo $?; pwd;');
});
