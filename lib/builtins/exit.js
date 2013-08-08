var through = require('through');

module.exports = function (args) {
    this.emit('exit', parseInt(args[0] || '0'));
    return through();
};
