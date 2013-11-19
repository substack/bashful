var resumer = require('../resumer_exit.js');

module.exports = function (args) {
    var tr = resumer();
    var jobs = this.jobs;
    tr.queue(Object.keys(jobs).map(function (ix) {
        var j = jobs[ix];
        return '[' + ix + '] '
            + (j.command + ' ' + j.arguments.join(' ')).replace(/\s+$/, '')
            + '\n'
        ;
    }).join(''));
    return tr;
};
