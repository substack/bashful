var through = require('through');
var resumer = require('resumer');
var duplexer = require('duplexer');
var shellQuote = require('shell-quote');
var decodePrompt = require('decode-prompt');
var path = require('path');

var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits');
var nextTick = require('./lib/next_tick.js');

var stringify = JSON.stringify

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
    if (!this.env.PWD) this.env.PWD = '/';
    this.custom = opts.custom || [];
    
    this._reader = opts.read || function () {};
    this._writer = opts.write || function () {};
    this._spawner = opts.spawn || function () {};
    this._exists = opts.exists || function (file, cb) { cb(false) };
    
    this._cursorX = 0;
    this.history = [];
    this.historyIndex = 0;
    this._historyLast = null;
}

Bash.prototype._read = function (rfile) {
    var file = path.resolve(this.env.PWD, rfile);
    this.emit('read', file);
    if (this._reader) return this._reader(file);
};

Bash.prototype._write = function (rfile) {
    var file = path.resolve(this.env.PWD, rfile);
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
    
    var line = '';
    var mode = null;
    
    var input = through(function write (buf) {
        if (typeof buf !== 'string') buf = buf.toString('utf8');
        
        for (var i = 0; i < buf.length; i++) {
            var c = buf.charCodeAt(i);
            if (current) {}
            else if (mode === 'escape' && c === 0x5b) {
                mode = '[';
                continue;
            }
            else if (mode === 'escape' && c === 0x4f) {
                mode = 'O';
                continue;
            }
            else if (mode === '[' && c >= 65 && c <= 68) {
                var dir = {
                    A: 'up', B: 'down', C: 'right', D: 'left'
                }[String.fromCharCode(c)];
                
                if (dir === 'left' && self._cursorX) {
                    self._cursorX --;
                    output.queue('\x1b\x5bD');
                }
                else if (dir === 'right' && self._cursorX < line.length) {
                    self._cursorX ++;
                    output.queue('\x1b\x5bC');
                }
                else if (dir === 'up') {
                    if (self._cursorX !== line.length) {
                        output.queue(
                            '\x1b[' + (line.length - self._cursorX) + 'C'
                        );
                        self._cursorX = line.length;
                    }
                    else if (self.historyIndex > 0) {
                        if (self.historyIndex === self.history.length
                        && self._historyLast === null) {
                            self._historyLast = line;
                        }
                        line = self.history[-- self.historyIndex];
                        if (self._cursorX) {
                            output.queue(
                                '\x1b[' + self._cursorX + 'D\x1b[K'
                                + line
                            );
                        }
                        else output.queue(line);
                        self._cursorX = line.length;
                    }
                }
                else if (dir === 'down'
                && self.historyIndex <= self.history.length - 1) {
                    if (self.historyIndex === self.history.length - 1) {
                        line = self._historyLast || '';
                        self.historyIndex ++;
                    }
                    else line = self.history[++ self.historyIndex];
                    if (self._cursorX) {
                        output.queue(
                            '\x1b[' + self._cursorX + 'D\x1b[K'
                            + line
                        );
                    }
                    else output.queue(line)
                    
                    self._cursorX = line.length;
                }
                
                mode = null;
                continue;
            }
            else if (mode === '[' && (c >= 48 && c <= 57)) {
                mode = '[' + buf.charAt(i);
                continue;
            }
            else if (/^\[\d/.test(mode) && c === 0x7e) {
                if (mode === '[3') { // delete
                    var before = line.slice(0, self._cursorX);
                    var after = line.slice(self._cursorX + 1);
                    line = before + after;
                    output.queue(
                        '\x1b[K' + after + '\x1b[' + after.length + 'D'
                    );
                }
                // todo: pgup, pgdown, insert
                mode = null;
                continue;
            }
            else if (mode === 'O') {
                var ch = buf.charAt(i);
                if (ch === 'F') { // end
                    output.queue('\x1b[' + (line.length - self._cursorX) + 'C');
                    self._cursorX = line.length;
                }
                else if (ch === 'H') { // home
                    output.queue('\x1b[' + self._cursorX + 'D');
                    self._cursorX = 0;
                }
                mode = null;
                continue;
            }
            else if (mode) {
                mode = null;
                continue;
            }
            
            if (c === 3) {
                if (current) {
                    line = '';
                    current.emit('SIGINT');
                    output.queue('^C');
                }
                else {
                    line = '';
                    self._cursorX = 0;
                    self.historyIndex = self.history.length;
                    self._historyLast = null;
                    output.queue('\n');
                    output.queue(self.getPrompt());
                }
                return write(buf.slice(i + 1));
            }
            else if (c === 4) {
                if (current) current.end();
                else this.queue(null);
                self._cursorX = 0;
                return write(buf.slice(i + 1));
            }
            else if (c === 8 || c === 0x7f) {
                if (self._cursorX) {
                    self._cursorX --;
                    var before = line.slice(0, self._cursorX)
                    var after = line.slice(self._cursorX + 1)
                    line = before + after;
                    
                    if (after.length) {
                        output.queue(
                            '\010\x1b[K' + after
                            + '\x1b[' + after.length + 'D'
                        );
                    }
                    else output.queue('\010 \010');
                }
                return write(buf.slice(i + 1));
            }
            else if (c === 10 || c === 13) {
                this.queue(line);
                if (line.length) {
                    self.history.push(line);
                    self.historyIndex = self.history.length;
                    self._historyLast = null;
                }
                self._cursorX = 0;
                line = '';
                return write(buf.slice(i + 1));
            }
            else if (c === 0x1b) {
                mode = 'escape';
            }
            else {
                var before = line.slice(0, self._cursorX);
                var after = line.slice(self._cursorX);
                var middle = String.fromCharCode(c);
                
                if (!/\s/.test(middle) && c < 26) {
                    output.queue('^' + String.fromCharCode(64 + c));
                }
                line = before + middle + after;
                
                if (after.length && middle === ' ') {
                    output.queue(
                        '\x1b[K' + after
                        + '\x1b[' + (after.length + 1) + 'D '
                    );
                }
                else if (after.length) {
                    output.queue(
                        '\x1b[K' + after
                        + '\x1b[' + after.length + 'D'
                    );
                }
                self._cursorX ++;
            }
        }
    }, inputEnd);
    
    function inputEnd () {
        if (line.length) this.queue(line);
        nextTick(function () {
            input.queue(null);
        });
    }
    
    var closed = false;
    
    var output = resumer();
    output.queue(self.getPrompt());
    
    var current = null;
    self.once('exit', end);
    
    var queue = [];
    input.pipe(through(write, end));
    return duplexer(input, output);
    
    function write (buf) {
        var line = typeof buf === 'string' ? buf : buf.toString('utf8');
        if (line === '') {
            if (!closed) {
                output.queue(self.getPrompt());
            }
            return;
        }
        if (current) return queue.push(line);
        
        var p = self.eval(line);
        p.on('SIGALRM', exit('SIGALRM', 142, 'Alarm clock'));
        p.on('SIGHUP', exit('SIGHUP', 129, 'Hangup'));
        p.on('SIGINT', exit('SIGINT', 0, ''));
        p.on('SIGKILL', exit('SIGKILL', 137, 'Killed'));
        p.on('SIGPIPE', exit('SIGPIPE', 141, ''));
        p.on('SIGPOLL', exit('SIGPOLL', 157, 'I/O possible'));
        p.on('SIGPROF', exit('SIGPROF', 155, 'Profiling timer expired'));
        p.on('SIGTERM', exit('SIGTERM', 143, 'Terminated'));
        p.on('SIGUSR1', exit('SIGUSR1', 138, 'User defined signal 1'));
        p.on('SIGUSR2', exit('SIGUSR2', 140, 'User defined signal 2'));
        p.on('SIGVTALRM', exit('SIGVTALRM', 154, 'Virtual timer expired'));
        p.on('SIGSTKFLT', exit('SIGSTKFLT', 144, 'Stack fault'));
        
        function exit (name, code, msg) {
            return function () {
                if (name === 'SIGKILL' || p.listeners(name).length === 1) {
                    output.queue(msg + '\n');
                    p.emit('exit', code);
                }
            };
        }
        
        current = p;
        p.pause();
        p.pipe(through(null, function () { p.emit('exit', 0) }));
        
        var exitCode = null;
        p.on('exit', function (code) {
            if (exitCode !== null) return;
            exitCode = code;
            current = null;
            nextTick(function () {
                if (!closed) output.queue(self.getPrompt());
                if (queue.length) {
                    write(queue.shift());
                }
                else if (closed) {
                    output.queue(null);
                    self.emit('exit', 0);
                }
            });
        });
        p.pipe(output, { end: false });
        p.resume();
    }
    
    function end () {
        closed = true;
        if (!current) {
            output.queue(null);
            self.emit('exit', 0);
        }
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
        cmd.on('error', function (err) { output.emit('error', err) });
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
        if (p && p.stdout) {
            var stdin = p.stdin || resumer();
            var d = duplexer(stdin, p.stdout);
            p.on('exit', function (code) { d.emit('exit', code) });
            p.on('error', function (e) { d.emit('error', e) });
            return d;
        }
        if (!p) {
            p = resumer();
            p.queue('No command ' + stringify(cmd) + ' found\n');
            p.queue(null);
        }
        return p;
    }
    
    return output;
};

function copy (obj) {
    var res = {};
    Object.keys(obj).forEach(function (key) {
        res[key] = obj[key];
    });
    return res;
}

var builtins = require('./lib/builtins/index.js');
builtins.eval = Bash.prototype.eval;
