var resumer = require('resumer');
var resumerExit = require('../resumer_exit');
var nextTick = require('../next_tick.js');
var path = require('path');
var rotate = require('rotate-array');

module.exports = function (args) {
    var env = this.env;
    var dirs = (this.dirs = this.dirs || []);
    var tr;
    var dir;
    var swap;
    var shift;

    function suppressExists(dir) {
        dirs.unshift(dir);
        var tr = resumerExit(0);
        tr.queue(env.PWD + ' ' + dirs.join(' ') + '\n');
        return tr;
    }

    // replace ^env.HOME with ~ (for display)

    // pushd +N/-N
    if (/^[+-]\d+$/.test(args[0])) {
        // Using parseInt directly and checking for NaN
        // values would cause false positives for directory
        // names starting with integers, hence the regexp
        var num = parseInt(args[0], 10);
        if (Math.abs(num) > dirs.length) {
            tr = resumerExit(1);
            // Use args[0] to preserve '+' prefix for positive numbers
            tr.queue('pushd: ' + args[0] + ': directory stack index out of range\n');
            return tr;
        }
        dirs.unshift(env.PWD);
        rotate(dirs, num);
        dir = dirs.shift();
        shift = true;

    // pushd -n dir
    } else if (args[0] === "-n") {
        return suppressExists(args[1]);

    // pushd dir -n
    } else if (args[1] === "-n") {
        return suppressExists(args[0]);

    // pushd dir
    } else if (args[0]) {
        dir = args[0];

    // pushd
    } else {
        if (dirs.length === 0) {
            tr = resumerExit(1);
            tr.queue('pushd: no other directory\n');
            return tr;
        }
        dir = dirs.shift();
        swap = true;
    }

    var edir = dir.replace(/^~/, env.HOME);
    edir = path.resolve(env.PWD, edir);

    tr = resumer();
    if (this._exists) this._exists(edir, onexists);
    else nextTick(function () { onexists(false) });

    return tr;

    function onexists (ex) {
        if (ex) {
            if (!shift) dirs.unshift(env.PWD);
            env.PWD = edir;
            tr.queue(edir + ' ' + dirs.join(' ') + '\n');
            tr.queue(null);
            tr.emit('exit', 0);
        }
        else {
            if (swap) dirs.unshift(env.PWD);
            tr.queue('pushd: ' + edir + ': No such file or directory\n');
            tr.queue(null);
            tr.emit('exit', 1);
        }
    }
};
