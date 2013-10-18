var resumerExit = require('../resumer_exit');

module.exports = function (args) {
    for (var i = 0, len = args.length; i < len; i++) {
        var kv = args[i].split('=');
        var k = kv.shift();
        var v = kv.join('=');
        this.env[k] = v;
    }
    return resumerExit(0);
}
