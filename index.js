var split = require('split');
var through = require('through');
var duplexer = require('duplexer');
var shellQuote = require('shell-quote');
var decodePrompt = require('decode-prompt');

var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits');
var nextTick = typeof setImmediate === 'function'
    ? setImmediate : process.nextTick
;

module.exports = Bash;
inherits(Bash, EventEmitter);

function Bash (opts) {
    if (!(this instanceof Bash)) return new Bash(opts);
    if (!opts) opts = {};
    this.env = opts.env || {};
    if (this.env.PS1 === undefined) {
        this.env.PS1 = opts.isTTY === false
            ? '\\w \\$ '
            : '\\w \\$ '
        ;
    }
    this.custom = opts.custom || [];
    
    this._reader = opts.read;
    this._writer = opts.write;
    this._spawner = opts.spawn;
}

Bash.prototype._read = function (file) {
    this.emit('read', file);
    if (this._reader) return this._reader(file);
};

Bash.prototype._write = function (file) {
    this.emit('write', file);
    if (this._writer) return this._writer(file);
};

Bash.prototype._spawn = function (cmd, args, opts) {
    this.emit('spawn', cmd, args, opts);
    if (this._spawner) return this._spawner(cmd, args, opts);
};

Bash.prototype.getPrompt = function () {
    return decodePrompt(this.env.PS1, {
        env: this.env
    });
};

Bash.prototype.createStream = function () {
    var self = this;
    var sp = split();
    var closed = false;
    
    var output = resumer();
    output.queue(self.getPrompt());
    
    sp.pipe(through(write, end));
    return duplexer(sp, output);
    
    function write (line) {
        var p = self.eval(line);
        sp.pause();
        p.pause();
        p.pipe(through(null, function () {
            sp.resume();
            nextTick(function () {
                if (!closed) output.queue(self.getPrompt());
            });
        }));
        p.pipe(output, { end: false });
        p.resume();
    }
    
    function end () {
        closed = true;
        output.queue(null);
    }
};

Bash.prototype.emit = function (name) {
    var self = this;
    var args = [].slice.call(arguments, 1);
    var res;
    this.listeners(name).forEach(function (fn) {
        res = res || fn.apply(self, args);
    });
    return res;
};

