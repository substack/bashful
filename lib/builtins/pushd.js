var resumer = require('resumer');
var resumerExit = require('../resumer_exit');
var nextTick = require('../next_tick.js');
var parseArgs = require('minimist');
var path = require('path');

module.exports = function (args) {
    var env = this.env;
    var dirs = (this.dirs = this.dirs || []);
    var argv = parseArgs(args); // Probably don't need to use minimist
    var tr;

    // replace ^env.HOME with ~ (for display)

    // Using parseInt directly here would cause false
    // positives for directory names starting with integers
    if (/^[+-]\d+$/.test(args[0])) {
        var rotate = parseInt(args[0], 10);
        if (Math.abs(rotate) > dirs.length) {
            tr = resumerExit(1);
            // Use args[0] to preserve '+' prefix for positive numbers
            tr.queue('pushd: ' + args[0] + ': directory stack index out of range\n');
            return tr;
        }
    }

    var dir = argv._[0] || '';
    var swap = !dir;

    if (swap && dirs.length === 0) {
        tr = resumerExit(1);
        tr.queue('pushd: no other directory\n');
        return tr;
    }

    var edir;
    if (swap) edir = dirs.shift();
    else {
        edir = dir.replace(/^~/, env.HOME);
        edir = path.resolve(env.PWD, edir);
    }

    tr = resumer();
    if (this._exists) this._exists(edir, onexists);
    else nextTick(function () { onexists(false) });

    return tr;

    function onexists (ex) {
        if (ex) {
            dirs.unshift(env.PWD);
            env.PWD = edir;
            tr.emit('exit', 0);
            tr.queue(edir + ' ' + dirs.join(' ') + '\n');
            tr.queue(null);
        }
        else {
            if (swap) {
                dirs.unshift(env.PWD);
            }
            tr.queue('pushd: ' + edir + ': No such file or directory\n');
            tr.emit('exit', 1);
            tr.queue(null);
        }
    }
};
