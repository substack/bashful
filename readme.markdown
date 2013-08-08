# bashful

Parse and execute bash in javascript without doing any IO
so you can use your own IO backend.

[![build status](https://secure.travis-ci.org/substack/bashful.png)](http://travis-ci.org/substack/bashful)

# example

using the default line-buffering in node:

``` js
var bash = require('bashful');
var fs = require('fs');

var sh = bash({
    env: process.env,
    spawn: require('child_process').spawn,
    write: fs.createWriteStream,
    read: fs.createReadStream,
    exists: fs.exists
});

var s = sh.createStream();
process.stdin.pipe(s).pipe(process.stdout);
```

```
$ echo hello
hello
$ echo $PWD
/home/substack/projects/bashful
$ beep boop
No command "beep" found
$ echo beep boop | wc -c
10
$ false || true && echo bleep
bleep
$ echo ONE TWO THREE > outfile.txt
$ cat outfile.txt
ONE TWO THREE
$ wc -c < outfile.txt
14
```

# raw mode

in raw mode, you get history with up/down arrows, jumping around with
left/right/home/end, and control characters like ^C and ^D:

``` js
var bash = require('bashful');
var fs = require('fs');

var sh = bash({
    env: process.env,
    spawn: require('child_process').spawn,
    write: fs.createWriteStream,
    read: fs.createReadStream,
    exists: fs.exists
});
sh.on('close', process.exit);

process.stdin.on('data', function (buf) {
    if (buf[0] === 13) process.stdout.write('\n');
    else if (buf[0] > 27 && buf[0] < 127) {
        process.stdout.write(buf);
    }
});
process.stdin.setRawMode(true);

var s = sh.createStream();
process.stdin.pipe(s).pipe(process.stdout);
```

# methods

``` js
var bash = require('bashful')
```

## var sh = bash(opts)

Create a new bashful shell `sh` from `opts`:

* `opts.env` - environment variables to use
* `opts.write(file)` - return a writable stream for `file`
* `opts.read(file)` - return a readable stream for `file`
* `opts.exists(file, cb)` - query whether `file` exists or not as the first
argument to `cb(ex)`
* `opts.spawn(cmd, args, opts)` - return a process object or a stream
* `opts.custom` - array of builtin keywords to delegate to `opts.spawn()`

## sh.createStream()

Create a duplex stream for the interpreter.
Write commands, read command output.

## sh.eval(expr)

Return a duplex stream for a single command expression `expr`.
`expr` can have all the fanciness of pipes and control characters but won't
split commands on newlines like `sh.createStream()` will.

# events

## bash.on('spawn', function (cmd, args, opts) {})

Just before a command is executed, this event fires.

## bash.on('read', function (file) {})

Just before a file is read, this event fires.

## bash.on('write', function (file) {})

Just before a file is written to, this event fires.

# status

The scope of this module is to only support the internally-defined bash
functions you can list by typing `help` in a real bash shell.

## implemented

* `&&`, `;`, `||`, `|`, `<`, `>`
* `$?`
* `cd [-L|[-P [-e]]] [dir]`
* `echo [-neE] [arg ...]`
* `eval [arg ...]`
* `exit [n]`
* `false`
* `filename [arguments]`
* `pwd [-LP]`
* `true`

## not yet implemented

* `job_spec [&]`
* `(( expression ))`
* `. filename [arguments]`
* `:`
* `[ arg... ]`
* `[[ expression ]]`
* `alias [-p] [name[=value] ... ]`
* `bg [job_spec ...]`
* `bind [-lpvsPVS] [-m keymap] [-f filen>`
* `break [n]`
* `builtin [shell-builtin [arg ...]]`
* `caller [expr]`
* `case WORD in [PATTERN [| PATTERN]...)>`
* `command [-pVv] command [arg ...]`
* `compgen [-abcdefgjksuv] [-o option]  >`
* `complete [-abcdefgjksuv] [-pr] [-DE] >`
* `compopt [-o|+o option] [-DE] [name ..>`
* `continue [n]`
* `coproc [NAME] command [redirections]`
* `declare [-aAfFgilrtux] [-p] [name[=va>`
* `dirs [-clpv] [+N] [-N]`
* `disown [-h] [-ar] [jobspec ...]`
* `enable [-a] [-dnps] [-f filename] [na>`
* `exec [-cl] [-a name] [command [argume>`
* `export [-fn] [name[=value] ...] or ex>`
* `fc [-e ename] [-lnr] [first] [last] o>`
* `fg [job_spec]`
* `for NAME [in WORDS ... ] ; do COMMAND>`
* `for (( exp1; exp2; exp3 )); do COMMAN>`
* `function name { COMMANDS ; } or name >`
* `getopts optstring name [arg]`
* `hash [-lr] [-p pathname] [-dt] [name >`
* `help [-dms] [pattern ...]`
* `history [-c] [-d offset] [n] or hist>`
* `if COMMANDS; then COMMANDS; [ elif C>`
* `jobs [-lnprs] [jobspec ...] or jobs >`
* `kill [-s sigspec | -n signum | -sigs>`
* `let arg [arg ...]`
* `local [option] name[=value] ...`
* `logout [n]`
* `mapfile [-n count] [-O origin] [-s c>`
* `popd [-n] [+N | -N]`
* `printf [-v var] format [arguments]`
* `pushd [-n] [+N | -N | dir]`
* `read [-ers] [-a array] [-d delim] [->`
* `readarray [-n count] [-O origin] [-s>`
* `readonly [-aAf] [name[=value] ...] o>`
* `return [n]`
* `select NAME [in WORDS ... ;] do COMM>`
* `set [-abefhkmnptuvxBCHP] [-o option->`
* `shift [n]`
* `shopt [-pqsu] [-o] [optname ...]`
* `source filename [arguments]`
* `suspend [-f]`
* `test [expr]`
* `time [-p] pipeline`
* `times`
* `trap [-lp] [[arg] signal_spec ...]`
* `type [-afptP] name [name ...]`
* `typeset [-aAfFgilrtux] [-p] name[=va>`
* `ulimit [-SHacdefilmnpqrstuvx] [limit>`
* `umask [-p] [-S] [mode]`
* `unalias [-a] name [name ...]`
* `unset [-f] [-v] [name ...]`
* `until COMMANDS; do COMMANDS; done`
* `variables - Names and meanings of so>`
* `wait [id]`
* `while COMMANDS; do COMMANDS; done`
* `{ COMMANDS ; }`