Bash.prototype.eval = function (line) {
    var self = this;
    if (!/\S+/.test(line)) {
        return builtins.echo.call(self, [ '-n' ]);
    }
    var output = resumer();
    
    if (Array.isArray(line)) line = line.join(' ');
    var parts = shellQuote.parse(line, function (key) {
        return { env: key };
    });
    var commands = [];
    
    for (var i = 0; i < parts.length; i++) {
        if (typeof parts[i] === 'object' && parts[i].op) {
            commands.push(parts[i]);
        }
        else {
            var cmd = commands[commands.length-1];
            if (!cmd || !cmd.command) {
                cmd = { command: parts[i], args: [] };
                commands.push(cmd);
            }
            else cmd.args.push(parts[i]);
        }
    }
    
    (function run (prevCode) {
        self.env['?'] = prevCode;
        
        if (commands.length === 0) {
            return nextTick(function () {
                output.emit('exit', self.env['?']);
                output.queue(null);
            });
        }
        var cmd = shiftCommand();
        var redirected = false;
        
        while (commands[0] && /^[|<>]$/.test(commands[0].op)) {
            var op = commands.shift().op;
            if (op === '|') {
                cmd = cmd.pipe(shiftCommand());
            }
            else if (op === '>') {
                var c = commands.shift();
                var file = typeof c === 'object' && c.env
                    ? self.env[c.env]
                    : c.command
                ;
                var ws = self._write(file);
                ws.on('error', function (err) {
                    output.queue(file + ': ' + (err.message || err) + '\n');
                    exitCode = err && err.code || 1;
                });
                if (!ws) {
                    output.queue(file + ': No such file or directory\n');
                    exitCode = 1;
                }
                else cmd.pipe(ws);
                redirected = true;
            }
            else if (op === '<') {
                var c = commands.shift();
                var file = typeof c === 'object' && c.env
                    ? self.env[c.env]
                    : c.command
                ;
                var rs = self._read(file);
                rs.on('error', function (err) {
                    output.queue(file + ': ' + (err.message || err) + '\n');
                    exitCode = err && err.code || 1;
                });
                if (!rs) {
                    output.queue(file + ': No such file or directory\n');
                    exitCode = 1;
                }
                else rs.pipe(cmd);
            }
        }
        
        var exitCode = 0;
        if (!redirected) cmd.pipe(output, { end: false });
        
        cmd.on('exit', function (code) { exitCode = exitCode || code });
        cmd.on('end', function () {
            for (var next = commands[0]; next && next.op; next = commands[0]) {
                commands.shift();
                if (next && next.op === '&&' && exitCode !== 0) {
                    commands.shift();
                    exitCode = 1;
                }
                else if (next && next.op === '||' && exitCode === 0) {
                    commands.shift();
                    exitCode = 1;
                }
            }
            run(exitCode);
        });
        return cmd;
    })(0);
    
    function shiftCommand () {
        var c = commands.shift();
        var cmd = c.command;
        var args = c.args.map(function (arg) {
            if (typeof arg === 'object' && arg.env) {
                var r = self.env[arg.env];
                if (r === undefined) r = '';
                return String(r);
            }
            else return arg;
        }).filter(Boolean);
        
        var localEnv = null;
        while (typeof cmd === 'string' && /^\w+=/.test(cmd)) {
            var m = /^(\w+)=(?:"((?:[^"]|\\")*)"|'((?:[^']|\\')*)'|(.*))/
                .exec(cmd)
            ;
            var key = m[1], value = m[2] || m[3] || m[4] || '';
            
            if (!localEnv) localEnv = copy(self.env);
            localEnv[key] = value;
            
            cmd = args.shift();
            if (cmd === undefined) {
                Object.keys(localEnv).forEach(function (key) {
                    self.env[key] = localEnv[key];
                });
                var tr = resumer();
                tr.queue(null);
                return tr;
            }
        }
        
        if (typeof cmd === 'object' && cmd.env) {
            cmd = self.env[cmd.env];
        }
        
        if (builtins[cmd] && self.custom.indexOf(cmd) < 0) {
            return builtins[cmd].call(self, args);
        }
        
        var p = self._spawn(cmd, args, {
            env: localEnv || self.env,
            cwd: self.env.PWD
        });
        if (p && p.stdin && p.stdout) {
            var d = duplexer(p.stdin, p.stdout);
            p.on('exit', function (code) { d.emit('exit', code) });
            return d;
        }
        if (!p) {
            p = resumer();
            p.queue('No command "' + cmd + '" found\n');
        }
        return p;
    }
    
    return output;
};

var builtins = Bash.builtins = {};
builtins.eval = Bash.prototype.eval;
builtins.echo = function (args) {
    var tr = resumer();
    
    var opts = { newline: true, 'escape': false };
    for (var i = 0; i < args.length; i++) {
        if (args[i] === '-n') {
            opts.newline = false;
            args.splice(i--, 1);
        }
        else if (args[i] === '-e') {
            opts['escape'] = true;
            args.splice(i--, 1);
        }
        else if (args[i] === '-E') {
            opts['escape'] = false;
            args.splice(i--, 1);
        }
    }
    
    if (args.length) tr.queue(args.join(' '));
    if (opts.newline) tr.queue('\n');
    tr.queue(null);
    
    return tr;
};

builtins['true'] = function (args) {
    var tr = through();
    tr.pause();
    nextTick(function () {
        tr.emit('exit', 0);
        tr.queue(null);
        tr.resume();
    });
    return tr;
};

builtins['false'] = function (args) {
    var tr = through();
    tr.pause();
    nextTick(function () {
        tr.emit('exit', 1);
        tr.queue(null);
        tr.resume();
    });
    return tr;
};

function resumer () {
    var tr = through();
    tr.pause();
    var resume = tr.resume;
    var pause = tr.pause;
    var paused = false;
    
    tr.pause = function () {
        paused = true;
        return pause.apply(this, arguments);
    };
    
    tr.resume = function () {
        paused = false;
        return resume.apply(this, arguments);
    };
    
    nextTick(function () {
        if (!paused) tr.resume();
    });
    
    return tr;
}

function copy (obj) {
    var res = {};
    Object.keys(obj).forEach(function (key) {
        res[key] = obj[key];
    });
    return res;
}
