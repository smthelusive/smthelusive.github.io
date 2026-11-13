// A tiny int-only subset of the JVM: an operand stack, local variables, and
// the instructions the levels hand out. Works in the browser and in _solve.js (node or jsc).
(function (root) {
    function VmError(kind, message) {
        this.kind = kind;
        this.message = message;
    }

    // name -> { help, run(state, arg) }. Instructions with an operand are written "bipush 31".
    var OPS = {
        iconst: { help: 'push the constant', run: function (s, n) { push(s, n); } },
        bipush: { help: 'push a byte value', run: function (s, n) { push(s, n); } },
        iload: { help: 'push local variable', run: function (s, i) {
            if (s.locals[i] === undefined) throw new VmError('VerifyError', 'local ' + i + ' is not initialized');
            push(s, s.locals[i]);
        } },
        istore: { help: 'pop into local variable', run: function (s, i) { s.locals[i] = pop(s); } },
        iinc: { help: 'add a constant to a local, no stack involved', run: function (s, i, c) {
            if (s.locals[i] === undefined) throw new VmError('VerifyError', 'local ' + i + ' is not initialized');
            s.locals[i] = (s.locals[i] + c) | 0;
        } },
        iadd: { help: 'pop b, pop a, push a + b', run: binary(function (a, b) { return (a + b) | 0; }) },
        isub: { help: 'pop b, pop a, push a − b', run: binary(function (a, b) { return (a - b) | 0; }) },
        imul: { help: 'pop b, pop a, push a × b', run: binary(function (a, b) { return Math.imul(a, b); }) },
        idiv: { help: 'pop b, pop a, push a / b (rounds toward zero)', run: binary(function (a, b) {
            if (b === 0) throw new VmError('ArithmeticException', '/ by zero');
            return (a / b) | 0;
        }) },
        irem: { help: 'pop b, pop a, push a % b', run: binary(function (a, b) {
            if (b === 0) throw new VmError('ArithmeticException', '/ by zero');
            return (a % b) | 0;
        }) },
        ishl: { help: 'pop b, pop a, push a << b', run: binary(function (a, b) { return a << b; }) },
        ineg: { help: 'pop a, push −a', run: function (s) { push(s, (-pop(s)) | 0); } },
        dup: { help: 'duplicate the top value', run: function (s) { var a = pop(s); push(s, a); push(s, a); } },
        dup_x1: { help: 'copy the top value and tuck it under the second one', run: function (s) {
            var b = pop(s), a = pop(s);
            push(s, b); push(s, a); push(s, b);
        } },
        swap: { help: 'swap the top two values', run: function (s) { var b = pop(s), a = pop(s); push(s, b); push(s, a); } },
        pop: { help: 'throw away the top value', run: function (s) { pop(s); } }
    };

    function binary(f) {
        return function (s) { var b = pop(s), a = pop(s); push(s, f(a, b)); };
    }

    function push(s, v) {
        if (s.stack.length >= s.maxStack) throw new VmError('VerifyError', 'stack size exceeds max_stack = ' + s.maxStack);
        s.stack.push(v);
    }

    function pop(s) {
        if (s.stack.length === 0) throw new VmError('VerifyError', 'stack underflow');
        return s.stack.pop();
    }

    // "iconst_m1" -> {op:'iconst', args:[-1]}, "iload_2" -> {op:'iload', args:[2]}, "iinc 0 1" -> {op:'iinc', args:[0,1]}
    function parse(insn) {
        var parts = insn.split(' ');
        var name = parts[0];
        var args = parts.slice(1).map(Number);
        var m = /^(iconst|iload|istore)_(m1|\d)$/.exec(name);
        if (m) return { op: m[1], args: [m[2] === 'm1' ? -1 : Number(m[2])] };
        if (!OPS[name]) throw new Error('unknown instruction ' + insn);
        return { op: name, args: args };
    }

    function help(insn) {
        return OPS[parse(insn).op].help;
    }

    function initialState(level) {
        return {
            stack: (level.start.stack || []).slice(),
            locals: (level.start.locals || []).slice(),
            maxStack: level.maxStack || 8
        };
    }

    // Runs one instruction on a copy of the state. Throws VmError on failure.
    function step(state, insn) {
        var s = { stack: state.stack.slice(), locals: state.locals.slice(), maxStack: state.maxStack };
        var p = parse(insn);
        OPS[p.op].run.apply(null, [s].concat(p.args));
        return s;
    }

    // Goal: the stack must match exactly; every local listed in the goal must match.
    function matches(state, goal) {
        var stack = goal.stack || [];
        if (state.stack.length !== stack.length) return false;
        for (var i = 0; i < stack.length; i++) if (state.stack[i] !== stack[i]) return false;
        var locals = goal.locals || [];
        for (var j = 0; j < locals.length; j++) {
            if (locals[j] !== null && state.locals[j] !== locals[j]) return false;
        }
        return true;
    }

    root.BytecodeEngine = {
        VmError: VmError,
        help: help,
        initialState: initialState,
        step: step,
        matches: matches
    };
    if (typeof module !== 'undefined') module.exports = root.BytecodeEngine;
})(typeof window !== 'undefined' ? window : globalThis);
