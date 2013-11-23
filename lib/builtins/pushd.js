var resumer = require('resumer');
var resumerExit = require('../resumer_exit');
var nextTick = require('../next_tick.js');
var parseArgs = require('minimist');
var path = require('path');

module.exports = function (args) {
    var env = this.env;
    var dirs = (this.dirs = this.dirs || []);
    var argv = parseArgs(args);
    var tr;

    // Handle empty arg (swap top dirs)
    // replace ^env.HOME with ~ (for display)

    var dir = argv._[0] || '';
    var swap = !dir;

    if (swap && dirs.length === 0) {
        tr = resumerExit(1);
        tr.queue("pushd: no other directory" + '\n');
        return tr;
    }

    var edir;
    if (swap) edir = dirs.splice(1, 1)[0];
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
            if (dirs.length === 0) dirs.push(env.PWD);
            dirs.unshift(edir);
            env.PWD = edir;
            tr.emit('exit', 0);
            tr.queue(dirs.join(' ') + '\n');
            tr.queue(null);
        }
        else {
            if (swap) {
                dirs.unshift(env.PWD);
            }
            tr.queue('pushd: ' + dir + ': No such file or directory\n');
            tr.emit('exit', 1);
            tr.queue(null);
        }
    }
};
